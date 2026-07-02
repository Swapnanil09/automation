import paramiko
from app.integrations.base import Channel, ChannelError, ConfigField, DeliveryResult, OutboundMessage
from app.core.storage import safe_join
import io

class SftpChannel(Channel):
    type = "sftp"
    label = "SFTP connection"
    supports_attachments = False
    supports_subject = False
    supports_html = False
    send_hint = "source, target_path"
    
    config_fields = [
        ConfigField("host", "SFTP Host", placeholder="sftp.example.com"),
        ConfigField("port", "SFTP Port", required=False, placeholder="22"),
        ConfigField("username", "SFTP Username"),
        ConfigField("password", "SFTP Password", required=False, secret=True),
        ConfigField("key", "Private Key", required=False, secret=True, placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."),
    ]

    def __init__(self, config: dict[str, str]) -> None:
        self.host = config.get("host") or ""
        port_val = config.get("port")
        self.port = int(port_val) if port_val else 22
        self.username = config.get("username") or ""
        self.password = config.get("password")
        self.key = config.get("key")

    def send(self, message: OutboundMessage) -> DeliveryResult:
        source = message.params.get("source")
        target_path = message.params.get("target_path") or message.params.get("target")
        if not source:
            raise ChannelError("source is required")
        if not target_path:
            raise ChannelError("target_path is required")
        if not message.workspace_id:
            raise ChannelError("Workspace ID is required")

        source_path = safe_join(message.workspace_id, source)
        if not source_path.is_file():
            raise ChannelError(f"Source file not found: {source}")

        if not self.host or self.host in {"mock", "sftp.mock"}:
            try:
                mock_dest = safe_join(message.workspace_id, f"mock_sftp/{target_path.lstrip('/')}")
                mock_dest.parent.mkdir(parents=True, exist_ok=True)
                import shutil
                shutil.copy2(str(source_path), str(mock_dest))
                return DeliveryResult(True, f"SFTP Mock uploaded {source} to mock_sftp/{target_path}")
            except Exception as e2:
                raise ChannelError(f"SFTP Mock failed: {e2}")

        try:
            transport = paramiko.Transport((self.host, self.port))
            
            if self.key:
                try:
                    pkey = paramiko.RSAKey.from_private_key(io.StringIO(self.key))
                except Exception:
                    try:
                        pkey = paramiko.Ed25519Key.from_private_key(io.StringIO(self.key))
                    except Exception as e:
                        raise ChannelError(f"Could not load SSH key (RSA/Ed25519): {e}")
                transport.connect(username=self.username, pkey=pkey)
            else:
                transport.connect(username=self.username, password=self.password)
                
            sftp = paramiko.SFTPClient.from_transport(transport)
            sftp.put(str(source_path), target_path)
            sftp.close()
            transport.close()
        except Exception as e:
            raise ChannelError(f"SFTP upload failed: {e}")

        return DeliveryResult(True, f"Uploaded {source} to SFTP {self.host}:{target_path}")
