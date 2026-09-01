import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Film, 
  Plus, 
  Music, 
  Sparkles, 
  Clock, 
  Trash2, 
  ShieldAlert, 
  Search
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Track } from '../../lib/types';
import { YouTubeIcon } from '../icons/YouTubeIcon';

interface TrackListProps {
  tracks: Track[];
  selectedTrack: Track | null;
  onSelectTrack: (track: Track) => void;
  onCreateProposal: (track: Track) => void;
  onOpenUploadModal: () => void;
  onDeleteTrack?: (trackId: string) => void;
  isAdmin?: boolean;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  selectedTrack,
  onSelectTrack,
  onCreateProposal,
  onOpenUploadModal,
  onDeleteTrack,
  isAdmin = false,
}) => {
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

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

  // Liste unique des genres existants
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    tracks.forEach((t) => {
      if (t.genre) set.add(t.genre);
    });
    return Array.from(set);
  }, [tracks]);

  // Filtrage combiné recherche & genre
  const filteredTracks = useMemo(() => {
    return tracks.filter((t) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.artist.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGenre =
        selectedGenre === 'all' || t.genre === selectedGenre;

      return matchesSearch && matchesGenre;
    });
  }, [tracks, searchQuery, selectedGenre]);

  return (
    <div className="space-y-8">
      {/* 🌟 BANNIÈRE HÉRO ÉPURÉE & ÉDITORIALE */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-gallery">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-800 text-xs font-bold font-mono">
              <Sparkles className="w-3.5 h-3.5 text-stone-900" />
              <span>Studio d'Écriture & Storyboard Musical</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 font-display tracking-tight leading-tight">
              Transformez chaque musique en{' '}
              <span className="text-rose-600 font-serif italic">
                scène de cinéma
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-xl">
              Sélectionnez un extrait musical, visualisez le moment fort et donnez vie à votre vision grâce à l'animatique flipbook et au scénario.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenUploadModal}
              className="px-6 py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs transition-all hover:scale-105 shadow-md flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Ajouter une Musique</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barre d'outils, Recherche & Filtres */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-100 border border-stone-200 text-stone-800 flex items-center justify-center">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-display">
                Bandes Originales & Extraits
              </h2>
              <p className="text-xs text-stone-500">
                {filteredTracks.length} morceau{filteredTracks.length > 1 ? 'x' : ''} disponible{filteredTracks.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Barre de Recherche */}
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher titre, compositeur..."
                className="w-full bg-white border border-stone-200 rounded-2xl pl-10 pr-3.5 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-900 transition-colors shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-900 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pilules de filtres par Genre */}
        {availableGenres.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
            <button
              type="button"
              onClick={() => setSelectedGenre('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                selectedGenre === 'all'
                  ? 'bg-stone-900 text-white font-bold shadow-sm'
                  : 'bg-white hover:bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200'
              }`}
            >
              Tous les genres
            </button>
            {availableGenres.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGenre(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  selectedGenre === g
                    ? 'bg-stone-900 text-white font-bold shadow-sm'
                    : 'bg-white hover:bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grille des morceaux filtrés */}
      {filteredTracks.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center space-y-3 shadow-gallery">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 mx-auto flex items-center justify-center text-stone-400">
            <Music className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-stone-900 font-display">Aucun morceau trouvé</h3>
          <p className="text-xs text-stone-500">
            Essayez de modifier vos termes de recherche ou réinitialisez le filtre.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedGenre('all');
            }}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTracks.map((track) => {
            const isSelected = selectedTrack?.id === track.id;
            const isYouTube = !!track.youtube_id;

            return (
              <div
                key={track.id}
                className={`group bg-white rounded-3xl border overflow-hidden transition-all duration-200 flex flex-col justify-between hover:shadow-gallery-hover relative ${
                  isSelected
                    ? 'border-stone-900 ring-2 ring-stone-900/10 shadow-gallery-lg'
                    : 'border-stone-200 hover:border-stone-400 shadow-gallery'
                }`}
              >
                {/* Bouton de Suppression (Admin uniquement) */}
                {isAdmin && onDeleteTrack && (
                  <button
                    type="button"
                    onClick={() => setTrackToDelete(track)}
                    className="absolute top-3 right-3 z-20 p-2 rounded-xl bg-white/90 hover:bg-rose-600 text-stone-700 hover:text-white border border-stone-200 shadow-md backdrop-blur-sm transition-all opacity-100 ring-2 ring-rose-500/50 scale-105"
                    title="Supprimer ce morceau de la bibliothèque (Admin)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Miniature YouTube */}
                <div className="relative aspect-video bg-stone-100 flex items-center justify-center overflow-hidden border-b border-stone-200">
                  {track.thumbnail_url ? (
                    <img
                      src={track.thumbnail_url}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-stone-400">
                      <Music className="w-10 h-10" />
                    </div>
                  )}

                  {/* Badges Genre & YouTube */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                    {track.genre && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-stone-800 border border-stone-200 shadow-sm backdrop-blur-sm">
                        {track.genre}
                      </span>
                    )}
                    {isYouTube && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white flex items-center gap-1 shadow-sm">
                        <YouTubeIcon className="w-3 h-3 fill-current" />
                        YouTube
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 z-10">
                    <span className="text-[11px] font-mono font-bold text-stone-900 bg-white/90 px-2 py-0.5 rounded-lg border border-stone-200 shadow-sm">
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                </div>

                {/* Contenu de la Carte */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-stone-900 line-clamp-1 group-hover:text-rose-600 transition-colors font-display">
                      {track.title}
                    </h3>
                    <p className="text-xs text-stone-500 line-clamp-1">
                      {track.artist}
                    </p>

                    {track.default_start_time !== undefined && track.default_start_time > 0 && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-mono text-stone-700 bg-stone-100 px-2.5 py-1 rounded-xl border border-stone-200 w-fit">
                        <Clock className="w-3 h-3 text-stone-500" />
                        <span>
                          Extrait à {formatDuration(track.default_start_time)}
                          {track.default_end_time ? ` → ${formatDuration(track.default_end_time)}` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions : Écouter & Créer Scénario */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTrack(track);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-sm ${
                        selectedTrack?.id === track.id
                          ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-rose-600/30'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-200'
                      }`}
                      title="Lancer la lecture dans le lecteur"
                    >
                      <Play className={`w-3.5 h-3.5 fill-current ${selectedTrack?.id === track.id ? 'animate-pulse text-white' : 'text-stone-700'}`} />
                      <span>{selectedTrack?.id === track.id ? 'En lecture ▶' : 'Écouter'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onCreateProposal(track)}
                      className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm hover:scale-105"
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
      )}

      {/* Modale de Confirmation de Suppression */}
      <Modal isOpen={!!trackToDelete} onClose={() => setTrackToDelete(null)} title="Supprimer cette musique ?" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-rose-600">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-200">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-300">Cette action est irréversible.</p>
            </div>
          </div>

          {trackToDelete && (
            <div className="bg-stone-800 rounded-2xl p-4 border border-stone-700 flex items-center gap-3">
              {trackToDelete.thumbnail_url && (
                <img
                  src={trackToDelete.thumbnail_url}
                  alt={trackToDelete.title}
                  className="w-16 aspect-video rounded-lg object-cover border border-stone-700 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-stone-100 truncate">{trackToDelete.title}</h4>
                <p className="text-[11px] text-stone-400 truncate">{trackToDelete.artist}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setTrackToDelete(null)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
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
      </Modal>
    </div>
  );
};
