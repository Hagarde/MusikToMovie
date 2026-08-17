import React from 'react';
import { Play, Film, Plus, Music, Sparkles } from 'lucide-react';
import { Track } from '../../lib/types';

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
            Bibliothèque de Musiques
          </h2>
          <p className="text-xs text-slate-400">
            Choisissez un morceau pour imaginer une scène de film et son storyboard
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenUploadModal}
          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-cinema-900 font-semibold text-xs transition-transform hover:scale-105 shadow-md shadow-brand-500/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Ajouter une musique
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tracks.map((track) => {
          const isSelected = selectedTrack?.id === track.id;
          return (
            <div
              key={track.id}
              className={`group bg-cinema-850 rounded-2xl border p-5 transition-all flex flex-col justify-between hover:shadow-xl ${
                isSelected
                  ? 'border-brand-500/80 bg-cinema-800 ring-1 ring-brand-500/40 shadow-brand-500/10'
                  : 'border-cinema-700/60 hover:border-cinema-600'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-cinema-900 border border-cinema-700 flex items-center justify-center text-brand-400 group-hover:scale-105 transition-transform">
                    <Music className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 bg-cinema-900/80 px-2 py-0.5 rounded-full border border-cinema-700/50">
                    {formatDuration(track.duration)}
                  </span>
                </div>

                <h3 className="font-semibold text-sm text-white line-clamp-1 group-hover:text-brand-300 transition-colors">
                  {track.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-1 mb-4">
                  {track.artist}
                </p>
              </div>

              <div className="pt-3 border-t border-cinema-700/50 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectTrack(track)}
                  className="px-3 py-1.5 rounded-xl bg-cinema-700 hover:bg-cinema-600 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Écouter dans le lecteur"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-brand-400" />
                  <span>Écouter</span>
                </button>

                <button
                  type="button"
                  onClick={() => onCreateProposal(track)}
                  className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-cinema-900 text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Créer Scénario</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
