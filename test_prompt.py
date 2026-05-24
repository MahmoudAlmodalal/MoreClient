import sys
sys.path.append('/home/mahmoud/Desktop/RAG/whatsapp_saas_RAG')
from dotenv import load_dotenv
load_dotenv('/home/mahmoud/Desktop/RAG/whatsapp_saas_RAG/.env')
from app.services.llm_orchestrator import SYSTEM_PROMPT_TEMPLATE
print("Successfully imported SYSTEM_PROMPT_TEMPLATE")
print(SYSTEM_PROMPT_TEMPLATE)
