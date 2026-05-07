import yt_dlp
import os
import uuid

class YouTubeService:
    def __init__(self, temp_dir="temp"):
        self.temp_dir = temp_dir
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)

    def get_info(self, url):
        """Obtiene información del video sin descargarlo"""
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=False)
                return {
                    "title": info.get('title', 'Unknown Title'),
                    "artist": info.get('uploader', 'Unknown Artist'),
                    "duration": info.get('duration', 0),
                    "thumbnail": info.get('thumbnail', ''),
                    "id": info.get('id', '')
                }
            except Exception as e:
                print(f"Error getting info: {e}")
                return None

    def download_audio(self, url, output_name=None):
        """Descarga el audio del video en formato mp3"""
        if not output_name:
            output_name = str(uuid.uuid4())
            
        # Usar ruta absoluta para evitar problemas en Windows
        abs_temp_dir = os.path.abspath(self.temp_dir)
        if not os.path.exists(abs_temp_dir):
            os.makedirs(abs_temp_dir)
            
        output_path = os.path.join(abs_temp_dir, f"{output_name}")
        
        # --- SALTO DE EMERGENCIA: Si el archivo ya existe, no hacemos NADA con YouTube ---
        import glob
        matches = glob.glob(output_path + ".*")
        if matches:
            for m in matches:
                if not m.endswith('.part') and os.path.getsize(m) > 500000: # Mas de 0.5MB
                    print(f"[YouTubeService] ¡ARCHIVO DETECTADO! Saltando descarga: {m}")
                    return m

        print(f"[YouTubeService] Descargando audio desde YouTube: {url}")
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': output_path + '.%(ext)s',
            'quiet': True,
            'no_warnings': True,
            'socket_timeout': 30, # 30 segundos de timeout
            'retries': 3,         # 3 reintentos
            'noplaylist': True,   # No bajar listas enteras por error
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                # Si el archivo ya existe (de un intento anterior), no bajamos de nuevo
                import glob
                matches = glob.glob(output_path + ".*")
                if matches and os.path.getsize(matches[0]) > 1000000: # Mas de 1MB
                    print(f"[YouTubeService] Archivo ya existente y valido: {matches[0]}")
                    return matches[0]

                ydl.download([url])
                
                # Buscar cualquier extensión que yt-dlp haya decidido usar
                import glob
                matches = glob.glob(output_path + ".*")
                
                if matches:
                    # Si hay varias, preferimos la que no sea .part
                    valid_matches = [m for m in matches if not m.endswith('.part')]
                    if valid_matches:
                        print(f"[YouTubeService] ¡ARCHIVO ENCONTRADO!: {valid_matches[0]}")
                        return valid_matches[0]
                
                print(f"[YouTubeService] ERROR: No se encontró ningún archivo para {output_path}")
                return None
            except Exception as e:
                print(f"Error downloading audio: {e}")
                return None

youtube_service = YouTubeService()
