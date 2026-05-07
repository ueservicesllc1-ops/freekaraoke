import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes import karaoke_routes, storage_routes

# Cargar .env desde la raíz si no existe en /backend
if os.path.exists("../.env"):
    load_dotenv("../.env")
else:
    load_dotenv()

app = FastAPI(title="freeKaraoke IA API")

# Configurar CORS
origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar rutas
app.include_router(karaoke_routes.router)
app.include_router(storage_routes.router)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    print(f"GLOBAL ERROR: {exc}")
    traceback.print_exc()
    return {
        "error": str(exc),
        "traceback": traceback.format_exc(),
        "status": "error"
    }

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
