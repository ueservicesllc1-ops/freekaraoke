import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

# Cargar .env desde la raíz si no existe localmente
if os.path.exists("../.env"):
    load_dotenv("../.env")
else:
    load_dotenv()

def initialize_firebase():
    if not firebase_admin._apps:
        # Prioridad 1: Service Account completo
        private_key = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")
        project_id = os.getenv("FIREBASE_PROJECT_ID") or os.getenv("VITE_FIREBASE_PROJECT_ID")
        client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
        
        if project_id and private_key and client_email:
            print(f"Initializing Firebase Admin with Service Account for project: {project_id}")
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": project_id,
                "private_key": private_key,
                "client_email": client_email,
                "token_uri": "https://oauth2.googleapis.com/token",
            })
            firebase_admin.initialize_app(cred)
        elif project_id:
            print(f"Initializing Firebase Admin with Project ID only: {project_id}")
            # Si solo tenemos el project_id, intentamos inicializar así (útil para auth simple)
            firebase_admin.initialize_app(options={'projectId': project_id})
        else:
            print("Warning: No Firebase configuration found. Auth will fail.")
            try:
                firebase_admin.initialize_app()
            except:
                pass

    return firestore.client()

db = initialize_firebase()
