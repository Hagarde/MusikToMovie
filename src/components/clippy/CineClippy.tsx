import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';

const CINE_OBSERVATIONS = [
  {
    title: "Discipline d'Acteur",
    text: "Dans Les Deux Tours, quand Aragorn shoote dans le casque d'Uruk-hai, Viggo Mortensen s'est brisé deux orteils en direct. Un acteur de la Comédie-Française n'aurait pas bronché, mais Peter Jackson a gardé la prise par pitié.",
    category: "Vérité de Tournage",
  },
  {
    title: "Le Climax de l'Humanité",
    text: "Inception est l'apogée intellectuelle de la civilisation occidentale. À la 148ème minute, l'oscillation de 0.2 mm de la toupie prouve irréfutablement la faillite de la physique newtonienne.",
    category: "Analyse Fondamentale",
  },
  {
    title: "Le Sens du Détail",
    text: "Leonardo DiCaprio s'est coupé la main avec un vrai verre dans Django. Le sang sur la table était réel, ce qui en fait techniquement le premier documentaire culinaire de Tarantino.",
    category: "Légende Vivante",
  },
  {
    title: "Tragédie Contemporaine",
    text: "Fast & Furious : Tokyo Drift est la réécriture la plus fidèle d'Œdipe Roi depuis Sophocle. Le drift symbolise la vaine tentative de l'homme d'échapper à l'inertie de son destin.",
    category: "Grands Textes",
  },
  {
    title: "Rigueur Élémentaire",
    text: "Stanley Kubrick a fait refaire 127 fois la prise de la hache à Jack Nicholson dans Shining. C'est le strict minimum syndical quand on a un soupçon d'amour-propre.",
    category: "Exigence Artistique",
  },
  {
    title: "Définition Formelle",
    text: "Si un plan dure moins de 45 secondes sans violoncelle solo ni pluie torrentielle, c'est un reel Instagram, pas du 7ème Art.",
    category: "Grammaire Visuelle",
  },
  {
    title: "Rapport Scientifique",
    text: "Interstellar a été formellement validé par un comité de physiciens nobélisés. L'amour transcende littéralement la gravitation quantique, c'est une formule mathématique.",
    category: "Astrophysique",
  },
  {
    title: "Civisme & Respect",
    text: "Regarder un film en version française ou sur un écran de smartphone de moins de 6.5 pouces devrait être passible d'une amende forfaitaire de troisième classe.",
    category: "Code de Conduite",
  },
  {
    title: "Précision Philologique",
    text: "Dark Vador ne dit pas 'Luke, je suis ton père', mais 'Non, je suis ton père'. Mais bon, je ne m'attends pas à ce que le public occasionnel maîtrise la linguistique galactique.",
    category: "Restitution Canonique",
  },
  {
    title: "Bio-compatibilité",
    text: "Le 24 images par seconde est la seule fréquence biologiquement compatible avec l'âme humaine. Au-delà de 30 fps, votre cerveau consomme du contenu de salle d'attente.",
    category: "Physiologie de l'Œil",
  }
];

