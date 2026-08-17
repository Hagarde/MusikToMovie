import React from 'react';
import { Film, Music, Compass, Plus, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentView: 'tracks' | 'proposals' | 'create' | 'view';
  onNavigate: (view: 'tracks' | 'proposals') => void;
  onOpenUpload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenUpload,
}) => {
  return (
    <header className="border-b border-cinema-700/60 bg-cinema-900/80 backdrop-blur-xl sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Titre */}
        <button
          type="button"
          onClick={() => onNavigate('tracks')}
          className="flex items-center gap-3 group text-left"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 flex items-center justify-center text-cinema-950 font-black shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-all">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-extrabold text-white tracking-tight flex items-center gap-1 font-display">
              Musik<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">To</span>Movie
            </span>
            <span className="block text-[10px] text-amber-300/70 tracking-widest uppercase font-semibold">
              Audio-to-Cinema Studio
            </span>
          </div>
        </button>

        {/* Navigation principale */}
        <nav className="flex items-center gap-1.5 sm:gap-3 bg-cinema-850/80 p-1.5 rounded-2xl border border-white/5 shadow-inner">
          <button
            type="button"
            onClick={() => onNavigate('tracks')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'tracks'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-cinema-950 shadow-md shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-300 hover:text-white hover:bg-cinema-750/60'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Musiques</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('proposals')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'proposals' || currentView === 'view'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-cinema-950 shadow-md shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-300 hover:text-white hover:bg-cinema-750/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Galerie Scénarios</span>
          </button>
        </nav>

        {/* Bouton d'action & GitHub */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenUpload}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-cinema-950 text-xs font-extrabold transition-all hover:scale-105 shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Ajouter Musique</span>
          </button>

          <a
            href="https://github.com/Hagarde/MusikToMovie"
            target="_blank"
            rel="noreferrer"
            className="p-2.5 rounded-xl text-slate-400 hover:text-white bg-cinema-850 hover:bg-cinema-750 border border-white/5 transition-colors"
            title="Dépôt GitHub"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
};
