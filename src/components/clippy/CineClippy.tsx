import React, { useState, useEffect } from 'react';
import { Sparkles, MessageSquare, X, ChevronRight, RefreshCw, Film } from 'lucide-react';

const CINE_ANECDOTES = [
  {
    title: "Le Saviez-vous ? (Évidemment)",
    text: "Dans Les Deux Tours, quand Aragorn donne un coup de pied rageur dans le casque d'Uruk-hai, Viggo Mortensen s'est VRAIMENT brisé deux orteils. Le cri de douleur dans le film est 100% authentique. Tout vrai cinéphile DOIT le répéter à chaque visionnage.",
    category: "Anecdote Sacrée",
  },
  {
    title: "Avis Catastrophique #1",
    text: "Inception est objectivement le plus grand chef-d'œuvre de l'histoire de l'humanité. D'ailleurs, à la 148ème minute, le plan montre clairement que la toupie oscille de 0.3 millimètre, ce qui prouve absolument tout.",
    category: "Hot Take Infaillible",
  },
  {
    title: "Le Saviez-vous ? #2",
    text: "Dans Django Unchained, Leonardo DiCaprio s'est réellement coupé la main avec un verre brisé en pleine prise. Il a continué de jouer en s'étalant son vrai sang sur le visage. Du génie brut.",
    category: "Légende du Cinéma",
  },
  {
    title: "Avis Catastrophique #2",
    text: "Citizen Kane ? Franchement surcoté. La véritable révolution dramaturgique et narrative du 21ème siècle, c'est le braquage du coffre-fort dans Fast & Furious 5.",
    category: "Provocation Pure",
  },
  {
    title: "Cinéma d'Auteur Élégant",
    text: "Personnellement, je ne regarde plus que des films roumains en noir et blanc de 4h30 sous-titrés en espéranto. Mais bon, écouter Hans Zimmer sur YouTube c'est pas mal non plus.",
    category: "Élitisme Décomplexé",
  },
  {
    title: "Le Saviez-vous ? #3",
    text: "Stanley Kubrick a fait refaire 127 fois la prise de la hache à Jack Nicholson dans Shining. Stanley était un homme tout à fait équilibré et sans compromis.",
    category: "Tournage Apaisé",
  },
  {
    title: "Avis Catastrophique #3",
    text: "Interstellar n'est pas un film de science-fiction : c'est un cours magistral d'astrophysique quantique validé à 100% par l'académie des sciences et mon cousin qui a fait S.",
    category: "Rigueur Scientifique",
  },
  {
    title: "Vérité Absolue",
    text: "Si une scène ne dure pas au moins 8 minutes en plan-séquence sous la pluie avec un violoncelle mélancolique en fond, peut-on encore légalement appeler ça du 7ème Art ?",
    category: "Théorie du Cinéma",
  },
  {
    title: "Le Saviez-vous ? #4",
    text: "Dans Le Parrain, le chat sur les genoux de Marlon Brando n'était pas dans le scénario : c'était un chat errant des studios Paramount qu'il a pris sur ses genoux. Son ronronnement a presque ruiné la prise de son.",
    category: "Improvisation Féline",
  }
];

