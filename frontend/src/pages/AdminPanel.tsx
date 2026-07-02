import { useEffect, useState } from "react";
import { Users, FolderGit2, Play, Activity, RefreshCw, Plus, CheckCircle, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";
import type { AdminStats, WorkerInfo, User } from "../lib/types";
import {
  Badge, Button, Card, ErrorText, Field, Input, Modal, PageHeader, Skeleton,
  useToast,
} from "../components/ui";

export default function AdminPanel() {
  const toast = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [workers, setWorkers] = useState<WorkerInfo[] | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  
  const [openUserModal, setOpenUserModal] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"stats" | "users" | "workers">("stats");

  function loadStats() {
    api.admin.stats().then(setStats).catch(e => setError(e.message));
  }

  function loadWorkers() {
    api.admin.workers().then(setWorkers).catch(e => setError(e.message));
  }

  function loadUsers() {
    api.admin.listUsers().then(setUsers).catch(e => setError(e.message));
  }

  useEffect(() => {
    loadStats();
    loadWorkers();
    loadUsers();
  }, []);

  async function handleCreateUser() {
    setError(null);
    setBusy(true);
    try {
      await api.admin.createUser({
        email,
        username,
        password,
        full_name: fullName || null,
      });
      setOpenUserModal(false);
      setEmail("");
      setUsername("");
      setPassword("");
      setFullName("");
      toast.success(`User @${username} created successfully`);
      loadUsers();
      loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestartWorker(name: string) {
    try {
      await api.admin.restartWorker(name);
      toast.success(`Restart signal sent to worker ${name}`);
      setTimeout(loadWorkers, 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to restart worker");
    }
  }

  return (
    <div>
      <PageHeader
        title="Admin Panel"
        description="Global system administration, worker scaling, and account provisioning."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { loadStats(); loadWorkers(); loadUsers(); }}>
              <RefreshCw className="h-4 w-4 mr-1" /> Sync
            </Button>
            <Button onClick={() => setOpenUserModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Provision User
            </Button>
          </div>
        }
      />

      {/* Tabs bar */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "stats"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          System Stats
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "users"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          User Management ({users?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("workers")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "workers"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Celery Workers ({workers?.length || 0})
        </button>
      </div>

      {activeTab === "stats" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          {!stats ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-6 border border-slate-100 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-2xl font-black text-slate-800">{stats.total_users}</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Provisioned Users</span>
                  </div>
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 border border-slate-100 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-2xl font-black text-slate-800">{stats.total_workspaces}</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Workspaces</span>
                  </div>
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <FolderGit2 className="h-5 w-5" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 border border-slate-100 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-2xl font-black text-slate-800">{stats.total_workflows}</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">Configured Workflows</span>
                  </div>
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <Play className="h-5 w-5" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 border border-slate-100 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-2xl font-black text-slate-800">{stats.total_runs}</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Run Executions</span>
                  </div>
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Success rate vs failures info */}
          {stats && (
            <Card className="p-6 border border-slate-100 bg-white">
              <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Run Executions Performance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 text-center">
                  <span className="block text-[28px] font-black text-emerald-600">{stats.success_runs}</span>
                  <span className="text-xs font-medium text-slate-400">Successful Runs</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 text-center">
                  <span className="block text-[28px] font-black text-rose-600">{stats.failed_runs}</span>
                  <span className="text-xs font-medium text-slate-400">Failed Runs</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 text-center">
                  <span className="block text-[28px] font-black text-brand-600">
                    {stats.total_runs > 0 ? Math.round((stats.success_runs / stats.total_runs) * 100) : 100}%
                  </span>
                  <span className="text-xs font-medium text-slate-400">Overall Success Rate</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "users" && (
        <Card className="border border-slate-100 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Role Status</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!users ? (
                  [0, 1, 2].map(i => (
                    <tr key={i}>
                      <td colSpan={5} className="px-6 py-4"><Skeleton className="h-5" /></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">No users configured.</td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/40">
                      <td className="px-6 py-4 font-mono text-sm font-bold text-slate-800">@{u.username}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{u.full_name || "—"}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{u.email}</td>
                      <td className="px-6 py-4">
                        <Badge tone={u.is_superuser ? "brand" : "neutral"}>
                          {u.is_superuser ? "Superuser" : "Standard User"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "workers" && (
        <div className="space-y-4">
          {!workers ? (
            [0, 1].map(i => <Skeleton key={i} className="h-[120px]" />)
          ) : workers.length === 0 ? (
            <Card className="p-12 text-center text-sm text-slate-400 bg-white border border-slate-100">
              No workers found. Make sure Celery is running.
            </Card>
          ) : (
            workers.map(w => (
              <Card key={w.name} className="p-6 border border-slate-100 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 p-2 rounded-lg shrink-0 ${
                      w.status === "healthy" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    }`}>
                      {w.status === "healthy" ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-mono text-sm font-bold text-slate-800">{w.name}</h4>
                      <p className="mt-1 text-xs text-slate-400">
                        PID: {w.pid || "N/A"} · Uptime: {Math.round(w.uptime / 60)} mins · Active Tasks: {w.active_tasks}
                      </p>
                      {w.error && <p className="mt-2 text-xs font-mono text-rose-500 bg-rose-50/50 p-2 rounded border border-rose-100">{w.error}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={w.status === "healthy" ? "ok" : "danger"}>
                      {w.status === "healthy" ? "Running" : "Unresponsive"}
                    </Badge>
                    <Button variant="secondary" onClick={() => handleRestartWorker(w.name)}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Restart Pool
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* User Provisioning Modal */}
      <Modal
        open={openUserModal}
        onClose={() => setOpenUserModal(false)}
        title="Provision New User"
        description="Add a new administrator or workflow member account to AutoFlow."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenUserModal(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={busy || !email || !username || !password}>
              {busy ? "Provisioning…" : "Provision User"}
            </Button>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleCreateUser(); }} className="space-y-4">
          <Field label="Username" htmlFor="new-username">
            <Input id="new-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. janesmith" autoFocus />
          </Field>
          <Field label="Email Address" htmlFor="new-email">
            <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
          </Field>
          <Field label="Full Name" htmlFor="new-fullname">
            <Input id="new-fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" />
          </Field>
          <Field label="Password" htmlFor="new-password">
            <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <ErrorText>{error}</ErrorText>
        </form>
      </Modal>
    </div>
  );
}
