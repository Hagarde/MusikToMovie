#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔄 Synchronisateur Batch Supabase -> Stems Demucs v4
Parcourt tous les morceaux et liens YouTube enregistrés dans Supabase,
filtre automatiquement les morceaux de moins de 5 minutes (pour éviter les vidéos de 45 min),
télécharge l'audio et génère automatiquement les 4 pistes Studio (Voix, Drums, Basse, Mélodie).
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path
import requests

# Forcer UTF-8 sur Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

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

SUPABASE_URL = "https://hbxejvpynymcxghdkbkh.supabase.co"
SUPABASE_KEY = "sb_publishable_nii-4wn98Yh4ESEzF_DkBw_qAYVzoIK"
OUTPUT_DIR = Path("stems_output")

# Limite de durée par défaut : 5 minutes (300 secondes)
MAX_DURATION_SECONDS = 300

# Pistes de secours si la base Supabase est vide
FALLBACK_TRACKS = [
    {
        "title": "Time - Inception Soundtrack",
        "artist": "Hans Zimmer",
        "duration": 275,
        "youtube_id": "RxabLA7UQ9k",
        "audio_url": "https://www.youtube.com/watch?v=RxabLA7UQ9k"
    },
    {
        "title": "Blade Runner 2049 - Tears in the Rain",
        "artist": "Hans Zimmer & Vangelis",
        "duration": 240,
        "youtube_id": "s36eQwgPNSE",
        "audio_url": "https://www.youtube.com/watch?v=s36eQwgPNSE"
    },
    {
        "title": "Interstellar - Main Theme",
        "artist": "Hans Zimmer",
        "duration": 250,
        "youtube_id": "UDVtMYqUAyw",
        "audio_url": "https://www.youtube.com/watch?v=UDVtMYqUAyw"
    },
    {
        "title": "The Dark Knight - Action Beat",
        "artist": "Hans Zimmer",
        "duration": 180,
        "youtube_id": "2r1pP294t44",
        "audio_url": "https://www.youtube.com/watch?v=2r1pP294t44"
    }
]

def format_duration(seconds: int) -> str:
    """Formate une durée en secondes en format 'Xm Ys'."""
    if not seconds or seconds <= 0:
        return "inconnue"
    mins = int(seconds) // 60
    secs = int(seconds) % 60
    return f"{mins}m {secs:02d}s"

