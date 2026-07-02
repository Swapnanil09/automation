import sqlite3
import json
import csv
from app.integrations.base import Channel, ChannelError, ConfigField, DeliveryResult, OutboundMessage
from app.core.storage import safe_join

class SqlChannel(Channel):
    type = "sql"
    label = "SQL DB connection"
    supports_attachments = False
    supports_subject = False
    supports_html = False
    send_hint = "query, output_file"
    
    config_fields = [
        ConfigField("db_type", "Database Type (sqlite/postgres)", placeholder="sqlite"),
        ConfigField("db_path", "SQLite Database Path (relative to workspace)", required=False, placeholder="data.db"),
        ConfigField("host", "Postgres Host", required=False, placeholder="localhost"),
        ConfigField("port", "Postgres Port", required=False, placeholder="5432"),
        ConfigField("username", "Postgres Username", required=False),
        ConfigField("password", "Postgres Password", required=False, secret=True),
        ConfigField("database", "Postgres Database name", required=False),
    ]

    def __init__(self, config: dict[str, str]) -> None:
        self.db_type = config.get("db_type") or "sqlite"
        self.db_path = config.get("db_path") or "data.db"
        self.host = config.get("host")
        self.port = config.get("port")
        self.username = config.get("username")
        self.password = config.get("password")
        self.database = config.get("database")

    def send(self, message: OutboundMessage) -> DeliveryResult:
        query = message.params.get("query")
        output_file = message.params.get("output_file") or message.params.get("output")
        if not query:
            raise ChannelError("SQL query is required")
        if not output_file:
            raise ChannelError("output_file parameter is required")
        
        if not message.workspace_id:
            raise ChannelError("Workspace ID is required")
            
        target_path = safe_join(message.workspace_id, output_file)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        
        if self.db_type == "sqlite":
            db_file = safe_join(message.workspace_id, self.db_path)
            db_file.parent.mkdir(parents=True, exist_ok=True)
            try:
                conn = sqlite3.connect(str(db_file))
                cursor = conn.cursor()
                cursor.execute(query)
                columns = [col[0] for col in cursor.description] if cursor.description else []
                rows = cursor.fetchall()
                conn.commit()
                conn.close()
            except Exception as e:
                raise ChannelError(f"SQLite execution failed: {e}")
        else:
            import psycopg2
            try:
                conn = psycopg2.connect(
                    host=self.host,
                    port=self.port or 5432,
                    user=self.username,
                    password=self.password,
                    database=self.database
                )
                cursor = conn.cursor()
                cursor.execute(query)
                columns = [col[0] for col in cursor.description] if cursor.description else []
                rows = cursor.fetchall()
                conn.commit()
                conn.close()
            except Exception as e:
                raise ChannelError(f"Postgres execution failed: {e}")

        try:
            if output_file.endswith(".json"):
                data = [dict(zip(columns, row)) for row in rows]
                target_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
            else:
                with open(target_path, "w", newline="", encoding="utf-8") as f:
                    writer = csv.writer(f)
                    if columns:
                        writer.writerow(columns)
                    writer.writerows(rows)
        except Exception as e:
            raise ChannelError(f"Failed to write results: {e}")

        return DeliveryResult(True, f"Executed SQL query, results written to {output_file}")
