import React, { useState, useRef } from 'react';
import { X, Upload, Music, Link as LinkIcon, Play, Pause, Clock, Sparkles, Check } from 'lucide-react';
import { Track } from '../../lib/types';
import { createTrack, uploadAudioFile } from '../../lib/supabase';

interface TrackUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackCreated: (newTrack: Track) => void;
}

const GENRES = [
  'Cinématique / Épique',
  'Suspense / Thriller',
  'Science-Fiction / Synthwave',
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
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [audioUrl, setAudioUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(60);
  const [defaultStartTime, setDefaultStartTime] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileMode, setFileMode] = useState<'file' | 'url'>('file');

  // Lecteur de prévisualisation dans la modale
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
    if (!title) setTitle(cleanTitle);

    // Créer une URL locale temporaire pour la pré-écoute
    const localUrl = URL.createObjectURL(file);
    setAudioUrl(localUrl);

    const tempAudio = new Audio(localUrl);
    tempAudio.onloadedmetadata = () => {
      setDuration(Math.round(tempAudio.duration));
    };
  };

  const togglePreviewPlay = () => {
    if (!audioPreviewRef.current || !audioUrl) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play().then(() => setIsPlayingPreview(true)).catch(() => {});
    }
  };

  const handlePreviewTimeUpdate = () => {
    if (audioPreviewRef.current) {
      setPreviewCurrentTime(audioPreviewRef.current.currentTime);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const setAsStartTime = () => {
    setDefaultStartTime(Math.floor(previewCurrentTime));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || (!audioUrl && !selectedFile)) return;

    setIsSubmitting(true);
    try {
      let finalAudioUrl = audioUrl;

      // Si un fichier a été uploadé, on l'envoie vers Supabase Storage
      if (selectedFile && fileMode === 'file') {
        finalAudioUrl = await uploadAudioFile(selectedFile);
      }

      const created = await createTrack({
        title: title.trim(),
        artist: artist.trim() || 'Artiste Indépendant',
        genre,
        audio_url: finalAudioUrl,
        duration: duration || 60,
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-cinema-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Ajouter un nouveau morceau</h3>
              <p className="text-[11px] text-slate-400">Stockage optimisé sur Supabase & réglage du moment de début</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-cinema-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mode Upload vs URL */}
          <div className="flex rounded-xl bg-cinema-900 p-1 border border-cinema-700/60 text-xs">
            <button
              type="button"
              onClick={() => setFileMode('file')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                fileMode === 'file' ? 'bg-brand-500 text-cinema-900 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Uploader un Fichier Audio (MP3 / WAV / OGG)
            </button>
            <button
              type="button"
              onClick={() => setFileMode('url')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                fileMode === 'url' ? 'bg-brand-500 text-cinema-900 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Lien URL Direct
            </button>
          </div>

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
                placeholder="Ex: Climax Symphonique / Nuit Électrique..."
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
                placeholder="Ex: Hans Zimmer, Compositeur..."
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Genre / Ambiance
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

          {fileMode === 'file' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Fichier Audio (MP3, WAV, OGG, M4A)
              </label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl p-2 text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:bg-brand-500 file:text-cinema-900 file:font-bold hover:file:bg-brand-400 cursor-pointer"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                URL du fichier audio MP3 / WAV *
              </label>
              <input
                type="url"
                required
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://serveur.com/morceau.mp3"
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono text-xs"
              />
            </div>
          )}

          {/* Pré-écoute et Réglage du Moment de Départ précis */}
          {audioUrl && (
            <div className="bg-cinema-900/90 rounded-xl border border-cinema-700/80 p-4 space-y-3">
              <audio
                ref={audioPreviewRef}
                src={audioUrl}
                onTimeUpdate={handlePreviewTimeUpdate}
                onEnded={() => setIsPlayingPreview(false)}
              />

              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-brand-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-400" />
                  Moment de début précis (Point fort de la musique)
                </span>
                <span className="font-mono text-slate-300 bg-cinema-800 px-2 py-0.5 rounded border border-cinema-700">
                  Début : <strong className="text-brand-400">{formatSeconds(defaultStartTime)}</strong>
                </span>
              </div>

              {/* Scrubber de pré-écoute */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePreviewPlay}
                  className="w-8 h-8 rounded-full bg-brand-500 hover:bg-brand-400 text-cinema-900 flex items-center justify-center shrink-0"
                >
                  {isPlayingPreview ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>

                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.5"
                  value={previewCurrentTime}
                  onChange={(e) => {
                    const t = parseFloat(e.target.value);
                    setPreviewCurrentTime(t);
                    if (audioPreviewRef.current) audioPreviewRef.current.currentTime = t;
                  }}
                  className="w-full h-1.5 bg-cinema-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />

                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  {formatSeconds(previewCurrentTime)} / {formatSeconds(duration)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-slate-400 italic">
                  Écoutez et cliquez pour caler le point d'entrée idéal :
                </p>
                <button
                  type="button"
                  onClick={setAsStartTime}
                  className="px-3 py-1 bg-cinema-800 hover:bg-brand-500 hover:text-cinema-900 text-slate-200 text-xs font-semibold rounded-lg border border-cinema-700 transition-colors flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Prendre {formatSeconds(previewCurrentTime)} comme début
                </button>
              </div>
            </div>
          )}

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
              disabled={isSubmitting || !title || (!audioUrl && !selectedFile)}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-400 text-cinema-900 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md"
            >
              {isSubmitting ? 'Téléversement en cours...' : 'Enregistrer le morceau'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
