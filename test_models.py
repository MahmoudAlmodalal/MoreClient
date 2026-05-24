import sys
sys.path.append('/home/mahmoud/Desktop/MoreClint')
from backend.core.config import settings as cfg
import urllib.request, json
req = urllib.request.Request("https://integrate.api.nvidia.com/v1/models", headers={"Authorization": f"Bearer {cfg.NVIDIA_API_KEY}"})
try:
    with urllib.request.urlopen(req, timeout=5) as response:
        models = json.loads(response.read().decode())
        print("Models:", [m['id'] for m in models.get('data', []) if 'deepseek' in m['id'].lower()])
except Exception as e:
    print("Error:", e)
