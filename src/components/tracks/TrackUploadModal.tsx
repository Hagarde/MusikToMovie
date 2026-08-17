import React, { useState, useEffect } from 'react';
import { X, Music, Link as LinkIcon, Play, Pause, Clock, Check, Sparkles, Loader2, Upload } from 'lucide-react';
import { Track } from '../../lib/types';
import { createTrack } from '../../lib/supabase';
import { extractYouTubeId, fetchYouTubeMetadata, getYouTubeThumbnail } from '../../lib/youtube';
import { YouTubeIcon } from '../icons/YouTubeIcon';

interface TrackUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackCreated: (newTrack: Track) => void;
}

const GENRES = [
  'Cinématique / Épique',
  'Suspense / Thriller',
  'Science-Fiction / Cyberpunk',
  'Drame / Émotion',
  'Film Noir / Jazz',
  'Action / Course-poursuite',
  'Ambiance / Planant',
];

export const TrackUploadModal: React.FC<TrackUploadModalProps> = ({
  isOpen,
  onClose,
  onTrackCreated,
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [duration, setDuration] = useState(180);
  const [defaultStartTime, setDefaultStartTime] = useState<number>(0);
  
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'youtube' | 'file'>('youtube');

  // Détection et auto-remplissage lors de la saisie d'un lien YouTube
  useEffect(() => {
    const detectedId = extractYouTubeId(youtubeUrl);
    if (detectedId && detectedId !== youtubeId) {
      setYoutubeId(detectedId);
      setThumbnailUrl(getYouTubeThumbnail(detectedId));
      setIsLoadingMetadata(true);

      fetchYouTubeMetadata(detectedId).then((meta) => {
        setTitle(meta.title);
        setArtist(meta.artist);
        if (meta.thumbnail_url) setThumbnailUrl(meta.thumbnail_url);
        setIsLoadingMetadata(false);
      }).catch(() => {
        setIsLoadingMetadata(false);
      });
    }
  }, [youtubeUrl]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || (!youtubeId && !youtubeUrl)) return;

    setIsSubmitting(true);
    try {
      const created = await createTrack({
        title: title.trim(),
        artist: artist.trim() || 'Artiste YouTube',
        genre,
        audio_url: youtubeUrl.trim(),
        youtube_id: youtubeId || undefined,
        thumbnail_url: thumbnailUrl || (youtubeId ? getYouTubeThumbnail(youtubeId) : undefined),
        duration: duration || 180,
        default_start_time: defaultStartTime,
      });

      onTrackCreated(created);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement du morceau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-cinema-850 rounded-2xl border border-cinema-700 w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* En-tête de la modale */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cinema-700/60 bg-cinema-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <YouTubeIcon className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Ajouter une Musique YouTube</h3>
              <p className="text-[11px] text-slate-400">Zéro stockage consommé • Métadonnées récupérées automatiquement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-cinema-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Champ d'import du lien YouTube */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
              <YouTubeIcon className="w-4 h-4 text-red-500" />
              Coller le lien de la vidéo YouTube (Musique / Bande Originale) *
            </label>
            <div className="relative">
              <input
                type="url"
                required
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Ex: https://www.youtube.com/watch?v=RxabLA7UQ9k ou youtu.be/..."
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors font-mono text-xs"
              />
              {isLoadingMetadata && (
                <Loader2 className="w-4 h-4 text-red-400 animate-spin absolute right-3 top-3" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Collez n'importe quel lien YouTube pour extraire instantanément le titre, l'artiste et la couverture.
            </p>
          </div>

          {/* Aperçu de la miniature et des métadonnées extraites */}
          {youtubeId && (
            <div className="bg-cinema-900/90 rounded-2xl border border-cinema-700/80 p-4 space-y-4 animate-in fade-in duration-200">
              <div className="flex gap-4 items-start">
                <div className="relative w-28 aspect-video rounded-xl overflow-hidden border border-cinema-700 shrink-0 bg-black shadow-md">
                  <img
                    src={thumbnailUrl}
                    alt="Aperçu YouTube"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <YouTubeIcon className="w-5 h-5 text-red-500 fill-current drop-shadow" />
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                    ✓ Vidéo YouTube Détectée
                  </span>
                  <h4 className="text-xs font-semibold text-white truncate">{title || 'Chargement...'}</h4>
                  <p className="text-[11px] text-slate-400 truncate">{artist}</p>
                </div>
              </div>

              {/* Moment de début / Point fort du morceau */}
              <div className="pt-3 border-t border-cinema-700/60 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-brand-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand-400" />
                    Point de départ de la scène (Timecode) :
                  </span>
                  <p className="text-[10px] text-slate-400">À quel moment fort la musique doit-elle commencer ?</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formatSeconds(defaultStartTime)}
                    onChange={(e) => setDefaultStartTime(parseTime(e.target.value))}
                    placeholder="01:30"
                    className="w-16 bg-cinema-800 border border-cinema-700 rounded-lg px-2 py-1 text-center font-mono text-xs font-bold text-brand-400 focus:outline-none focus:border-brand-400"
                  />
                  <span className="text-[11px] text-slate-500">min:sec</span>
                </div>
              </div>
            </div>
          )}

          {/* Formulaire de confirmation des champs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Titre du morceau *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Time - Inception"
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Artiste / Compositeur
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Ex: Hans Zimmer"
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Genre / Ambiance Cinéma
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-cinema-700/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-cinema-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title || !youtubeUrl}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-400 text-cinema-900 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md hover:scale-105"
            >
              {isSubmitting ? 'Enregistrement...' : 'Ajouter cette musique'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
