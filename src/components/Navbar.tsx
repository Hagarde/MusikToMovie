import React from 'react';
import { Film, Music, Compass, Sparkles, Plus, Shield, ShieldCheck, LogOut, Radio, Mic, Layers, Disc } from 'lucide-react';

export type AppView = 
  | 'concept' 
  | 'tracks' 
  | 'proposals' 
  | 'create' 
  | 'view' 
  | 'm2m_gallery' 
  | 'm2m_studio'
  | 'm2m_mashup_gallery'
  | 'm2m_mashup_studio';

export type AppMode = 'musiktomovie' | 'movietomusik' | 'musiktomusik';

interface NavbarProps {
  currentView: AppView;
  appMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  onNavigate: (view: AppView) => void;
  onOpenUpload: () => void;
  isAdmin: boolean;
  onToggleAdminModal: () => void;
  onLogoutAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  appMode,
  onSelectMode,
  onNavigate,
  onOpenUpload,
  isAdmin,
  onToggleAdminModal,
  onLogoutAdmin,
}) => {
  return (
    <header className="border-b border-stone-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Logo & Titre Arty */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (appMode === 'musiktomovie') onNavigate('concept');
              else if (appMode === 'movietomusik') onNavigate('m2m_gallery');
              else onNavigate('m2m_mashup_gallery');
            }}
            className="flex items-center gap-2 group text-left shrink-0"
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-black shadow-md group-hover:scale-105 transition-transform ${
              appMode === 'musiktomovie' ? 'bg-stone-900' : appMode === 'movietomusik' ? 'bg-rose-600' : 'bg-gradient-to-br from-violet-600 to-rose-600'
            }`}>
              {appMode === 'musiktomovie' ? (
                <Film className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : appMode === 'movietomusik' ? (
                <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Disc className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" style={{ animationDuration: '6s' }} />
              )}
            </div>
            <div>
              <span className="text-sm sm:text-base font-black text-stone-900 tracking-tight flex items-center gap-0.5 sm:gap-1 font-display">
                {appMode === 'musiktomovie' ? (
                  <>Musik<span className="text-rose-600">To</span>Movie</>
                ) : appMode === 'movietomusik' ? (
                  <>Movie<span className="text-rose-600">To</span>Musik</>
                ) : (
                  <>Musik<span className="text-violet-600">To</span>Musik</>
                )}
              </span>
              <span className="hidden sm:block text-[9px] text-stone-500 tracking-widest uppercase font-semibold">
                {appMode === 'musiktomovie' ? 'Musique → Storyboard' : appMode === 'movietomusik' ? 'Visuel → Composition Micro' : 'Stems & Mashup Lab'}
              </span>
            </div>
          </button>

          {/* Switch de Mode à 3 Univers : MusikToMovie vs MovieToMusik vs MusikToMusik */}
          <div className="hidden lg:flex items-center bg-stone-100 p-0.5 rounded-xl border border-stone-200 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => onSelectMode('musiktomovie')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                appMode === 'musiktomovie'
                  ? 'bg-white text-stone-900 shadow-sm font-extrabold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <Film className="w-3 h-3 text-stone-700" />
              <span>MusikToMovie</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectMode('movietomusik')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                appMode === 'movietomusik'
                  ? 'bg-rose-600 text-white shadow-sm font-extrabold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <Radio className="w-3 h-3 text-rose-300 animate-pulse" />
              <span>MovieToMusik</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectMode('musiktomusik')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                appMode === 'musiktomusik'
                  ? 'bg-gradient-to-r from-violet-600 to-rose-600 text-white shadow-sm font-extrabold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <Disc className="w-3 h-3 text-violet-200" />
              <span>MusikToMusik</span>
            </button>
          </div>
        </div>

        {/* Navigation principale selon le mode actif */}
        {appMode === 'musiktomovie' && (
          <nav className="flex items-center gap-0.5 sm:gap-1 bg-stone-100/90 p-0.5 sm:p-1 rounded-2xl border border-stone-200 text-[11px] sm:text-xs shrink min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('concept')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 shrink-0 ${
                currentView === 'concept'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="hidden xs:inline">Le Concept</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('tracks')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 shrink-0 ${
                currentView === 'tracks'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Music className="w-3.5 h-3.5 shrink-0" />
              <span>Musiques</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('proposals')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 shrink-0 ${
                currentView === 'proposals' || currentView === 'view'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Galerie</span>
              <span className="sm:hidden">Films</span>
            </button>
          </nav>
        )}

        {appMode === 'movietomusik' && (
          <nav className="flex items-center gap-0.5 sm:gap-1 bg-stone-100/90 p-0.5 sm:p-1 rounded-2xl border border-stone-200 text-[11px] sm:text-xs shrink min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('m2m_gallery')}
              className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                currentView === 'm2m_gallery'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Galerie Sonore</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('m2m_studio')}
              className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                currentView === 'm2m_studio'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Studio Micro</span>
            </button>
          </nav>
        )}

        {appMode === 'musiktomusik' && (
          <nav className="flex items-center gap-0.5 sm:gap-1 bg-stone-100/90 p-0.5 sm:p-1 rounded-2xl border border-stone-200 text-[11px] sm:text-xs shrink min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('m2m_mashup_gallery')}
              className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                currentView === 'm2m_mashup_gallery'
                  ? 'bg-gradient-to-r from-violet-600 to-rose-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Galerie Mashups</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('m2m_mashup_studio')}
              className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                currentView === 'm2m_mashup_studio'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Disc className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span>Studio Mashup</span>
            </button>
          </nav>
        )}

        {/* Actions : Ajouter Musique / Switch Mobile / Admin */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Switcher Mode sur mobile */}
          <div className="lg:hidden flex items-center bg-stone-100 rounded-xl p-0.5 border border-stone-200 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => onSelectMode(
                appMode === 'musiktomovie' ? 'movietomusik' : appMode === 'movietomusik' ? 'musiktomusik' : 'musiktomovie'
              )}
              className="px-2 py-1 rounded-lg bg-white shadow-sm text-stone-900"
            >
              {appMode === 'musiktomovie' ? '🎬 M2M' : appMode === 'movietomusik' ? '🎙️ Movie' : '🎛️ Remix'}
            </button>
          </div>

          {appMode === 'musiktomovie' && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all hover:scale-105 shadow-sm flex items-center gap-1.5"
              title="Ajouter un morceau YouTube"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden md:inline">Ajouter Musique</span>
            </button>
          )}

          {/* Bouton / Badge Mode Admin */}
          {isAdmin ? (
            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-xl px-2 py-1 text-xs">
              <span className="flex items-center gap-1 font-bold text-rose-700 text-[10px] sm:text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden lg:inline">Admin</span>
              </span>
              <button
                type="button"
                onClick={onLogoutAdmin}
                className="p-0.5 text-rose-500 hover:text-rose-800 rounded hover:bg-rose-100 transition-colors"
                title="Quitter le mode administrateur"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggleAdminModal}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors flex items-center text-xs"
              title="Connexion Administrateur"
            >
              <Shield className="w-3.5 h-3.5" />
            </button>
          )}

          <a
            href="https://github.com/Hagarde/MusikToMovie"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors hidden xs:flex"
            title="Dépôt GitHub"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
};
