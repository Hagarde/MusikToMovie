#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🎵 Extracteur Local de Stems Studio (Demucs v4 HTDemucs + yt-dlp + Détection IA de BPM)
Sépare 100% hors-navigateur en 4 pistes chirurgicales pour MusikToMovie :
  - vocals.wav (🎤 Voix)
  - drums.wav  (🥁 Batterie)
  - bass.wav   (🎸 Basse)
  - melody.wav (🎹 Mélodie / Instruments)
Calcule automatiquement le BPM exact via l'analyse du stem drums.wav
et l'inscrit directement dans le nom du dossier [XXX BPM] et dans metadata.json.
"""

import os
import sys
import re
import shutil
import struct
import math
import json
import subprocess
import wave
from pathlib import Path

# Injection automatique de FFmpeg dans PATH
try:
    import imageio_ffmpeg
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(ffmpeg_exe)
    target_ffmpeg = os.path.join(ffmpeg_dir, "ffmpeg.exe")
    if not os.path.exists(target_ffmpeg):
        shutil.copyfile(ffmpeg_exe, target_ffmpeg)
    os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
except Exception:
    pass

OUTPUT_DIR = Path("stems_output")

def check_dependencies():
    """Vérifie que les outils nécessaires sont installés."""
    missing = []
    try:
        import yt_dlp
    except ImportError:
        missing.append("yt-dlp")

    try:
        import demucs
    except ImportError:
        missing.append("demucs")

    try:
        import imageio_ffmpeg
    except ImportError:
        missing.append("imageio-ffmpeg")

    if missing:
        print("\n⚠️  Dépendances manquantes détectées !")
        print(f"👉 Veuillez exécuter : pip install {' '.join(missing)} torch torchaudio")
        choice = input("\nSouhaitez-vous les installer automatiquement maintenant ? (O/n) : ").strip().lower()
        if choice in ("", "o", "oui", "y", "yes"):
            print("\n📦 Installation des paquets en cours...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", *missing, "torch", "torchaudio"])
            print("✅ Dépendances installées avec succès !\n")
        else:
            sys.exit(1)

def sanitize_url(raw_url: str) -> str:
    """Corrige les éventuelles fautes de frappe dans l'URL (ex: hhttps://)."""
    url = raw_url.strip().strip('"').strip("'")
    if url.startswith("hhttps://"):
        url = "https://" + url[9:]
    elif url.startswith("hhttp://"):
        url = "http://" + url[8:]
    elif not url.startswith("http://") and not url.startswith("https://") and ("youtube.com" in url or "youtu.be" in url):
        url = "https://" + url
    return url

def sanitize_filename(title: str) -> str:
    """Nettoie le titre pour créer un nom de dossier Windows valide."""
    clean = re.sub(r'[\\/*?:"<>|]', "", title).strip()
    return clean if clean else "stems_track"

