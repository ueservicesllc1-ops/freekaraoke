from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
import os

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifica el token de Firebase enviado en el header Authorization: Bearer <token>
    """
    token = credentials.credentials
    try:
        # Verificar el token con Firebase Admin SDK
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(
            status_code=401,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
