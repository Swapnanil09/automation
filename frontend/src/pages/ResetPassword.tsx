import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { Button, ErrorText, Field, Input, useToast } from "../components/ui";

export default function ResetPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
      setError("Token is missing. Check your reset link.");
      return;
    }

    setBusy(true);
    try {
      await api.auth.resetPassword({ token, new_password: password });
      toast.success("Password reset successfully. Please log in.");
      navigate("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reset password");
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
          <h1 className="text-xl font-bold tracking-tight text-white">Choose New Password</h1>
          <p className="mb-6 mt-1.5 text-xs text-slate-400">Please enter and confirm your new password below.</p>
          
          <form onSubmit={submit} className="space-y-4">
            <Field label="New password" htmlFor="password" labelClassName="!text-slate-300 text-xs font-medium">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="New password (min 8 chars)"
                className="!bg-slate-950 !border-slate-800/80 focus:!border-brand focus:!ring-brand/15 focus:!ring-2 !text-white placeholder:!text-slate-600 !h-10 rounded-lg text-sm transition-all"
                required
              />
            </Field>
            
            <Field label="Confirm new password" htmlFor="confirmPassword" labelClassName="!text-slate-300 text-xs font-medium">
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
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
              {busy ? "Resetting password…" : "Reset Password"}
            </Button>
            
            {!token && (
              <p className="text-xs text-rose-500 text-center mt-2 font-semibold">
                Warning: Reset token is missing in URL! Please open a valid reset link.
              </p>
            )}
            
            <div className="text-center pt-2">
              <Link to="/login" className="text-xs font-semibold text-slate-400 hover:text-white underline decoration-slate-600 hover:decoration-slate-400 underline-offset-4 transition-colors">
                Back to sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
