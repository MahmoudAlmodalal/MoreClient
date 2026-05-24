import sys
sys.path.append('/home/mahmoud/Desktop/MoreClint')
from backend.core.config import settings as cfg
from openai import OpenAI
client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=cfg.NVIDIA_API_KEY
)
try:
    resp = client.chat.completions.create(
        model="deepseek-ai/deepseek-v4-pro",
        messages=[{"role": "user", "content": "hi"}],
        temperature=1.0,
        top_p=0.95,
        max_tokens=100,
        extra_body={"chat_template_kwargs": {"thinking": False}},
        stream=True
    )
    print("Stream starting...")
    for chunk in resp:
        if chunk.choices and chunk.choices[0].delta.content:
            sys.stdout.write(chunk.choices[0].delta.content)
            sys.stdout.flush()
    print("\nDone")
except Exception as e:
    import traceback
    traceback.print_exc()
