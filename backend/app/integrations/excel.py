import csv
import json
from app.integrations.base import Channel, ChannelError, ConfigField, DeliveryResult, OutboundMessage
from app.core.storage import safe_join
import openpyxl

class ExcelChannel(Channel):
    type = "excel"
    label = "Excel Generator"
    supports_attachments = False
    supports_subject = False
    supports_html = False
    send_hint = "source, output_file"
    config_fields = []

    def __init__(self, config: dict[str, str]) -> None:
        pass

    def send(self, message: OutboundMessage) -> DeliveryResult:
        source = message.params.get("source")
        output_file = message.params.get("output_file") or message.params.get("output")
        if not source:
            raise ChannelError("source file is required")
        if not output_file:
            raise ChannelError("output_file path is required")
            
        if not message.workspace_id:
            raise ChannelError("Workspace ID is required")

        source_path = safe_join(message.workspace_id, source)
        output_path = safe_join(message.workspace_id, output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if not source_path.is_file():
            raise ChannelError(f"Source file not found: {source}")

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Data"

        try:
            if source.endswith(".json"):
                data = json.loads(source_path.read_text(encoding="utf-8"))
                if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
                    headers = list(data[0].keys())
                    ws.append(headers)
                    for item in data:
                        ws.append([item.get(h) for h in headers])
                else:
                    raise ChannelError("JSON data must be a list of objects")
            else:
                with open(source_path, newline="", encoding="utf-8") as f:
                    reader = csv.reader(f)
                    for row in reader:
                        ws.append(row)
            wb.save(str(output_path))
        except Exception as e:
            raise ChannelError(f"Excel generation failed: {e}")

        return DeliveryResult(True, f"Generated Excel from {source} to {output_file}")
