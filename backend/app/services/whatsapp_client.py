import json
import urllib.request
import urllib.error
from app.config import settings


class WhatsAppClient:
    def __init__(self):
        self.base_url = f"https://graph.facebook.com/{settings.whatsapp_api_version}"
        self.phone_number_id = settings.whatsapp_phone_number_id
        self.token = settings.whatsapp_access_token
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    def _request(self, method: str, path: str, data: dict = None):
        url = f"{self.base_url}/{path}"
        body = json.dumps(data).encode() if data else None
        req = urllib.request.Request(url, data=body, headers=self.headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            return {"error": True, "status": e.code, "body": e.read().decode()[:1000]}
        except Exception as e:
            return {"error": True, "message": str(e)}

    def get_media_url(self, media_id: str) -> str:
        result = self._request("GET", media_id)
        if result.get("error"):
            raise ValueError(f"Failed to get media URL: {result}")
        return result.get("url")

    def download_media(self, media_id: str) -> bytes:
        media_url = self.get_media_url(media_id)
        req = urllib.request.Request(media_url, headers={"Authorization": f"Bearer {self.token}"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read()

    def send_message(self, to: str, text: str, preview_url: bool = False):
        data = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"body": text, "preview_url": preview_url},
        }
        return self._request("POST", f"{self.phone_number_id}/messages", data)

    def send_reaction(self, to: str, message_id: str, emoji: str):
        data = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "reaction",
            "reaction": {"message_id": message_id, "emoji": emoji},
        }
        return self._request("POST", f"{self.phone_number_id}/messages", data)


whatsapp_client = WhatsAppClient()
