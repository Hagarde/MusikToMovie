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
  const initialStartTime = track.default_start_time || 0;
  const initialEndTime = track.default_end_time || Math.min(Math.floor(track.duration), initialStartTime + 30);

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
          frames: frames.filter(f => !!f),
          animation_fps: animationFps,
        },
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
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#f43f5e', '#6366f1']
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
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cinema-850 hover:bg-cinema-750 border border-white/5 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la bibliothèque</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !movieTitle.trim()}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-cinema-950 font-black text-xs transition-all hover:scale-105 shadow-xl shadow-amber-500/25 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Publication en cours...' : 'Publier le Storyboard & Scénario'}</span>
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
      <div className="bg-cinema-850/90 backdrop-blur-xl rounded-3xl border border-amber-500/20 p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="flex items-center gap-3 border-b border-cinema-700/60 pb-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-display">
              Concept & Univers du Film
            </h2>
            <p className="text-xs text-slate-400">Définissez l'identité et le pitch de votre œuvre</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Titre du Film / Scénario *
            </label>
            <input
              type="text"
              required
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              placeholder="Ex: Mirage Urbain, Dernier Signal, Écho Silencieux..."
              className="w-full bg-cinema-900 border border-cinema-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Scénariste / Réalisateur
            </label>
            <div className="relative">
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Votre nom"
                className="w-full bg-cinema-900 border border-cinema-700 rounded-2xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Genre Cinématographique
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-cinema-900 border border-cinema-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 cursor-pointer transition-colors"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Pitch / Logline en une phrase
            </label>
            <input
              type="text"
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
              placeholder="Ex: Dans une ville plongée dans le noir, une détective traque une silhouette insaisissable."
              className="w-full bg-cinema-900 border border-cinema-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* 2. Bloc Narratif 1 : Éléments Précédents */}
      <div className="bg-cinema-850/90 backdrop-blur-xl rounded-3xl border border-cyan-500/30 p-6 sm:p-7 shadow-2xl space-y-3.5">
        <div className="flex items-center gap-3 border-b border-cinema-700/60 pb-3.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base font-display">
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
          className="w-full bg-cinema-900 border border-cinema-700 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 leading-relaxed resize-none transition-colors"
        />
      </div>

      {/* 3. Bloc Narratif 2 : LA SCÈNE CLÉ (Dessins Flipanim + Minutage + Texte) */}
      <div className="bg-cinema-850/95 backdrop-blur-xl rounded-3xl border-2 border-amber-500/80 p-6 sm:p-7 shadow-2xl space-y-5 ring-2 ring-amber-500/20 shadow-amber-500/5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cinema-700/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-cinema-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base font-display flex items-center gap-2">
                2. La Scène Clé & Storyboard Animé
                <span className="text-[10px] uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 font-bold">
                  Climax Synchronisé
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                L'instant précis où la musique explose : dessinez une ou plusieurs frames en mode animation flipbook !
              </p>
            </div>
          </div>

          {/* Timecodes de synchronisation */}
          <div className="flex items-center gap-2 text-xs font-mono bg-cinema-900 px-4 py-2 rounded-2xl border border-cinema-700 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Timecode :</span>
            <input
              type="text"
              value={formatSeconds(startTime)}
              onChange={(e) => setStartTime(parseTime(e.target.value))}
              className="w-14 bg-cinema-800 text-center rounded-lg text-amber-300 font-bold px-1.5 py-0.5 border border-cinema-700 text-xs"
              placeholder="01:20"
              title="Début"
            />
            <span className="text-slate-500">→</span>
            <input
              type="text"
              value={formatSeconds(endTime)}
              onChange={(e) => setEndTime(parseTime(e.target.value))}
              className="w-14 bg-cinema-800 text-center rounded-lg text-amber-300 font-bold px-1.5 py-0.5 border border-cinema-700 text-xs"
              placeholder="01:50"
              title="Fin"
            />

            <button
              type="button"
              onClick={() => {
                setStartTime(Math.floor(currentAudioTime));
                setEndTime(Math.floor(currentAudioTime) + 25);
              }}
              className="text-[10px] bg-cinema-750 hover:bg-amber-500 hover:text-cinema-950 text-slate-300 px-2.5 py-1 rounded-lg transition-colors font-bold ml-1"
              title="Caler le timecode sur le lecteur audio actuel"
            >
              Prendre ({formatSeconds(currentAudioTime)})
            </button>
          </div>
        </div>

        {/* Studio de Dessin Multi-Frames (Flipanim) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span className="flex items-center gap-2 text-amber-300">
              <Layers className="w-4 h-4 text-amber-400" />
              Studio de Dessin Flipbook
            </span>
            <span className="text-[11px] text-slate-400">
              Astuce : Utilisez la <strong>Pelure d'oignon</strong> pour animer le mouvement frame par frame !
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
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Titre du Plan / Climax
            </label>
            <input
              type="text"
              value={keySceneTitle}
              onChange={(e) => setKeySceneTitle(e.target.value)}
              placeholder="Ex: Le face-à-face sous la verrière..."
              className="w-full bg-cinema-900 border border-cinema-700 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Intentions de mise en scène & caméra
            </label>
            <textarea
              rows={2}
              value={keySceneDesc}
              onChange={(e) => setKeySceneDesc(e.target.value)}
              placeholder="Ex: Cadrage serré sur les yeux, ralenti synchrone avec le solo de cuivre, travelling arrière..."
              className="w-full bg-cinema-900 border border-cinema-700 rounded-2xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none leading-relaxed transition-colors"
            />
          </div>
        </div>
      </div>

      {/* 4. Bloc Narratif 3 : Éléments Succédants */}
      <div className="bg-cinema-850/90 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-6 sm:p-7 shadow-2xl space-y-3.5">
        <div className="flex items-center gap-3 border-b border-cinema-700/60 pb-3.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base font-display">
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
          className="w-full bg-cinema-900 border border-cinema-700 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 leading-relaxed resize-none transition-colors"
        />
      </div>

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !movieTitle.trim()}
          className="flex items-center gap-2.5 px-9 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-cinema-950 font-black text-sm transition-all hover:scale-105 shadow-2xl shadow-amber-500/30 disabled:opacity-50"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{isSaving ? 'Publication en cours...' : 'Finaliser & Enregistrer le Storyboard'}</span>
        </button>
      </div>
    </div>
  );
};
