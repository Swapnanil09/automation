# AutoFlow — Production Deployment & Architecture Guide

This guide provides step-by-step instructions for deploying AutoFlow in a secure, production-grade, highly available cloud environment.

---

## 1. Production Architecture Overview

In production, instead of running all services in a single Docker Compose group on a single machine, you should decouple your stateful services (Postgres, Redis), stateless API containers, and background workers.

```
                    ┌───────────────────────────────┐
                    │      CloudFront / CDN / S3    │ (Static Frontend Hosting)
                    │       (React SPA Bundle)      │
                    └───────────────┬───────────────┘
                                    │ HTTPS (Port 443)
                                    ▼
                    ┌───────────────────────────────┐
                    │  Application Load Balancer    │ (HTTPS Termination & Routing)
                    └───────────────┬───────────────┘
                                    │ HTTP (Port 8000)
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │             ECS / Kubernetes / Container Group         │
       │                                                        │
       │   ┌──────────────────┐          ┌──────────────────┐   │
       │   │     API Node     │          │     API Node     │   │ (Stateless APIs)
       │   └────────┬─────────┘          └────────┬─────────┘   │
       │            │                             │             │
       │            ▼                             ▼             │
       │   ┌────────────────────────────────────────────────┐   │
       │   │             Celery Worker Group                │   │
       │   │                                                │   │
       │   │   ┌──────────────┐          ┌──────────────┐   │   │ (Background Runner Tasks)
       │   │   │ Worker Node  │          │ Worker Node  │   │   │
       │   │   └──────────────┘          └──────────────┘   │   │
       │   └────────────────────────────────────────────────┘   │
       │                            ▲                           │
       │   ┌────────────────────────┴────────┐                  │
       │   │         Scheduler Node          │                  │ (Exactly One Replica)
       │   │       (Celery Beat Task)        │                  │
       │   └─────────────────────────────────┘                  │
       └────────────────────────────┬───────────────────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            │               Stateful Services               │
            │                                               │
            │   ┌──────────────┐          ┌──────────────┐  │
            │   │  AWS RDS PG  │          │ ElastiCache  │  │ (Managed Database & Cache)
            │   │ (Postgres16) │          │   (Redis)    │  │
            │   └──────────────┘          └──────────────┘  │
            └───────────────────────────────────────────────┘
```

### Key Deployment Rules:
1. **Stateless APIs:** The `api` containers are completely stateless and can be scaled horizontally using an Application Load Balancer.
2. **Decoupled Workers:** Celery `worker` containers consume tasks from Redis and can be scaled horizontally depending on the volume of workflow executions.
3. **Singleton Scheduler:** The `scheduler` (Celery Beat) **must run as a single replica**. Running multiple Celery Beat schedulers simultaneously will cause cron jobs to trigger duplicate workflow executions.
4. **Isolated Worker Directory:** Workers execute arbitrary shell commands inside `/data/workspaces` (the workspace root). In production, ensure this mount is either backed by a distributed file system (e.g., AWS EFS) if sharing workspaces across multiple worker nodes, or running isolated VM nodes.

---

## 2. Step-by-Step Production Setup

### Step 1: Provision Managed Database & Cache
1. **PostgreSQL 16:** Spin up a managed DB instance (e.g., AWS RDS PostgreSQL) with automatic daily backups.
2. **Redis 7:** Spin up a managed cache group (e.g., AWS ElastiCache Redis) with in-transit encryption.

### Step 2: Build Production Artifacts

#### A. Build and Deploy Frontend
Build the Vite production SPA package:
```bash
cd frontend
npm install
npm run build
```
This outputs a directory of static assets in `dist/`. Upload this entire directory to a static host (e.g., AWS S3 bucket, Vercel, Netlify, or serve with Nginx) and configure a CDN (e.g., CloudFront) for global delivery.

#### B. Build Backend Docker Image
Compile the backend application into a Docker image:
```bash
docker build -t yourregistry/autoflow-backend:latest ./backend
```
Push the image to your container registry (e.g., AWS ECR, Docker Hub).

