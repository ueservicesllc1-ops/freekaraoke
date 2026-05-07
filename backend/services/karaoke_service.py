import uuid
from datetime import datetime
from services.firestore_service import db
from services.youtube_service import youtube_service
from services.b2_storage import b2_storage
import os


class KaraokeService:
    def create_pending_karaoke(self, youtube_url: str, user_id: str, background_image_url: str = ""):
        """
        Obtiene metadata de YouTube, crea documento en Firestore y retorna el ID.
        """
        import re
        info = youtube_service.get_info(youtube_url)
        if not info:
            raise ValueError("No se pudo obtener información del video. Verifica el link.")

        # --- Limpieza inteligente de metadatos ---
        raw_title = info["title"]
        raw_artist = info["artist"]
        
        # 1. Eliminar prefijos de Mix
        clean_title = re.sub(r"^(?i)Mix\s*-\s*", "", raw_title)
        
        # 2. Intentar separar Artista - Título
        # Buscamos guiones largos, cortos o pipes
        separators = [r" - ", r" – ", r" — ", r" \| "]
        split_pattern = "|".join(separators)
        
        final_title = clean_title
        final_artist = raw_artist

        if re.search(split_pattern, clean_title):
            parts = re.split(split_pattern, clean_title, 1)
            if len(parts) == 2:
                t_artist = parts[0].strip()
                t_title = parts[1].strip()
                
                # Si el artista actual es genérico o desconocido, usamos el del título
                generic_names = ["unknown", "vevo", "official", "karaoke", "topic", "channel", "music"]
                if not final_artist or any(g in final_artist.lower() for g in generic_names):
                    final_artist = t_artist
                
                final_title = t_title

        # 3. Limpieza final de tags
        final_title = final_title.replace("mx ", "").replace("MX ", "").replace("Mx ", "").strip()
        final_title = re.sub(r"(?i)\s*\[.*?\]", "", final_title) # Eliminar [Official Video] etc
        final_title = re.sub(r"(?i)\s*\(.*?\)", "", final_title).strip() # Eliminar (Lyrics) etc
        
        # Limpiar el artista de sufijos de YouTube como " - Topic"
        final_artist = re.sub(r"(?i)\s*-\s*Topic", "", final_artist).strip()

        karaoke_id = str(uuid.uuid4())

        karaoke_data = {
            "id":                 karaoke_id,
            "userId":             user_id,
            "youtubeUrl":         youtube_url,
            "youtubeVideoId":     self._extract_video_id(youtube_url),
            "title":              final_title or clean_title,
            "artist":             final_artist or "AI Artist",
            "thumbnail":          info["thumbnail"],
            "duration":           self._format_duration(info["duration"]),
            "durationSeconds":    info["duration"],
            "status":             "pending",
            "createdAt":          datetime.utcnow(),
            "updatedAt":          datetime.utcnow(),
            "audioUrl":           "",
            "vocalsUrl":          "",
            "instrumentalUrl":    "",
            "lyrics":             [],
            "language":           "",
            "backgroundImageUrl": background_image_url,
        }

        db.collection("karaokes").document(karaoke_id).set(karaoke_data)

        return {
            "success":   True,
            "karaokeId": karaoke_id,
            "message":   "Karaoke creado y en cola de procesamiento",
        }

    def process_karaoke(self, karaoke_id: str):
        """
        Pipeline completo:
        1. Descargar audio de YouTube
        2. Separar pistas con Demucs htdemucs_ft en Modal (GPU)
        3. Transcribir vocals con Whisper large-v3 en Modal (GPU)
        4. Subir todas las pistas + audio completo a Backblaze B2
        5. Guardar lyrics + URLs en Firestore → status = 'ready'
        """
        doc_ref = db.collection("karaokes").document(karaoke_id)
        doc     = doc_ref.get()
        if not doc.exists:
            print(f"[KaraokeService] ❌ No existe documento {karaoke_id}")
            return

        data       = doc.to_dict()
        youtube_url = data["youtubeUrl"]
        user_id     = data["userId"]

        local_audio = None
        stem_paths  = {}

        try:
            doc_ref.update({"status": "DOWNLOADING...", "updatedAt": datetime.utcnow()})

            # ── 1. Descargar audio ─────────────────────────────────────────
            print(f"[KaraokeService] [1/4] Descargando audio para {karaoke_id}...")
            local_audio = youtube_service.download_audio(youtube_url, karaoke_id)

            if not local_audio or not os.path.exists(local_audio):
                raise Exception("Fallo en la descarga de audio")

            # ── 2. Pipeline Unificado (Separación + Transcripción) ──────────
            doc_ref.update({"status": "AI SEPARATING & LYRICS (GPU)...", "updatedAt": datetime.utcnow()})
            print(f"[KaraokeService] [2/4] Ejecutando IA (Demucs + Whisper) en un solo paso...")
            from services.modal_client import process_full_karaoke_with_modal
            
            result_data = process_full_karaoke_with_modal(local_audio, karaoke_id)
            
            stem_paths = result_data.get("stem_paths", {})
            lyrics     = result_data.get("lyrics", [])
            language   = lyrics[0].get("language", "") if lyrics else ""

            # ── 3. Subir Stems y Audio Completo a B2 ───────────────────────
            doc_ref.update({"status": "SYNCING TO CLOUD...", "updatedAt": datetime.utcnow()})
            print(f"[KaraokeService] [3/4] Guardando resultados en la nube...")
            remote_base = f"users/{user_id}/karaokes/{karaoke_id}"
            
            remote_full = f"{remote_base}/full_audio.mp3"
            b2_storage.upload_file(local_audio, remote_full)
            full_audio_url = b2_storage.get_public_url(remote_full)

            # Subir stems
            stem_files = {
                "vocals":    "vocals.mp3",
                "no_vocals": "no_vocals.mp3",
            }
            stem_urls = {}
            for stem_name, filename in stem_files.items():
                local_path = stem_paths.get(stem_name)
                if local_path and os.path.exists(local_path):
                    remote_path = f"{remote_base}/{filename}"
                    b2_storage.upload_file(local_path, remote_path)
                    stem_urls[stem_name] = b2_storage.get_public_url(remote_path)

            # ── 4. Finalizar ───────────────────────────────────────────────
            doc_ref.update({
                "status":          "ready",
                "audioUrl":        full_audio_url,
                "vocalsUrl":       stem_urls.get("vocals", ""),
                "instrumentalUrl": stem_urls.get("no_vocals", ""),
                "lyrics":          lyrics,
                "language":        language,
                "model":           "htdemucs_ft + whisper-large-v3 (unified)",
                "updatedAt":       datetime.utcnow(),
            })

            print(f"[KaraokeService] DONE: ¡Pista lista! {karaoke_id}")

        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"[KaraokeService] ERROR: {e}")
            doc_ref.update({
                "status":    "failed",
                "error":     str(e),
                "updatedAt": datetime.utcnow(),
            })

        finally:
            # Limpiar archivos temporales
            if local_audio and os.path.exists(local_audio):
                os.remove(local_audio)
            if stem_paths:
                from services.modal_client import cleanup_stems
                cleanup_stems(stem_paths)

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _format_duration(self, seconds):
        if not seconds:
            return "0:00"
        minutes = int(seconds) // 60
        secs    = int(seconds) % 60
        return f"{minutes}:{secs:02d}"

    def _extract_video_id(self, url: str) -> str:
        """Extrae el video ID de una URL de YouTube."""
        import re
        patterns = [
            r"(?:v=|youtu\.be/)([A-Za-z0-9_-]{11})",
            r"(?:embed/)([A-Za-z0-9_-]{11})",
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return ""


karaoke_service = KaraokeService()
