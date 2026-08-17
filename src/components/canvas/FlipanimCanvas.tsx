import React, { useRef, useState, useEffect } from 'react';
import { 
  Paintbrush, 
  Eraser, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Plus, 
  Copy, 
  Play, 
  Pause, 
  Layers,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ArrowLeftToLine
} from 'lucide-react';

interface FlipanimCanvasProps {
  initialFrames?: string[];
  onChange?: (frames: string[]) => void;
  onTogglePlayAnim?: (isPlaying: boolean) => void;
  fps?: number;
  readOnly?: boolean;
}

const COLOR_PALETTE = [
  '#ffffff', // Blanc
  '#cbd5e1', // Gris clair
  '#64748b', // Gris moyen
  '#0f172a', // Noir
  '#eab308', // Or cinéma
  '#ef4444', // Rouge vif
  '#3b82f6', // Bleu
  '#22c55e', // Vert
];

const BRUSH_SIZES = [2, 4, 8, 16];
const FPS_OPTIONS = [1, 2, 4, 6];

export const FlipanimCanvas: React.FC<FlipanimCanvasProps> = ({
  initialFrames = [],
  onChange,
  onTogglePlayAnim,
  fps = 3,
  readOnly = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [frames, setFrames] = useState<string[]>(
    initialFrames.length > 0 ? initialFrames : ['']
  );
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  
  // Outils de dessin
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState<string>('#ffffff');
  const [brushSize, setBrushSize] = useState<number>(3);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [onionSkin, setOnionSkin] = useState<boolean>(true);

  // Drag & Drop des frames
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Mode Lecture Animation (Flipbook)
  const [isPlayingAnim, setIsPlayingAnim] = useState<boolean>(false);
  const [animFps, setAnimFps] = useState<number>(fps);
  const [playFrameIndex, setPlayFrameIndex] = useState<number>(0);

  // Historique Undo/Redo pour la frame active
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);

  // Charger ou réinitialiser le canvas sur la frame courante
  const loadFrame = (index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#12141c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessin de l'onion skin (frame précédente en filigrane)
    if (onionSkin && index > 0 && frames[index - 1]) {
      const prevImg = new Image();
      prevImg.onload = () => {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.drawImage(prevImg, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        drawCurrentFrameContent(ctx, canvas, index);
      };
      prevImg.src = frames[index - 1];
      return;
    }

    drawCurrentFrameContent(ctx, canvas, index);
  };

  const drawCurrentFrameContent = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, index: number) => {
    const frameData = frames[index];
    if (frameData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        saveHistoryState();
      };
      img.src = frameData;
    } else {
      saveHistoryState();
    }
  };

  useEffect(() => {
    if (!isPlayingAnim) {
      loadFrame(currentFrameIndex);
    }
  }, [currentFrameIndex, onionSkin]);

  // Boucle de lecture d'animation
  useEffect(() => {
    if (!isPlayingAnim || frames.length === 0) return;

    const interval = setInterval(() => {
      setPlayFrameIndex((prev) => (prev + 1) % frames.length);
    }, 1000 / animFps);

    return () => clearInterval(interval);
  }, [isPlayingAnim, frames.length, animFps]);

  const toggleAnimation = () => {
    const nextState = !isPlayingAnim;
    setIsPlayingAnim(nextState);
    if (onTogglePlayAnim) {
      onTogglePlayAnim(nextState);
    }
  };

  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const saveCurrentFrameToState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/webp', 0.85);
    const updated = [...frames];
    updated[currentFrameIndex] = dataUrl;
    setFrames(updated);
    if (onChange) onChange(updated);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly || isPlayingAnim) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isEraser ? '#12141c' : color;
    ctx.lineWidth = isEraser ? brushSize * 3 : brushSize;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly || isPlayingAnim) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || readOnly || isPlayingAnim) return;
    setIsDrawing(false);
    saveHistoryState();
    saveCurrentFrameToState();
  };

  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const prevStep = historyStep - 1;
      ctx.putImageData(history[prevStep], 0, 0);
      setHistoryStep(prevStep);
      saveCurrentFrameToState();
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const nextStep = historyStep + 1;
      ctx.putImageData(history[nextStep], 0, 0);
      setHistoryStep(nextStep);
      saveCurrentFrameToState();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#12141c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveHistoryState();
    saveCurrentFrameToState();
  };

  // Actions de Gestion des Frames (Ajout, Duplication, Suppression, Déplacement)
  const addFrameAt = (index: number) => {
    saveCurrentFrameToState();
    const newFrames = [...frames];
    newFrames.splice(index, 0, '');
    setFrames(newFrames);
    setCurrentFrameIndex(index);
    setHistory([]);
    setHistoryStep(-1);
    if (onChange) onChange(newFrames);
  };

  const duplicateFrame = () => {
    saveCurrentFrameToState();
    const currentFrameData = frames[currentFrameIndex];
    const newFrames = [...frames];
    newFrames.splice(currentFrameIndex + 1, 0, currentFrameData);
    setFrames(newFrames);
    setCurrentFrameIndex(currentFrameIndex + 1);
    if (onChange) onChange(newFrames);
  };

  const deleteFrame = (index: number) => {
    if (frames.length <= 1) {
      clearCanvas();
      return;
    }
    const newFrames = frames.filter((_, i) => i !== index);
    setFrames(newFrames);
    const newIdx = Math.min(currentFrameIndex, newFrames.length - 1);
    setCurrentFrameIndex(newIdx);
    if (onChange) onChange(newFrames);
  };

  const moveFrame = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    saveCurrentFrameToState();
    const newFrames = [...frames];
    const [moved] = newFrames.splice(fromIndex, 1);
    newFrames.splice(toIndex, 0, moved);
    setFrames(newFrames);
    setCurrentFrameIndex(toIndex);
    if (onChange) onChange(newFrames);
  };

  // Drag and Drop Handlers
  const handleDragStart = (index: number) => {
    if (readOnly) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      moveFrame(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="flex flex-col bg-cinema-850 rounded-2xl border border-cinema-700/80 overflow-hidden shadow-2xl space-y-0">
      {/* Barre d'outils supérieure (Adaptée Mobile) */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 bg-cinema-800/95 border-b border-cinema-700/60 text-xs">
          {/* Pinceau / Gomme */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsEraser(false)}
              className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-semibold ${
                !isEraser
                  ? 'bg-brand-500 text-cinema-950 shadow-sm'
                  : 'bg-cinema-700/50 text-slate-300 hover:bg-cinema-700'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dessin</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEraser(true)}
              className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-semibold ${
                isEraser
                  ? 'bg-brand-500 text-cinema-950 shadow-sm'
                  : 'bg-cinema-700/50 text-slate-300 hover:bg-cinema-700'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gomme</span>
            </button>
          </div>

          {/* Palette de couleurs */}
          {!isEraser && (
            <div className="flex items-center gap-1 sm:gap-1.5 bg-cinema-900/80 px-2 py-1 rounded-lg border border-cinema-700/50 overflow-x-auto max-w-[140px] sm:max-w-none">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border transition-transform shrink-0 ${
                    color === c ? 'scale-125 border-brand-400 ring-2 ring-brand-400/40' : 'border-cinema-600 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={`Couleur ${c}`}
                />
              ))}
            </div>
          )}

          {/* Épaisseur */}
          <div className="hidden xs:flex items-center gap-1 bg-cinema-900/80 px-1.5 sm:px-2 py-1 rounded-lg border border-cinema-700/50">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setBrushSize(size)}
                className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono transition-colors ${
                  brushSize === size ? 'bg-brand-500/30 text-brand-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {size}px
              </button>
            ))}
          </div>

          {/* Pelure d'oignon & Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setOnionSkin(!onionSkin)}
              className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                onionSkin
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 font-semibold'
                  : 'bg-cinema-700 text-slate-400 hover:text-white'
              }`}
              title="Afficher la frame précédente en filigrane"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Pelure d'oignon</span>
            </button>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={undo}
                disabled={historyStep <= 0}
                className="p-1.5 rounded hover:bg-cinema-700 text-slate-300 disabled:opacity-30"
                title="Annuler"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={historyStep >= history.length - 1}
                className="p-1.5 rounded hover:bg-cinema-700 text-slate-300 disabled:opacity-30"
                title="Rétablir"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                className="p-1.5 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300"
                title="Effacer la frame"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Surface du Canvas (Tactile fluide sur Mobile) */}
      <div className="relative aspect-video w-full bg-[#12141c] flex items-center justify-center overflow-hidden touch-none">
        {isPlayingAnim ? (
          <div className="w-full h-full flex items-center justify-center bg-black relative">
            {frames[playFrameIndex] ? (
              <img
                src={frames[playFrameIndex]}
                alt={`Frame ${playFrameIndex + 1}`}
                className="w-full h-full object-contain pointer-events-none select-none"
              />
            ) : (
              <span className="text-xs text-slate-500">Frame vide</span>
            )}
            <div className="absolute top-3 left-3 bg-red-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>FLIPBOOK + MUSIQUE ({playFrameIndex + 1}/{frames.length})</span>
            </div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className={`w-full h-full object-contain ${
              readOnly ? 'cursor-default' : isEraser ? 'canvas-cursor-eraser' : 'canvas-cursor-brush'
            }`}
          />
        )}

        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-500 pointer-events-none bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">
          16:9 • Frame {currentFrameIndex + 1} / {frames.length}
        </div>
      </div>

      {/* Bandeau de contrôle des Frames avec Drag & Drop et Ajout au début */}
      <div className="p-2.5 sm:p-3 bg-cinema-900 border-t border-cinema-700/60 flex flex-col gap-2.5">
        {/* Ligne 1 : Contrôles de lecture Flipbook */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAnimation}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-transform hover:scale-105 shadow-md ${
                isPlayingAnim
                  ? 'bg-rose-500 text-white shadow-rose-500/20'
                  : 'bg-brand-500 hover:bg-brand-400 text-cinema-950 shadow-brand-500/20'
              }`}
            >
              {isPlayingAnim ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlayingAnim ? 'Arrêter' : 'Flipbook + Musique'}</span>
            </button>

            {/* Vitesse FPS */}
            <div className="flex items-center gap-1 bg-cinema-800 px-1.5 py-1 rounded-lg border border-cinema-700 text-xs">
              {FPS_OPTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAnimFps(f)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    animFps === f ? 'bg-brand-500 text-cinema-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f}fps
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <span className="hidden sm:inline">Glissez-déposez (Drag & Drop) les vignettes pour réordonner</span>
          </div>
        </div>

        {/* Ligne 2 : Bandeau de Vignettes avec Drag & Drop fluide */}
        <div className="flex items-center gap-2 overflow-x-auto py-1.5 max-w-full">
          {/* Bouton rapide : Insérer une frame au tout début (position 1) */}
          {!readOnly && (
            <button
              type="button"
              onClick={() => addFrameAt(0)}
              className="px-2.5 py-2 rounded-xl bg-cinema-800 hover:bg-cinema-750 border border-cinema-700/80 hover:border-brand-500/60 text-slate-300 hover:text-brand-300 text-[10px] font-semibold flex items-center gap-1 transition-all shrink-0 shadow-sm"
              title="Créer une nouvelle frame en 1ère position"
            >
              <ArrowLeftToLine className="w-3.5 h-3.5 text-brand-400" />
              <span>+ Au début</span>
            </button>
          )}

          {/* Liste des frames déplaçables */}
          {frames.map((f, i) => {
            const isDragged = draggedIndex === i;
            const isOver = dragOverIndex === i;

            return (
              <div
                key={i}
                draggable={!readOnly && !isPlayingAnim}
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                className={`relative group shrink-0 transition-all ${
                  isDragged ? 'opacity-40 scale-95' : ''
                } ${isOver ? 'ring-2 ring-brand-400 scale-105 rounded-xl' : ''}`}
              >
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      saveCurrentFrameToState();
                      setCurrentFrameIndex(i);
                      setIsPlayingAnim(false);
                      if (onTogglePlayAnim) onTogglePlayAnim(false);
                    }}
                    className={`w-14 sm:w-16 h-9 sm:h-10 rounded-xl overflow-hidden border-2 transition-all flex items-center justify-center bg-black cursor-grab active:cursor-grabbing ${
                      currentFrameIndex === i && !isPlayingAnim
                        ? 'border-brand-400 ring-2 ring-brand-400/40 shadow-lg scale-105'
                        : 'border-cinema-700 hover:border-slate-500 opacity-75 hover:opacity-100'
                    }`}
                  >
                    {f ? (
                      <img src={f} alt={`Frame ${i + 1}`} className="w-full h-full object-cover pointer-events-none select-none" />
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono font-bold">#{i + 1}</span>
                    )}

                    {/* Numéro de frame en coin */}
                    <span className="absolute bottom-0.5 left-1 text-[9px] font-mono font-bold text-white bg-black/70 px-1 rounded">
                      {i + 1}
                    </span>
                  </button>

                  {/* Boutons de réarrangement fléchés pour mobile */}
                  {!readOnly && frames.length > 1 && (
                    <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-cinema-900 border border-cinema-700 rounded px-0.5 shadow z-10">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveFrame(i, i - 1);
                          }}
                          className="text-slate-400 hover:text-white p-0.5"
                          title="Déplacer vers la gauche"
                        >
                          <ChevronLeft className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {i < frames.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveFrame(i, i + 1);
                          }}
                          className="text-slate-400 hover:text-white p-0.5"
                          title="Déplacer vers la droite"
                        >
                          <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Bouton Supprimer */}
                  {!readOnly && frames.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFrame(i);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-400 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
                      title="Supprimer cette frame"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Boutons d'ajout à la fin et duplication */}
          {!readOnly && (
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              <button
                type="button"
                onClick={() => addFrameAt(frames.length)}
                className="px-3 py-2 rounded-xl bg-cinema-800 hover:bg-cinema-700 border border-cinema-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Ajouter une frame à la fin"
              >
                <Plus className="w-3.5 h-3.5 text-brand-400" />
                <span>Frame</span>
              </button>

              <button
                type="button"
                onClick={duplicateFrame}
                className="p-2 rounded-xl bg-cinema-800 hover:bg-cinema-700 border border-cinema-700 text-slate-300 hover:text-white transition-colors"
                title="Dupliquer la frame active pour animer le mouvement"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