### Step 3: Configure Production Environment Variables (`.env`)
Generate your production secret keys and configure the environment variables:
```bash
# Generate 32-byte hex key for JWT signing & Fernet encryption
openssl rand -hex 32
```
Deploy the following variables into your container definitions or Kubernetes Secret configurations:
```ini
PROJECT_NAME=AutoFlow
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=your-secure-32-byte-hex-key

# Token Lifetimes
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=14

# Database and Broker connections
POSTGRES_HOST=your-rds-endpoint.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_USER=autoflow_admin
POSTGRES_PASSWORD=your-db-password
POSTGRES_DB=autoflow

REDIS_HOST=your-elasticache-endpoint.amazonaws.com
REDIS_PORT=6379

# Shared workspace storage directory
WORKSPACES_ROOT=/mnt/efs/workspaces

# Optional Admin Registration Token to secure administrative signup
ADMIN_REGISTRATION_TOKEN=your-secure-admin-token
```

### Step 4: Run Database Migrations
Run a one-time migration command using the backend image to prepare all Postgres tables:
```bash
docker run --rm \
  --env-file .env \
  yourregistry/autoflow-backend:latest \
  alembic upgrade head
```

### Step 5: Launch Containers on ECS / Kubernetes
Deploy your container groups using the following replica settings:
* **API Service:** Minimum 2 replicas, configured with target tracking metrics for CPU/Memory utilization.
* **Worker Service:** Minimum 2 replicas.
* **Scheduler Service:** **Strictly 1 replica** (Singleton configuration).

---

## 3. Production Security Checklist

- [ ] **Enforce Admin Registration Token:** Configure `ADMIN_REGISTRATION_TOKEN` in production. This secures administrative registration, requiring signup requests to present the correct token to claim superuser (admin) privileges.
- [ ] **Run Workers Under Least Privilege:** In the `worker` Docker image, ensure the entrypoint executes command execution tasks under a non-root OS user (e.g., user `celery`), restricting system commands from accessing host system files.
- [ ] **Secret Encryption:** The database records all secrets under AES-256 Fernet symmetric encryption. Ensure your `SECRET_KEY` is safely backed up in a secure vault (like AWS Secrets Manager or HashiCorp Vault) and is never printed in log streams.
- [ ] **Ingress SSL Termination:** Configure Nginx, Traefik, or AWS ALB to enforce SSL/TLS (HTTPS) only, routing API endpoints under `/api` and serving static files for all other routes.

---

## 4. End-User Flow

1. **Onboarding & Role-Based Access Control (RBAC):**
   * Register your first administrator account.
   * Create separate **Workspaces** (isolated containers) representing your projects (e.g., `Marketing-Automation`, `Data-Backups`).
   * Invite team members to workspaces with specific roles: `viewer` (read-only), `member` (create/run), `maintainer` (manage secrets/settings), or `owner`.
2. **Project Files & Versioning:**
   * Write or upload automation scripts, config files, or datasets straight from the file explorer.
   * Track files using the built-in git panel to commit updates and manage development branches.
3. **Secrets & Configurations:**
   * Set up connection strings, API keys, or target addresses in the workspace's variables & secrets vault. Secrets are safely encrypted at rest.
4. **Orchestrating Workflows:**
   * Author workflows using standard YAML.
   * Add triggers: `manual`, time-based `schedule` (supporting custom cron expressions evaluated against local timezones), or `webhook` URLs to start runs from GitHub, GitLab, or external service hooks.
5. **Observability:**
   * Watch runs execute step-by-step with real-time logs, timing breakdowns, execution history, and in-app notifications.

---

## 5. Optional Analytical Migration (ClickHouse)

When scaling to millions of workflow runs, transactional database queries on PostgreSQL (for trends, lines, global logs, and search) may degrade application performance. In high-throughput settings, it is highly recommended to migrate delivery log storage to ClickHouse.

If you choose to perform this migration:
1. **Review the Migration Guide:** Consult the detailed [docs/CLICKHOUSE_PRODUCTION_SETUP.md](file:///C:/Users/CLIRKOL-56/Documents/github_clone/autoflow/docs/CLICKHOUSE_PRODUCTION_SETUP.md) for database tables, schema models, and python optimization examples.
2. **Setup a ClickHouse Cluster:** Deploy an isolated ClickHouse server or managed group (e.g., ClickHouse Cloud).
3. **Add ClickHouse Credentials:** Configure target environment variables:
   ```ini
   CLICKHOUSE_HOST=your-clickhouse-host
   CLICKHOUSE_PORT=9000
   CLICKHOUSE_USER=default
   CLICKHOUSE_PASSWORD=your-clickhouse-password
   CLICKHOUSE_DB=autoflow
   ```
4. **Update Logs Path**: Update the backend task runner `executor.py` to write step outputs directly to ClickHouse, and configure the API endpoints (`/deliveries` and `/dashboard/stats`) to pull aggregates from ClickHouse tables.
