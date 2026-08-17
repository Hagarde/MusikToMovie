import React, { useState } from 'react';
import { 
  Play, 
  Film, 
  Plus, 
  Music, 
  Sparkles, 
  Clock, 
  Trash2, 
  ShieldAlert, 
  Settings2, 
  Clapperboard,
  Layers,
  Flame,
  Radio
} from 'lucide-react';
import { Track } from '../../lib/types';
import { YouTubeIcon } from '../icons/YouTubeIcon';

interface TrackListProps {
  tracks: Track[];
  selectedTrack: Track | null;
  onSelectTrack: (track: Track) => void;
  onCreateProposal: (track: Track) => void;
  onOpenUploadModal: () => void;
  onDeleteTrack?: (trackId: string) => void;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  selectedTrack,
  onSelectTrack,
  onCreateProposal,
  onOpenUploadModal,
  onDeleteTrack,
}) => {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const confirmDelete = () => {
    if (trackToDelete && onDeleteTrack) {
      onDeleteTrack(trackToDelete.id);
      setTrackToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* 🌟 BANNIÈRE HÉRO CHALEUREUSE & CINÉMATOGRAPHIQUE */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cinema-850 via-cinema-800 to-cinema-900 border border-amber-500/20 p-6 sm:p-8 shadow-2xl shadow-amber-500/5">
        {/* Lumières d'ambiance en arrière plan */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Studio d'Écriture & Storyboard Musical</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white font-display tracking-tight leading-tight">
              Transformez chaque note de musique en{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200">
                scène de cinéma
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Choisissez un morceau YouTube, écoutez le climax et donnez vie à votre vision cinématographique grâce à notre studio de flipbook animé et de scénario.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenUploadModal}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-cinema-950 font-extrabold text-sm transition-all hover:scale-105 shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Ajouter une Musique</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barre d'outils et Titre de la Bibliothèque */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-display">
              Bandes Originales & Morceaux
            </h2>
            <p className="text-xs text-slate-400">
              {tracks.length} morceau{tracks.length > 1 ? 'x' : ''} disponible{tracks.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Mode Admin / Gestion */}
          <button
            type="button"
            onClick={() => setIsAdminMode(!isAdminMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isAdminMode
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-md ring-1 ring-rose-500/30'
                : 'bg-cinema-850 hover:bg-cinema-800 text-slate-400 hover:text-white border border-white/5'
            }`}
            title="Activer le mode gestion pour supprimer des musiques"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{isAdminMode ? 'Mode Gestion Actif' : 'Gérer la bibliothèque'}</span>
          </button>
        </div>
      </div>

      {/* Grille des morceaux avec cartes chaleureuses et lumineuses */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tracks.map((track) => {
          const isSelected = selectedTrack?.id === track.id;
          const isYouTube = !!track.youtube_id;

          return (
            <div
              key={track.id}
              className={`group bg-cinema-850/90 rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col justify-between hover:shadow-2xl relative backdrop-blur-md ${
                isSelected
                  ? 'border-amber-500 bg-gradient-to-b from-cinema-800 to-cinema-850 ring-2 ring-amber-500/30 shadow-amber-500/15 scale-[1.01]'
                  : 'border-cinema-700/60 hover:border-amber-500/50 hover:shadow-amber-500/10'
              }`}
            >
              {/* Bouton de Suppression en Mode Gestion ou au survol */}
              {(isAdminMode || onDeleteTrack) && (
                <button
                  type="button"
                  onClick={() => setTrackToDelete(track)}
                  className={`absolute top-3 right-3 z-20 p-2 rounded-xl bg-black/80 hover:bg-rose-600 text-slate-300 hover:text-white border border-white/10 backdrop-blur-md transition-all shadow-lg ${
                    isAdminMode ? 'opacity-100 ring-2 ring-rose-500/50 scale-105' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="Supprimer ce morceau de la bibliothèque"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Miniature YouTube avec overlay dégradé */}
              <div className="relative aspect-video bg-cinema-950 flex items-center justify-center overflow-hidden border-b border-cinema-700/60">
                {track.thumbnail_url ? (
                  <img
                    src={track.thumbnail_url}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-600">
                    <Music className="w-10 h-10" />
                  </div>
                )}

                {/* Voile sombre dégradé cinématique */}
                <div className="absolute inset-0 bg-gradient-to-t from-cinema-900/90 via-transparent to-black/30 pointer-events-none" />

                {/* Badge Genre & YouTube */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                  {track.genre && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cinema-900/90 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-sm">
                      {track.genre}
                    </span>
                  )}
                  {isYouTube && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/90 text-white flex items-center gap-1 shadow-sm backdrop-blur-md">
                      <YouTubeIcon className="w-3 h-3 fill-current" />
                      YouTube
                    </span>
                  )}
                </div>

                <div className="absolute bottom-3 right-3 z-10">
                  <span className="text-[11px] font-mono font-bold text-slate-200 bg-black/80 px-2 py-0.5 rounded-lg border border-white/10 backdrop-blur-md">
                    {formatDuration(track.duration)}
                  </span>
                </div>
              </div>

              {/* Contenu de la Carte */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-amber-300 transition-colors font-display">
                    {track.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {track.artist}
                  </p>

                  {track.default_start_time !== undefined && track.default_start_time > 0 && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/25 w-fit">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>
                        Extrait à {formatDuration(track.default_start_time)}
                        {track.default_end_time ? ` → ${formatDuration(track.default_end_time)}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions : Écouter & Créer Scénario */}
                <div className="pt-3 border-t border-cinema-700/50 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectTrack(track)}
                    className="px-3.5 py-2 rounded-xl bg-cinema-750 hover:bg-cinema-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/5"
                    title="Écouter dans le lecteur"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
                    <span>Écouter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onCreateProposal(track)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-cinema-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 hover:scale-105"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Créer Scénario</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modale de Confirmation de Suppression */}
      {trackToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-cinema-850 rounded-3xl border border-cinema-700 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Supprimer cette musique ?</h3>
                <p className="text-xs text-slate-400">Cette action est irréversible.</p>
              </div>
            </div>

            <div className="bg-cinema-900/90 rounded-2xl p-4 border border-cinema-700/60 flex items-center gap-3">
              {trackToDelete.thumbnail_url && (
                <img
                  src={trackToDelete.thumbnail_url}
                  alt={trackToDelete.title}
                  className="w-16 aspect-video rounded-lg object-cover border border-cinema-700 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate">{trackToDelete.title}</h4>
                <p className="text-[11px] text-slate-400 truncate">{trackToDelete.artist}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTrackToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-cinema-700 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-transform hover:scale-105 shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmer la suppression</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