export const CineClippy: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Changement automatique de citation toutes les 16 secondes si la bulle est ouverte
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CINE_ANECDOTES.length);
    }, 16000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Clignement d'yeux aléatoire de Clippy
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 3500);
    return () => clearInterval(blinkInterval);
  }, []);

  const nextAnecdote = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % CINE_ANECDOTES.length);
  };

  const current = CINE_ANECDOTES[currentIndex];

  return (
    <aside 
      aria-label="Ciné-Clippy, anecdotes et avis de cinéma"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end pointer-events-none select-none max-w-[340px] sm:max-w-[380px]"
    >
      {/* Bulle de dialogue interactive */}
      {isOpen && (
        <div className="pointer-events-auto mb-3 p-4 bg-white rounded-2xl border-2 border-stone-900 shadow-arty text-stone-900 animate-in fade-in slide-in-from-bottom-3 duration-200 relative">
          {/* En-tête de la bulle */}
          <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-mono">
                {current.category}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-stone-900 p-0.5 rounded hover:bg-stone-100 transition-colors"
              title="Réduire Clippy"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Titre & Texte d'anecdote */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-black text-stone-900 font-display flex items-center gap-1">
              <span>{current.title}</span>
            </h4>
            <p className="text-xs text-stone-700 leading-relaxed font-sans">
              "{current.text}"
            </p>
          </div>

          {/* Boutons d'action dans la bulle */}
          <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-stone-100 text-[11px]">
            <span className="text-[10px] text-stone-400 font-mono">
              {currentIndex + 1} / {CINE_ANECDOTES.length}
            </span>

            <button
              type="button"
              onClick={nextAnecdote}
              className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-[10px] flex items-center gap-1 transition-transform hover:scale-105"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Autre pépite</span>
            </button>
          </div>

          {/* Pointe de bulle vers Clippy */}
          <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-r-2 border-b-2 border-stone-900 transform rotate-45" />
        </div>
      )}

      {/* Mascotte Clippy Réalisateur / Cinéphile */}
      <button
        type="button"
        onClick={() => {
          if (!isOpen) {
            setIsOpen(true);
          } else {
            nextAnecdote();
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="pointer-events-auto group relative flex items-center justify-center p-2 rounded-2xl bg-white border-2 border-stone-900 shadow-arty hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
        title={isOpen ? "Clique pour une autre anecdote !" : "Ouvrir Ciné-Clippy"}
      >
        <div className="relative w-11 h-11 flex items-center justify-center">
          {/* Dessin SVG de Clippy en Lunettes 3D Rétro / Réalisateur */}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow">
            {/* Corps du Trombone en Métal */}
            <path
              d="M 50 15 
                 C 30 15, 20 28, 20 48 
                 C 20 72, 35 88, 55 88 
                 C 75 88, 85 75, 85 55 
                 C 85 35, 75 25, 60 25 
                 C 45 25, 35 35, 35 52 
                 C 35 68, 42 76, 52 76 
                 C 62 76, 70 68, 70 55
                 L 70 42"
              fill="none"
              stroke="#1c1917"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Berêt de réalisateur noir posé sur la tête */}
            <ellipse cx="48" cy="18" rx="20" ry="6" fill="#1c1917" />
            <circle cx="48" cy="13" r="3" fill="#e11d48" />

            {/* Yeux expressifs avec lunettes 3D rétro (Verre Cyan & Verre Rouge) */}
            {isBlinking ? (
              // Yeux fermés / clin d'œil
              <g stroke="#1c1917" strokeWidth="3" strokeLinecap="round">
                <line x1="38" y1="36" x2="48" y2="36" />
                <line x1="56" y1="36" x2="66" y2="36" />
              </g>
            ) : (
              // Lunettes 3D Stéréoscopiques
              <g>
                {/* Monture */}
                <rect x="34" y="30" width="36" height="15" rx="3" fill="#ffffff" stroke="#1c1917" strokeWidth="2.5" />
                <line x1="52" y1="30" x2="52" y2="45" stroke="#1c1917" strokeWidth="2" />
                
                {/* Verre Gauche (Rouge/Magenta) */}
                <rect x="36" y="32" width="14" height="11" rx="2" fill="#ef4444" fillOpacity="0.85" />
                <circle cx="43" cy="37" r="2.5" fill="#ffffff" />
                <circle cx="44" cy="37" r="1.5" fill="#000000" />

                {/* Verre Droit (Cyan/Bleu) */}
                <rect x="54" y="32" width="14" height="11" rx="2" fill="#06b6d4" fillOpacity="0.85" />
                <circle cx="61" cy="37" r="2.5" fill="#ffffff" />
                <circle cx="62" cy="37" r="1.5" fill="#000000" />
              </g>
            )}

            {/* Bouche souriante / narquoise */}
            <path
              d="M 44 54 Q 52 60 60 54"
              fill="none"
              stroke="#1c1917"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Badge indicateur de présence */}
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">
          🎬
        </span>
      </button>
    </aside>
  );
};
