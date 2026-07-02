# ⚙️ Workflow Extensions, Conditional Logic, and Self-Healing Roadmap

This document outlines the architecture, setup instructions, and design patterns for building multi-step workflows, conditional routing, and automated self-healing execution runs in **Report Scheduler**.

---

## 1. Multi-Step Workflow Actions

Since Report Scheduler executes workflow steps as shell processes in the workspace context with injected secrets/variables, you can build powerful multi-step report delivery pipelines directly using standard CLI tools or container-installed runtimes.

### 📥 Run SQL Query
Queries databases (e.g. PostgreSQL, ClickHouse, MySQL) and outputs results directly into a structured CSV file.
```yaml
name: Extract Database Report
steps:
  - name: execute-query
    run: |
      psql "$DATABASE_URL" -c "COPY (SELECT id, email, created_at FROM users WHERE is_active = true) TO STDOUT WITH CSV HEADER" > report.csv
```

### 📊 Generate Excel
Uses Python (pandas/openpyxl) to compile CSV queries into formatted Excel spreadsheets.
```yaml
  - name: compile-excel
    run: |
      python -c "
      import pandas as pd
      df = pd.read_csv('report.csv')
      df.to_excel('report.xlsx', index=False, sheet_name='Active Users')
      "
```

### 🗜️ Compress
Uses `tar` or `zip` utilities to archive large files.
```yaml
  - name: compress-archive
    run: |
      zip -9 report.zip report.xlsx
```

### 📤 Upload to SFTP
Uses `sshpass` and `sftp` or Python (`paramiko`) to transfer output reports to remote servers.
```yaml
  - name: upload-sftp
    run: |
      sshpass -p "$SFTP_PASSWORD" sftp -o StrictHostKeyChecking=no "$SFTP_USER@$SFTP_HOST" <<EOF
      put report.zip /uploads/reports/
      bye
      EOF
```

### ✉️ Email Stakeholders
Leverages Report Scheduler's built-in `gmail` integration channel step to email files.
```yaml
  - name: send-email
    uses: gmail
    with:
      connection: global-smtp
      recipients: stakeholders@example.com
      subject: "Monthly Active Users Report"
      body: "Attached is the compiled report."
      attachments:
        - report.zip
```

---

## 2. Implementing Conditional Logic

You can achieve conditional logic inside shell run steps using standard scripting syntax.

### ⚖️ Conditional Compression (File Size > 10 MB)
Determines whether a file exceeds 10 MB (10,485,760 bytes) and compresses it, otherwise leaving it uncompressed.
```yaml
  - name: check-and-compress
    run: |
      FILE_SIZE=$(stat -c%s "report.xlsx")
      if [ "$FILE_SIZE" -gt 10485760 ]; then
        echo "File size ($FILE_SIZE bytes) exceeds 10MB limit. Compressing..."
        zip -9 report.zip report.xlsx
        echo "final_file=report.zip" >> $GITHUB_ENV
      else
        echo "File size ($FILE_SIZE bytes) within limits. Skipping compression."
        cp report.xlsx report.xlsx.ready
        echo "final_file=report.xlsx.ready" >> $GITHUB_ENV
      fi
```

### 🔍 Empty Data Logic (Notify Owner Only)
Checks if the database extraction contains no data (empty file or only header line) and redirects the email.
```yaml
  - name: check-data-and-dispatch
    run: |
      ROW_COUNT=$(wc -l < report.csv)
      if [ "$ROW_COUNT" -le 1 ]; then
        echo "No records found in database query. Alerting owner only."
        # Use curl to notify owner webhook or send message
        exit 0
      fi
```

### 🛡️ Fallback Workflows
If a run fails, the system automatically triggers a fallback notification or diagnostic workflow by making a POST call to the Report Scheduler manual trigger API.
```yaml
  - name: trigger-fallback
    run: |
      curl -X POST "http://api:8000/api/v1/workspaces/$WORKSPACE_ID/workflows/$FALLBACK_WF_ID/trigger" \
        -H "Authorization: Bearer $API_TOKEN"
```

---

## 3. Celery Self-Healing Jobs (Implemented)

The workflow worker has a built-in Celery-level self-healing mechanism:
* **Automatic Restart**: If a workflow run terminates with a `FAILED` state (e.g. timeout, script error, connection issue), Celery automatically restarts it.
* **Exponential Backoff**: Configured with a max retry count of **3**, and an exponential countdown scale ($5^{\text{retry\_number}}$ seconds):
  1. Retry 1: **5 seconds** delay.
  2. Retry 2: **25 seconds** delay.
  3. Retry 3: **125 seconds** delay.

This configuration is active inside [tasks.py](file:///C:/Users/CLIRKOL-56/Documents/github_clone/autoflow/backend/app/workers/tasks.py#L27-L55).
