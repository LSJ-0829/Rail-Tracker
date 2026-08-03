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
    <div className="max-w-sm mx-auto px-5 py-24">
      <h1 className="text-xl font-bold tracking-tight text-center mb-2">🔒 국내 철도 완주 기록</h1>
      <p className="text-sm text-neutral-500 text-center mb-8">
        {mode === "setup" ? "처음 쓰는 기기예요. 사용할 비밀번호를 정해주세요." : "비밀번호를 입력해주세요."}
      </p>

      <form onSubmit={mode === "setup" ? handleSetup : handleLogin} className="space-y-3">
        <input
          type="password"
          autoFocus
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
          placeholder="비밀번호"
          className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-500"
        />
        {mode === "setup" && (
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="비밀번호 확인"
            className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-500"
          />
        )}
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-neutral-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-neutral-800 transition disabled:opacity-50"
        >
          {mode === "setup" ? "설정하고 시작하기" : "들어가기"}
        </button>
      </form>

      {mode === "login" && (
        <p className="text-[11px] text-neutral-400 text-center mt-6 leading-relaxed">
          비밀번호를 잊었다면, 이 브라우저의 사이트 데이터(localStorage)를 지우고 새로
          설정할 수 있어요. 단, 그러면 저장된 완주 기록도 함께 사라져요.
        </p>
      )}
    </div>
  );
}
