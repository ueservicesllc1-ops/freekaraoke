import yt_dlp
import os

url = "https://www.youtube.com/watch?v=Zi_XLOBDo_Y" # Billie Jean
output_name = "test_download"
temp_dir = "temp"

if not os.path.exists(temp_dir):
    os.makedirs(temp_dir)

output_path = os.path.join(temp_dir, output_name)

ydl_opts = {
    'format': 'bestaudio/best',
    'postprocessors': [{
        'key': 'FFmpegExtractAudio',
        'preferredcodec': 'mp3',
        'preferredquality': '192',
    }],
    'outtmpl': output_path,
    'verbose': True,
}

print(f"Intentando descargar a: {output_path}")

try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    print(f"Descarga completada. Verificando archivo...")
    expected_file = f"{output_path}.mp3"
    if os.path.exists(expected_file):
        print(f"EXITO: El archivo existe en {expected_file}")
    else:
        print(f"ERROR: El archivo NO existe en {expected_file}")
        # Listar archivos en temp
        print("Archivos en temp:", os.listdir(temp_dir))
except Exception as e:
    print(f"FALLO CRITICO: {e}")
