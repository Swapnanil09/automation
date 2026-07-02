import { useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { Button, ErrorText, Field, Input, useToast } from "../components/ui";

export default function ForgotPassword() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
      toast.success("Reset link sent successfully");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to request password reset");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6">
      {/* Premium dark grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
      
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-brand/10 blur-[130px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 shadow-xl mb-3">
            <Logo className="h-5 w-5" />
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white leading-none">Report Scheduler</h2>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Self-Hosted Automation</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl shadow-black/50">
          <h1 className="text-xl font-bold tracking-tight text-white">Reset Password</h1>
          
          {sent ? (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                If an account matches that email address, a password reset link has been dispatched.
              </p>
              <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800">
                <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Local Setup Check</span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Check your terminal/docker logs for a generated reset link if SMTP is not configured.
                </span>
              </div>
              <Link
                to="/login"
                className="mt-2 block w-full text-center py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4 mt-4">
              <p className="text-xs text-slate-400">
                Enter your registered email address below, and we'll send you a recovery link valid for 10 minutes.
              </p>
              
              <Field label="Email address" htmlFor="email" labelClassName="!text-slate-300 text-xs font-medium">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  placeholder="name@example.com"
                  className="!bg-slate-950 !border-slate-800/80 focus:!border-brand focus:!ring-brand/15 focus:!ring-2 !text-white placeholder:!text-slate-600 !h-10 rounded-lg text-sm transition-all"
                  required
                />
              </Field>
              
              {error && <ErrorText>{error}</ErrorText>}
              
              <Button
                type="submit"
                disabled={busy}
                className="w-full !h-10 mt-2 font-semibold text-white !bg-brand hover:!bg-brand/90 active:scale-[0.98] transition-all rounded-lg text-sm flex items-center justify-center shadow-lg shadow-brand/10 border-0"
              >
                {busy ? "Sending link…" : "Send Link"}
              </Button>
              
              <div className="text-center pt-2">
                <Link to="/login" className="text-xs font-semibold text-slate-400 hover:text-white underline decoration-slate-600 hover:decoration-slate-400 underline-offset-4 transition-colors">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
