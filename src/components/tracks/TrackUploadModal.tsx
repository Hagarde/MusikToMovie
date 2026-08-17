import React, { useState } from 'react';
import { X, Upload, Music, Link as LinkIcon, Sparkles } from 'lucide-react';
import { Track } from '../../lib/types';
import { createTrack } from '../../lib/supabase';

interface TrackUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackCreated: (newTrack: Track) => void;
}

export const TrackUploadModal: React.FC<TrackUploadModalProps> = ({
  isOpen,
  onClose,
  onTrackCreated,
}) => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [duration, setDuration] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileMode, setFileMode] = useState<'url' | 'file'>('url');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Titre automatique à partir du nom de fichier
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
    if (!title) setTitle(cleanTitle);

    // Convertir en Data URL locale
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAudioUrl(event.target.result as string);
        // Calcul de la durée avec Audio
        const audio = new Audio(event.target.result as string);
        audio.onloadedmetadata = () => {
          setDuration(Math.round(audio.duration));
        };
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !audioUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await createTrack({
        title: title.trim(),
        artist: artist.trim() || 'Artiste Indépendant',
        audio_url: audioUrl,
        duration: duration || 60,
      });
      onTrackCreated(created);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-cinema-850 rounded-2xl border border-cinema-700 w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cinema-700/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-white">Ajouter un nouveau morceau</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-cinema-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex rounded-xl bg-cinema-900 p-1 border border-cinema-700/60 text-xs">
            <button
              type="button"
              onClick={() => setFileMode('url')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                fileMode === 'url' ? 'bg-brand-500 text-cinema-900 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Lien / URL Audio (MP3 / WAV)
            </button>
            <button
              type="button"
              onClick={() => setFileMode('file')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                fileMode === 'file' ? 'bg-brand-500 text-cinema-900 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Fichier Local (Upload)
            </button>
          </div>

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
              className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
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
              placeholder="Ex: Hans Zimmer, Ennio Morricone, Nom de groupe..."
              className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {fileMode === 'url' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                URL du fichier audio MP3 / WAV *
              </label>
              <input
                type="url"
                required
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://mon-serveur.com/morceau.mp3"
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono text-xs"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sélectionner un fichier audio MP3 ou WAV
              </label>
              <input
                type="file"
                accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg"
                onChange={handleFileUpload}
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl p-2 text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-brand-500 file:text-cinema-900 file:font-bold hover:file:bg-brand-400 cursor-pointer"
              />
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
              disabled={isSubmitting || !title || !audioUrl}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-400 text-cinema-900 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? 'Enregistrement...' : 'Ajouter le morceau'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
