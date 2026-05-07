from services.firestore_service import db
from datetime import datetime

print("--- REVISANDO ESTADO DE KARAOKES ---")
docs = db.collection("karaokes").order_by("createdAt", direction="DESCENDING").limit(5).stream()

for doc in docs:
    k = doc.to_dict()
    print(f"ID: {doc.id}")
    print(f"Título: {k.get('title')}")
    print(f"Estado: {k.get('status')}")
    print(f"Creado: {k.get('createdAt')}")
    if k.get('error'):
        print(f"ERROR: {k.get('error')}")
    print("-" * 30)
