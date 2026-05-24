import sys
sys.path.append('/home/mahmoud/Desktop/MoreClint')
from backend.core.config import settings as cfg
print("NVIDIA_API_KEY:", bool(cfg.NVIDIA_API_KEY))
from openai import OpenAI
client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=cfg.NVIDIA_API_KEY
)
try:
    resp = client.chat.completions.create(
        model=cfg.CHAT_MODEL,
        messages=[{"role": "user", "content": "hello"}],
        temperature=1.0,
        top_p=0.95,
        max_tokens=16384,
        extra_body={"chat_template_kwargs": {"thinking": False}},
        stream=False
    )
    print("Success:", resp.choices[0].message.content)
except Exception as e:
    import traceback
    traceback.print_exc()
