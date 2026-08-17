import React, { useState } from 'react';
import { Film, ArrowLeft, Save, Sparkles, User, Tag, FileText, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Track, Scene, Proposal } from '../../lib/types';
import { SceneCard } from './SceneCard';
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
  const [movieTitle, setMovieTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [logline, setLogline] = useState('');
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [highlightRange, setHighlightRange] = useState<{ start: number; end: number } | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Initialisation des 3 scènes narratives calées sur le point fort
  const startTime = track.default_start_time || Math.floor(track.duration * 0.25);
  const [scenes, setScenes] = useState<Scene[]>([
    {
      section_type: 'preceding',
      scene_title: 'Séquence d\'ouverture / Prélude',
      description: '',
      image_data: '',
      start_time: 0,
      end_time: startTime,
      order_index: 0,
    },
    {
      section_type: 'main',
      scene_title: 'La Scène Clé (Climax musical)',
      description: '',
      image_data: '',
      start_time: startTime,
      end_time: Math.min(Math.floor(track.duration), startTime + 30),
      order_index: 1,
    },
    {
      section_type: 'succeeding',
      scene_title: 'Dénouement & Transition',
      description: '',
      image_data: '',
      start_time: Math.min(Math.floor(track.duration), startTime + 30),
      end_time: Math.floor(track.duration),
      order_index: 2,
    },
  ]);

  const updateScene = (index: number, updated: Partial<Scene>) => {
    setScenes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updated };
      return copy;
    });
  };

  const handlePreviewRange = (start: number, end: number) => {
    setHighlightRange({ start, end });
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
        },
        scenes
      );

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#bf882d', '#f5edd6', '#3b82f6']
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
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Barre de retour et d'actions */}
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
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-cinema-900 font-bold text-xs transition-transform hover:scale-105 shadow-lg shadow-brand-500/20 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Enregistrement...' : 'Enregistrer le Concept & Storyboard'}</span>
        </button>
      </div>

      {/* Lecteur Audio persistant en haut */}
      <div className="sticky top-4 z-40">
        <AudioPlayer
          track={track}
          onTimeUpdate={(time) => setCurrentAudioTime(time)}
          highlightRange={highlightRange}
        />
      </div>

      {/* Cadrage Général du Film / Scénario */}
      <div className="bg-cinema-850 rounded-2xl border border-cinema-700 p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-2 border-b border-cinema-700/60 pb-3">
          <Film className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-bold text-white">
            Informations sur le Film & Scénario
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Titre du Film / Scénario *
            </label>
            <input
              type="text"
              required
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              placeholder="Ex: Les Larmes de Titan, Mirage Urbain, Dernier Signal..."
              className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nom / Pseudo du Scénariste
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Genre Cinématographique
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Pitch / Logline en une phrase
            </label>
            <input
              type="text"
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
              placeholder="Ex: Dans une métropole sous surveillance, un pilote rebelle tente une évasion désespérée."
              className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Les 3 Séquences Narratives */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            Storyboard & Découpage Séquentiel (3 Séquences)
          </h3>
          <span className="text-xs text-slate-400">
            Dessinez et décrivez chaque étape narrative
          </span>
        </div>

        {scenes.map((scene, index) => (
          <SceneCard
            key={scene.section_type}
            scene={scene}
            currentAudioTime={currentAudioTime}
            onChange={(updated) => updateScene(index, updated)}
            onPreviewTimeRange={handlePreviewRange}
          />
        ))}
      </div>

      {/* Bouton de sauvegarde final */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !movieTitle.trim()}
          className="flex items-center gap-2 px-8 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-cinema-900 font-bold text-sm transition-transform hover:scale-105 shadow-xl shadow-brand-500/20 disabled:opacity-50"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{isSaving ? 'Enregistrement en cours...' : 'Finaliser & Enregistrer la Proposition'}</span>
        </button>
      </div>
    </div>
  );
};