def fetch_supabase_youtube_tracks():
    """Récupère tous les morceaux avec liens YouTube depuis Supabase et filtre par durée."""
    print("[*] Connexion a la base de donnees Supabase...")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }

    all_tracks = []
    seen_ids = set()

    # 1. Vérification table 'tracks'
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/tracks?select=*", headers=headers, timeout=10)
        if r.status_code == 200:
            data = r.json()
            print(f"  [OK] Table 'tracks' : {len(data)} morceau(x) trouve(s)")
            for item in data:
                yt_id = item.get("youtube_id")
                audio_url = item.get("audio_url", "")
                title = item.get("title", "Morceau sans titre")
                artist = item.get("artist", "")
                duration = item.get("duration", 0)

                url = ""
                if yt_id:
                    url = f"https://www.youtube.com/watch?v={yt_id}"
                elif "youtube.com" in audio_url or "youtu.be" in audio_url:
                    url = audio_url

                if url and url not in seen_ids:
                    seen_ids.add(url)
                    all_tracks.append({
                        "title": title,
                        "artist": artist,
                        "url": url,
                        "duration": duration,
                        "source": "supabase/tracks"
                    })
    except Exception as e:
        print(f"  [!] Erreur lecture table tracks : {e}")

    # 2. Vérification table 'proposals' (soundtrack_url ou audio_url)
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/proposals?select=*", headers=headers, timeout=10)
        if r.status_code == 200:
            data = r.json()
            print(f"  [OK] Table 'proposals' : {len(data)} proposition(s) trouvee(s)")
            for item in data:
                for key in ["audio_url", "soundtrack_url", "music_url", "youtube_url"]:
                    raw_url = item.get(key, "")
                    if raw_url and ("youtube.com" in raw_url or "youtu.be" in raw_url) and raw_url not in seen_ids:
                        seen_ids.add(raw_url)
                        all_tracks.append({
                            "title": item.get("title") or item.get("movie_title") or "Proposition Supabase",
                            "artist": item.get("author_name") or "",
                            "url": raw_url,
                            "duration": 0,
                            "source": "supabase/proposals"
                        })
    except Exception as e:
        print(f"  [!] Erreur lecture table proposals : {e}")

    # 3. Fallback démo si vide
    if not all_tracks:
        print("\n[INFO] Aucun morceau personnalise trouve dans la base distante.")
        print("[INFO] Utilisation des morceaux de demo du projet :")
        for ft in FALLBACK_TRACKS:
            all_tracks.append({
                "title": ft["title"],
                "artist": ft["artist"],
                "url": ft["audio_url"],
                "duration": ft.get("duration", 200),
                "source": "demo_project"
            })

    # 4. Séparation : Éligibles (<= 5 min) vs Trop longs (> 5 min)
    eligible_tracks = []
    skipped_tracks = []

    for t in all_tracks:
        dur = t.get("duration", 0)
        # Si la durée est connue et dépasse 5 min (300 s)
        if dur > MAX_DURATION_SECONDS:
            skipped_tracks.append(t)
        else:
            eligible_tracks.append(t)

    return eligible_tracks, skipped_tracks

def sanitize_title(title: str) -> str:
    """Génère un nom de dossier propre pour Windows."""
    clean = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()
    return clean if clean else "morceau_stems"

def download_and_extract_track(track_info: dict, output_dir: Path, temp_dir: Path):
    """Télécharge et sépare un morceau spécifique en vérifiant la durée max."""
    url = track_info["url"]
    raw_title = track_info["title"]
    safe_title = sanitize_title(raw_title)
    final_dir = output_dir / safe_title

    # Vérifie si les 4 stems existent déjà
    required_stems = ["vocals.wav", "drums.wav", "bass.wav", "melody.wav"]
    if final_dir.exists() and all((final_dir / s).exists() for s in required_stems):
        print(f"  [DEJA FAIT] {safe_title} (les 4 stems existent deja)")
        return True, "already_done"

    print(f"\n" + "-" * 60)
    print(f"[>] Traitement : {raw_title} ({url})")
    print("-" * 60)

    import yt_dlp

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': str(temp_dir / f"{safe_title}.%(ext)s"),
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
            # Récupérer les métadonnées en premier
            meta = ydl.extract_info(url, download=False)
            if meta:
                meta_duration = meta.get("duration", 0)
                if meta_duration and meta_duration > MAX_DURATION_SECONDS:
                    print(f"  [SKIP > 5 min] {raw_title} ({format_duration(meta_duration)} > {format_duration(MAX_DURATION_SECONDS)})")
                    return True, "skipped_too_long"
            
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
        print(f"  [X] Echec du telechargement pour {url}")
        return False, "download_error"

    wav_files = list(temp_dir.glob(f"{safe_title}*.wav"))
    if not wav_files:
        wav_files = list(temp_dir.glob("*.wav"))
    if not wav_files:
        print(f"  [X] Aucun fichier WAV genere pour {url}")
        return False, "wav_missing"

    audio_file = wav_files[0]

    # Inférence Demucs v4
    print(f"\n[AI] Inference Demucs v4 HTDemucs sur : {audio_file.name}...")
    cmd = [
        sys.executable, "-m", "demucs.separate",
        "-n", "htdemucs",
        "--out", str(output_dir),
        str(audio_file)
    ]
    subprocess.check_call(cmd, env=os.environ)

    # Déplacement & Renommage vers stems_output/<Titre>/
    track_stem = audio_file.stem
    demucs_out_dir = output_dir / "htdemucs" / track_stem
    final_dir.mkdir(parents=True, exist_ok=True)

    mapping = {
        "vocals.wav": "vocals.wav",
        "drums.wav": "drums.wav",
        "bass.wav": "bass.wav",
        "other.wav": "melody.wav",
    }

    for src_name, dest_name in mapping.items():
        src_file = demucs_out_dir / src_name
        if src_file.exists():
            shutil.copy2(src_file, final_dir / dest_name)

    # Nettoyage intermédiaire
    try:
        shutil.rmtree(output_dir / "htdemucs", ignore_errors=True)
        if audio_file.exists():
            audio_file.unlink()
    except Exception:
        pass

    print(f"  [OK] 4 Stems crees dans : {final_dir}")
    return True, "success"

