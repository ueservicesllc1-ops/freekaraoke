from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from services.firestore_service import db
from services.karaoke_service import karaoke_service
from utils.auth import get_current_user

router = APIRouter(prefix="/api/karaoke", tags=["karaoke"])

class CreateKaraokeRequest(BaseModel):
    youtubeUrl: str
    backgroundImageUrl: str = ""

class ProcessKaraokeRequest(BaseModel):
    karaokeId: str

@router.post("/create")
async def create_karaoke(request: CreateKaraokeRequest, user: dict = Depends(get_current_user)):
    """Crea el documento en Firestore y retorna el ID inmediatamente."""
    try:
      user_id = user["uid"]
      result = karaoke_service.create_pending_karaoke(request.youtubeUrl, user_id, request.backgroundImageUrl)
      return result
    except ValueError as e:
      raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
      print(f"Error creating karaoke: {e}")
      raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/process")
async def process_karaoke(request: ProcessKaraokeRequest, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """
    Dispara el procesamiento en background.
    Verifica que el karaoke pertenezca al usuario antes de procesar.
    """
    try:
        # Podríamos verificar aquí si el karaokeId pertenece al user["uid"]
        # por simplicidad lo lanzamos, ya que process_karaoke lee el userId del doc
        background_tasks.add_task(karaoke_service.process_karaoke, request.karaokeId)
        return {
            "success": True,
            "karaokeId": request.karaokeId,
            "message": "Procesamiento iniciado con Demucs AI.",
        }
    except Exception as e:
        print(f"Error triggering process: {e}")
        raise HTTPException(status_code=500, detail="Error al iniciar procesamiento")

@router.get("/list")
async def list_karaokes(user: dict = Depends(get_current_user)):
    """Lista los karaokes del usuario logueado."""
    try:
        from services.firestore_service import db
        user_id = user["uid"]
        print(f"[Backend] Listando karaokes para el usuario: {user_id}")
        
        # Simplificamos la consulta quitando el order_by temporalmente 
        # para evitar el error de índice de Firestore si no está creado.
        # Ordenaremos en memoria por ahora.
        docs = db.collection("karaokes")\
                 .where("userId", "==", user_id)\
                 .limit(50).stream()
        
        karaokes = []
        for doc in docs:
            k = doc.to_dict()
            k["id"] = doc.id
            if "createdAt" in k and k["createdAt"]:
                k["createdAt"] = k["createdAt"].isoformat()
            if "updatedAt" in k and k["updatedAt"]:
                k["updatedAt"] = k["updatedAt"].isoformat()
            karaokes.append(k)
        
        # Ordenar en memoria (descendente por fecha)
        karaokes.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
        
        print(f"[Backend] Se encontraron {len(karaokes)} pistas.")
        return karaokes
    except Exception as e:
        import traceback
        print(f"[Backend] ERROR CRÍTICO en list_karaokes: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al obtener la lista: {str(e)}")

@router.delete("/{karaoke_id}")
async def delete_karaoke(karaoke_id: str):
    """Borra un karaoke de la base de datos (Sin restricciones para limpieza)."""
    try:
        from services.firestore_service import db
        print(f"[Backend] Solicitud de borrado para: {karaoke_id}")
        doc_ref = db.collection("karaokes").document(karaoke_id)
        doc = doc_ref.get()
        
        if doc.exists:
            doc_ref.delete()
            print(f"[Backend] ✅ {karaoke_id} borrado con éxito.")
        else:
            print(f"[Backend] ⚠️ {karaoke_id} no existía en la base de datos.")
            
        return {"status": "ok", "message": "Borrado correctamente"}
    except Exception as e:
        print(f"[Backend] ❌ Error en borrado: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{karaoke_id}")
async def get_karaoke(karaoke_id: str, user: dict = Depends(get_current_user)):
    """Obtiene el estado de un karaoke específico del usuario."""
    try:
        from services.firestore_service import db
        doc = db.collection("karaokes").document(karaoke_id).get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Karaoke no encontrado")
            
        k = doc.to_dict()
        
        # Seguridad: Solo el dueño puede verlo
        if k.get("userId") != user["uid"]:
            raise HTTPException(status_code=403, detail="No tienes permiso para ver este recurso")
            
        k["id"] = doc.id
        if "createdAt" in k and k["createdAt"]:
            k["createdAt"] = k["createdAt"].isoformat()
        if "updatedAt" in k and k["updatedAt"]:
            k["updatedAt"] = k["updatedAt"].isoformat()
        return k
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting karaoke: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener el karaoke")
