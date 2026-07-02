# ⚙️ Workflow Extensions: SQL, Excel, Compress, and SFTP Integrations

This document provides detailed setup, parameter syntax, and design patterns for the newly implemented native multi-step workflow actions in **AutoFlow**.

---

## 1. Run SQL Query (`uses: sql`)

Runs database queries (SQLite or PostgreSQL) and writes structured results directly to a CSV or JSON file in the workspace.

### Connection Catalog Settings
* **db_type**: `sqlite` or `postgres` (default: `sqlite`)
* **db_path**: Relational path to the SQLite file in the workspace (default: `data.db`).
* **host / port / username / password / database**: PostgreSQL connection credentials (for `postgres` type).

### Step Configuration Syntax
```yaml
steps:
  - name: Query Database
    uses: sql
    connection: my-workspace-db
    with:
      query: "SELECT id, email, full_name FROM users WHERE is_active = true"
      output_file: "active_users.csv"
```
*Note: If `output_file` ends in `.json`, results are written in JSON array format, otherwise CSV format is used.*

---

## 2. Compile Excel Sheet (`uses: excel`)

Converts a CSV query result file into a formatted Microsoft Excel spreadsheet (`.xlsx`) using python's `openpyxl`.

### Step Configuration Syntax
```yaml
steps:
  - name: Generate Spreadsheet
    uses: excel
    with:
      source: "active_users.csv"
      output: "users_report.xlsx"
      sheet_name: "Active Members"
```

---

## 3. Compress Archive (`uses: compress`)

Packages files or entire folders into a compressed archive (`.zip` or `.tar.gz`) to reduce attachment sizes.

### Step Configuration Syntax
```yaml
steps:
  - name: Package Report
    uses: compress
    with:
      source: "users_report.xlsx"
      output: "report_package.zip"
      format: "zip"  # zip or tar.gz (default: zip)
```

---

## 4. SFTP File Upload (`uses: sftp`)

Transfers archived reports or assets to a remote server over secure SFTP/SSH.

### Connection Catalog Settings
* **host**: Remote SFTP server hostname.
* **port**: SSH port (default: `22`).
* **username**: SFTP user.
* **password**: Secure SSH password.

### Step Configuration Syntax
```yaml
steps:
  - name: Upload to Remote Server
    uses: sftp
    connection: sftp-storage
    with:
      file: "report_package.zip"
      destination: "/uploads/reports/users_report.zip"
```

---

## 5. End-to-End Workflow Pipeline Example

This pipeline connects all the actions to extract database metrics, convert them to Excel, package/compress them, upload via SFTP, and send an email alert to stakeholders:

```yaml
steps:
  - name: Extract SQL Query
    uses: sql
    connection: sqlite-local
    with:
      query: "SELECT * FROM deliveries WHERE status = 'delivered'"
      output_file: "success_logs.csv"

  - name: Compile Excel Worksheet
    uses: excel
    with:
      source: "success_logs.csv"
      output: "deliveries_summary.xlsx"
      sheet_name: "Delivered Logs"

  - name: Compress Summary Report
    uses: compress
    with:
      source: "deliveries_summary.xlsx"
      output: "deliveries_summary.zip"

  - name: SFTP Upload to Client Storage
    uses: sftp
    connection: client-sftp
    with:
      file: "deliveries_summary.zip"
      destination: "/var/www/reports/deliveries_summary.zip"

  - name: Email Delivery Status to Owner
    uses: gmail
    connection: workspaces-gmail-relay
    with:
      to: "admin@example.com"
      subject: "Nightly Deliveries Summary Report"
      body: "Please find attached the nightly report summary archive."
      attachments:
        - "deliveries_summary.zip"
```

