import os
import sys
from dotenv import load_dotenv

# Añadir el directorio actual al path para importar servicios
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.karaoke_service import karaoke_service
from services.firestore_service import db

def test_full_pipeline():
    print("--- Iniciando Test de Pipeline ---")
    
    # 1. URL de prueba (Cartoon - On & On - NCS)
    test_url = "https://www.youtube.com/watch?v=K4DyBUG242c" 
    test_user_id = "test_user_123"
    
    try:
        # 2. Crear entrada en Firestore
        print(f"\n[1/3] Creando entrada pendiente para: {test_url}")
        result = karaoke_service.create_pending_karaoke(test_url, test_user_id)
        karaoke_id = result["karaokeId"]
        print(f"[OK] Creado con ID: {karaoke_id}")
        
        # 3. Ejecutar procesamiento
        print(f"\n[2/3] Iniciando procesamiento (esto puede tardar unos minutos)...")
        karaoke_service.process_karaoke(karaoke_id)
        
        # 4. Verificar resultado en Firestore
        print(f"\n[3/3] Verificando resultado final...")
        doc = db.collection("karaokes").document(karaoke_id).get()
        if doc.exists:
            data = doc.to_dict()
            print(f"Estado final: {data.get('status')}")
            if data.get('status') == 'ready':
                print(f"[OK] URLs generadas:")
                print(f"   - Audio: {data.get('audioUrl')}")
                print(f"   - Vocales: {data.get('vocalsUrl')}")
                print(f"   - Instrumental: {data.get('instrumentalUrl')}")
            else:
                print(f"[ERROR] El proceso no termino en 'ready'. Estado: {data.get('status')}")
                print(f"   Error: {data.get('error')}")
        else:
            print("[ERROR] El documento no existe en Firestore.")

    except Exception as e:
        print(f"Error durante el test: {e}")

if __name__ == "__main__":
    test_full_pipeline()