export const CineClippy: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isClapping, setIsClapping] = useState(false);

  // Changement automatique toutes les 18 secondes
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      triggerClap();
      setCurrentIndex((prev) => (prev + 1) % CINE_OBSERVATIONS.length);
    }, 18000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Clignement d'yeux mignon
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
    }, 3600);
    return () => clearInterval(blinkInterval);
  }, []);

  const triggerClap = () => {
    setIsClapping(true);
    setTimeout(() => setIsClapping(false), 260);
  };

  const nextObservation = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerClap();
    setCurrentIndex((prev) => (prev + 1) % CINE_OBSERVATIONS.length);
  };

  const current = CINE_OBSERVATIONS[currentIndex];

  return (
    <aside 
      aria-label="Clappy, le clap de tournage cinéphile"
      className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end pointer-events-none select-none max-w-[calc(100vw-1.5rem)] sm:max-w-[360px]"
    >
      {/* Bulle de dialogue flottante style bande dessinée */}
      {isOpen && (
        <div className="pointer-events-auto mb-2 p-3.5 sm:p-4 bg-white rounded-3xl border border-stone-200 shadow-xl text-stone-900 animate-in fade-in slide-in-from-bottom-2 duration-200 relative backdrop-blur-md">
          {/* En-tête discret */}
          <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-1.5 mb-1.5">
            <span className="text-[9px] sm:text-[10px] font-bold text-stone-500 font-mono uppercase tracking-wider">
              {current.category}
            </span>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-stone-900 p-0.5 rounded-full hover:bg-stone-100 transition-colors"
              title="Fermer la bulle"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Titre & Texte avec second degré pur */}
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-stone-900 font-display">
              {current.title}
            </h4>
            <p className="text-[11px] sm:text-xs text-stone-700 leading-relaxed">
              "{current.text}"
            </p>
          </div>

          {/* Bouton Suivant discret */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-stone-100 text-[10px] text-stone-400">
            <span className="font-mono">Clappy • Le Cinéphile</span>
            <button
              type="button"
              onClick={nextObservation}
              className="flex items-center gap-1 font-bold text-stone-700 hover:text-stone-900 p-1 rounded-lg hover:bg-stone-100 transition-colors"
              title="Anecdote suivante"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Autre vérité</span>
            </button>
          </div>

          {/* Pointe de bulle pointant directement vers le personnage libre */}
          <div className="absolute -bottom-2 right-10 w-3.5 h-3.5 bg-white border-r border-b border-stone-200 transform rotate-45 shadow-sm" />
        </div>
      )}

      {/* 🎬 Personnage Clappy vectoriel sans boîte, libre et mignon */}
      <button
        type="button"
        onClick={() => {
          if (!isOpen) {
            setIsOpen(true);
          }
          nextObservation();
        }}
        className="pointer-events-auto group focus:outline-none transition-transform hover:scale-110 active:scale-95 drop-shadow-lg cursor-pointer"
        title="Cliquez sur Clappy pour une vérité cinématographique !"
      >
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 drop-shadow-xl filter">
          {/* Dessin SVG mignon et détaillé de Clappy */}
          <svg viewBox="0 0 120 120" className="w-full h-full">
            <defs>
              {/* Dégradé doux de l'ardoise */}
              <linearGradient id="slateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#292524" />
                <stop offset="100%" stopColor="#1c1917" />
              </linearGradient>

              {/* Motif à rayures du clap */}
              <pattern id="cuteStripes" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="8" height="16" fill="#1c1917" />
                <rect x="8" width="8" height="16" fill="#f5f5f4" />
              </pattern>
            </defs>

            {/* Ombre portée douce au sol */}
            <ellipse cx="60" cy="114" rx="30" ry="4" fill="#000000" fillOpacity="0.15" />

            {/* Petits pieds mignons de dessin animé */}
            <ellipse cx="44" cy="108" rx="8" ry="5" fill="#1c1917" />
            <ellipse cx="76" cy="108" rx="8" ry="5" fill="#1c1917" />

            {/* 1. Corps de l'ardoise (arrondi, mignon) */}
            <rect
              x="22"
              y="44"
              width="76"
              height="60"
              rx="12"
              fill="url(#slateGrad)"
              stroke="#1c1917"
              strokeWidth="2.5"
            />

            {/* Lignes de tableau de tournage */}
            <line x1="30" y1="56" x2="90" y2="56" stroke="#44403c" strokeWidth="1.5" strokeDasharray="2 2" />
            <text x="30" y="52" fill="#a8a29e" fontSize="6.5" fontFamily="monospace" fontWeight="bold">SCENE 1</text>
            <text x="68" y="52" fill="#a8a29e" fontSize="6.5" fontFamily="monospace" fontWeight="bold">TAKE 1</text>

            {/* 2. Barre inférieure fixe du clap */}
            <rect
              x="22"
              y="32"
              width="76"
              height="14"
              rx="3"
              fill="url(#cuteStripes)"
              stroke="#1c1917"
              strokeWidth="2"
            />

            {/* 3. Bras mobile supérieur du clap (Qui claque !) */}
            <g
              style={{
                transformOrigin: '24px 34px',
                transform: isClapping ? 'rotate(-26deg)' : 'rotate(-8deg)',
                transition: 'transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <rect
                x="22"
                y="19"
                width="76"
                height="14"
                rx="4"
                fill="url(#cuteStripes)"
                stroke="#1c1917"
                strokeWidth="2"
              />
              {/* Charnière rouge vive */}
              <circle cx="28" cy="26" r="4" fill="#e11d48" stroke="#1c1917" strokeWidth="1.5" />
            </g>

            {/* 4. Joues roses mignonnes (Blush) */}
            <circle cx="36" cy="80" r="5" fill="#f43f5e" fillOpacity="0.45" />
            <circle cx="84" cy="80" r="5" fill="#f43f5e" fillOpacity="0.45" />

            {/* 5. Grands Yeux de Clippy (Mignons et brillants) */}
            {isBlinking ? (
              // Yeux fermés en petits arcs souriants ^^
              <g stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round">
                <path d="M 40 73 Q 48 68 56 73" fill="none" />
                <path d="M 64 73 Q 72 68 80 73" fill="none" />
              </g>
            ) : (
              // Grands yeux expressifs animés
              <g>
                {/* Oeil Gauche */}
                <ellipse cx="48" cy="72" rx="10" ry="12" fill="#ffffff" stroke="#1c1917" strokeWidth="1.5" />
                <circle cx="50" cy="71" r="5.5" fill="#1c1917" />
                <circle cx="52.5" cy="68" r="2.2" fill="#ffffff" />
                <circle cx="48" cy="74" r="1.2" fill="#ffffff" />

                {/* Oeil Droit */}
                <ellipse cx="72" cy="72" rx="10" ry="12" fill="#ffffff" stroke="#1c1917" strokeWidth="1.5" />
                <circle cx="74" cy="71" r="5.5" fill="#1c1917" />
                <circle cx="76.5" cy="68" r="2.2" fill="#ffffff" />
                <circle cx="72" cy="74" r="1.2" fill="#ffffff" />

                {/* Sourcils mignons relevés */}
                <path d="M 40 57 Q 48 53 55 57" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 65 57 Q 72 52 80 56" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}

            {/* 6. Petite bouche souriante attachante */}
            <path
              d="M 54 87 Q 60 93 66 87"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Petites mains mignonnes sur les côtés */}
            <circle cx="16" cy="74" r="6" fill="#ffffff" stroke="#1c1917" strokeWidth="2" />
            <circle cx="104" cy="74" r="6" fill="#ffffff" stroke="#1c1917" strokeWidth="2" />
          </svg>
        </div>
      </button>
    </aside>
  );
};
