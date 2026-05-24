import sys
sys.path.append('/home/mahmoud/Desktop/MoreClint')
from backend.core.config import settings as cfg
from openai import OpenAI
client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=cfg.NVIDIA_API_KEY,
    timeout=5.0
)
try:
    resp = client.chat.completions.create(
        model="deepseek-ai/deepseek-v4-pro",
        messages=[{"role": "user", "content": "hi"}],
        temperature=1.0,
        top_p=0.95,
        max_tokens=100,
        extra_body={"chat_template_kwargs": {"thinking": False}},
        stream=False
    )
    print("Success small:", resp.choices[0].message.content)
except Exception as e:
    import traceback
    traceback.print_exc()
