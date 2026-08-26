import json
import re
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

log_path = r"C:\Users\Moi\.gemini\antigravity\brain\2a73f05c-0084-4968-ae80-9e711ad0420c\.system_generated\logs\transcript_full.jsonl"

with open(log_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

last_user = None
for l in reversed(lines):
    data = json.loads(l)
    if data.get("type") == "USER_INPUT":
        content = data.get("content", "")
        if '"tracks"' in content:
            last_user = content
            break

if last_user:
    # 1. Extraire la liste des tracks
    tracks_match = re.search(r'"tracks":\s*(\[\s*\{.*?\}\s*\])\s*,\s*"proposals"', last_user, re.DOTALL)
    tracks = []
    if tracks_match:
        tracks = json.loads(tracks_match.group(1))

    # 2. Proposals
    proposals = [
        {
            "id": "62c8a70e-10f9-495c-90bf-de188674ae21",
            "track_id": "14c1616d-83d9-4bcf-96e9-016fbb85c0a8",
            "author_name": "Xorri",
            "movie_title": "Volver",
            "genre": "Cinématique / Épique",
            "logline": "Une ville balnéaire, un tension entre deux horizons ...",
            "context_before": "Vie normale , hésitation entre la rester auprès de sa famille ou bine partir à l'autre bout du monde.",
            "context_after": "Elle saute le pas et déménage à l'autre bout du monde.",
            "key_scene_title": "Climax & Révélation Visuelle",
            "key_scene_description": "Une jeune femme est au volant de sa voiture, fenêtre ouverte, chevelure au vent pendant la nuit. \nElle tapote la bord de sa fenêtre puis allume une cigarette avec difficulté avec le vent. \nC'est le vent qui fume la cigarette. \nDes flashbacks l'envahissent provoquant la nostalgie. (un truc qui la force à s'arrêter)",
            "key_scene_start_time": 90,
            "key_scene_end_time": 120,
            "animation_fps": 0.25,
            "likes_count": 0,
            "created_at": "2026-08-24T08:18:38.583Z"
        },
        {
            "id": "15a35c7b-1948-4341-818d-e3c20c6c503b",
            "track_id": "07ababb4-7d62-4121-8cee-a1934655fa2d",
            "author_name": "Xorri for that moment",
            "movie_title": "R1bo des bois",
            "genre": "Rock / Metal",
            "logline": "Film autorporteur",
            "context_before": "",
            "context_after": "J’ai avalé une fameuse gorgée de poison. — Trois fois béni soit le conseil qui m’est arrivé !",
            "key_scene_title": "Climax & Révélation Visuelle",
            "key_scene_description": "Je ne souhaite pas m'exprimer sur ce que cela signifie, cela va sans dire ...",
            "key_scene_start_time": 215,
            "key_scene_end_time": 275,
            "animation_fps": 8,
            "likes_count": 0,
            "created_at": "2026-08-24T08:18:38.583Z"
        }
    ]

    print(f"TRACKS EXTRAITS : {len(tracks)}")
    print(f"PROPOSALS EXTRAITS : {len(proposals)}")

    with open("scripts/imported_local_data.json", "w", encoding="utf-8") as out:
        json.dump({"tracks": tracks, "proposals": proposals}, out, indent=2, ensure_ascii=False)
    print("FICHIER scripts/imported_local_data.json MIS A JOUR AVEC SUCCES !")