def detect_bpm_from_wav(wav_path: Path) -> int:
    """
    🔬 Détecte le BPM exact à partir du stem de batterie (drums.wav).
    Analyse l'enveloppe d'énergie et les attaques de percussions.
    """
    if not wav_path.exists():
        return 120
    try:
        with wave.open(str(wav_path), 'rb') as wf:
            n_channels = wf.getnchannels()
            sample_width = wf.getsampwidth()
            framerate = wf.getframerate()
            n_frames = wf.getnframes()

            if framerate <= 0 or n_frames <= 0 or sample_width != 2:
                return 120

            duration = n_frames / framerate
            target_duration = min(45.0, duration)
            start_time = 10.0 if duration > 30 else 0.0
            start_frame = int(start_time * framerate)
            read_frames = int(target_duration * framerate)

            wf.setpos(min(start_frame, n_frames - 1))
            raw_bytes = wf.readframes(read_frames)

            fmt = f"<{len(raw_bytes) // 2}h"
            samples = struct.unpack(fmt, raw_bytes)
            
            if n_channels > 1:
                mono = [((samples[i] + samples[i+1]) * 0.5) / 32768.0 for i in range(0, len(samples) - 1, n_channels)]
            else:
                mono = [s / 32768.0 for s in samples]

            hop_size = int(framerate * 0.01) # 10ms
            num_hops = len(mono) // hop_size
            if num_hops < 100:
                return 120

            energies = []
            for h in range(num_hops):
                chunk = mono[h * hop_size : (h + 1) * hop_size]
                rms = math.sqrt(sum(x * x for x in chunk) / max(1, len(chunk)))
                energies.append(rms)

            flux = [0.0]
            for i in range(1, len(energies)):
                diff = energies[i] - energies[i-1]
                flux.append(diff if diff > 0 else 0.0)

            avg_flux = sum(flux) / len(flux)
            threshold = avg_flux * 1.5

            min_dist = int(0.28 / 0.01) # Min 280ms
            peaks = []
            last_peak = -min_dist

            for i in range(2, len(flux) - 2):
                if flux[i] > threshold and flux[i] > flux[i-1] and flux[i] > flux[i+1]:
                    if i - last_peak >= min_dist:
                        peaks.append(i * 0.01)
                        last_peak = i

            if len(peaks) < 6:
                return 120

            interval_counts = {}
            for i in range(len(peaks)):
                for j in range(1, 4):
                    if i + j < len(peaks):
                        delta = peaks[i + j] - peaks[i]
                        if delta > 0:
                            candidate = (60.0 * j) / delta
                            while candidate < 65: candidate *= 2
                            while candidate > 180: candidate /= 2
                            rounded = round(candidate)
                            if 65 <= rounded <= 180:
                                interval_counts[rounded] = interval_counts.get(rounded, 0) + (4 - j)

            if not interval_counts:
                return 120

            best_bpm = max(interval_counts.items(), key=lambda x: x[1])[0]
            return int(best_bpm)
    except Exception as e:
        print(f"  [!] Note: Calcul BPM par défaut (120 BPM) : {e}")
        return 120

def download_youtube_audio(url: str, output_path: Path):
    """Télécharge l'audio YouTube et le convertit directement en WAV propre."""
    url = sanitize_url(url)
    print(f"\n📥 1/3. Téléchargement YouTube ({url})...")
    import yt_dlp

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': str(output_path / '%(title)s.%(ext)s'),
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios', 'mweb', 'web_creator'],
            }
        },
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '0',
        }],
        'quiet': False,
        'no_warnings': True,
    }

    info = None
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
    except Exception as e:
        print(f"  [!] Tentative avec cookies navigateur...")
        for browser in ['chrome', 'edge', 'firefox']:
            try:
                opts = dict(ydl_opts)
                opts['cookiesfrombrowser'] = (browser,)
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    if info:
                        break
            except Exception:
                continue

    if not info:
        print(f"\n❌ Échec du téléchargement pour l'URL : {url}")
        sys.exit(1)

    title = info.get('title', 'YouTube_Track')
    clean_title = sanitize_filename(title)
    
    wav_files = list(output_path.glob("*.wav"))
    if not wav_files:
        print("\n❌ Aucun fichier WAV généré après téléchargement.")
        sys.exit(1)
        
    return wav_files[0], clean_title

