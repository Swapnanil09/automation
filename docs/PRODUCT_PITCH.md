# AutoFlow — Product Presentation & Pitch Deck

## 🚀 The Vision: Next-Gen Self-Hosted Automation
AutoFlow is a **100% free, self-hosted automation platform** built for developers, data engineers, and DevOps teams. It provides a clean, modern UI combined with an isolated runtime engine to orchestrate local scripts, SQL jobs, analytical reporting, and messaging integrations—giving you the convenience of **GitHub Actions** but optimized for local, private infrastructure.

---

## 💡 The Problem We Solve

| The Status Quo | The AutoFlow Solution |
| :--- | :--- |
| **Untracked Cron Jobs**: Hard to debug, lack centralized logging, no visual status history. | **Visual Execution Dashboard**: Live-streamed logs, per-step execution status, absolute line numbers, and historical timeline trend charts. |
| **Cloud Schedulers (SaaS Lock-in)**: High pricing, data privacy concerns, secrets stored on third-party servers. | **100% Self-Hosted & Secure**: Runs inside your local Docker stack. Workspace secrets are encrypted at rest via Fernet keys stored locally. |
| **Monolithic Infrastructure**: High CPU overhead, complex setups, hard to scale. | **Decoupled Architecture**: Fast Uvicorn + FastAPI web server, async task dispatching via Celery Workers, and Redis caching broker. |

---

## 🛠️ Core Platform Capabilities

1. **Workspace Isolation**: Virtual projects with dedicated file systems, Git repositories, variables, and role-based access controls (RBAC).
2. **Workflow YAML Engine**: Orchestrate complex multi-step pipelines with top-level environments, step execution flags, and `continue_on_error` controls.
3. **Built-in Schedulers & Webhooks**: Triggers workflow runs on cron-based intervals (evaluated every minute) or via unguessable secure webhook URLs.
4. **Git Integration**: Full version control system directly integrated into each workspace directory, letting you track code alterations dynamically.

---

## 🔥 Recent Product Innovations

### 🔌 1. Flexible SMTP Server Customisation
*   **Enterprise Server Support**: Support for Gmail App Passwords, custom relays, and enterprise networks (such as Office365 `smtp.office365.com` on port `587`).
*   **STARTTLS Support**: Secure handshakes initialized dynamically over TLS (STARTTLS protocol on port `587` or non-SSL connections), alongside traditional SSL on port `465`.
*   **Reports & Attachments Delivery**: Generate documents (CSV, PDF, stamp texts) inside workspace steps, and deliver them directly via integrated mail dispatches.

### 🐍 2. File-Based Python Execution (Local CI/CD)
*   **Upload & Orchestrate**: Upload, write, or pull `.py` files into the workspace directory.
*   **Direct Execution**: Orchestrate runs using standard shell execution steps: `run: python hello_report.py`.
*   **CLI Parameter Passing**: Pass dynamic arguments (`sys.argv`) and capture raw outputs and errors directly in the step console logs.

### 📊 3. Interactive Zoomable Trend Graph
*   **Real-time Scroll-to-Zoom**: Dynamic pixel-based width scaling. Simply **hover over the graph and scroll the mouse wheel** to zoom in and out horizontally in real-time.
*   **Status Filters**: Toggle between views to show all executions or isolate Success (Delivered), Failed, or Executing timelines.
*   **Vertex Data Dots**: Visible coordinates plotted directly on paths to denote execution ticks.
*   **Expanded white tooltip card**: High-contrast, floating tooltip displaying clear, larger stats.
*   **Click-to-Inspect Overlay (Stock-style)**: Clicking any coordinate dot or vertical gridline anchors a solid indigo guide line, overlays a larger coordinate marker, and expands a dedicated datapoint card underneath the chart showing the exact timestamp and run counts.

### 👥 4. Collaborative Discussions & Access Sharing
*   **Threaded Comments**: Post messages directly on any workflow page to discuss performance or configuration.
*   **Teammate `@username` Mentions**: Reference colleagues using `@username` to trigger real-time notifications in their inbox.
*   **Access Sharing**: Share access permissions with other workspace members.
*   **Ownership Transfer**: Seamless transfer of workflow ownership from one member to another.

### 🛡️ 5. Role-Based Access Control (RBAC) & Admin User Promotion
*   **Dynamic Role Dropdown**: Superadmins can change any user's role status (Superuser vs. Standard User) at any time directly using table dropdowns in the Admin Panel.
*   **Endpoint Shielding**: Enforces strict superuser permissions on global delivery feeds, user listings, and scale/worker controls.
*   **Celery Worker Monitor & Restarts**: Live ping checks of worker uptime, active task counts, and broadcast commands to restart worker pools.

### ⚡ 6. Native Pipeline Steps (SQL, Excel, Compress, SFTP)
*   **Native Steps**: Direct YAML actions for database querying (`sql`), formatting to Excel (`excel`), packaging archives (`compress`), and secure SFTP uploads (`sftp`) without writing verbose script utilities.
*   **Execution Replay**: Instantly replay past runs with the exact same variables and parameters.
*   **Conflict Detection**: Real-time cron check warnings to detect schedule overlaps and avoid bottlenecks.

### 🛡️ 7. Admin Security, Shell Logs, & Pagination (July 2026)
*   **Admin Registration Token**: Secure administrative registration by verifying an environment-configured token during signup.
*   **Shell Step Logs Tracking**: Native integration of shell step (`run:`) execution histories into the global Deliveries log under a `"shell"` channel, represented with a `Terminal` icon in the UI.
*   **Dashboard Logs Pagination**: The dashboard execution log table shows only the last 5 logs initially. Users can expand in increments of 5 up to 25. Reaching 25 logs redirects the user to the full Logs section.

---

## 🏗️ Technical Architecture & Scale

*   **FastAPI & Uvicorn**: High-throughput REST API layer.
*   **Celery & Redis**: Background job queue processing heavy shell workloads asynchronously.
*   **PostgreSQL 16**: Relational storage for metadata, deliveries, users, and audit logs.
*   **Vite React SPA**: Modern single page application built on React 18, TypeScript, and TailwindCSS.

---

## 🚀 Production Scaling & Roadmap

To support enterprise-grade high-availability and security in production environments, the platform defines the following optimization roadmap:
*   **Sandbox Execution Isolation (Docker/gVisor)**: Running each shell execution task inside an ephemeral, resource-constrained container to ensure maximum host security.
*   **WebSocket Observability**: Real-time log streaming and event updates via Redis Pub/Sub, eliminating frontend HTTP polling.
*   **PgBouncer Pooling**: Managed transaction-level database multiplexing to handle highly concurrent API and worker operations.
*   **OLAP Log Storage (ClickHouse)**: Dedicated column-oriented analytics integration for sub-millisecond querying over millions of execution logs (detailed in [docs/CLICKHOUSE_PRODUCTION_SETUP.md](docs/CLICKHOUSE_PRODUCTION_SETUP.md)).
