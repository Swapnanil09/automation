# 🔮 AutoFlow: Future Implementation Roadmap

This document outlines the planned improvements and optimizations to evolve AutoFlow into a highly resilient, enterprise-grade, and secure automation platform. 

---

## 🏗️ 1. Execution Isolation & Sandboxing
* **Current Posture**: Workflow steps run directly on the host shell of the Celery worker container/node, which allows unrestricted access to host resources.
* **Goal**: Isolate execution scopes.
* **Implementation Plan**:
  * Integrate **Docker SDK for Python** inside `executor.py`.
  * For each workflow run, spin up a secure, ephemeral container using a hardened base image (e.g. `python:3.12-alpine`).
  * Enforce resource constraints (e.g. maximum `256MB` RAM and `0.5` CPU cores) directly via Docker container settings to prevent memory leaks or compute monopolization.

## 💾 2. Transaction Connection Pooling
* **Current Posture**: High concurrent workflow executions open direct database connections, risking connection exhaustion on PostgreSQL.
* **Goal**: Stabilize and multiplex database connections.
* **Implementation Plan**:
  * Introduce **PgBouncer** in transaction pooling mode as a containerized service.
  * Update backend `Settings` database URL references to route through PgBouncer's multiplexed port.

## 📈 3. Log Storage Scaling (ClickHouse Integration)
* **Current Posture**: Relational configuration data and analytical logs reside in the same PostgreSQL database.
* **Goal**: Decouple OLTP (config) from OLAP (logs).
* **Implementation Plan**:
  * Execute a dual-write configuration to replicate delivery logs to **ClickHouse** column-oriented storage.
  * Shift all dashboard query pipelines (`/dashboard/stats`, `/deliveries`) to retrieve analytics directly from ClickHouse.

## 🔒 4. Enterprise-Grade Secrets Management
* **Current Posture**: Secrets are Fernet-encrypted using a local symmetric key stored in `.env`.
* **Goal**: Prevent key exposure and meet compliance requirements.
* **Implementation Plan**:
  * Integrate with **HashiCorp Vault** (self-hosted) or cloud key managers (AWS KMS / GCP KMS) to fetch encryption keys dynamically.
  * Implement dynamic log-masking filters in `executor.py` to replace decrypted secret values printed to console output with `***` masks.

## 🌐 5. Real-Time Observability (WebSockets)
* **Current Posture**: The React SPA client polls the API endpoints at fixed intervals to fetch notifications and run log streams.
* **Goal**: Minimize network overhead and provide sub-second updates.
* **Implementation Plan**:
  * Create a real-time WebSocket router (`/api/v1/ws/runs/{run_id}`) in FastAPI.
  * Stream Celery worker progress events directly to browser clients via Redis Pub/Sub, eliminating HTTP polling.

## ⚙️ 6. Pipeline Resilience (YAML Extensions)
* **Goal**: Support robust error handling at the YAML definition level.
* **Implementation Plan**:
  * Extend YAML syntax to support step-level parameters:
    ```yaml
    steps:
      - name: ETL Load
        run: python load_data.py
        retries: 3
        timeout: 120
    ```
