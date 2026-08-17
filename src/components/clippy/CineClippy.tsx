import React, { useState, useEffect } from 'react';
import { Sparkles, X, RefreshCw, Clapperboard } from 'lucide-react';

const CINE_ANECDOTES = [
  {
    title: "Le Saviez-vous ? (Évidemment)",
    text: "Dans Les Deux Tours, quand Aragorn donne un coup de pied dans le casque d'Uruk-hai, Viggo Mortensen s'est VRAIMENT brisé deux orteils. Le cri de douleur dans le film est 100% authentique. Tout vrai cinéphile DOIT le répéter à chaque visionnage.",
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
    text: "Dans Le Parrain, le chat sur les genoux de Marlon Brando n'était pas dans le scénario : c'était un chat errant des studios Paramount qu'il a pris spontanément. Son ronronnement a presque ruiné la prise de son.",
    category: "Improvisation Féline",
  }
];

export const CineClippy: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isClapping, setIsClapping] = useState(false);

  // Changement automatique de citation toutes les 16 secondes si la bulle est ouverte
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      triggerClap();
      setCurrentIndex((prev) => (prev + 1) % CINE_ANECDOTES.length);
    }, 16000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Clignement d'yeux de la mascotte
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 220);
    }, 3200);
    return () => clearInterval(blinkInterval);
  }, []);

  const triggerClap = () => {
    setIsClapping(true);
    setTimeout(() => setIsClapping(false), 300);
  };

  const nextAnecdote = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerClap();
    setCurrentIndex((prev) => (prev + 1) % CINE_ANECDOTES.length);
  };

  const current = CINE_ANECDOTES[currentIndex];

  return (
    <aside 
      aria-label="Clap-Clippy, anecdotes et avis de cinéma"
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
              title="Réduire Clap-Clippy"
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
              <span>Autre pépite 🎬</span>
            </button>
          </div>

          {/* Pointe de bulle vers Clap-Clippy */}
          <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-r-2 border-b-2 border-stone-900 transform rotate-45" />
        </div>
      )}

      {/* Mascotte "Clap-Clippy" (Le Clap de Tournage Expressif façon Clippy) */}
      <button
        type="button"
        onClick={() => {
          if (!isOpen) {
            setIsOpen(true);
            triggerClap();
          } else {
            nextAnecdote();
          }
        }}
        className="pointer-events-auto group relative flex items-center justify-center p-2 rounded-2xl bg-white border-2 border-stone-900 shadow-arty hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
        title={isOpen ? "Clique pour clapper une autre anecdote !" : "Ouvrir Clap-Clippy"}
      >
        <div className="relative w-12 h-12 flex items-center justify-center">
          {/* Dessin SVG de Clap-Clippy */}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow">
            <defs>
              {/* Motif rayé cinéma pour le clap (noir et blanc biseauté) */}
              <pattern id="clapperStripes" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="8" height="16" fill="#1c1917" />
                <rect x="8" width="8" height="16" fill="#ffffff" />
              </pattern>
            </defs>

            {/* 1. Corps de l'ardoise (Le rectangle du bas) */}
            <rect
              x="14"
              y="38"
              width="72"
              height="52"
              rx="8"
              fill="#1c1917"
              stroke="#1c1917"
              strokeWidth="3"
            />

            {/* Lignes de repères cinéma sur l'ardoise */}
            <line x1="20" y1="52" x2="80" y2="52" stroke="#44403c" strokeWidth="1.5" strokeDasharray="3 3" />
            <text x="20" y="48" fill="#a8a29e" fontSize="7" fontFamily="monospace" fontWeight="bold">SCENE 1</text>
            <text x="56" y="48" fill="#a8a29e" fontSize="7" fontFamily="monospace" fontWeight="bold">TAKE 24</text>

            {/* 2. Barre supérieure fixe (base du clap) */}
            <rect
              x="14"
              y="28"
              width="72"
              height="11"
              rx="2"
              fill="url(#clapperStripes)"
              stroke="#1c1917"
              strokeWidth="2.5"
            />

            {/* 3. Bras articulé du Clap (S'ouvre et claque !) */}
            <g
              style={{
                transformOrigin: '16px 28px',
                transform: isClapping ? 'rotate(-24deg)' : 'rotate(-6deg)',
                transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <rect
                x="14"
                y="17"
                width="72"
                height="11"
                rx="3"
                fill="url(#clapperStripes)"
                stroke="#1c1917"
                strokeWidth="2.5"
              />
              {/* Vis / Charnière de fixation */}
              <circle cx="19" cy="22" r="3" fill="#e11d48" stroke="#1c1917" strokeWidth="1.5" />
            </g>

            {/* 4. Les Yeux expressifs façon Clippy */}
            {isBlinking ? (
              // Yeux fermés / clignement
              <g stroke="#ffffff" strokeWidth="3" strokeLinecap="round">
                <line x1="32" y1="68" x2="44" y2="68" />
                <line x1="56" y1="68" x2="68" y2="68" />
              </g>
            ) : (
              // Grands yeux expressifs et sympathiques
              <g>
                {/* Oeil Gauche */}
                <ellipse cx="38" cy="67" rx="9" ry="11" fill="#ffffff" stroke="#1c1917" strokeWidth="2" />
                <circle cx="40" cy="66" r="4.5" fill="#1c1917" />
                <circle cx="42" cy="64" r="1.8" fill="#ffffff" />

                {/* Oeil Droit */}
                <ellipse cx="62" cy="67" rx="9" ry="11" fill="#ffffff" stroke="#1c1917" strokeWidth="2" />
                <circle cx="64" cy="66" r="4.5" fill="#1c1917" />
                <circle cx="66" cy="64" r="1.8" fill="#ffffff" />

                {/* Sourcils façon Clippy (un sourcil levé curieux) */}
                <path d="M 31 54 Q 38 49 45 53" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 55 53 Q 62 48 69 52" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}

            {/* 5. Bouche souriante */}
            <path
              d="M 44 80 Q 50 85 56 80"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Petit badge caméra en coin */}
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-[8px] text-white font-bold shadow">
          🎬
        </span>
      </button>
    </aside>
  );
};
