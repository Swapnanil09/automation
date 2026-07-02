# 👥 Collaboration, Access Control, and Administrative Panel

This document outlines the architecture, capabilities, and setup instructions for **Collaboration Features**, **Role-Based Access Control (RBAC)**, and the **Admin Panel** in the Report Scheduler application.

---

## 1. Collaboration Features

Report Scheduler supports robust multi-user workspace collaboration:

### 💬 Discussion & Mentions
* **Contextual Comments**: Users can leave comment threads on any workflow/schedule page to discuss run performance or setup.
* **Teammate Mentions**: Mention workspace colleagues using `@username` in comment content. The system parses these mentions and issues in-app notifications linked directly to the workflow page.
* **Database Schema**: Persisted in the `WorkflowComment` table, referencing `workflow_id` and the author's `user_id`.

### 🔗 Workspace Sharing
* **Schedule Sharing**: Share workflows with specific users or teams in the workspace.
* **Security Controls**: Sharing records (`WorkflowShare` table) grant access permissions to standard users who wouldn't otherwise have access to read or execute the workflows.

### 👑 Ownership Transfer
* **Transfer Ownership**: Workflow owners or workspace co-admins can transfer the ownership of a schedule to another user.
* **Audit Logging**: Ownership transfers are logged in the `ActivityLog` table for visibility.

### 📝 Workspace Activity Log
* **Audit Logs**: An activity log records important modifications (e.g. creating, updating, deleting, sharing, commenting on, or transferring workflows).
* **Workspace Scoping**: Accessible via `GET /workspaces/{workspace_id}/activity`.

---

## 2. Role-Based Access Control (RBAC)

The application enforces strict API-level and UI-level segregation:

| Section / Action | Admin / Superuser | Workspace Co-Admin | Workspace Member | Standard User / Guest |
|---|---|---|---|---|
| **User Provisioning (`POST /users`)** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Global Members List (`GET /users`)** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **System-wide Deliveries Logs** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Admin Stats & Worker Control** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Workflow Access** | ✅ Yes | ✅ Yes (Workspace) | ✅ Yes (If Owned/Shared) | ❌ No |

### API Protection
FastAPI dependencies (`get_current_superuser`) protect administrative endpoints. Standard users attempting to query system-wide delivery logs (`/deliveries`), list users, or restart workers receive a `403 Forbidden` error.

---

## 3. Administrative Panel

The **Admin Panel** is a premium, superuser-only dashboard:
* **System Stats**: Shows total provisioned users, active workspaces, configured workflows, total run executions, and overall success rates.
* **User Provisioning**: Admin form to register standard users or new administrators.
* **Worker Monitor**: Connects directly to Celery's inspect interface to ping workers, show CPU/PID stats, track active tasks, and issue broadcast `pool_restart` commands to unresponsive workers.
* **Live Conflict Alerts**: Real-time overlapping check (`POST /check-conflicts`) triggers warnings when configuring schedule crons to prevent execution bottlenecks.
