"""
Storage Routes — Backblaze B2
Proporciona URLs firmadas para subir y descargar archivos de fondo de karaoke.
"""
import os
import time
import hmac
import hashlib
import base64
import requests
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from utils.auth import get_current_user
from services.b2_storage import b2_storage

router = APIRouter(prefix="/api/storage", tags=["storage"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _safe_path(user_id: str, filename: str) -> str:
    """Construye una ruta segura dentro del bucket para el usuario."""
    safe_name = "".join(c for c in filename if c.isalnum() or c in ".-_")
    return f"backgrounds/{user_id}/{int(time.time())}_{safe_name}"


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/storage/url/{filename}
# Devuelve la URL pública para un archivo ya subido
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/url/{filename:path}")
async def get_file_url(filename: str, user: dict = Depends(get_current_user)):
    """
    Devuelve la URL pública de un archivo en B2.
    El filename debe ser la ruta relativa dentro del bucket, e.g.:
    backgrounds/uid/1234567890_photo.jpg
    """
    try:
        url = b2_storage.get_public_url(filename)
        return {"url": url, "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener URL: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/storage/upload-url/{filename}?contentType=image/jpeg
# Genera una URL pre-firmada para subida directa desde el browser a B2
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/upload-url/{filename:path}")
async def get_upload_url(
    filename: str,
    contentType: str = "application/octet-stream",
    user: dict = Depends(get_current_user),
):
    """
    Genera una URL pre-firmada de subida directa a Backblaze B2.
    El cliente sube el archivo directamente con PUT a esa URL.
    Devuelve:
      - uploadUrl:    URL para el PUT
      - publicUrl:    URL pública final del archivo tras la subida
      - remotePath:   ruta dentro del bucket
    """
    if not b2_storage.bucket:
        raise HTTPException(status_code=503, detail="B2 storage no configurado")

    try:
        remote_path = _safe_path(user["uid"], filename)

        # Obtener upload URL desde B2
        upload_auth = b2_storage.bucket.get_upload_url()

        # Las credenciales que necesita el frontend para hacer el PUT
        # Usamos la API nativa de B2 (no S3) — el frontend hará el POST
        # directamente a la URL de B2
        return {
            "uploadUrl": upload_auth.upload_url,
            "authorizationToken": upload_auth.auth_token,
            "remotePath": remote_path,
            "publicUrl": b2_storage.get_public_url(remote_path),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar upload URL: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/storage/upload-background
# El backend sube la imagen por el cliente (más simple que URL firmada B2 nativa)
# ─────────────────────────────────────────────────────────────────────────────
from fastapi import UploadFile, File
import tempfile

@router.post("/upload-background")
async def upload_background(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """
    Sube una imagen de fondo al bucket B2.
    El frontend envía el archivo con multipart/form-data.
    Devuelve la URL pública permanente.
    """
    # Validar tipo
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Usa JPG, PNG o WEBP.")

    # Validar tamaño (max 10 MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo es demasiado grande (máx. 10 MB).")

    if not b2_storage.bucket:
        raise HTTPException(status_code=503, detail="B2 storage no configurado. Revisa las credenciales B2.")

    try:
        # Guardar temp y subir
        ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
        remote_path = f"backgrounds/{user['uid']}/{int(time.time())}.{ext}"

        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        public_url = b2_storage.upload_file(tmp_path, remote_path)

        # Limpiar temporal
        os.unlink(tmp_path)

        return {
            "success": True,
            "publicUrl": public_url,
            "remotePath": remote_path,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir imagen: {e}")
