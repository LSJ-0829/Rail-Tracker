import { lock } from "../utils/auth";

const LINKS = [
  { view: "physical", label: "노선" },
  { view: "service", label: "운행계통" },
  { view: "map", label: "지도" },
  { view: "abroad", label: "해외" },
  { view: "progress", label: "완주 현황" },
];

/**
 * 모든 화면 위에 붙는 얇은 반투명 상단 바.
 * current: 지금 화면(lobby | physical | service | progress | detail)
 */
export default function NavBar({ current, onNavigate }) {
  return (
    <nav className="sticky top-0 z-30 bg-[rgba(251,251,253,0.8)] backdrop-blur-xl backdrop-saturate-150 border-b border-black/[0.06]">
      <div className="max-w-[980px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
        <button
          onClick={() => onNavigate("lobby")}
          className="text-[15px] font-semibold tracking-tight text-ink/90 hover:text-ink shrink-0"
        >
          철도완주
        </button>
        <div className="flex items-center gap-3.5 sm:gap-8 text-[12px] sm:text-[13px]">
          {LINKS.map((l) => (
            <button
              key={l.view}
              onClick={() => onNavigate(l.view)}
              className={`transition ${current === l.view ? "text-ink font-medium" : "text-ink/70 hover:text-ink"}`}
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => {
              lock();
              window.location.reload();
            }}
            aria-label="잠그기"
            title="잠그기"
            className="text-ink/60 hover:text-ink transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2.5" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
