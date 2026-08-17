# Liste des Tâches & Découpage (Tasks Breakdown) - MusikToMovie

## Phase 1 : Initialisation du Projet & Base de Données
- [ ] **1.1** Initialiser le projet Next.js avec TypeScript et Tailwind CSS.
- [ ] **1.2** Configurer le client Supabase (Variables d'environnement, schéma SQL et buckets de stockage `audio` et `storyboards`).
- [ ] **1.3** Définir les types TypeScript complets (`Track`, `Proposal`, `Scene`).

## Phase 2 : Gestion Musicale & Lecteur Audio
- [ ] **2.1** Créer le composant lecteur audio (`AudioPlayer`) avec contrôle de lecture, volume, scrubber et affichage du timecode en direct.
- [ ] **2.2** Développer la page d'upload / ajout de morceaux avec stockage du fichier MP3.
- [ ] **2.3** Créer la bibliothèque de morceaux (liste avec pré-écoute).

## Phase 3 : Studio de Dessin & Canevas Storyboard
- [ ] **3.1** Développer le composant de dessin HTML5 Canvas (`StoryboardCanvas`).
- [ ] **3.2** Ajouter les outils : Pinceau (épaisseur, couleur), Gomme, Vider le canevas, Annuler/Refaire (Undo/Redo).
- [ ] **3.3** Implémenter l'export du croquis au format image (PNG Blob) vers le bucket de stockage.

## Phase 4 : Éditeur de Scénario & Séquençage
- [ ] **4.1** Créer le formulaire de proposition (Titre du film, Genre, Logline, Auteur).
- [ ] **4.2** Créer l'éditeur multi-sections (Éléments Précédents / Scène Clé / Éléments Succédants).
- [ ] **4.3** Associer à chaque section : Description textuelle, Dessin storyboard, Timecodes début/fin.
- [ ] **4.4** Enregistrer la proposition complète et ses scènes associées dans la base de données.

## Phase 5 : Visionneuse Interactive & Partage
- [ ] **5.1** Développer la vue de lecture de scénario (`StoryboardViewer`) synchronisant la musique avec les scènes.
- [ ] **5.2** Créer la galerie de comparaison des différentes propositions pour une même musique.

## Phase 6 : Validation & Déploiement
- [ ] **6.1** Valider le bon fonctionnement sur desktop et tablette / mobile.
- [ ] **6.2** Déployer sur Vercel et connecter au projet Supabase.
