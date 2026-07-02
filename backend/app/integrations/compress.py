import zipfile
import gzip
import tarfile
import shutil
from app.integrations.base import Channel, ChannelError, ConfigField, DeliveryResult, OutboundMessage
from app.core.storage import safe_join

class CompressChannel(Channel):
    type = "compress"
    label = "File Compressor"
    supports_attachments = False
    supports_subject = False
    supports_html = False
    send_hint = "source, output_file, format"
    config_fields = []

    def __init__(self, config: dict[str, str]) -> None:
        pass

    def send(self, message: OutboundMessage) -> DeliveryResult:
        source = message.params.get("source")
        output_file = message.params.get("output_file") or message.params.get("output")
        fmt = message.params.get("format") or "zip"
        if not source:
            raise ChannelError("source is required")
        if not output_file:
            raise ChannelError("output_file is required")
        if not message.workspace_id:
            raise ChannelError("Workspace ID is required")

        source_path = safe_join(message.workspace_id, source)
        output_path = safe_join(message.workspace_id, output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if not source_path.exists():
            raise ChannelError(f"Source not found: {source}")

        try:
            if fmt == "zip":
                if source_path.is_dir():
                    shutil.make_archive(str(output_path).replace(".zip", ""), "zip", root_dir=str(source_path))
                else:
                    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                        zipf.write(source_path, arcname=source_path.name)
            elif fmt == "gzip":
                if source_path.is_dir():
                    raise ChannelError("GZIP does not support directories. Use zip or tar instead.")
                with open(source_path, "rb") as f_in:
                    with gzip.open(output_path, "wb") as f_out:
                        shutil.copyfileobj(f_in, f_out)
            elif fmt == "tar":
                with tarfile.open(output_path, "w:gz" if output_file.endswith(".tar.gz") else "w") as tar:
                    tar.add(source_path, arcname=source_path.name)
            else:
                raise ChannelError(f"Unsupported compress format: {fmt}")
        except Exception as e:
            raise ChannelError(f"Compression failed: {e}")

        return DeliveryResult(True, f"Compressed {source} to {output_file}")
