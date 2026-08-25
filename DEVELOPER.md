# 🛠️ Documentation Technique & Architecture Développeur (MusikToMovie)

Bienvenue dans la documentation d'architecture de **MusikToMovie**. Ce document est destiné aux développeurs, ingénieurs audio et mainteneurs du projet. Il détaille la stack technique, les algorithmes mathématiques et DSP, le modèle de données et les pipelines d'exécution.

---

## 📋 Table des Matières
1. [Principes Directeurs Ponytail ("Lazy, Not Negligent")](#1-principes-directeurs-ponytail)
2. [Stack Technique & Dépendances](#2-stack-technique--dépendances)
3. [Arborescence du Projet](#3-arborescence-du-projet)
4. [Moteur Canvas 2D & Algorithmes Graphiques (`FlipanimCanvas`)](#4-moteur-canvas-2d--algorithmes-graphiques)
5. [Moteur Audio Multi-Pistes & Décodage Waveform (`audioEngine.ts`)](#5-moteur-audio-multi-pistes--décodage-waveform)
6. [Moteur DSP de Séparation de Stems & Mashup Lab (`stemEngine.ts`)](#6-moteur-dsp-de-séparation-de-stems--mashup-lab)
7. [Intégration Universelle des Plateformes Audio (`youtube.ts`)](#7-intégration-universelle-des-plateformes-audio)
8. [Persistance, Modèle de Données & Schéma Supabase](#8-persistance-modèle-de-données--schéma-supabase)
9. [Installation, Configuration & Commandes NPM](#9-installation-configuration--commandes-npm)

---

## 1. Principes Directeurs Ponytail ("Lazy, Not Negligent")

Le projet applique scrupuleusement l'échelle de décision définie dans `AGENTS.md` :

1. **YAGNI (You Ain't Gonna Need It)** : Ne résoudre que le besoin explicite. Zéro abstraction prématurée.
2. **Bibliothèque standard & Web APIs Natives** : Privilégier les fonctions natives du navigateur :
   - **HTML5 Canvas 2D** pour le storyboard et les masques polygonaux.
   - **Web Audio API** native (`AudioContext`, `BiquadFilterNode`, `MediaStreamAudioDestinationNode`) pour le traitement de signal DSP en temps réel (zéro dépendance serveur lourde).
   - **MediaRecorder API** pour la capture microphone et l'export audio.
3. **Plateforme native** : Utiliser les APIs natives avant d'installer des paquets NPM tiers.
4. **Code Minimaliste & Lisible** : Fonctions directes et déclaratives.
5. **Pas de négligence** : Gestion rigoureuse des erreurs, validation des entrées, fallbacks automatiques hors-ligne (`LocalStorage`).

---

## 2. Stack Technique & Dépendances

| Catégorie | Technologie | Rôle |
| :--- | :--- | :--- |
| **Framework UI** | React 18 (Hooks, Context, FC) | Composants d'interface déclaratifs |
| **Langage** | TypeScript (Strict Mode) | Typage statique, interfaces de données |
| **Styles** | Tailwind CSS + `@tailwindcss/typography` | Design moderne, animations, responsive |
| **Build Tool** | Vite 6 | Bundler HMR ultra-rapide |
| **Traitement Audio** | Web Audio API native | Filtrage 3 bandes, séparation 4 stems, décodage PCM |
| **Moteur Graphique** | HTML5 Canvas 2D Context | Dessin matriciel, lasso polygonal, transformation 2D |
| **Base de Données** | Supabase (PostgreSQL) + LocalStorage | Persistance hybride cloud & offline |
| **Icônes** | Lucide React | Iconographie SVG cohérente |

---

## 3. Arborescence du Projet

```
MusikToMovie/
├── public/                     # Assets statiques
├── src/
│   ├── components/
│   │   ├── about/              # ConceptPage (Manifeste & onboarding)
│   │   ├── admin/              # AdminModal (Gestion des suppressions)
│   │   ├── audio/              # AudioPlayer (Lecteur YouTube & synchronisation)
│   │   ├── canvas/             # FlipanimCanvas (Moteur de dessin & storyboard)
│   │   ├── clippy/             # CineClippy (Mascotte & anecdotes cinéma)
│   │   ├── icons/              # Icônes SVG custom (YouTubeIcon, etc.)
│   │   ├── movietomusik/       # MovieToMusikStudio & MovieToMusikGallery
│   │   ├── musiktomusik/       # MusikToMusikStudio & MusikToMusikGallery
│   │   ├── storyboard/         # ProposalCreator, ProposalViewer, ProposalsGallery
│   │   ├── tracks/             # TrackList, TrackUploadModal
│   │   └── Navbar.tsx          # Barre de navigation à 3 modes
│   ├── lib/
│   │   ├── audioEngine.ts      # Moteur multi-pistes micro, EQ & DSP Waveforms
│   │   ├── stemEngine.ts       # Moteur DSP séparation de Stems & Mashup Lab
│   │   ├── supabase.ts         # Client Supabase & Fallbacks LocalStorage
│   │   ├── types.ts            # Interfaces TypeScript globales
│   │   └── youtube.ts          # Détecteur de plateformes & extraction oEmbed
│   ├── App.tsx                 # Routeur & State global de l'application
│   ├── index.css               # Directives Tailwind & styles de curseurs canvas
│   └── main.tsx                # Point d'entrée React
├── AGENTS.md                   # Règles de développement Ponytail
├── DEVELOPER.md                # Documentation technique (ce fichier)
├── README.md                   # Guide utilisateur et présentation générale
├── package.json                # Dépendances et scripts de build
├── tailwind.config.js          # Configuration Tailwind (couleurs, ombres)
├── tsconfig.json               # Configuration TypeScript
└── vite.config.ts              # Configuration Vite
```

---

## 4. Moteur Canvas 2D & Algorithmes Graphiques (`FlipanimCanvas`)

Le composant `src/components/canvas/FlipanimCanvas.tsx` gère le storyboard animé 16:9 (résolution native `640x360`).

### 4.1. Algorithme de Découpe par Lasso Libre (`ctx.clip()`)
Lorsque l'utilisateur entoure une zone au Lasso libre :
1. **Enregistrement des points polygonaux** : `lassoPoints: Point[]`.
2. **Calcul de la Bounding Box AABB** :
   $$\text{minX} = \min(P_x), \quad \text{minY} = \min(P_y), \quad \text{width} = \max(P_x) - \text{minX}, \quad \text{height} = \max(P_y) - \text{minY}$$
3. **Extraction dans un Canvas temporaire isolé** :
   ```ts
   const tempCanvas = document.createElement('canvas');
   tempCanvas.width = width;
   tempCanvas.height = height;
   const tempCtx = tempCanvas.getContext('2d')!;

   // Masque polygonal
   tempCtx.beginPath();
   lassoPoints.forEach((pt, i) => {
     const localX = pt.x - minX;
     const localY = pt.y - minY;
     if (i === 0) tempCtx.moveTo(localX, localY);
     else tempCtx.lineTo(localX, localY);
   });
   tempCtx.closePath();
   tempCtx.clip(); // Restreindre le dessin à l'intérieur du lasso
   tempCtx.drawImage(canvas, -minX, -minY);
   ```
4. **Effacement de la zone d'origine sur le calque principal** :
   ```ts
   mainCtx.save();
   mainCtx.globalCompositeOperation = 'destination-out';
   mainCtx.beginPath();
   lassoPoints.forEach((pt, i) => {
     if (i === 0) mainCtx.moveTo(pt.x, pt.y);
     else mainCtx.lineTo(pt.x, pt.y);
   });
   mainCtx.closePath();
   mainCtx.fill();
   mainCtx.restore();
   ```
5. **Instanciation de l'Objet Flottant (`FloatingObject`)** :
   ```ts
   setFloatingObject({
     canvas: tempCanvas,
     x: minX + width / 2,
     y: minY + height / 2,
     width,
     height,
     scaleX: 1,
     scaleY: 1,
     rotation: 0
   });
   ```

### 4.2. Rendu Matriciel 2D de l'Objet Flottant
L'objet est rendu en surimpression (`overlayCanvas`) avec la matrice 2D suivante :
```ts
ctx.save();
ctx.translate(obj.x, obj.y);
ctx.rotate((obj.rotation * Math.PI) / 180);
ctx.scale(obj.scaleX, obj.scaleY);
ctx.drawImage(obj.canvas, -obj.width / 2, -obj.height / 2);
ctx.restore();
```

### 4.3. Gestion des Événements Hors-Canvas
Pour permettre de tracer des lignes qui traversent les bords ou de déplacer un objet jusqu'à l'extrême bord de l'écran, des écouteurs globaux `window.addEventListener('mousemove')` et `window.addEventListener('mouseup')` sont enregistrés pendant la phase `isDrawing` ou `transformInteraction`. Les coordonnées sont recalculées par rapport au `rect = canvas.getBoundingClientRect()` sans clamping forcé, garantissant des tracés continus jusqu'aux limites absolues.

---

## 5. Moteur Audio Multi-Pistes & Décodage Waveform (`audioEngine.ts`)

Le fichier `src/lib/audioEngine.ts` gère l'enregistrement microphone overdubbing et le mixage multi-pistes.

### 5.1. Graph de Nœuds Web Audio par Piste
Pour chaque piste enregistrée dans `MultiTrackAudioEngine` :

```
[HTMLAudioElement] 
       │
       ▼
[MediaElementAudioSourceNode]
       │
       ▼
[BiquadFilter (Low-Shelf 200Hz - Bass)]
       │
       ▼
[BiquadFilter (Peaking 1200Hz - Mid)]
       │
       ▼
[BiquadFilter (High-Shelf 3500Hz - Treble)]
       │
       ▼
[GainNode (Volume Piste + Mute / Solo Logic)]
       │
       ▼
[Master GainNode (1.0)] ──► [AudioContext.destination]
```

### 5.2. Décodage et Calcul des Crêtes Waveform (DSP)
La fonction `extractWaveformData(base64OrBlob, samplesCount = 100)` décode les données PCM natives :
```ts
const audioCtx = new AudioContext();
const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
const channelData = audioBuffer.getChannelData(0); // Canal mono ou gauche
const blockSize = Math.floor(channelData.length / samplesCount);
const peaks: number[] = [];

for (let i = 0; i < samplesCount; i++) {
  const start = i * blockSize;
  let sum = 0;
  for (let j = 0; j < blockSize; j++) {
    sum += Math.abs(channelData[start + j]);
  }
  peaks.push(sum / blockSize);
}

// Normalisation
const max = Math.max(...peaks, 0.001);
const normalized = peaks.map(p => Math.max(0.08, Math.min(1.0, p / max)));
```

### 5.3. Rognage Temporel Anti-Clic (`trim_start` / `trim_end`)
Les micros génèrent fréquemment un clic acoustique au moment du déclenchement du bouton physique.
Dans `MultiTrackAudioEngine` :
- `trim_start` : Par défaut initialisé à `0.08s` pour éliminer le transitoire initial du clic.
- Écouteur `timeupdate` :
  ```ts
  if (audio.currentTime >= trimEnd) {
    audio.currentTime = trimStart;
    if (this.isPlaying) audio.play().catch(() => {});
  }
  ```

---

## 6. Moteur DSP de Séparation de Stems & Mashup Lab (`stemEngine.ts`)

Le fichier `src/lib/stemEngine.ts` implémente un filtre de crossover 4 bandes en temps réel couplé à une séparation spatiale Mid/Side.

### 6.1. Pipeline de Filtrage des 4 Stems

```
                            [Source Audio Deck]
                                     │
         ┌───────────────────┬───────┴───────────┬───────────────────┐
         ▼                   ▼                   ▼                   ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │   🎤 VOCALS  │    │   🥁 DRUMS   │    │   🎸 BASS    │    │  🎹 MELODY   │
  │ Highpass 280 │    │ Highpass 55  │    │ Lowpass 180  │    │ Highpass 1200│
  │ Lowpass 3500 │    │ Lowpass 220  │    │ Lowpass 180  │    │ HighShelf3200│
  │ Peaking 1500 │    │ Snap 4500Hz  │    │ (Sub 20-180) │    │ (Harmonics)  │
  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
         │                   │                   │                   │
         ▼                   ▼                   ▼                   ▼
   [Vocals Gain]       [Drums Gain]        [Bass Gain]        [Melody Gain]
         │                   │                   │                   │
         └───────────────────┴───────┬───────────┴───────────────────┘
                                     ▼
                             [Master GainNode]
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
         [AudioDestination]              [MediaStreamDestination]
         (Haut-parleurs)                 (Enregistrement REC)
```

### 6.2. Matrice de Croisement (`StemMixConfig`)
Pour chaque stem $S \in \{\text{vocals}, \text{drums}, \text{bass}, \text{melody}\}$ :
$$\text{Output}_S = \begin{cases} 
\text{DeckA}_S \cdot \text{VolA}_S & \text{si source = 'A'} \\
\text{DeckB}_S \cdot \text{VolB}_S & \text{si source = 'B'} \\
\text{DeckA}_S \cdot \text{VolA}_S + \text{DeckB}_S \cdot \text{VolB}_S & \text{si source = 'both'} \\
0 & \text{si source = 'none' ou isMuted}
\end{cases}$$

### 6.3. Calage DJ & Synchronisation Deck B
- **Pitch / BPM Shift** : Appliqué nativement via `deckB.playbackRate = speedRatioB` (plage $0.80$ à $1.30$).
- **Offset Temporel** : Synchronisation du déphasage temporel :
  $$\text{Time}_B = (\text{Time}_A + \text{Offset}_B) \pmod{\text{Duration}_B}$$

---

## 7. Intégration Universelle des Plateformes Audio (`youtube.ts`)

Le fichier `src/lib/youtube.ts` assure la compatibilité multi-plateformes :

```ts
export type PlatformSource = 'youtube' | 'youtube_music' | 'spotify' | 'deezer' | 'soundcloud' | 'unknown';
```

1. **Détection Regex de l'URL** : Identifie la plateforme cible.
2. **Extraction YouTube ID** : Supporte `youtu.be/ID`, `youtube.com/watch?v=ID`, `music.youtube.com/watch?v=ID`.
3. **Résolution Métadonnées oEmbed** :
   - YouTube : `https://www.youtube.com/oembed?url=...&format=json`
   - Spotify : `https://open.spotify.com/oembed?url=...`
   - Deezer : `https://api.deezer.com/oembed?url=...`
   - SoundCloud : `https://soundcloud.com/oembed?url=...&format=json`

---

## 8. Persistance, Modèle de Données & Schéma Supabase

### 8.1. Schéma des Tables PostgreSQL (Supabase)

```sql
-- 1. Table des Musiques
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  genre TEXT,
  audio_url TEXT NOT NULL,
  youtube_id TEXT,
  thumbnail_url TEXT,
  duration NUMERIC DEFAULT 0,
  default_start_time NUMERIC DEFAULT 0,
  default_end_time NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table des Storyboards & Scénarios (MusikToMovie)
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  director_name TEXT NOT NULL,
  genre TEXT,
  logline TEXT,
  intention TEXT,
  visual_style TEXT,
  target_audience TEXT,
  scenes JSONB NOT NULL DEFAULT '[]'::jsonb,
  votes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table des Projets MovieToMusik (Studio Bruitage Micro)
CREATE TABLE movietomusik_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  genre TEXT,
  visual_type TEXT NOT NULL,
  visual_url TEXT NOT NULL,
  tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
  audio_data TEXT,
  duration NUMERIC DEFAULT 0,
  description TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Table des Mashups MusikToMusik (Stems Splitter)
CREATE TABLE musiktomusik_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  genre TEXT,
  trackA JSONB NOT NULL,
  trackB JSONB NOT NULL,
  stem_config JSONB NOT NULL,
  speed_ratio_B NUMERIC DEFAULT 1.0,
  offset_seconds_B NUMERIC DEFAULT 0.0,
  recorded_audio_data TEXT,
  duration NUMERIC DEFAULT 45,
  description TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 8.2. Stratégie de Résilience Hors-Ligne (Offline Fallback)
Toutes les fonctions dans `src/lib/supabase.ts` implémentent un bloc `try / catch` avec repli automatique sur le `LocalStorage` du navigateur (`safeGetLocalStorage`, `safeSetLocalStorage`). Si Supabase est injoignable ou non configuré, l'application continue de fonctionner à 100%.

---

## 9. Installation, Configuration & Commandes NPM

### 9.1. Prérequis
- **Node.js** >= 18.0.0
- **NPM** >= 9.0.0

### 9.2. Installation
```bash
git clone https://github.com/Hagarde/MusikToMovie.git
cd MusikToMovie
npm install
```

### 9.3. Variables d'Environnement (`.env` optionnel)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 9.4. Commandes de Développement & Build
```bash
# Lancer le serveur de développement HMR (port 5173)
npm run dev

# Vérification TypeScript & compilation de production Vite
npm run build

# Prévisualiser le build localement
npm run preview
```

---

## 🤝 Contribution & Bonnes Pratiques
1. Respectez les directives **Ponytail** (`AGENTS.md`).
2. Vérifiez systématiquement la compilation via `npm run build` avant de commiter.
3. Préservez les commentaires et docstrings existants.
