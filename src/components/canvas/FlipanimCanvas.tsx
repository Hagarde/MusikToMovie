import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
  ArrowLeftToLine,
  Image as ImageIcon
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
  '#e11d48', // Rouge cinéma
  '#f97316', // Orange
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Charger ou réinitialiser le canvas sur une frame précise
  const loadFrame = useCallback((index: number, framesList: string[] = frames) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fond tablette d'animation sombre
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessin de l'onion skin (frame précédente en filigrane)
    if (onionSkin && index > 0 && framesList[index - 1]) {
      const prevImg = new Image();
      prevImg.onload = () => {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.drawImage(prevImg, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        drawCurrentFrameContent(ctx, canvas, index, framesList);
      };
      prevImg.src = framesList[index - 1];
      return;
    }

    drawCurrentFrameContent(ctx, canvas, index, framesList);
  }, [onionSkin, frames]);

  const drawCurrentFrameContent = (
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    index: number,
    framesList: string[]
  ) => {
    const frameData = framesList[index];
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
      loadFrame(currentFrameIndex, frames);
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

  const toggleAnimation = useCallback(() => {
    const nextState = !isPlayingAnim;
    setIsPlayingAnim(nextState);
    if (onTogglePlayAnim) {
      onTogglePlayAnim(nextState);
    }
  }, [isPlayingAnim, onTogglePlayAnim]);

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

  const saveCurrentFrameToState = (frameIdx: number = currentFrameIndex) => {
    const canvas = canvasRef.current;
    if (!canvas) return frames;

    const dataUrl = canvas.toDataURL('image/webp', 0.80);
    const updated = [...frames];
    updated[frameIdx] = dataUrl;
    setFrames(updated);
    if (onChange) onChange(updated);
    return updated;
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
    ctx.strokeStyle = isEraser ? '#1c1917' : color;
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

  // 🔄 Annuler (Undo) & Rétablir (Redo)
  const undo = useCallback(() => {
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
  }, [historyStep, history, currentFrameIndex]);

  const redo = useCallback(() => {
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
  }, [historyStep, history, currentFrameIndex]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveHistoryState();
    saveCurrentFrameToState();
  };

  // 🖼️ Importer une image externe comme calque de référence sur la frame active
  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#1c1917';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;

        ctx.drawImage(img, x, y, w, h);
        saveHistoryState();
        saveCurrentFrameToState();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 🎬 Actions de Gestion des Frames
  const addFrameAt = (index: number) => {
    const saved = saveCurrentFrameToState();
    const newFrames = [...saved];
    newFrames.splice(index, 0, '');
    setFrames(newFrames);
    setCurrentFrameIndex(index);
    setHistory([]);
    setHistoryStep(-1);
    if (onChange) onChange(newFrames);
    loadFrame(index, newFrames);
  };

  const duplicateFrame = useCallback(() => {
    const saved = saveCurrentFrameToState();
    const currentFrameData = saved[currentFrameIndex];
    const newFrames = [...saved];
    newFrames.splice(currentFrameIndex + 1, 0, currentFrameData);
    setFrames(newFrames);
    setCurrentFrameIndex(currentFrameIndex + 1);
    setHistory([]);
    setHistoryStep(-1);
    if (onChange) onChange(newFrames);
    loadFrame(currentFrameIndex + 1, newFrames);
  }, [currentFrameIndex, frames, onChange]);

  // 🗑️ Suppression d'une frame
  const deleteFrame = (indexToDelete: number) => {
    if (frames.length <= 1) {
      clearCanvas();
      return;
    }

    let baseFrames = frames;
    if (indexToDelete !== currentFrameIndex) {
      baseFrames = saveCurrentFrameToState();
    }

    const newFrames = baseFrames.filter((_, i) => i !== indexToDelete);

    let newIndex = currentFrameIndex;
    if (indexToDelete === currentFrameIndex) {
      newIndex = Math.min(indexToDelete, newFrames.length - 1);
    } else if (indexToDelete < currentFrameIndex) {
      newIndex = currentFrameIndex - 1;
    }

    setFrames(newFrames);
    setCurrentFrameIndex(newIndex);
    setHistory([]);
    setHistoryStep(-1);
    if (onChange) onChange(newFrames);
    loadFrame(newIndex, newFrames);
  };

  const moveFrame = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const saved = saveCurrentFrameToState();
    const newFrames = [...saved];
    const [moved] = newFrames.splice(fromIndex, 1);
    newFrames.splice(toIndex, 0, moved);
    setFrames(newFrames);
    setCurrentFrameIndex(toIndex);
    setHistory([]);
    setHistoryStep(-1);
    if (onChange) onChange(newFrames);
    loadFrame(toIndex, newFrames);
  };

  // ⌨️ Raccourcis Clavier du Studio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (isCtrlOrCmd && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      } else if (e.code === 'Space') {
        e.preventDefault();
        toggleAnimation();
      } else if (e.key === 'ArrowLeft') {
        if (currentFrameIndex > 0) {
          saveCurrentFrameToState();
          setCurrentFrameIndex((prev) => prev - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (currentFrameIndex < frames.length - 1) {
          saveCurrentFrameToState();
          setCurrentFrameIndex((prev) => prev + 1);
        }
      } else if (e.key === 'd' || e.key === 'D') {
        duplicateFrame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, toggleAnimation, duplicateFrame, currentFrameIndex, frames.length]);

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
    <div className="flex flex-col bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-gallery space-y-0">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageImport}
        className="hidden"
      />

      {/* Barre d'outils supérieure */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 bg-stone-50 border-b border-stone-200 text-xs">
          {/* Pinceau / Gomme */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsEraser(false)}
              className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-semibold ${
                !isEraser
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-stone-200/70 text-stone-700 hover:bg-stone-200'
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
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-stone-200/70 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gomme</span>
            </button>
          </div>

          {/* Palette de couleurs */}
          {!isEraser && (
            <div className="flex items-center gap-1 sm:gap-1.5 bg-white px-2 py-1 rounded-lg border border-stone-200 overflow-x-auto max-w-[140px] sm:max-w-none shadow-sm">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border transition-transform shrink-0 ${
                    color === c ? 'scale-125 border-stone-900 ring-2 ring-stone-900/30' : 'border-stone-300 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={`Couleur ${c}`}
                />
              ))}
            </div>
          )}

          {/* Épaisseur */}
          <div className="hidden xs:flex items-center gap-1 bg-white px-1.5 sm:px-2 py-1 rounded-lg border border-stone-200 shadow-sm">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setBrushSize(size)}
                className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono transition-colors ${
                  brushSize === size ? 'bg-stone-900 text-white font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {size}px
              </button>
            ))}
          </div>

          {/* Pelure d'oignon, Import Image & Actions Undo/Redo */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setOnionSkin(!onionSkin)}
              className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                onionSkin
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
              title="Afficher la frame précédente en filigrane (Pelure d'oignon)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Oignon</span>
            </button>

            {/* Importer Image */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 rounded-lg text-xs flex items-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
              title="Importer un croquis ou une image de référence"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Importer</span>
            </button>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={undo}
                disabled={historyStep <= 0}
                className="p-1.5 rounded hover:bg-stone-200 text-stone-700 disabled:opacity-30 flex items-center gap-1"
                title="Annuler (Ctrl+Z)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={historyStep >= history.length - 1}
                className="p-1.5 rounded hover:bg-stone-200 text-stone-700 disabled:opacity-30 flex items-center gap-1"
                title="Rétablir (Ctrl+Y)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                className="p-1.5 rounded hover:bg-red-50 text-red-600 ml-1"
                title="Effacer la frame"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Surface du Canvas avec repères */}
      <div className="relative aspect-video w-full bg-[#1c1917] flex items-center justify-center overflow-hidden touch-none">
        {isPlayingAnim ? (
          <div className="w-full h-full flex items-center justify-center bg-black relative">
            {frames[playFrameIndex] ? (
              <img
                src={frames[playFrameIndex]}
                alt={`Frame ${playFrameIndex + 1}`}
                className="w-full h-full object-contain pointer-events-none select-none"
              />
            ) : (
              <span className="text-xs text-stone-500">Frame vide</span>
            )}
            <div className="absolute top-3 left-3 bg-rose-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-md font-mono">
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

        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-stone-400 pointer-events-none bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
          16:9 • Frame {currentFrameIndex + 1} / {frames.length}
        </div>
      </div>

      {/* Bandeau de contrôle des Frames */}
      <div className="p-2.5 sm:p-3 bg-stone-50 border-t border-stone-200 flex flex-col gap-2.5">
        {/* Ligne 1 : Contrôles de lecture Flipbook */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAnimation}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-transform hover:scale-105 shadow-sm ${
                isPlayingAnim
                  ? 'bg-rose-600 text-white'
                  : 'bg-stone-900 hover:bg-stone-800 text-white'
              }`}
            >
              {isPlayingAnim ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlayingAnim ? 'Arrêter' : 'Flipbook + Musique'}</span>
            </button>

            {/* Vitesse FPS */}
            <div className="flex items-center gap-1 bg-white px-1.5 py-1 rounded-lg border border-stone-200 text-xs shadow-sm">
              {FPS_OPTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAnimFps(f)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    animFps === f ? 'bg-stone-900 text-white font-bold' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {f}fps
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-stone-500">
            <span className="hidden lg:inline bg-white px-2 py-0.5 rounded border border-stone-200 font-mono text-[10px] shadow-sm">
              Espace (Play) • ◀ ▶ (Frames) • D (Dupliquer)
            </span>
          </div>
        </div>

        {/* Ligne 2 : Bandeau de Vignettes avec Drag & Drop */}
        <div className="flex items-center gap-2 overflow-x-auto py-1.5 max-w-full">
          {!readOnly && (
            <button
              type="button"
              onClick={() => addFrameAt(0)}
              className="px-2.5 py-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 hover:text-stone-900 text-[10px] font-semibold flex items-center gap-1 transition-all shrink-0 shadow-sm"
              title="Créer une nouvelle frame en 1ère position"
            >
              <ArrowLeftToLine className="w-3.5 h-3.5 text-stone-900" />
              <span>+ Au début</span>
            </button>
          )}

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
                } ${isOver ? 'ring-2 ring-stone-900 scale-105 rounded-xl' : ''}`}
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
                        ? 'border-stone-900 ring-2 ring-stone-900/20 shadow-md scale-105'
                        : 'border-stone-200 hover:border-stone-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {f ? (
                      <img src={f} alt={`Frame ${i + 1}`} className="w-full h-full object-cover pointer-events-none select-none" />
                    ) : (
                      <span className="text-[10px] text-stone-500 font-mono font-bold">#{i + 1}</span>
                    )}

                    <span className="absolute bottom-0.5 left-1 text-[9px] font-mono font-bold text-white bg-black/70 px-1 rounded">
                      {i + 1}
                    </span>
                  </button>

                  {!readOnly && frames.length > 1 && (
                    <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-stone-200 rounded px-0.5 shadow z-10">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveFrame(i, i - 1);
                          }}
                          className="text-stone-500 hover:text-stone-900 p-0.5"
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
                          className="text-stone-500 hover:text-stone-900 p-0.5"
                          title="Déplacer vers la droite"
                        >
                          <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {!readOnly && frames.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFrame(i);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
                      title="Supprimer cette frame"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {!readOnly && (
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              <button
                type="button"
                onClick={() => addFrameAt(frames.length)}
                className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Ajouter une frame à la fin"
              >
                <Plus className="w-3.5 h-3.5 text-stone-900" />
                <span>Frame</span>
              </button>

              <button
                type="button"
                onClick={duplicateFrame}
                className="p-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 hover:text-stone-900 transition-colors shadow-sm"
                title="Dupliquer la frame active (Raccourci: Touche D)"
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
