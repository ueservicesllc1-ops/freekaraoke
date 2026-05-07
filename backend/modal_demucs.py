"""
FreeKaraoke - Modal Demucs + Whisper Pipeline
Modelos:
  - Separación:    htdemucs_ft  (Hybrid Transformer Demucs, fine-tuned) — el mejor
  - Transcripción: whisper large-v3                                      — el mejor

Despliegue:
    modal deploy backend/modal_demucs.py

Prueba local:
    modal run backend/modal_demucs.py --audio-path cancion.mp3
"""

import io
import modal

# ---------------------------------------------------------------------------
# Imagen del contenedor con todas las dependencias
# ---------------------------------------------------------------------------
demucs_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libsndfile1")
    .pip_install(
        "demucs==4.0.1",
        "torch==2.2.2",
        "torchaudio==2.2.2",
        "soundfile",
        "numpy",
        "av",
        "dora-search",
        "faster-whisper",
        # Para el endpoint FastAPI
        "fastapi",
        "python-multipart",
    )
)

# ---------------------------------------------------------------------------
# Volumen para cachear pesos del modelo — evita descarga repetida
# ---------------------------------------------------------------------------
model_cache   = modal.Volume.from_name("demucs-model-cache",  create_if_missing=True)
whisper_cache = modal.Volume.from_name("whisper-model-cache", create_if_missing=True)

# ---------------------------------------------------------------------------
# App Modal
# ---------------------------------------------------------------------------
app = modal.App(
    name="freekaraoke-demucs",
    image=demucs_image,
)


# ---------------------------------------------------------------------------
# Clase GPU — Demucs (separación de pistas)
# ---------------------------------------------------------------------------
@app.cls(
    gpu="A10G",
    timeout=600,
    memory=8192,
    volumes={"/model_cache": model_cache},
    min_containers=0,
)
class DemucsService:

    @modal.enter()
    def load_model(self):
        import os
        import torch
        from demucs.pretrained import get_model

        os.environ["TORCH_HOME"]    = "/model_cache/torch"
        os.environ["XDG_CACHE_HOME"] = "/model_cache/xdg"

        print("Cargando htdemucs_ft...")
        self.model = get_model("htdemucs_ft")
        self.model.eval()

        device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(device)
        self.device = device
        print(f"Demucs listo en: {device}")

    @modal.method()
    def separate(self, audio_bytes: bytes, filename: str = "audio.mp3") -> dict:
        import io
        import os
        import tempfile
        import torch
        import torchaudio
        from demucs.apply import apply_model
        from demucs.audio import convert_audio

        print(f"Procesando Demucs: {filename}  ({len(audio_bytes)/1024/1024:.1f} MB)")

        suffix = os.path.splitext(filename)[-1] or ".mp3"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        waveform, sample_rate = torchaudio.load(tmp_path)
        os.unlink(tmp_path)

        waveform = convert_audio(
            waveform, sample_rate,
            self.model.samplerate, self.model.audio_channels,
        )
        waveform = waveform.to(self.device)

        with torch.no_grad():
            sources = apply_model(
                self.model,
                waveform.unsqueeze(0),
                device=self.device,
                shifts=1,
                split=True,
                overlap=0.25,
                progress=True,
            )[0]

        source_names = self.model.sources
        # Instrumental = todo excepto vocals
        no_vocals = sum(sources[i] for i, n in enumerate(source_names) if n != "vocals")

        stems = {n: sources[i].cpu() for i, n in enumerate(source_names)}
        stems["no_vocals"] = no_vocals.cpu()

        result = {}
        for name, tensor in stems.items():
            # Guardar temporalmente como WAV para que torchaudio lo entienda
            wav_buf = io.BytesIO()
            torchaudio.save(wav_buf, tensor, self.model.samplerate, format="wav")
            wav_buf.seek(0)
            
            # Convertir a MP3 usando ffmpeg directamente para máxima compatibilidad
            # Usamos un bitrate de 192k para un balance perfecto entre peso y calidad
            import subprocess
            
            # Crear archivos temporales para la conversion
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_tmp:
                wav_tmp.write(wav_buf.read())
                wav_tmp_path = wav_tmp.name
            
            mp3_tmp_path = wav_tmp_path.replace(".wav", ".mp3")
            
            try:
                subprocess.run([
                    "ffmpeg", "-y", "-i", wav_tmp_path, 
                    "-codec:a", "libmp3lame", "-b:a", "192k", 
                    mp3_tmp_path
                ], check=True, capture_output=True)
                
                with open(mp3_tmp_path, "rb") as f:
                    result[name] = f.read()
            finally:
                if os.path.exists(wav_tmp_path): os.unlink(wav_tmp_path)
                if os.path.exists(mp3_tmp_path): os.unlink(mp3_tmp_path)

        return result


