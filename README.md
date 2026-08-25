# 🎬 MusikToMovie • La Plateforme Créative Audio-Visuelle & Mashup

> **Plateforme web artistique et interactive réunissant le cinéma, le storyboard, le sound design et le remix musical.**  
> Développé avec **React 18**, **TypeScript**, **Tailwind CSS**, **Web Audio API native** et **HTML5 Canvas 2D**.

---

## 🌟 Les 3 Univers Créatifs

MusikToMovie propose 3 modes complémentaires pour explorer toutes les facettes du lien entre image et son :

```
                        ┌───────────────────────────────┐
                        │   🎵 MusikToMovie Platform    │
                        └───────────────┬───────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│  🎬 MusikToMovie      │   │  🎙️ MovieToMusik      │   │  🎛️ MusikToMusik      │
│ (Musique → Storyboard)│   │ (Visuel → Bruitage)   │   │ (Stems DSP & Mashup)  │
└───────────────────────┘   └───────────────────────┘   └───────────────────────┘
```

| Mode | Concept | Ce que vous pouvez faire |
| :--- | :--- | :--- |
| **🎬 MusikToMovie** | **Musique ➔ Film & Storyboard** | Choisissez une musique YouTube, découpez-la en scènes (Précédente, Principale, Suivante) et dessinez votre storyboard animé plan par plan avec le moteur **Flipanim**. |
| **🎙️ MovieToMusik** | **Visuel ➔ Musique & Bruitage** | Importez une vidéo MP4, un GIF ou une image, enregistrez vos voix/bruitages au micro avec superposition illimitée (Overdubbing) et éditez vos pistes sur la **Timeline Audacity**. |
| **🎛️ MusikToMusik** | **Musique A + B ➔ Remix & Mashup** | Branchez 2 musiques YouTube, isolez en temps réel les **4 pistes (Voix, Batterie, Basse, Mélodie)** grâce au moteur DSP Web Audio et créez un remix hybride synchronisé. |

---

## 🚀 Guide Utilisateur Rapide

### 1. 🎬 Mode MusikToMovie (Scénariser & Dessiner)
1. **Choisir une Musique** : Cliquez sur l'onglet **« Musiques »** ou ajoutez votre propre lien YouTube/Spotify/Deezer via le bouton **`[+ Ajouter Musique]`**.
2. **Découper le Scénario** : Définissez vos 3 scènes narratives :
   - *Scène Précédente* : Le contexte initial.
   - *Scène Principale* : Le moment fort synchronisé avec la musique.
   - *Scène Suivante* : La conclusion ou le cliffhanger.
3. **Dessiner avec Flipanim Canvas** :
   - ✏️ **Crayon, Marqueur, Formes (Rectangle, Cercle, Flèche)** & Pot de peinture.
   - ✂️ **Lasso Libre (Touche `L`) & Cadre** : Entourez n'importe quelle zone de votre dessin pour la déplacer, la redimensionner ou la pivoter.
   - 🎬 **`[🎬 Animer sur Frame Suivante ➡️]`** : Propagez votre objet sélectionné d'image en image en 1 clic pour un stop-motion ultra-rapide.
   - 🧅 **Pelure d'oignon** : Affiche la frame précédente en transparence pour caler vos mouvements.
4. **Publier & Partager** : Sauvegardez votre storyboard et partagez son URL unique (`?story=ID`) dans la galerie.

---

### 2. 🎙️ Mode MovieToMusik (Sound Design & Bruitage Micro)
1. **Choisir un Visuel** : Sélectionnez un des presets cinéma ou importez votre propre vidéo MP4, GIF animé ou image.
2. **Enregistrer au Micro (Overdubbing)** :
   - Cliquez sur **`[Enregistrer la Piste]`** : le compte à rebours 3-2-1 se lance et la vidéo démarre.
   - Chantez, beatboxez ou bruitiez. Les prises précédentes jouent automatiquement dans votre casque en fond sonore !
3. **Éditer sur la Timeline Waveform (Style Audacity)** :
   - Observez les **véritables formes d'onde audio** de chaque prise.
   - Glissez la **poignée gauche `[|◀]`** pour **couper le clic de micro ou le silence initial**.
   - Glissez la **poignée droite `[▶|]`** pour raccourcir la fin.
   - Ajustez l'**Égaliseur EQ 3 Bandes** (Bass, Mid, Treble) et le volume par piste, ou utilisez Mute (🔇) et Solo (🎧).
4. **Publier** : Partagez votre création audio-visuelle synchronisée (`?m2m_story=ID`).

---

### 3. 🎛️ Mode MusikToMusik (Séparateur de Stems & Mashup Lab)
1. **Charger les Decks A & B** :
   - Cliquez sur **`[📺 Changer / YouTube]`** sur le Deck A et le Deck B.
   - Choisissez un morceau parmi la bibliothèque ou **collez n'importe quel lien YouTube**.
2. **Mixer les 4 Pistes (Stems)** :
   - 🎤 **Voix / Acapella** : Choisissez si vous voulez la voix du morceau A, B, les deux ou aucune.
   - 🥁 **Batterie & Beat** : Isolez le rythme d'un des morceaux.
   - 🎸 **Basse & Sub** : Conservez la ligne de basse souhaitée.
   - 🎹 **Mélodie & Synthés** : Combinez les instruments et harmonies.
3. **Calage DJ Tempo (BPM) & Synchronisation** :
   - Ajustez la vitesse du Deck B (`80%` à `130%`) pour caler le tempo.
   - Réglez le décalage temporel (`Offset`) pour aligner les refrains et les drops.
4. **Enregistrer & Partager** : Cliquez sur **`[🔴 Enregistrer]`** pour capturer le mix en direct et le publier dans la galerie (`?mashup=ID`).

---

## ⌨️ Raccourcis Clavier Pratiques (Studio Flipanim)

| Raccourci | Action |
| :--- | :--- |
| **`B`** | Outil Crayon standard |
| **`E`** | Outil Gomme |
| **`L`** | Outil **Lasso Libre** (Sélectionner une zone) |
| **`F`** | Remplissage (Pot de peinture) |
| **`I`** | Pipette (Sélection de couleur) |
| **`Ctrl + Z`** | Annuler la dernière action |
| **`Ctrl + Y`** | Rétablir l'action |
| **`Espace`** | Lancer / Mettre en pause la lecture Flipbook |
| **`[` / `]`** | Diminuer / Agrandir la taille du pinceau |

---

## 🛠️ Stack Technique

- **Frontend** : React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite.
- **Audio DSP Engine** : Web Audio API native (`AudioContext`, `BiquadFilterNode`, `MediaElementAudioSourceNode`, `AnalyserNode`, `MediaStreamAudioDestinationNode`).
- **Canvas Engine** : HTML5 Canvas 2D avec matrices de transformation 2D et écouteurs d'événements globaux `window`.
- **Intégration Vidéo** : YouTube IFrame Player API & lecteur vidéo HTML5 natif.
- **Backend & Base de données** : Supabase (PostgreSQL) avec système de secours automatique **LocalStorage** haute résilience.

---

## 📚 Documentation Développeur

Pour consulter l'architecture logicielle complète, les diagrammes de flux de traitement du signal (DSP), les matrices mathématiques du Canvas et le schéma de base de données, consultez :
👉 **[`DEVELOPER.md`](./DEVELOPER.md)**

---

## 📄 Licence
Projet open-source sous licence **MIT**.
Créé pour l'**UTT** et la communauté créative.
GitHub : [https://github.com/Hagarde/MusikToMovie](https://github.com/Hagarde/MusikToMovie)