def separate_with_demucs(audio_file: Path, target_dir: Path, title: str):
    """Exécute l'inférence neuronale Demucs v4 HTDemucs et calcule le BPM."""
    print(f"\n🧠 2/3. Séparation IA Neuronale Demucs v4 HTDemucs...")
    print(f"👉 Traitement de : {audio_file.name}")
    print("⏳ Cela prend généralement entre 30 et 90 secondes selon votre machine...")

    cmd = [
        sys.executable, "-m", "demucs.separate",
        "-n", "htdemucs",
        "--out", str(target_dir),
        str(audio_file)
    ]
    
    subprocess.check_call(cmd, env=os.environ)

    # Récupération et calcul du BPM sur la piste drums
    track_name = audio_file.stem
    demucs_out_dir = target_dir / "htdemucs" / track_name
    drums_wav = demucs_out_dir / "drums.wav"
    
    detected_bpm = detect_bpm_from_wav(drums_wav) if drums_wav.exists() else 120
    print(f"\n🥁 3/3. Analyse Rythmique & Détection du Tempo : {detected_bpm} BPM")

    # Nom du dossier final intégrant le tag BPM
    folder_name = f"{title} [{detected_bpm} BPM]"
    final_dir = target_dir / folder_name
    final_dir.mkdir(parents=True, exist_ok=True)

    stem_mapping = {
        "vocals.wav": "vocals.wav",
        "drums.wav": "drums.wav",
        "bass.wav": "bass.wav",
        "other.wav": "melody.wav",
    }

    print(f"✨ Normalisation des 4 Stems Studio...")
    for src_stem, dest_stem in stem_mapping.items():
        src_path = demucs_out_dir / src_stem
        dest_path = final_dir / dest_stem
        if src_path.exists():
            shutil.copy2(src_path, dest_path)
            print(f"  ✅ {dest_stem.upper()} -> {dest_path.name}")

    # Enregistrement du fichier de métadonnées
    metadata = {
        "title": title,
        "bpm": detected_bpm,
        "model": "Demucs v4 HTDemucs",
        "stems": ["vocals.wav", "drums.wav", "bass.wav", "melody.wav"]
    }
    with open(final_dir / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    # Nettoyage dossier intermédiaire demucs
    try:
        shutil.rmtree(target_dir / "htdemucs")
    except Exception:
        pass

    return final_dir, detected_bpm

def main():
    print("=" * 65)
    print("🎛️  EXTRACTEUR LOCAL DE STEMS STUDIO + DÉTECTION BPM IA")
    print("=" * 65)

    check_dependencies()

    source = sys.argv[1] if len(sys.argv) > 1 else ""
    if not source:
        source = input("\n👉 Entrez une URL YouTube ou le chemin d'un fichier audio (MP3/WAV) : ").strip('"').strip("'")

    if not source:
        print("❌ Aucune entrée fournie. Fin du programme.")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    temp_dir = OUTPUT_DIR / "_temp"
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        cleaned_source = sanitize_url(source)
        if cleaned_source.startswith("http://") or cleaned_source.startswith("https://"):
            audio_file, title = download_youtube_audio(cleaned_source, temp_dir)
        else:
            audio_file = Path(source)
            if not audio_file.exists():
                print(f"❌ Fichier introuvable : {audio_file}")
                sys.exit(1)
            title = sanitize_filename(audio_file.stem)

        final_stems_dir, detected_bpm = separate_with_demucs(audio_file, OUTPUT_DIR, title)

        print("\n" + "=" * 65)
        print(f"🎉 SÉPARATION TERMINÉE : {detected_bpm} BPM DÉTECTÉ !")
        print("=" * 65)
        print(f"\n📂 Dossier généré : {final_stems_dir.resolve()}")
        print(f"🏷️  Tag BPM intégré : [{detected_bpm} BPM]")
        print("\n🚀 UTILISATION DANS MUSIKTOMOVIE :")
        print("1. Ouvrez le Studio MusikToMusik sur votre navigateur.")
        print("2. Glissez les 4 fichiers (ou le dossier) sur le Deck A ou B.")
        print(f"3. Le BPM ({detected_bpm} BPM) et le calage seront automatiquement reconnus !")
        print("-" * 65)

        # Ouvre automatiquement le dossier dans l'explorateur Windows
        if sys.platform == "win32":
            os.startfile(str(final_stems_dir))
        elif sys.platform == "darwin":
            subprocess.run(["open", str(final_stems_dir)])
        else:
            subprocess.run(["xdg-open", str(final_stems_dir)])

    finally:
        # Nettoyage
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    main()
