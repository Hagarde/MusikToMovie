#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🎵 Extracteur Local de Stems Studio (Demucs v4 HTDemucs + yt-dlp)
Sépare 100% hors-navigateur en 4 pistes chirurgicales pour MusikToMovie :
  - vocals.wav (🎤 Voix)
  - drums.wav  (🥁 Batterie)
  - bass.wav   (🎸 Basse)
  - melody.wav (🎹 Mélodie / Instruments)
"""

import os
import sys
import shutil
import subprocess
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

def download_youtube_audio(url: str, output_path: Path):
    """Télécharge l'audio YouTube et le convertit directement en WAV propre."""
    print(f"\n📥 1/3. Téléchargement YouTube ({url})...")
    import yt_dlp

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': str(output_path / '%(title)s.%(ext)s'),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '0',
        }],
        'quiet': False,
        'no_warnings': True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title = info.get('title', 'audio_track')
        safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()
        wav_files = list(output_path.glob("*.wav"))
        if wav_files:
            return wav_files[0], safe_title
        all_files = list(output_path.glob("*.*"))
        return all_files[0] if all_files else output_path, safe_title

def separate_with_demucs(audio_file: Path, target_dir: Path, title: str):
    """Lance la séparation Demucs v4 HTDemucs (Qualité Studio Pro)."""
    print(f"\n🧠 2/3. Inférence Réseau de Neurones Demucs v4 (HTDemucs)...")
    print(f"🎵 Fichier source : {audio_file.name}")
    print("⏳ Ce calcul utilise votre processeur multi-coeurs / GPU. Veuillez patienter...")

    cmd = [
        sys.executable, "-m", "demucs.separate",
        "-n", "htdemucs",
        "--out", str(target_dir),
        str(audio_file)
    ]
    
    subprocess.check_call(cmd, env=os.environ)

    # Récupération et renommage des 4 fichiers générés par Demucs
    track_name = audio_file.stem
    demucs_out_dir = target_dir / "htdemucs" / track_name
    
    final_dir = target_dir / title
    final_dir.mkdir(parents=True, exist_ok=True)

    stem_mapping = {
        "vocals.wav": "vocals.wav",
        "drums.wav": "drums.wav",
        "bass.wav": "bass.wav",
        "other.wav": "melody.wav",  # Renommé en melody pour MusikToMovie
    }

    print(f"\n✨ 3/3. Normalisation des 4 Stems Studio...")
    for src_stem, dest_stem in stem_mapping.items():
        src_path = demucs_out_dir / src_stem
        dest_path = final_dir / dest_stem
        if src_path.exists():
            shutil.copy2(src_path, dest_path)
            print(f"  ✅ {dest_stem.upper()} -> {dest_path}")

    # Nettoyage dossier intermédiaire demucs
    try:
        shutil.rmtree(target_dir / "htdemucs")
    except Exception:
        pass

    return final_dir

def main():
    print("=" * 65)
    print("🎛️  EXTRACTEUR LOCAL DE STEMS STUDIO POUR MUSIKTOMOVIE")
    print("=" * 65)

    check_dependencies()

    source = sys.argv[1] if len(sys.argv) > 1 else ""
    if not source:
        source = input("\n👉 Entrez une URL YouTube ou le chemin d'un fichier audio (MP3/WAV) : ").strip('"').strip()

    if not source:
        print("❌ Aucune entrée fournie. Fin du programme.")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    temp_dir = OUTPUT_DIR / "_temp"
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        if source.startswith("http://") or source.startswith("https://"):
            audio_file, title = download_youtube_audio(source, temp_dir)
        else:
            audio_file = Path(source)
            if not audio_file.exists():
                print(f"❌ Fichier introuvable : {audio_file}")
                sys.exit(1)
            title = audio_file.stem

        final_stems_dir = separate_with_demucs(audio_file, OUTPUT_DIR, title)

        print("\n" + "=" * 65)
        print("🎉 SÉPARATION TERMINÉE AVEC SUCCÈS (QUALITÉ STUDIO 100% PURE) !")
        print("=" * 65)
        print(f"\n📂 Dossier de vos 4 pistes : {final_stems_dir.resolve()}")
        print("\n🚀 INSTRUCTIONS D'UTILISATION DANS MUSIKTOMOVIE :")
        print("1. Ouvrez votre navigateur sur MusikToMovie Studio.")
        print("2. Cliquez sur [📂 Importer MP3 / Stems Pro] sur le Deck A ou B.")
        print("3. Sélectionnez les 4 fichiers d'un coup (ou glissez-les sur la platine) :")
        print("   • vocals.wav  (🎤 Voix pure)")
        print("   • drums.wav   (🥁 Batterie)")
        print("   • bass.wav    (🎸 Basse)")
        print("   • melody.wav  (🎹 Mélodie / Instruments)")
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