# ---------------------------------------------------------------------------
# Clase GPU — Whisper large-v3 (transcripción + timestamps por palabra)
# ---------------------------------------------------------------------------
@app.cls(
    gpu="A10G",
    timeout=300,
    memory=16384,          # large-v3 necesita más VRAM
    volumes={"/whisper_cache": whisper_cache},
    min_containers=0,
)
class WhisperService:
    """Transcripción con Faster-Whisper large-v3 — máxima precisión."""

    @modal.enter()
    def load_model(self):
        from faster_whisper import WhisperModel
        import os

        print("Cargando Whisper large-v3 (mejor modelo)...")
        model_path = "/whisper_cache/large-v3"
        # int8 en A10G: rápido y preciso
        self.model = WhisperModel(
            "large-v3",
            device="cuda",
            compute_type="float16",
            download_root=model_path,
        )
        print("Whisper large-v3 listo.")

    @modal.method()
    def transcribe(self, audio_bytes: bytes, language: str = None) -> list:
        """
        Transcribe el audio y retorna lista de segmentos con timestamps.
        Cada segmento incluye 'words' con start/end por palabra para karaoke preciso.
        """
        import io
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        # beam_size=5 + word_timestamps para karaoke preciso
        kwargs = dict(beam_size=5, word_timestamps=True, vad_filter=True)
        if language:
            kwargs["language"] = language

        segments, info = self.model.transcribe(tmp_path, **kwargs)
        print(f"Idioma detectado: {info.language} (confianza: {info.language_probability:.2f})")

        results = []
        for segment in segments:
            words = []
            if segment.words:
                for w in segment.words:
                    words.append({
                        "start": round(w.start, 3),
                        "end":   round(w.end,   3),
                        "word":  w.word.strip(),
                    })

            results.append({
                "start":    round(segment.start, 3),
                "end":      round(segment.end,   3),
                "text":     segment.text.strip(),
                "words":    words,
                "language": info.language,
            })

        os.unlink(tmp_path)
        return results


# ---------------------------------------------------------------------------
# Endpoint HTTP Unificado
# ---------------------------------------------------------------------------
@app.function(
    gpu="A10G",
    timeout=900,           # suficiente para canción larga
    volumes={"/model_cache": model_cache, "/whisper_cache": whisper_cache},
)
@modal.fastapi_endpoint(method="POST", label="freekaraoke-process")
async def process_endpoint(request: dict) -> dict:
    """
    Endpoint unificado:
      action="separate"   → separar pistas con Demucs htdemucs_ft
      action="transcribe" → transcribir vocals con Whisper large-v3
      action="full"       → separar + transcribir en un solo llamado
    """
    import base64

    action    = request.get("action", "separate")
    audio_b64 = request.get("audio_b64")

    if not audio_b64:
        return {"success": False, "error": "Falta audio_b64"}

    audio_bytes = base64.b64decode(audio_b64)

    # ── Separación de pistas ─────────────────────────────────────────────────
    if action == "separate":
        filename = request.get("filename", "audio.mp3")
        service  = DemucsService()
        stems    = service.separate.remote(audio_bytes, filename)
        return {
            "success": True,
            "stems":   {name: base64.b64encode(data).decode() for name, data in stems.items()},
        }

    # ── Transcripción de letras ──────────────────────────────────────────────
    elif action == "transcribe":
        language = request.get("language")   # None = detección automática
        service  = WhisperService()
        lyrics   = service.transcribe.remote(audio_bytes, language)
        return {"success": True, "lyrics": lyrics}

    # ── Pipeline completo: separar + transcribir ─────────────────────────────
    elif action == "full":
        filename = request.get("filename", "audio.mp3")
        language = request.get("language")

        demucs_svc  = DemucsService()
        whisper_svc = WhisperService()

        # Separar pistas
        stems = demucs_svc.separate.remote(audio_bytes, filename)

        # Transcribir solo los vocals
        vocals_bytes = stems.get("vocals", b"")
        lyrics       = whisper_svc.transcribe.remote(vocals_bytes, language) if vocals_bytes else []

        return {
            "success": True,
            "stems":   {name: base64.b64encode(data).decode() for name, data in stems.items()},
            "lyrics":  lyrics,
        }

    return {"success": False, "error": "Acción no válida. Usa: separate | transcribe | full"}


# ---------------------------------------------------------------------------
# Entrypoint local para pruebas
# ---------------------------------------------------------------------------
@app.local_entrypoint()
def main(audio_path: str = ""):
    import os
    if not audio_path or not os.path.exists(audio_path):
        print("Uso: modal run backend/modal_demucs.py --audio-path /ruta/audio.mp3")
        return

    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    print("--- Test Separación (htdemucs_ft) ---")
    demucs = DemucsService()
    stems  = demucs.separate.remote(audio_bytes, os.path.basename(audio_path))
    print(f"Separado en {len(stems)} pistas: {list(stems.keys())}")

    print("\n--- Test Transcripción Whisper large-v3 ---")
    whisper = WhisperService()
    lyrics  = whisper.transcribe.remote(stems["vocals"])
    for seg in lyrics[:5]:
        print(f"[{seg['start']:.2f} - {seg['end']:.2f}] {seg['text']}")
        if seg.get("words"):
            for w in seg["words"][:4]:
                print(f"    {w['word']}  ({w['start']:.2f}s)")
