import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api";
import { ErrorText } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const rotateX = ((yc - y) / yc) * 6; // Max 6 degrees tilt
    const rotateY = ((x - xc) / xc) * 6; // Max 6 degrees tilt
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await login(username, password, remember);
      navigate("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6 select-none">
      {/* Dynamic Grid Background Layer */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* Floating Ambient Glowing Shapes */}
      <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none animate-pulse-glow" />
      
      <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-violet-500/5 blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-pink-500/5 blur-3xl animate-float2 pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-indigo-500/5 blur-2xl animate-float3 pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3">
            <img src="/logo.png" className="h-10 w-10 filter drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]" alt="AutoFlow" />
            <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-md">AutoFlow</span>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Self-hosted automation platform</p>
        </div>

        {/* 3D Interactive Login Card */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.01, 1.01, 1.01)`,
            transition: "transform 0.1s ease-out, shadow 0.1s ease-out"
          }}
          className="relative bg-slate-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] hover:border-violet-500/30 hover:shadow-[0_30px_100px_rgba(139,92,246,0.15),inset_0_1px_1px_rgba(255,255,255,0.1)] duration-300"
        >
          {/* Top Edge Glow line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-500 rounded-t-2xl absolute top-0 left-0" />

          <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
          <p className="mb-6 mt-1.5 text-sm text-slate-400">Sign in to manage your workspaces and workflows.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-5"
          >
            <div>
              <label htmlFor="username" className="mb-2 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Username or email
              </label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                placeholder="name@example.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 h-11 text-sm text-slate-100 placeholder-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 h-11 text-sm text-slate-100 placeholder-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
              />
            </div>

            <div className="flex items-center justify-between select-none">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-400 hover:text-slate-200 transition-colors">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-violet-500 focus:ring-violet-500/20 focus:ring-offset-0 focus:ring-2 focus:outline-none accent-violet-500"
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                Forgot password?
              </Link>
            </div>

            {error && <ErrorText>{error}</ErrorText>}

            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 mt-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] text-white font-bold tracking-wide rounded-xl shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_4px_30px_rgba(139,92,246,0.5),0_0_15px_rgba(6,182,212,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {busy ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-slate-400">
          New to AutoFlow?{" "}
          <Link to="/register" className="font-semibold text-violet-400 hover:text-violet-300 underline decoration-violet-500/30 hover:decoration-violet-500/50 underline-offset-4 transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
