import sys
import os
sys.path.append(os.getcwd())
from backend.models.database import SessionLocal
from backend.models.tables import Setting
from backend.core import crypto

db = SessionLocal()
s = db.query(Setting).first()
if s:
    print("Stored token:", s.telegram_token)
    print("Decrypted token:", crypto.decrypt(s.telegram_token))
else:
    print("No setting")
db.close()
