# Plan Technique & Architecture - MusikToMovie

## 1. Choix de la Stack Technique (100% Gratuite & Open-Source)

Pour répondre aux contraintes (quelques utilisateurs, gratuité totale, faible maintenance, stockage de fichiers audio et dessins) :

```
┌────────────────────────────────────────────────────────┐
│               FRONTEND & APPLICATION WEB               │
│        Next.js (React / TypeScript) / Tailwind CSS     │
│        (Hébergé gratuitement sur Vercel / Netlify)     │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     MODULE STORYBOARD     │ │       MODULE AUDIO        │
│  HTML5 Canvas Interactif  │ │   Web Audio API / Wave    │
│  (Dessin, Pinceau, Export)│ │ (Timecodes, Playback sync)│
└───────────────────────────┘ └───────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌────────────────────────────────────────────────────────┐
│               BACKEND & STOCKAGE (BaaS)                │
│             Supabase (Open-Source / Free Tier)         │
│   • PostgreSQL : Métadonnées, Scénarios, Textes        │
│   • Storage (S3-compatible) : Fichiers MP3 & Dessins   │
│   • Auth (Optionnel) : Comptes ou Pseudo simple        │
└────────────────────────────────────────────────────────┘
```

### Justification des choix
1. **Frontend / Framework** : **Next.js (App Router) + TypeScript**
   - Rendu fluide, Server Actions pour les mutations directes de base de données.
   - Hébergement gratuit à vie sur le Free Tier de **Vercel** ou **Cloudflare Pages**.
2. **Base de données & Stockage Fichiers** : **Supabase (Open-Source / PostgreSQL)**
   - *Base de données* : PostgreSQL gratuit (500 Mo, largement suffisant pour des milliers de scénarios).
   - *Stockage d'objets (Bucket)* : 1 Go gratuit pour stocker les fichiers audio (MP3) et les images générées par le canevas de dessin (PNG/WebP).
   - *Alternative locale/auto-hébergée* : **PocketBase** ou **SQLite + Express**.
3. **Module de Dessin (Storyboard Canvas)** :
   - Composant React basé sur **HTML5 Canvas** (ultra réactif, gestion du trait, gomme, couleurs, calques légers, export Base64/Blob PNG).
4. **Module Audio** :
   - Lecteur audio HTML5 avec synchronisation temporelle (timecodes début/fin pour chaque scène).

---

## 2. Modèle de Données (Database Schema)

### Table `tracks` (Musiques)
| Champ | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identifiant unique |
| `title` | `TEXT` | Titre du morceau |
| `artist` | `TEXT` | Artiste / Compositeur |
| `audio_url` | `TEXT` | URL publique du fichier MP3 dans le bucket de stockage |
| `duration` | `NUMERIC` | Durée en secondes |
| `created_at` | `TIMESTAMPTZ`| Date d'ajout |

### Table `proposals` (Propositions de films / scénarios)
| Champ | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identifiant unique |
| `track_id` | `UUID` (FK) | Référence vers `tracks.id` |
| `author_name` | `TEXT` | Nom ou pseudo de l'utilisateur |
| `movie_title` | `TEXT` | Titre du concept de film |
| `genre` | `TEXT` | Genre (Thriller, Sci-Fi, Drame, etc.) |
| `logline` | `TEXT` | Résumé en une phrase |
| `created_at` | `TIMESTAMPTZ`| Date de création |

### Table `scenes` (Scènes & Storyboard)
| Champ | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identifiant unique |
| `proposal_id` | `UUID` (FK) | Référence vers `proposals.id` |
| `section_type` | `ENUM` | `'preceding'` (Avant), `'main'` (Scène Clé), `'succeeding'` (Après) |
| `scene_title` | `TEXT` | Titre ou en-tête de la séquence |
| `description` | `TEXT` | Texte détaillé de l'action / mise en scène |
| `image_url` | `TEXT` | URL du dessin/croquis exporté du canvas |
| `start_time` | `NUMERIC` | Timecode début (secondes) |
| `end_time` | `NUMERIC` | Timecode fin (secondes) |
| `order_index` | `INT` | Ordre d'affichage de la scène |

---

## 3. Architecture des Composants Frontend

```text
src/
├── app/
│   ├── layout.tsx              # Layout global avec Navbar & Thème
│   ├── page.tsx                # Page d'accueil : Liste des musiques & concepts récents
│   ├── tracks/
│   │   ├── upload/page.tsx     # Formulaire d'upload de musique
│   │   └── [id]/
│   │       ├── page.tsx        # Détail d'une musique + Liste des propositions
│   │       └── create/page.tsx # Studio de création de Storyboard & Scénario
│   └── proposals/
│       └── [id]/page.tsx       # Visionneuse interactive du Film / Storyboard avec musique
├── components/
│   ├── audio/
│   │   ├── AudioPlayer.tsx     # Lecteur audio persistant avec scrubber & timecodes
│   │   └── TrackCard.tsx       # Vignette de musique
│   ├── canvas/
│   │   ├── StoryboardCanvas.tsx# Outil de dessin interactif (Pinceau, Gomme, Undo, Couleurs)
│   │   └── CanvasToolbar.tsx   # Barre d'outils du canevas
│   ├── storyboard/
│   │   ├── SceneEditor.tsx     # Formulaire de scène (Texte + Canvas + Timecode)
│   │   └── StoryboardViewer.tsx# Lecteur de séquence synchronisé
│   └── ui/                     # Boutons, Modales, Inputs, Tabs
└── lib/
    ├── supabase.ts             # Client Supabase
    └── types.ts                # Typage TypeScript des entités
```

---

## 4. Stratégie de Déploiement & Coût Zéro
1. **Dépôt GitHub** : Hébergement du code source.
2. **Vercel** : Déploiement automatique en CI/CD à chaque `git push` (Plan Hobby gratuit).
3. **Supabase Cloud** : Projet PostgreSQL + Stockage S3 (Plan Free : 500MB DB, 1GB Storage, 50k requêtes/mois, amplement suffisant pour l'usage cible).
