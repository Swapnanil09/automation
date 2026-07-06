import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api";
import { ErrorText } from "../components/ui";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    full_name: "",
    admin_token: "",
  });
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

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await register(
        form.email,
        form.username,
        form.password,
        form.full_name || undefined,
        form.admin_token || undefined
      );
      navigate("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Registration failed");
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

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3">
            <img src="/logo.png" className="h-10 w-10 filter drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]" alt="AutoFlow" />
            <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-md">AutoFlow</span>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Self-hosted automation platform</p>
        </div>

        {/* 3D Interactive Register Card */}
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

          <h2 className="text-2xl font-bold text-white tracking-tight">Create Account</h2>
          <p className="mb-6 mt-1.5 text-sm text-slate-400">The first registered account receives platform admin rights.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-5"
          >
            <div>
              <label htmlFor="fn" className="mb-2 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Full name
              </label>
              <input
                id="fn"
                value={form.full_name}
                onChange={set("full_name")}
                placeholder="Ada Lovelace"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 h-11 text-sm text-slate-100 placeholder-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
              />
            </div>

            <div>
              <label htmlFor="em" className="mb-2 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email
              </label>
              <input
                id="em"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 h-11 text-sm text-slate-100 placeholder-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="un" className="mb-2 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Username
                </label>
                <input
                  id="un"
                  value={form.username}
                  onChange={set("username")}
                  placeholder="username"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 h-11 text-sm text-slate-100 placeholder-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
                />
              </div>

              <div>
                <label htmlFor="pw" className="mb-2 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <input
                  id="pw"
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  placeholder="Min 8 chars"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 h-11 text-sm text-slate-100 placeholder-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="at" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Admin Registration Token
                </label>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Optional</span>
              </div>
              <input
                id="at"
                type="password"
                value={form.admin_token}
                onChange={set("admin_token")}
                placeholder="Enter admin token if provided"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 h-11 text-sm text-slate-100 placeholder-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
              />
            </div>

            {error && <ErrorText>{error}</ErrorText>}

            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] text-white font-bold tracking-wide rounded-xl shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_4px_30px_rgba(139,92,246,0.5),0_0_15px_rgba(6,182,212,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {busy ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>

            <div className="text-center mt-4">
              <Link
                to="/login"
                className="text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
