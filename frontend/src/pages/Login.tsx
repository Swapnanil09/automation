import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Workflow } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api";
import { Button, ErrorText, Field, Input } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null); setBusy(true);
    try { await login(username, password); navigate("/"); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Login failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden animate-gradient-bg p-6">
      {/* Subtle overlays to enhance depth */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
      <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 h-[500px] w-[500px] rounded-full bg-pink-500/20 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-white to-indigo-100 text-brand shadow-xl mb-3 transition-transform duration-300 hover:scale-110 hover:rotate-6">
            <Workflow className="h-6 w-6" />
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-none drop-shadow-md">AutoFlow</h2>
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-200/90 drop-shadow-sm">Self-Hosted Automation</p>
        </div>

        <div className="backdrop-blur-xl bg-slate-900/75 border border-white/10 p-8 rounded-[28px] shadow-2xl shadow-black/40">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Welcome Back</h1>
          <p className="mb-6 mt-1 text-sm text-slate-300 leading-normal">Sign in to your account to manage pipelines.</p>
          
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-5">
            <Field label="Username or email" htmlFor="username" labelClassName="text-slate-200">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                placeholder="you@example.com"
                className="bg-slate-950/40 border-slate-700/60 focus:border-brand-400 focus:ring focus:ring-brand-400/20 text-white placeholder:text-slate-500 h-10 rounded-xl focus:bg-slate-950/60 transition-all duration-200"
              />
            </Field>
            
            <Field label="Password" htmlFor="password" labelClassName="text-slate-200">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-950/40 border-slate-700/60 focus:border-brand-400 focus:ring focus:ring-brand-400/20 text-white placeholder:text-slate-500 h-10 rounded-xl focus:bg-slate-950/60 transition-all duration-200"
              />
            </Field>
            
            {error && <ErrorText>{error}</ErrorText>}
            
            <Button
              type="submit"
              disabled={busy}
              className="w-full h-10 mt-3 font-bold text-white shadow-lg shadow-brand/20 bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-600 hover:from-brand-600 hover:to-purple-700 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
        
        <p className="mt-5 text-center text-sm text-indigo-100">
          No account?{" "}
          <Link to="/register" className="font-semibold text-white hover:text-indigo-200 underline decoration-indigo-400/50 underline-offset-4 transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
