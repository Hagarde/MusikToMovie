import React from 'react';
import { Play, Film, Plus, Music, Sparkles, Clock } from 'lucide-react';
import { Track } from '../../lib/types';
import { YouTubeIcon } from '../icons/YouTubeIcon';

interface TrackListProps {
  tracks: Track[];
  selectedTrack: Track | null;
  onSelectTrack: (track: Track) => void;
  onCreateProposal: (track: Track) => void;
  onOpenUploadModal: () => void;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  selectedTrack,
  onSelectTrack,
  onCreateProposal,
  onOpenUploadModal,
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-brand-400" />
            Bibliothèque de Musiques & Bandes Originales
          </h2>
          <p className="text-xs text-slate-400">
            Sélectionnez une musique YouTube pour concevoir votre concept de film et votre storyboard
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenUploadModal}
          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-cinema-900 font-semibold text-xs transition-transform hover:scale-105 shadow-md shadow-brand-500/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Ajouter un lien YouTube
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tracks.map((track) => {
          const isSelected = selectedTrack?.id === track.id;
          const isYouTube = !!track.youtube_id;

          return (
            <div
              key={track.id}
              className={`group bg-cinema-850 rounded-2xl border overflow-hidden transition-all flex flex-col justify-between hover:shadow-2xl ${
                isSelected
                  ? 'border-brand-500/80 bg-cinema-800 ring-1 ring-brand-500/40 shadow-brand-500/10'
                  : 'border-cinema-700/60 hover:border-cinema-600'
              }`}
            >
              {/* Miniature YouTube ou Illustration Audio */}
              <div className="relative aspect-video bg-cinema-900 flex items-center justify-center overflow-hidden border-b border-cinema-700/60">
                {track.thumbnail_url ? (
                  <img
                    src={track.thumbnail_url}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-600">
                    <Music className="w-10 h-10" />
                  </div>
                )}

                {/* Badge Genre & YouTube */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  {track.genre && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cinema-900/90 text-brand-300 border border-cinema-700 backdrop-blur-sm">
                      {track.genre}
                    </span>
                  )}
                  {isYouTube && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/90 text-white flex items-center gap-1 shadow-sm backdrop-blur-sm">
                      <YouTubeIcon className="w-3 h-3 fill-current" />
                      YouTube
                    </span>
                  )}
                </div>

                <div className="absolute bottom-3 right-3">
                  <span className="text-[11px] font-mono text-slate-200 bg-black/80 px-2 py-0.5 rounded-lg border border-white/10 backdrop-blur-sm">
                    {formatDuration(track.duration)}
                  </span>
                </div>
              </div>

              {/* Contenu */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-brand-300 transition-colors">
                    {track.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {track.artist}
                  </p>

                  {track.default_start_time !== undefined && track.default_start_time > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20 w-fit">
                      <Clock className="w-3 h-3" />
                      <span>Point fort à {formatDuration(track.default_start_time)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-cinema-700/50 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectTrack(track)}
                    className="px-3 py-1.5 rounded-xl bg-cinema-700 hover:bg-cinema-600 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    title="Écouter dans le lecteur"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-brand-400" />
                    <span>Écouter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onCreateProposal(track)}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-cinema-900 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm hover:scale-105"
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
    </div>
  );
};