def main():
    print("=" * 65)
    print("🔄 SYNCHRONISATEUR BATCH SUPABASE -> STEMS DEMUCS V4")
    print(f"⏱️  Limite maximale de durée : {MAX_DURATION_SECONDS // 60} minutes par morceau")
    print("=" * 65)
    print()

    eligible, skipped = fetch_supabase_youtube_tracks()

    if skipped:
        print(f"\n[INFO] {len(skipped)} morceau(x) ignore(s) car depassant 5 minutes :")
        for s in skipped:
            dur_str = format_duration(s.get("duration", 0))
            print(f"  - ⏩ {s['artist']} - {s['title']} ({dur_str})")

    print(f"\n[TOTAL] {len(eligible)} morceau(x) < 5 min a traiter :")
    for i, t in enumerate(eligible, 1):
        dur_str = format_duration(t.get("duration", 0))
        print(f"  {i:02d}. {t.get('artist', '')} - {t['title']} ({dur_str})")

    if not eligible:
        print("\nAucun morceau éligible (< 5 min) à traiter.")
        sys.exit(0)

    print("\n" + "=" * 65)
    confirm = input("👉 Lancer la separation automatique de ces morceaux ? (O/n) : ").strip().lower()
    if confirm not in ("", "o", "oui", "y", "yes"):
        print("Operation annulee.")
        sys.exit(0)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    temp_dir = OUTPUT_DIR / "_temp_batch"
    temp_dir.mkdir(parents=True, exist_ok=True)

    success_count = 0
    already_done_count = 0
    skipped_count = len(skipped)
    failed_count = 0

    try:
        for idx, track in enumerate(eligible, 1):
            print(f"\n[{idx}/{len(eligible)}] Traitement de : {track['title']}")
            ok, status = download_and_extract_track(track, OUTPUT_DIR, temp_dir)
            if ok:
                if status == "already_done":
                    already_done_count += 1
                elif status == "skipped_too_long":
                    skipped_count += 1
                else:
                    success_count += 1
            else:
                failed_count += 1

        print("\n" + "=" * 65)
        print("🎉 RAPPORT DE SYNCHRONISATION TERMINE !")
        print("=" * 65)
        print(f"  [+] Morceaux nouvellement separes : {success_count}")
        print(f"  [>] Morceaux deja prets          : {already_done_count}")
        print(f"  [⏩] Morceaux ignores (> 5 min)   : {skipped_count}")
        if failed_count > 0:
            print(f"  [!] Erreurs de telechargement     : {failed_count}")
        print(f"\n📂 Dossier racine de vos Stems : {OUTPUT_DIR.resolve()}")
        print("=" * 65)

        # Ouverture de l'explorateur Windows
        if sys.platform == "win32":
            os.startfile(str(OUTPUT_DIR.resolve()))
        elif sys.platform == "darwin":
            subprocess.run(["open", str(OUTPUT_DIR.resolve())])
        else:
            subprocess.run(["xdg-open", str(OUTPUT_DIR.resolve())])

    finally:
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    main()
