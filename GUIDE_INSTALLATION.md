# 🚀 Guide d'Installation & Démarrage Rapide (Ordinateur Vierge)

Ce guide pas à pas permet de rendre **MusikToMovie** et son moteur d'IA **Demucs v4** 100% opérationnels sur un ordinateur totalement vierge en moins de 3 minutes.

---

## 📋 Étape 0 : Les 2 Seuls Prérequis à Télécharger

Si vous êtes sur une nouvelle machine, installez ces deux outils gratuits :

1. **Node.js (LTS)** : [Télécharger Node.js](https://nodejs.org/) *(Cliquez sur suivant jusqu'au bout)*
2. **Python 3** : [Télécharger Python](https://www.python.org/downloads/)  
   > ⚠️ **TRÈS IMPORTANT lors de l'installation de Python** : Cochez bien la case **☑️ "Add python.exe to PATH"** en bas de la première fenêtre !

*(Si vous n'avez pas Git, vous pouvez simplement télécharger le projet en ZIP via le bouton vert "Code" > "Download ZIP" sur GitHub).*

---

## ⚡ Étape 1 : Cloner ou Télécharger le Répertoire

Ouvrez un terminal (PowerShell ou Invite de commandes) :
```bash
git clone https://github.com/Hagarde/MusikToMovie.git
cd MusikToMovie
```

---

## 📦 Étape 2 : Installation Automatique en 1 Clic

Double-cliquez simplement sur le fichier :
### 👉 `installer_tout.bat`

Ce script va automatiquement :
1. Installer toutes les dépendances web (`npm install`).
2. Installer PyTorch optimisé, Demucs v4 et les outils audio (`pip install demucs yt-dlp imageio-ffmpeg`).
3. Configurer automatiquement FFmpeg.
4. Afficher **`✅ TOUT EST PRÊT !`**

---

## 🎧 Étape 3 : Utilisation au Quotidien

Vous disposez de deux scripts 1-clic :

| Script | Action |
| :--- | :--- |
| **`lancer_studio.bat`** | Démarre le serveur local et **ouvre votre navigateur** sur le studio de mixage (`http://localhost:5173`). |
| **`extraire_pistes.bat`** | Vous demande un lien YouTube ou un MP3, et **sépare automatiquement les 4 pistes** en qualité studio dans le dossier `stems_output/`. |

---

## 🎛️ Résumé du Workflow Studio Pro :

```
1. Double-cliquez sur "extraire_pistes.bat"
   └── Collez votre lien YouTube (ex: morceau A et morceau B).
   └── Le script crée les dossiers avec vos 4 fichiers WAV.

2. Double-cliquez sur "lancer_studio.bat"
   └── Le site web s'ouvre dans votre navigateur.
   └── Cliquez sur [📂 Importer MP3 / Stems Pro] sur le Deck A et glissez les 4 fichiers.
   └── Faites de même sur le Deck B.

3. Mixez, activez le Solo/Mute, synchronisez le tempo et profitez d'une isolation 100% pure !
```
