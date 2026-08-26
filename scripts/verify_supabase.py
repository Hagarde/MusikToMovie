import requests
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

headers = {
    "apikey": "sb_publishable_nii-4wn98Yh4ESEzF_DkBw_qAYVzoIK",
    "Authorization": "Bearer sb_publishable_nii-4wn98Yh4ESEzF_DkBw_qAYVzoIK"
}

r = requests.get("https://hbxejvpynymcxghdkbkh.supabase.co/rest/v1/tracks?select=id,title,artist,youtube_id", headers=headers)
data = r.json()
print("==================================================")
print(f"🎉 SUCCÈS : {len(data)} MORCEAUX ENREGISTRÉS DANS SUPABASE !")
print("==================================================")
for i, t in enumerate(data, 1):
    print(f"  {i:02d}. {t.get('artist', '')} - {t.get('title', '')} [YouTube: {t.get('youtube_id')}]")
