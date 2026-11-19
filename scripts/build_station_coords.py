"""OSM 역 노드 -> lines.json 역 좌표 매칭.

1순위: railway=station/halt 등 역 노드. 2순위: 신호장·yard·폐역·공사중 역·'X역' 승강장.
사용법: python3 build_station_coords.py osm.json tier2.json lines.json stationCoords.json
osm.json / tier2.json 은 Overpass API 결과(out tags center). 쿼리는 README '지도용 역 좌표' 참고.

동명이역은 노선 안에서 이웃 역에 가장 가까운 후보를 고른다. 2순위 후보와 이웃 역에서 너무 먼
1순위 단일 후보는 이웃 역과 MAX_GAP km 이내일 때만 받아들인다.
"""
import json, math, re, sys
from collections import defaultdict

osm_path, tier2_path, lines_path, out_path = sys.argv[1:5]
lines = json.load(open(lines_path))

HIGH_SPEED = {"gyeongbu-gosok-full", "honam-gosok-full", "suseo-pyeongtaek-gosok-full"}
MAX_GAP = 25.0

def norm(s):
    s = s.strip().replace(" ", "").replace("·", "")
    return re.sub(r"(역|정거장|신호장)$", "", s)

def keys_for(name):
    ks = [norm(name), norm(re.sub(r"\(.*?\)", "", name))]
    return list(dict.fromkeys(ks))

def build_index(path):
    idx = defaultdict(list)
    for e in json.load(open(path))["elements"]:
        t = e.get("tags", {})
        lat = e.get("lat") if "lat" in e else (e.get("center") or {}).get("lat")
        lng = e.get("lon") if "lon" in e else (e.get("center") or {}).get("lon")
        if lat is None or lng is None:
            continue
        names = set()
        for k in ("name", "name:ko", "official_name", "alt_name", "old_name", "railway:ref"):
            for part in (t.get(k) or "").split(";"):
                if part:
                    names.add(part)
        for n in names:
            for key in {norm(n), norm(re.sub(r"\(.*?\)", "", n))}:
                idx[key].append((lat, lng))
    return idx

idx1, idx2 = build_index(osm_path), build_index(tier2_path)

def dist(a, b):
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dl = math.radians(b[1] - a[1])
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))

def cluster(pts, eps=1.5):
    groups = []
    for p in pts:
        for g in groups:
            if dist(g[0], p) < eps:
                g.append(p)
                break
        else:
            groups.append([p])
    return [(sum(x[0] for x in g) / len(g), sum(x[1] for x in g) / len(g)) for g in groups]

def candidates(idx, name):
    for k in keys_for(name):
        if idx.get(k):
            return cluster(idx[k])
    return []

def neighbor_refs(chosen, i, span=4):
    for d in range(1, span + 1):
        refs = [chosen[j] for j in (i - d, i + d) if 0 <= j < len(chosen) and chosen[j] is not None]
        if refs:
            return refs, d
    return [], None

registry_ids = set()
for l in lines:
    if l.get("kind") == "physical" and l.get("passengerAccessible") is not False:
        registry_ids.add(l["id"])
    elif l.get("kind") == "urban" and not l.get("physicalLineId") and not l.get("physicalSegments"):
        registry_ids.add(l["id"])

result, missing, far, tier2_used, dropped = {}, [], [], [], []
for l in lines:
    if l["id"] not in registry_ids:
        continue
    sts = l.get("stations", [])
    gap = 80.0 if l["id"] in HIGH_SPEED else MAX_GAP
    c1 = [candidates(idx1, s) for s in sts]
    chosen = [c[0] if len(c) == 1 else None for c in c1]

    # 이웃 역 대부분과 동떨어진 1순위 단일 후보는 버린다(다른 지역 동명이역)
    # 지지도: 같은 노선에서 확정된 다른 역 중 gap*3 안에 있는 역 수. 가장 낮은 이상치부터 버린다.
    while True:
        pts = [(i, p) for i, p in enumerate(chosen) if p is not None]
        if len(pts) < 2:
            break
        support = {i: sum(1 for j, q in pts if j != i and dist(p, q) <= gap * 3) for i, p in pts}
        worst = min(support, key=lambda i: support[i])
        if support[worst] > 0 or len(pts) <= 1:
            break
        if all(v == 0 for v in support.values()):
            break
        dropped.append((l["id"], sts[worst]))
        chosen[worst] = None
        c1[worst] = [c for c in c1[worst] if any(dist(c, q) <= gap * 3 for j, q in pts if j != worst)]

    for _ in range(6):
        for i in range(len(sts)):
            if chosen[i] is not None:
                continue
            refs, d = neighbor_refs(chosen, i)
            if not refs:
                continue
            for tier, cands in ((1, c1[i]), (2, candidates(idx2, sts[i]))):
                if not cands:
                    continue
                best = min(cands, key=lambda p: min(dist(p, r) for r in refs))
                if tier == 1 and len(cands) > 1 or min(dist(best, r) for r in refs) <= gap * d:
                    chosen[i] = best
                    if tier == 2:
                        tier2_used.append((l["id"], sts[i]))
                    break

    # 역이 2~3개뿐인 짧은 관광 노선은 이웃 지지가 약하므로, 1·2순위 후보 조합 중 전체 길이가
    # 가장 짧은 조합을 고른다(구간 하나라도 gap을 넘으면 채택하지 않음).
    if 2 <= len(sts) <= 3:
        import itertools
        pools = [cluster((c1[i] or []) + candidates(idx2, s)) for i, s in enumerate(sts)]
        if all(pools):
            best_combo = min(
                itertools.product(*pools),
                key=lambda combo: sum(dist(combo[k], combo[k + 1]) for k in range(len(combo) - 1)),
            )
            if all(dist(best_combo[k], best_combo[k + 1]) <= gap for k in range(len(best_combo) - 1)):
                chosen = list(best_combo)

    m = {}
    for i, s in enumerate(sts):
        if chosen[i] is None:
            refs, d = neighbor_refs(chosen, i)
            holders = [o[s] for o in result.values() if s in o]
            if not refs and len(holders) == 1:
                chosen[i] = tuple(holders[0])
                tier2_used.append((l["id"], s, "other-line"))
            for other in result.values():
                if chosen[i] is not None:
                    break
                p = other.get(s)
                if p and refs and min(dist(p, r) for r in refs) <= gap * (d or 1):
                    chosen[i] = tuple(p)
                    tier2_used.append((l["id"], s, "other-line"))
                    break
        if chosen[i] is None:
            missing.append((l["id"], l["name"], s))
        else:
            m[s] = [round(chosen[i][0], 5), round(chosen[i][1], 5)]
    for i in range(len(sts) - 1):
        a, b = m.get(sts[i]), m.get(sts[i + 1])
        if a and b and dist(a, b) > (60 if l["id"] in HIGH_SPEED else 20):
            far.append((l["id"], sts[i], sts[i + 1], round(dist(a, b), 1)))
    result[l["id"]] = m

json.dump(result, open(out_path, "w"), ensure_ascii=False, separators=(",", ":"))
total = sum(len(l["stations"]) for l in lines if l["id"] in registry_ids)
print("matched", sum(len(v) for v in result.values()), "/", total)
print("DROPPED (wrong-region single match)", dropped)
print("TIER2", len(tier2_used), tier2_used)
print("MISSING", len(missing))
for x in missing:
    print("  ", x)
print("FAR", len(far))
for x in far:
    print("  ", x)
