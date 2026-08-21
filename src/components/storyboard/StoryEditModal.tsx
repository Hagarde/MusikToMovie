import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Film, 
  Sparkles, 
  BookOpen, 
  Clapperboard, 
  Loader2, 
  Tag, 
  User, 
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Proposal, GENRES } from '../../lib/types';
import { updateProposal } from '../../lib/supabase';

interface StoryEditModalProps {
  isOpen: boolean;
  proposal: Proposal;
  onClose: () => void;
  onSaved: (updated: Proposal) => void;
}

export const StoryEditModal: React.FC<StoryEditModalProps> = ({
  isOpen,
  proposal,
  onClose,
  onSaved,
}) => {
  const [movieTitle, setMovieTitle] = useState(proposal.movie_title || '');
  const [authorName, setAuthorName] = useState(proposal.author_name || '');
  const [genre, setGenre] = useState(proposal.genre || GENRES[0]);
  const [logline, setLogline] = useState(proposal.logline || '');
  const [contextBefore, setContextBefore] = useState(proposal.context_before || '');
  const [contextAfter, setContextAfter] = useState(proposal.context_after || '');
  const [keySceneTitle, setKeySceneTitle] = useState(proposal.key_scene_title || '');
  const [keySceneDesc, setKeySceneDesc] = useState(proposal.key_scene_description || '');
  const [animationFps, setAnimationFps] = useState<number>(
    proposal.animation_fps ? Number(proposal.animation_fps) : 0.5
  );

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieTitle.trim()) return;

    setIsSaving(true);
    try {
      const updates: Partial<Proposal> = {
        movie_title: movieTitle.trim(),
        author_name: authorName.trim() || 'Auteur Anonyme',
        genre: genre.trim(),
        logline: logline.trim(),
        context_before: contextBefore.trim(),
        context_after: contextAfter.trim(),
        key_scene_title: keySceneTitle.trim(),
        key_scene_description: keySceneDesc.trim(),
        animation_fps: animationFps,
      };

      const updated = await updateProposal(proposal.id, updates);
      if (updated) {
        onSaved(updated);
      } else {
        onSaved({ ...proposal, ...updates });
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement des modifications.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-4 sm:my-8 max-h-[90vh] flex flex-col">
        {/* En-tête de la modale */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900 text-sm sm:text-base font-display">Modifier le Storyboard & Scénario</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Mode Admin
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-stone-500">Corrigez l'orthographe, le genre, le pitch et le contenu des scènes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-900 p-1.5 rounded-lg hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire d'édition */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Titre et Auteur */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-stone-600" />
                Titre du Film / Scénario *
              </label>
              <input
                type="text"
                required
                value={movieTitle}
                onChange={(e) => setMovieTitle(e.target.value)}
                placeholder="Ex: Le Dernier Crépuscule"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900 transition-colors font-medium shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-600" />
                Auteur du Scénario
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Ex: Jean Dupont"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900 transition-colors font-medium shadow-sm"
              />
            </div>
          </div>

          {/* Genre et Cadence FPS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-stone-600" />
                Genre Cinématographique *
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900 transition-colors font-medium shadow-sm"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-600" />
                Cadence par défaut (Flipbook)
              </label>
              <select
                value={animationFps}
                onChange={(e) => setAnimationFps(parseFloat(e.target.value))}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 font-mono focus:outline-none focus:border-stone-900 transition-colors shadow-sm"
              >
                <option value={0.25}>1/4 fps (4.0s / plan - Très contemplatif)</option>
                <option value={0.33}>1/3 fps (3.0s / plan - Contemplatif)</option>
                <option value={0.5}>1/2 fps (2.0s / plan - Recommandé)</option>
                <option value={0.75}>3/4 fps (1.3s / plan)</option>
                <option value={1}>1.0 fps (1.0s / plan)</option>
                <option value={2}>2.0 fps (0.5s / plan - Dynamique)</option>
                <option value={3}>3.0 fps (Animation fluide)</option>
                <option value={4}>4.0 fps (Animation rapide)</option>
              </select>
            </div>
          </div>

          {/* Pitch / Logline */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-stone-600" />
              Pitch / Logline (L'accroche en 1-2 phrases)
            </label>
            <textarea
              rows={2}
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
              placeholder="Ex: Dans un futur submergé, une navigatrice solitaire découvre les ruines d'une ancienne cité..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900 resize-none transition-colors shadow-sm font-sans"
            />
          </div>

          {/* 1. Contexte & Ce qui précède */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-stone-600" />
              1. Ce qui précède (Contexte & Mise en place)
            </label>
            <textarea
              rows={3}
              value={contextBefore}
              onChange={(e) => setContextBefore(e.target.value)}
              placeholder="Décrivez la situation initiale, l'atmosphère avant l'explosion de la musique..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900 resize-none transition-colors shadow-sm font-sans leading-relaxed"
            />
          </div>

          {/* 2. Scène Clé (Titre + Intentions) */}
          <div className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-xs font-display">
              <Clapperboard className="w-4 h-4" />
              <span>2. La Scène Clé (Le Moment Fort & Storyboard)</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Titre du Plan / Climax
              </label>
              <input
                type="text"
                value={keySceneTitle}
                onChange={(e) => setKeySceneTitle(e.target.value)}
                placeholder="Ex: Le face-à-face sous la verrière..."
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900 transition-colors shadow-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Intentions de Réalisation, Sentiments & Non-dits
              </label>
              <textarea
                rows={4}
                value={keySceneDesc}
                onChange={(e) => setKeySceneDesc(e.target.value)}
                placeholder="Décrivez ce que ressentent les personnages, l'éclairage, la caméra et le lien avec la musique..."
                className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900 resize-none transition-colors shadow-sm font-sans leading-relaxed"
              />
            </div>
          </div>

          {/* 3. Ce qui succède */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-stone-600" />
              3. Ce qui succède (Dénouement & Conclusion)
            </label>
            <textarea
              rows={3}
              value={contextAfter}
              onChange={(e) => setContextAfter(e.target.value)}
              placeholder="Comment la scène se termine, ce qu'il reste après ce moment..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900 resize-none transition-colors shadow-sm font-sans leading-relaxed"
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving || !movieTitle.trim()}
              className="px-6 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-2 transition-all hover:scale-105 shadow-md disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Enregistrement...' : 'Sauvegarder les modifications'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
