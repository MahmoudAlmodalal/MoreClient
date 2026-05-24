import urllib.request, json
from backend.core.config import settings as cfg
req = urllib.request.Request(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    data=json.dumps({
        "model": "deepseek-ai/deepseek-v4-pro",
        "messages": [{"role": "user", "content": "hello"}],
        "temperature": 1.0,
        "max_tokens": 100,
        "stream": True
    }).encode('utf-8'),
    headers={
        "Authorization": f"Bearer {cfg.NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
)
try:
    with urllib.request.urlopen(req, timeout=10) as response:
        print("Success:", response.readline().decode())
except Exception as e:
    print("Error:", e)
