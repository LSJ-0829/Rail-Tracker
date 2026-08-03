// 아주 단순한 클라이언트 사이드 비밀번호 게이트.
// 이 앱은 정적으로 배포되는 개인용 트래커라, "진짜 보안"이 아니라
// 다른 사람이 우연히 들어와서 내 기록을 건드리지 못하게 막는 정도의 잠금이다.
// (누구든 개발자도구로 코드를 보면 우회할 수 있음 - 그 정도는 감안한 설계)

const HASH_KEY = "rail-tracker-auth-hash";
const AUTHED_KEY = "rail-tracker-authed";

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hasPassword() {
  return !!localStorage.getItem(HASH_KEY);
}

export function isAuthed() {
  return localStorage.getItem(AUTHED_KEY) === "1";
}

export async function setPassword(password) {
  const hash = await sha256(password);
  localStorage.setItem(HASH_KEY, hash);
  localStorage.setItem(AUTHED_KEY, "1");
}

export async function checkPassword(password) {
  const hash = await sha256(password);
  const stored = localStorage.getItem(HASH_KEY);
  const ok = !!stored && stored === hash;
  if (ok) localStorage.setItem(AUTHED_KEY, "1");
  return ok;
}

export function lock() {
  localStorage.removeItem(AUTHED_KEY);
}
