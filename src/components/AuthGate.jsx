import { useEffect, useState } from "react";
import { hasPassword, isAuthed, setPassword, checkPassword } from "../utils/auth";

/**
 * 비밀번호가 없으면 "설정" 화면, 있으면 "확인" 화면을 보여주고,
 * 인증되면 children을 렌더링한다.
 */
export default function AuthGate({ children }) {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState("login"); // setup | login
  const [authed, setAuthedState] = useState(false);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode(hasPassword() ? "login" : "setup");
    setAuthedState(isAuthed());
    setReady(true);
  }, []);

  if (!ready) return null;
  if (authed) return children;

  const handleSetup = async (e) => {
    e.preventDefault();
    setError("");
    if (pw1.length < 4) {
      setError("비밀번호는 4자 이상으로 설정해주세요.");
      return;
    }
    if (pw1 !== pw2) {
      setError("두 비밀번호가 서로 달라요.");
      return;
    }
    setBusy(true);
    await setPassword(pw1);
    setBusy(false);
    setAuthedState(true);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const ok = await checkPassword(pw1);
    setBusy(false);
    if (ok) {
      setAuthedState(true);
    } else {
      setError("비밀번호가 맞지 않아요.");
      setPw1("");
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-5">
      <div className="w-full max-w-[380px] py-16">
        <div className="mx-auto mb-6 w-14 h-14 rounded-full bg-canvas flex items-center justify-center text-ink">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="4" y="11" width="16" height="10" rx="2.5" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <h1 className="headline text-[32px] leading-tight text-center mb-2">
          {mode === "setup" ? "비밀번호 설정" : "철도완주"}
        </h1>
        <p className="text-[17px] text-sub text-center mb-8 leading-snug">
          {mode === "setup" ? "처음 쓰는 기기예요. 사용할 비밀번호를 정해주세요." : "비밀번호를 입력해주세요."}
        </p>

        <form onSubmit={mode === "setup" ? handleSetup : handleLogin} className="space-y-3">
          <input
            type="password"
            autoFocus
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            placeholder="비밀번호"
            className="field !py-3.5 !text-[17px]"
          />
          {mode === "setup" && (
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="비밀번호 확인"
              className="field !py-3.5 !text-[17px]"
            />
          )}
          {error && <p className="text-[13px] text-[#e30000] text-center">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full !py-3.5 !text-[17px]">
            {mode === "setup" ? "설정하고 시작하기" : "계속"}
          </button>
        </form>

        {mode === "login" && (
          <p className="text-[12px] text-sub text-center mt-8 leading-relaxed">
            비밀번호를 잊었다면 이 브라우저의 사이트 데이터를 지우고 새로 설정할 수 있어요.
            <br />
            단, 그러면 저장된 완주 기록도 함께 사라져요.
          </p>
        )}
      </div>
    </main>
  );
}
