# Spécifications Fonctionnelles - MusikToMovie

## 1. Contexte & Vision du Produit
**MusikToMovie** est une application web collaborative et créative permettant à un petit groupe d'utilisateurs de concevoir des concepts cinématographiques et storyboards inspirés par des morceaux musicaux.

L'objectif est d'explorer comment une musique peut donner vie à une scène clé de film, ainsi qu'aux séquences narratives qui la précèdent et lui succèdent.

---

## 2. Personas & Cibles
- **Scénaristes, vidéastes, passionnés de cinéma & musique** : Utilisateurs souhaitant poser rapidement des idées visuelles et narratives à l'écoute d'un morceau.
- **Taille de l'audience** : Petite équipe / cercle restreint (quelques utilisateurs, 5-20 personnes).
- **Contrainte budgétaire** : 100% hébergement gratuit (Free Tier / Open-source).

---

## 3. Parcours Utilisateur & Fonctionnalités Clés

### 3.1. Gestion de la Musique
- **Bibliothèque musicale** : Consultation de la liste des morceaux disponibles.
- **Ajout de musique** : Upload de fichiers audio (MP3, WAV) ou association d'URL audio avec métadonnées (Titre, Artiste, Genre, Durée).
- **Lecteur audio intégré** : Lecture/pause, contrôle du volume, scrubber/timeline avec repérage temporel (timecodes).

### 3.2. Création de Proposition de Scénario / Film
Pour une musique sélectionnée, l'utilisateur peut créer une **Proposition** composée de 3 blocs narratifs :
1. **La Scène Clé (Scène Principale)** : La scène centrale spécifiquement synchronisée avec la musique.
2. **Les Éléments Précédents (Avant)** : Contexte, scènes d'introduction ou montée dramatique menant à la scène.
3. **Les Éléments Succédants (Après)** : Résolution, conséquences ou transition narrative post-scène.

### 3.3. Outils de Description Multi-formes
Chaque bloc/scène dispose de :
- **Un canevas de dessin (Storyboard Sketch)** : Outil de dessin intégré (pinceau, gomme, couleurs, épaisseur, annuler/refaire) pour esquisser des plans, cadrages ou personnages.
- **Un éditeur de texte narratif** : Titre de la scène, description de l'action, cadrage/caméra, ambiance sonore, intentions de mise en scène.
- **Timecodes associés** : Possibilité d'indiquer à quel intervalle de la musique la scène correspond (ex: `01:15` - `02:30`).

### 3.4. Consultation & Partage
- Visualisation d'une proposition complète sous forme de storyboard interactif avec lecture de la musique en fond.
- Comparaison des différentes propositions de scénarios imaginées par les utilisateurs pour une même musique.

---

## 4. Critères d'Acceptation (Acceptance Criteria)
- [ ] L'utilisateur peut écouter un morceau et naviguer dans la timeline audio.
- [ ] L'utilisateur peut dessiner directement sur un canevas interactif et sauvegarder son croquis sans outil externe.
- [ ] L'utilisateur peut rédiger les textes des 3 séquences (Avant / Scène Clé / Après).
- [ ] Les données (textes, images dessinées, morceaux audio) sont persistées de manière fiable sur un stockage persistant gratuit.
- [ ] L'interface est responsive, intuitive et agréable à utiliser sur desktop et tablette.
