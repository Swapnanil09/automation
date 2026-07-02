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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6">
      {/* Premium dark grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
      
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-brand/10 blur-[130px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-brand shadow-xl mb-3 transition-transform duration-300 hover:scale-105">
            <Workflow className="h-5 w-5" />
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white leading-none">AutoFlow</h2>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Self-Hosted Automation</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl shadow-black/50">
          <h1 className="text-xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="mb-6 mt-1.5 text-xs text-slate-400">Sign in to your dashboard to manage pipelines.</p>
          
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
            <Field label="Username or email" htmlFor="username" labelClassName="!text-slate-300 text-xs font-medium">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                placeholder="name@example.com"
                className="!bg-slate-950 !border-slate-800/80 focus:!border-brand focus:!ring-brand/15 focus:!ring-2 !text-white placeholder:!text-slate-600 !h-10 rounded-lg text-sm transition-all"
              />
            </Field>
            
            <Field label="Password" htmlFor="password" labelClassName="!text-slate-300 text-xs font-medium">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="!bg-slate-950 !border-slate-800/80 focus:!border-brand focus:!ring-brand/15 focus:!ring-2 !text-white placeholder:!text-slate-600 !h-10 rounded-lg text-sm transition-all"
              />
            </Field>
            
            {error && <ErrorText>{error}</ErrorText>}
            
            <Button
              type="submit"
              disabled={busy}
              className="w-full !h-10 mt-2 font-semibold text-white !bg-brand hover:!bg-brand/90 active:scale-[0.98] transition-all rounded-lg text-sm flex items-center justify-center shadow-lg shadow-brand/10 border-0"
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
        
        <p className="mt-5 text-center text-xs text-slate-500">
          New to AutoFlow?{" "}
          <Link to="/register" className="font-semibold text-slate-300 hover:text-white underline decoration-slate-600 hover:decoration-slate-400 underline-offset-4 transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

