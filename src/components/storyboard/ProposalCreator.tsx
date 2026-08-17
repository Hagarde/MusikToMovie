import React, { useState } from 'react';
import { 
  Film, 
  ArrowLeft, 
  Save, 
  Sparkles, 
  User, 
  Tag, 
  FileText, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Clapperboard, 
  Layers,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Track, Proposal } from '../../lib/types';
import { FlipanimCanvas } from '../canvas/FlipanimCanvas';
import { AudioPlayer } from '../audio/AudioPlayer';
import { createProposal } from '../../lib/supabase';

interface ProposalCreatorProps {
  track: Track;
  onBack: () => void;
  onProposalSaved: (proposal: Proposal) => void;
}

const GENRES = [
  'Drame',
  'Thriller / Suspense',
  'Science-Fiction',
  'Cyberpunk',
  'Action / Course-poursuite',
  'Horreur / Mystère',
  'Romance / Poésie',
  'Film Noir',
  'Animation',
];

export const ProposalCreator: React.FC<ProposalCreatorProps> = ({
  track,
  onBack,
  onProposalSaved,
}) => {
  // Infos Générales du Film
  const [movieTitle, setMovieTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [logline, setLogline] = useState('');

  // 3 Blocs Narratifs
  const [contextBefore, setContextBefore] = useState('');
  const [contextAfter, setContextAfter] = useState('');

  // Scène Clé
  const initialStartTime = track.default_start_time || Math.floor(track.duration * 0.25);
  const initialEndTime = Math.min(Math.floor(track.duration), initialStartTime + 30);

  const [keySceneTitle, setKeySceneTitle] = useState('Climax & Révélation Visuelle');
  const [keySceneDesc, setKeySceneDesc] = useState('');
  const [startTime, setStartTime] = useState<number>(initialStartTime);
  const [endTime, setEndTime] = useState<number>(initialEndTime);
  const [frames, setFrames] = useState<string[]>(['']);
  const [animationFps, setAnimationFps] = useState<number>(3);

  // État lecteur et synchronisation Flipbook
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [forcePlayTime, setForcePlayTime] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr: string) => {
    const parts = timeStr.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(timeStr, 10) || 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieTitle.trim()) {
      alert('Veuillez renseigner un titre de film.');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await createProposal(
        {
          track_id: track.id,
          author_name: authorName.trim() || 'Scénariste Anonyme',
          movie_title: movieTitle.trim(),
          genre,
          logline: logline.trim(),
          context_before: contextBefore.trim(),
          context_after: contextAfter.trim(),
          key_scene_title: keySceneTitle.trim(),
          key_scene_description: keySceneDesc.trim(),
          key_scene_start_time: startTime,
          key_scene_end_time: endTime,
          frames: frames.filter(f => !!f), // On ne garde que les frames dessinées
          animation_fps: animationFps,
        },
        // Rétrocompatibilité pour la table scenes
        [
          {
            section_type: 'preceding',
            scene_title: 'Ce qui précède',
            description: contextBefore,
            image_data: '',
            start_time: 0,
            end_time: startTime,
            order_index: 0,
          },
          {
            section_type: 'main',
            scene_title: keySceneTitle,
            description: keySceneDesc,
            image_data: frames[0] || '',
            start_time: startTime,
            end_time: endTime,
            order_index: 1,
          },
          {
            section_type: 'succeeding',
            scene_title: 'Ce qui succède',
            description: contextAfter,
            image_data: '',
            start_time: endTime,
            end_time: Math.floor(track.duration),
            order_index: 2,
          }
        ]
      );

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#bf882d', '#f5edd6', '#3b82f6', '#ef4444']
      });

      onProposalSaved(saved);
    } catch (err) {
      console.error(err);
      alert('Une erreur est survenue lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Navigation et Sauvegarde */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cinema-850 hover:bg-cinema-800 border border-cinema-700 text-xs font-medium text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la bibliothèque</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !movieTitle.trim()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-cinema-950 font-bold text-xs transition-transform hover:scale-105 shadow-lg shadow-brand-500/20 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Enregistrement...' : 'Publier le Storyboard & Scénario'}</span>
        </button>
      </div>

      {/* Lecteur Audio persistant centré sur l'intervalle de la Scène Clé */}
      <div className="sticky top-4 z-40">
        <AudioPlayer
          track={track}
          onTimeUpdate={setCurrentAudioTime}
          highlightRange={{ start: startTime, end: endTime }}
          forcePlayAtTime={forcePlayTime}
        />
      </div>

      {/* 1. Fiche Générale du Film */}
      <div className="bg-cinema-850 rounded-2xl border border-cinema-700 p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-cinema-700/60 pb-3">
          <Film className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-bold text-white">
            Concept & Univers du Film
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Titre du Film / Scénario *
            </label>
            <input
              type="text"
              required
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              placeholder="Ex: Mirage Urbain, Dernier Signal, Écho Silencieux..."
              className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Scénariste / Réalisateur
            </label>
            <div className="relative">
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Votre nom"
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Genre Cinématographique
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Pitch / Logline en une phrase
            </label>
            <input
              type="text"
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
              placeholder="Ex: Dans une ville plongée dans le noir, une détective traque une silhouette insaisissable."
              className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      {/* 2. Bloc Narratif 1 : Éléments Précédents (Texte uniquement) */}
      <div className="bg-cinema-850 rounded-2xl border border-blue-500/30 p-6 shadow-xl space-y-3">
        <div className="flex items-center gap-2 border-b border-cinema-700/60 pb-3">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-bold text-white text-base">
              1. Ce qui précède (Contexte & Mise en place)
            </h3>
            <p className="text-xs text-slate-400">
              Rédigez le contexte narratif : où sommes-nous, qui sont les personnages et comment la tension monte avant la scène clé ?
            </p>
          </div>
        </div>

        <textarea
          rows={4}
          value={contextBefore}
          onChange={(e) => setContextBefore(e.target.value)}
          placeholder="Ex: Après des jours de filature dans les bas-fonds de la métropole, Marcus rejoint le toit de la tour Apex. La pluie commence à tomber, les sirènes résonnent au loin..."
          className="w-full bg-cinema-900 border border-cinema-700 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 leading-relaxed resize-none"
        />
      </div>

      {/* 3. Bloc Narratif 2 : LA SCÈNE CLÉ (Dessins Flipanim + Minutage + Texte) */}
      <div className="bg-cinema-850 rounded-2xl border-2 border-brand-500/80 p-6 shadow-2xl space-y-5 ring-1 ring-brand-500/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cinema-700/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500 text-cinema-950 flex items-center justify-center font-black shadow-md">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                2. La Scène Clé & Storyboard Animé
                <span className="text-[10px] uppercase tracking-wider bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full border border-brand-500/40">
                  Moment Fort Synchronisé
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                L'instant précis où la musique explose : dessinez une ou plusieurs frames en mode animation flipbook !
              </p>
            </div>
          </div>

          {/* Timecodes de synchronisation avec YouTube */}
          <div className="flex items-center gap-2 text-xs font-mono bg-cinema-900 px-3.5 py-1.5 rounded-xl border border-cinema-700">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-slate-400">Timecode :</span>
            <input
              type="text"
              value={formatSeconds(startTime)}
              onChange={(e) => setStartTime(parseTime(e.target.value))}
              className="w-12 bg-cinema-800 text-center rounded text-brand-300 font-bold px-1 py-0.5 border border-cinema-700 text-xs"
              placeholder="01:20"
              title="Début"
            />
            <span className="text-slate-500">→</span>
            <input
              type="text"
              value={formatSeconds(endTime)}
              onChange={(e) => setEndTime(parseTime(e.target.value))}
              className="w-12 bg-cinema-800 text-center rounded text-brand-300 font-bold px-1 py-0.5 border border-cinema-700 text-xs"
              placeholder="01:50"
              title="Fin"
            />

            <button
              type="button"
              onClick={() => {
                setStartTime(Math.floor(currentAudioTime));
                setEndTime(Math.floor(currentAudioTime) + 25);
              }}
              className="text-[10px] bg-cinema-700 hover:bg-brand-500 hover:text-cinema-950 text-slate-300 px-2 py-1 rounded transition-colors font-medium ml-1"
              title="Caler le timecode sur le lecteur audio actuel"
            >
              Prendre ({formatSeconds(currentAudioTime)})
            </button>
          </div>
        </div>

        {/* Studio de Dessin Multi-Frames (Flipanim) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 text-brand-300">
              <Layers className="w-4 h-4" />
              Dessin Storyboard (Animation Multi-Frames / Flipbook)
            </span>
            <span className="text-[11px] text-slate-400">
              Astuce : Utilisez la <strong>Pelure d'oignon</strong> et <strong>Dupliquer</strong> pour créer facilement du mouvement !
            </span>
          </div>

          <FlipanimCanvas
            initialFrames={frames}
            fps={animationFps}
            onChange={(updatedFrames) => setFrames(updatedFrames)}
            onTogglePlayAnim={(isPlaying) => {
              if (isPlaying) {
                setForcePlayTime(startTime);
              } else {
                setForcePlayTime(-1);
              }
            }}
          />
        </div>

        {/* Détails du texte de la Scène Clé */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Titre du Plan / Climax
            </label>
            <input
              type="text"
              value={keySceneTitle}
              onChange={(e) => setKeySceneTitle(e.target.value)}
              placeholder="Ex: Le face-à-face sous la verrière..."
              className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Intentions de mise en scène & caméra
            </label>
            <textarea
              rows={2}
              value={keySceneDesc}
              onChange={(e) => setKeySceneDesc(e.target.value)}
              placeholder="Ex: Cadrage serré sur les yeux, ralenti synchrone avec le solo de cuivre, travelling arrière..."
              className="w-full bg-cinema-900 border border-cinema-700 rounded-xl p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* 4. Bloc Narratif 3 : Éléments Succédants (Texte uniquement) */}
      <div className="bg-cinema-850 rounded-2xl border border-purple-500/30 p-6 shadow-xl space-y-3">
        <div className="flex items-center gap-2 border-b border-cinema-700/60 pb-3">
          <FileText className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="font-bold text-white text-base">
              3. Ce qui succède (Conséquences & Dénouement)
            </h3>
            <p className="text-xs text-slate-400">
              Comment se termine la scène ? Quelles sont les retombées immédiates pour les personnages et la suite de l'histoire ?
            </p>
          </div>
        </div>

        <textarea
          rows={4}
          value={contextAfter}
          onChange={(e) => setContextAfter(e.target.value)}
          placeholder="Ex: Le silence retombe. La silhouette s'efface dans la brume. Marcus ramasse l'artefact brisé sur le sol, réalisant que le compte à rebours est lancé..."
          className="w-full bg-cinema-900 border border-cinema-700 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 leading-relaxed resize-none"
        />
      </div>

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !movieTitle.trim()}
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-cinema-950 font-bold text-sm transition-transform hover:scale-105 shadow-xl shadow-brand-500/20 disabled:opacity-50"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{isSaving ? 'Publication en cours...' : 'Finaliser & Enregistrer le Storyboard'}</span>
        </button>
      </div>
    </div>
  );
};
