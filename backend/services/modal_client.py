"""
Cliente Modal para FreeKaraoke - Modal SDK 1.4.1
Usa modal.Function.from_name() para llamar directamente a funciones GPU,
evitando el limite de 4MB del endpoint HTTP.
"""

import os
import tempfile
from pathlib import Path


MODAL_APP_NAME = "freekaraoke-demucs"


def process_full_karaoke_with_modal(audio_file_path: str, karaoke_id: str) -> dict:
    """
    Pipeline unificado: llama funciones Modal via Python SDK (sin limite de tamano).
    """
    import modal

    print(f"[Modal] Leyendo archivo: {audio_file_path}")
    with open(audio_file_path, "rb") as f:
        audio_bytes = f.read()

    filename = os.path.basename(audio_file_path)
    size_mb = len(audio_bytes) / 1024 / 1024
    print(f"[Modal] Enviando {size_mb:.1f} MB a DemucsService via SDK (sin limite HTTP)...")

    # Usar from_name() - API correcta para Modal SDK 1.4.1
    DemucsService = modal.Cls.from_name(MODAL_APP_NAME, "DemucsService")
    demucs = DemucsService()
    stems_bytes = demucs.separate.remote(audio_bytes, filename)

    vocals_bytes = stems_bytes.get("vocals", b"")

    print(f"[Modal] Separacion completa. Enviando vocals a WhisperService...")
    WhisperService = modal.Cls.from_name(MODAL_APP_NAME, "WhisperService")
    whisper = WhisperService()
    lyrics = whisper.transcribe.remote(vocals_bytes) if vocals_bytes else []

    print(f"[Modal] IA completada. Guardando {len(stems_bytes)} stems en disco...")

    output_dir = Path(tempfile.gettempdir()) / f"demucs_{karaoke_id}"
    output_dir.mkdir(parents=True, exist_ok=True)

    stem_paths = {}
    for stem_name, stem_data in stems_bytes.items():
        out_path = output_dir / f"{stem_name}.mp3"
        with open(out_path, "wb") as f:
            f.write(stem_data)
        stem_paths[stem_name] = str(out_path)
        print(f"[Modal] Guardado: {stem_name}.mp3 ({len(stem_data)/1024/1024:.1f} MB)")

    return {
        "stem_paths": stem_paths,
        "lyrics":     lyrics,
    }


def separate_audio_with_modal(audio_file_path: str, karaoke_id: str) -> dict:
    """Solo separacion, sin transcripcion."""
    import modal

    with open(audio_file_path, "rb") as f:
        audio_bytes = f.read()

    filename = os.path.basename(audio_file_path)
    print(f"[Modal] Enviando {len(audio_bytes)/1024/1024:.1f} MB a DemucsService...")

    DemucsService = modal.Cls.from_name(MODAL_APP_NAME, "DemucsService")
    demucs = DemucsService()
    stems_bytes = demucs.separate.remote(audio_bytes, filename)

    output_dir = Path(tempfile.gettempdir()) / f"demucs_{karaoke_id}"
    output_dir.mkdir(parents=True, exist_ok=True)

    stem_paths = {}
    for stem_name, stem_data in stems_bytes.items():
        out_path = output_dir / f"{stem_name}.mp3"
        with open(out_path, "wb") as f:
            f.write(stem_data)
        stem_paths[stem_name] = str(out_path)

    return stem_paths


def transcribe_audio_with_modal(audio_file_path: str) -> list:
    """Solo transcripcion con Whisper."""
    import modal

    with open(audio_file_path, "rb") as f:
        audio_bytes = f.read()

    WhisperService = modal.Cls.from_name(MODAL_APP_NAME, "WhisperService")
    whisper = WhisperService()
    return whisper.transcribe.remote(audio_bytes)


def cleanup_stems(stem_paths: dict):
    """Elimina archivos WAV temporales."""
    for path in stem_paths.values():
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception as e:
            print(f"[Modal] Advertencia al limpiar {path}: {e}")
    if stem_paths:
        parent = Path(list(stem_paths.values())[0]).parent
        try:
            if parent.exists() and not any(parent.iterdir()):
                parent.rmdir()
        except Exception:
            pass
