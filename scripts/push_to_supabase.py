import json
import requests
import sys

SUPABASE_URL = "https://hbxejvpynymcxghdkbkh.supabase.co"
SUPABASE_KEY = "sb_publishable_nii-4wn98Yh4ESEzF_DkBw_qAYVzoIK"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=representation"
}

def push_data(json_path):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    tracks = data.get("tracks", [])
    proposals = data.get("proposals", [])

    print(f"[*] Traitement de {len(tracks)} morceaux et {len(proposals)} propositions...")

    # 1. Nettoyage & Upsert Tracks
    if tracks:
        clean_tracks = []
        for t in tracks:
            clean_tracks.append({
                "id": t["id"],
                "title": t.get("title", "Sans titre"),
                "artist": t.get("artist", ""),
                "genre": t.get("genre"),
                "audio_url": t.get("audio_url", ""),
                "youtube_id": t.get("youtube_id"),
                "thumbnail_url": t.get("thumbnail_url"),
                "duration": t.get("duration", 180),
                "default_start_time": t.get("default_start_time", 0),
                "default_end_time": t.get("default_end_time", 60),
                "created_at": t.get("created_at")
            })

        print(f"[*] Envoi des tracks vers Supabase...")
        r = requests.post(f"{SUPABASE_URL}/rest/v1/tracks", headers=headers, json=clean_tracks)
        print("  -> Status:", r.status_code)
        if r.status_code in (200, 201):
            print(f"  [OK] {len(r.json())} tracks enregistrés avec succès dans Supabase !")
        else:
            print("  [ERREUR Tracks]:", r.text)

    # 2. Nettoyage & Upsert Proposals
    if proposals:
        clean_proposals = []
        for p in proposals:
            clean_proposals.append({
                "id": p["id"],
                "track_id": p.get("track_id"),
                "author_name": p.get("author_name", "Anonyme"),
                "movie_title": p.get("movie_title", "Scénario"),
                "genre": p.get("genre", "Cinéma"),
                "logline": p.get("logline", ""),
                "context_before": p.get("context_before", ""),
                "context_after": p.get("context_after", ""),
                "key_scene_title": p.get("key_scene_title", ""),
                "key_scene_description": p.get("key_scene_description", ""),
                "key_scene_start_time": p.get("key_scene_start_time", 0),
                "key_scene_end_time": p.get("key_scene_end_time", 60),
                "likes_count": p.get("likes_count", 0),
                "created_at": p.get("created_at")
            })

        print(f"[*] Envoi des proposals vers Supabase...")
        r2 = requests.post(f"{SUPABASE_URL}/rest/v1/proposals", headers=headers, json=clean_proposals)
        print("  -> Status:", r2.status_code)
        if r2.status_code in (200, 201):
            print(f"  [OK] {len(r2.json())} propositions enregistrées avec succès dans Supabase !")
        else:
            print("  [ERREUR Proposals]:", r2.text)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        push_data(sys.argv[1])
    else:
        push_data("scripts/imported_local_data.json")
