import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Paintbrush, 
  Highlighter, 
  PaintBucket, 
  Square, 
  Circle as CircleIcon, 
  Minus, 
  ArrowUpRight, 
  Pipette, 
  Grid3X3, 
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

type CanvasTool = 
  | 'pen' 
  | 'marker' 
  | 'fill' 
  | 'rect' 
  | 'circle' 
  | 'line' 
  | 'arrow' 
  | 'eraser' 
  | 'pipette';

const COLOR_PALETTE = [
  '#ffffff', // Blanc pur
  '#cbd5e1', // Gris clair
  '#64748b', // Gris moyen
  '#0f172a', // Noir d'encre
  '#e11d48', // Rouge cinéma
  '#f97316', // Orange
  '#fbbf24', // Jaune doré
  '#3b82f6', // Bleu
  '#22c55e', // Vert
  '#a855f7', // Violet
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
  
  // Outils et modes
  const [activeTool, setActiveTool] = useState<CanvasTool>('pen');
  const [color, setColor] = useState<string>('#ffffff');
  const [brushSize, setBrushSize] = useState<number>(3);
  const [onionSkin, setOnionSkin] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showShapeMenu, setShowShapeMenu] = useState<boolean>(false);

  // État de dessin
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [previewSnapshot, setPreviewSnapshot] = useState<ImageData | null>(null);

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

  // Sauvegarder l'état dans l'historique
  const saveHistoryState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => {
      const newHist = prev.slice(0, historyStep + 1);
      newHist.push(imageData);
      return newHist;
    });
    setHistoryStep((prev) => prev + 1);
  }, [historyStep]);

  // Sauvegarder la frame active dans la liste
  const saveCurrentFrameToState = useCallback((frameIdx: number = currentFrameIndex) => {
    const canvas = canvasRef.current;
    if (!canvas) return frames;

    const dataUrl = canvas.toDataURL('image/webp', 0.85);
    const updated = [...frames];
    updated[frameIdx] = dataUrl;
    setFrames(updated);
    if (onChange) onChange(updated);
    return updated;
  }, [currentFrameIndex, frames, onChange]);

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

  // Boucle de lecture d'animation Flipbook
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

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      return {
        x: Math.round((e.touches[0].clientX - rect.left) * scaleX),
        y: Math.round((e.touches[0].clientY - rect.top) * scaleY)
      };
    }
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY)
    };
  };

  // 🪣 Algorithme du Pot de Peinture (Flood Fill)
  const applyFloodFill = (startX: number, startY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const a = 255;

    const startPos = (startY * width + startX) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];

    if (Math.abs(startR - r) < 5 && Math.abs(startG - g) < 5 && Math.abs(startB - b) < 5) {
      return;
    }

    const colorMatch = (pos: number) => {
      const dr = Math.abs(data[pos] - startR);
      const dg = Math.abs(data[pos + 1] - startG);
      const db = Math.abs(data[pos + 2] - startB);
      const da = Math.abs(data[pos + 3] - startA);
      return dr + dg + db + da < 45;
    };

    const queue: number[] = [startX + startY * width];
    const visited = new Uint8Array(width * height);

    while (queue.length > 0) {
      const idx = queue.pop()!;
      if (visited[idx]) continue;
      visited[idx] = 1;

      const pos = idx * 4;
      if (!colorMatch(pos)) continue;

      data[pos] = r;
      data[pos + 1] = g;
      data[pos + 2] = b;
      data[pos + 3] = a;

      const cx = idx % width;
      const cy = Math.floor(idx / width);

      if (cx > 0 && !visited[idx - 1]) queue.push(idx - 1);
      if (cx < width - 1 && !visited[idx + 1]) queue.push(idx + 1);
      if (cy > 0 && !visited[idx - width]) queue.push(idx - width);
      if (cy < height - 1 && !visited[idx + width]) queue.push(idx + width);
    }

    ctx.putImageData(imgData, 0, 0);
    saveHistoryState();
    saveCurrentFrameToState();
  };

  // 💧 Pipette (EyeDropper)
  const applyPipette = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
    setColor(hex);
    setActiveTool('pen');
  };

  // Début d'action de dessin
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly || isPlayingAnim) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);

    // 🪣 Pot de peinture
    if (activeTool === 'fill') {
      applyFloodFill(coords.x, coords.y);
      return;
    }

    // 💧 Pipette
    if (activeTool === 'pipette') {
      applyPipette(coords.x, coords.y);
      return;
    }

    setIsDrawing(true);
    setStartPoint(coords);

    // Snapshot pour la prévisualisation des formes géométriques
    if (['rect', 'circle', 'line', 'arrow'].includes(activeTool)) {
      setPreviewSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
      return;
    }

    // Outils continus (crayon, marqueur, gomme)
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'eraser') {
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = brushSize * 3;
      ctx.globalAlpha = 1.0;
    } else if (activeTool === 'marker') {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize * 2.5;
      ctx.globalAlpha = 0.35; // Surlignage / Ombrage cinématographique
    } else {
      // Pinceau standard
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = 1.0;
    }
  };

  // Tracé en cours
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly || isPlayingAnim) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);

    // Tracé de formes géométriques avec prévisualisation en temps réel
    if (['rect', 'circle', 'line', 'arrow'].includes(activeTool) && startPoint && previewSnapshot) {
      ctx.putImageData(previewSnapshot, 0, 0);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = 1.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (activeTool === 'rect') {
        const w = coords.x - startPoint.x;
        const h = coords.y - startPoint.y;
        ctx.strokeRect(startPoint.x, startPoint.y, w, h);
      } else if (activeTool === 'circle') {
        const rx = Math.abs(coords.x - startPoint.x) / 2;
        const ry = Math.abs(coords.y - startPoint.y) / 2;
        const cx = Math.min(startPoint.x, coords.x) + rx;
        const cy = Math.min(startPoint.y, coords.y) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (activeTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else if (activeTool === 'arrow') {
        // Flèche directionnelle (mouvement de caméra / personnage)
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();

        // Pointe de flèche
        const angle = Math.atan2(coords.y - startPoint.y, coords.x - startPoint.x);
        const headLen = Math.max(10, brushSize * 3);
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.lineTo(coords.x - headLen * Math.cos(angle - Math.PI / 6), coords.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(coords.x, coords.y);
        ctx.lineTo(coords.x - headLen * Math.cos(angle + Math.PI / 6), coords.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
      return;
    }

    // Pinceau continu
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  // Fin d'action de dessin
  const stopDrawing = () => {
    if (!isDrawing || readOnly || isPlayingAnim) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.globalAlpha = 1.0;
      }
    }
    setIsDrawing(false);
    setStartPoint(null);
    setPreviewSnapshot(null);
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
  }, [historyStep, history, saveCurrentFrameToState]);

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
  }, [historyStep, history, saveCurrentFrameToState]);

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

  // 🖼️ Importer une image externe comme référence
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
  }, [currentFrameIndex, saveCurrentFrameToState, onChange, loadFrame]);

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
      } else if (e.key === 'b' || e.key === 'B') {
        setActiveTool('pen');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('eraser');
      } else if (e.key === 'g' || e.key === 'G') {
        setActiveTool('fill');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, toggleAnimation, duplicateFrame, currentFrameIndex, frames.length, saveCurrentFrameToState]);

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

  const isShapeTool = ['rect', 'circle', 'line', 'arrow'].includes(activeTool);

  return (
    <div className="flex flex-col bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-gallery space-y-0">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageImport}
        className="hidden"
      />

      {/* 🎨 BARRE D'OUTILS DE DESSIN STYLE STUDIO & PAINT */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-stone-50 border-b border-stone-200 text-xs">
          {/* Groupe 1 : Outils Principaux (Crayon, Marqueur, Pot, Formes, Gomme, Pipette) */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Crayon standard */}
            <button
              type="button"
              onClick={() => { setActiveTool('pen'); setShowShapeMenu(false); }}
              className={`p-2 rounded-xl transition-all flex items-center gap-1 font-semibold ${
                activeTool === 'pen'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200/70 text-stone-700 border border-stone-200'
              }`}
              title="Crayon / Pinceau net (B)"
            >
              <Paintbrush className="w-4 h-4" />
              <span className="hidden md:inline text-[11px]">Crayon</span>
            </button>

            {/* Marqueur ombrage / surlignage */}
            <button
              type="button"
              onClick={() => { setActiveTool('marker'); setShowShapeMenu(false); }}
              className={`p-2 rounded-xl transition-all flex items-center gap-1 font-semibold ${
                activeTool === 'marker'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200/70 text-stone-700 border border-stone-200'
              }`}
              title="Marqueur ombrage & volume (semi-transparent)"
            >
              <Highlighter className="w-4 h-4 text-amber-500" />
              <span className="hidden md:inline text-[11px]">Ombrage</span>
            </button>

            {/* Pot de peinture */}
            <button
              type="button"
              onClick={() => { setActiveTool('fill'); setShowShapeMenu(false); }}
              className={`p-2 rounded-xl transition-all flex items-center gap-1 font-semibold ${
                activeTool === 'fill'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200/70 text-stone-700 border border-stone-200'
              }`}
              title="Pot de peinture / Remplissage (G)"
            >
              <PaintBucket className="w-4 h-4 text-rose-500" />
              <span className="hidden md:inline text-[11px]">Remplir</span>
            </button>

            {/* Menu Formes Géométriques */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowShapeMenu(!showShapeMenu)}
                className={`p-2 rounded-xl transition-all flex items-center gap-1 font-semibold ${
                  isShapeTool
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white hover:bg-stone-200/70 text-stone-700 border border-stone-200'
                }`}
                title="Formes géométriques simples & flèches"
              >
                {activeTool === 'circle' && <CircleIcon className="w-4 h-4" />}
                {activeTool === 'line' && <Minus className="w-4 h-4" />}
                {activeTool === 'arrow' && <ArrowUpRight className="w-4 h-4 text-sky-400" />}
                {(!isShapeTool || activeTool === 'rect') && <Square className="w-4 h-4" />}
                <span className="hidden md:inline text-[11px]">Formes</span>
              </button>

              {/* Menu déroulant des formes */}
              {showShapeMenu && (
                <div className="absolute top-full left-0 mt-1.5 z-30 bg-white rounded-2xl border border-stone-200 shadow-xl p-1.5 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => { setActiveTool('rect'); setShowShapeMenu(false); }}
                    className={`p-2 rounded-xl text-xs flex items-center gap-1 ${
                      activeTool === 'rect' ? 'bg-stone-900 text-white' : 'hover:bg-stone-100 text-stone-700'
                    }`}
                    title="Rectangle / Cadre de plan"
                  >
                    <Square className="w-4 h-4" />
                    <span className="text-[10px]">Cadre</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTool('circle'); setShowShapeMenu(false); }}
                    className={`p-2 rounded-xl text-xs flex items-center gap-1 ${
                      activeTool === 'circle' ? 'bg-stone-900 text-white' : 'hover:bg-stone-100 text-stone-700'
                    }`}
                    title="Cercle / Tête / Viseur"
                  >
                    <CircleIcon className="w-4 h-4" />
                    <span className="text-[10px]">Cercle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTool('line'); setShowShapeMenu(false); }}
                    className={`p-2 rounded-xl text-xs flex items-center gap-1 ${
                      activeTool === 'line' ? 'bg-stone-900 text-white' : 'hover:bg-stone-100 text-stone-700'
                    }`}
                    title="Ligne droite"
                  >
                    <Minus className="w-4 h-4" />
                    <span className="text-[10px]">Ligne</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTool('arrow'); setShowShapeMenu(false); }}
                    className={`p-2 rounded-xl text-xs flex items-center gap-1 ${
                      activeTool === 'arrow' ? 'bg-stone-900 text-white' : 'hover:bg-stone-100 text-stone-700'
                    }`}
                    title="Flèche de mouvement caméra / travelling"
                  >
                    <ArrowUpRight className="w-4 h-4 text-sky-500" />
                    <span className="text-[10px]">Flèche Cam</span>
                  </button>
                </div>
              )}
            </div>

            {/* Gomme */}
            <button
              type="button"
              onClick={() => { setActiveTool('eraser'); setShowShapeMenu(false); }}
              className={`p-2 rounded-xl transition-all flex items-center gap-1 font-semibold ${
                activeTool === 'eraser'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200/70 text-stone-700 border border-stone-200'
              }`}
              title="Gomme (E)"
            >
              <Eraser className="w-4 h-4" />
              <span className="hidden md:inline text-[11px]">Gomme</span>
            </button>

            {/* Pipette */}
            <button
              type="button"
              onClick={() => { setActiveTool('pipette'); setShowShapeMenu(false); }}
              className={`p-2 rounded-xl transition-all flex items-center gap-1 font-semibold ${
                activeTool === 'pipette'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200/70 text-stone-700 border border-stone-200'
              }`}
              title="Pipette / Choisir une couleur sur l'image"
            >
              <Pipette className="w-4 h-4" />
            </button>
          </div>

          {/* Palette de couleurs */}
          {activeTool !== 'eraser' && (
            <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-2xl border border-stone-200 overflow-x-auto max-w-[160px] sm:max-w-none shadow-sm">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full border transition-transform shrink-0 ${
                    color === c ? 'scale-125 border-stone-900 ring-2 ring-stone-900/30' : 'border-stone-300 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={`Couleur ${c}`}
                />
              ))}
              {/* Sélecteur natif de couleur libre */}
              <label className="w-5 h-5 rounded-full border border-stone-300 flex items-center justify-center cursor-pointer overflow-hidden relative shrink-0 hover:scale-110 transition-transform">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
                <span className="text-[10px] font-bold text-stone-700">+</span>
              </label>
            </div>
          )}

          {/* Épaisseur du trait */}
          <div className="hidden xs:flex items-center gap-1 bg-white px-2 py-1.5 rounded-2xl border border-stone-200 shadow-sm">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setBrushSize(size)}
                className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-mono transition-colors ${
                  brushSize === size ? 'bg-stone-900 text-white font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {size}px
              </button>
            ))}
          </div>

          {/* Outils secondaires : Grille 16:9, Pelure d'oignon, Import, Undo/Redo */}
          <div className="flex items-center gap-1.5">
            {/* Grille de composition cinéma (Règle des tiers) */}
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-xl text-xs flex items-center gap-1 transition-all ${
                showGrid
                  ? 'bg-stone-900 text-white font-semibold shadow-sm'
                  : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
              }`}
              title="Afficher la grille de composition cinéma (Règle des tiers)"
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px]">Grille</span>
            </button>

            {/* Pelure d'oignon */}
            <button
              type="button"
              onClick={() => setOnionSkin(!onionSkin)}
              className={`p-2 rounded-xl text-xs flex items-center gap-1 transition-all ${
                onionSkin
                  ? 'bg-stone-900 text-white font-semibold shadow-sm'
                  : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
              }`}
              title="Afficher la frame précédente en filigrane (Pelure d'oignon)"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px]">Oignon</span>
            </button>

            {/* Importer Image */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-xs flex items-center gap-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 transition-colors shadow-sm"
              title="Importer un croquis ou une image de référence"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px]">Image</span>
            </button>

            {/* Undo / Redo / Trash */}
            <div className="flex items-center gap-0.5 bg-white p-1 rounded-2xl border border-stone-200 shadow-sm">
              <button
                type="button"
                onClick={undo}
                disabled={historyStep <= 0}
                className="p-1 rounded hover:bg-stone-100 text-stone-700 disabled:opacity-30 flex items-center"
                title="Annuler (Ctrl+Z)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={historyStep >= history.length - 1}
                className="p-1 rounded hover:bg-stone-100 text-stone-700 disabled:opacity-30 flex items-center"
                title="Rétablir (Ctrl+Y)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                className="p-1 rounded hover:bg-red-50 text-red-600 ml-0.5"
                title="Effacer la frame"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Surface du Canvas avec repères et Grille */}
      <div className="relative aspect-video w-full bg-[#1c1917] flex items-center justify-center overflow-hidden touch-none select-none">
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
          <>
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
                readOnly 
                  ? 'cursor-default' 
                  : activeTool === 'eraser' 
                    ? 'canvas-cursor-eraser' 
                    : activeTool === 'fill' 
                      ? 'cursor-crosshair' 
                      : activeTool === 'pipette' 
                        ? 'cursor-help' 
                        : 'canvas-cursor-brush'
              }`}
            />

            {/* Grille de Composition Cinématographique (Règle des tiers) */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/10">
                <div className="border-r border-b border-white/15" />
                <div className="border-r border-b border-white/15" />
                <div className="border-b border-white/15" />
                <div className="border-r border-b border-white/15" />
                <div className="border-r border-b border-white/15" />
                <div className="border-b border-white/15" />
                <div className="border-r border-white/15" />
                <div className="border-r border-white/15" />
                <div />
              </div>
            )}
          </>
        )}

        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-stone-400 pointer-events-none bg-black/60 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
          16:9 • Frame {currentFrameIndex + 1} / {frames.length}
        </div>
      </div>

      {/* Bandeau de contrôle des Frames & Lecture Flipbook */}
      <div className="p-3 bg-stone-50 border-t border-stone-200 flex flex-col gap-2.5">
        {/* Ligne 1 : Contrôles de lecture Flipbook */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAnimation}
              className={`px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-transform hover:scale-105 shadow-sm ${
                isPlayingAnim
                  ? 'bg-rose-600 text-white'
                  : 'bg-stone-900 hover:bg-stone-800 text-white'
              }`}
            >
              {isPlayingAnim ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlayingAnim ? 'Arrêter l\'animation' : 'Flipbook + Musique'}</span>
            </button>

            {/* Vitesse FPS */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-stone-200 text-xs shadow-sm">
              {FPS_OPTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAnimFps(f)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-colors ${
                    animFps === f ? 'bg-stone-900 text-white font-bold' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {f}fps
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-stone-500">
            <span className="hidden lg:inline bg-white px-2.5 py-1 rounded-xl border border-stone-200 font-mono text-[10px] shadow-sm">
              B (Crayon) • G (Remplir) • E (Gomme) • Espace (Play) • D (Dupliquer)
            </span>
          </div>
        </div>

        {/* Ligne 2 : Bandeau de Vignettes avec Drag & Drop */}
        <div className="flex items-center gap-2 overflow-x-auto py-1.5 max-w-full">
          {!readOnly && (
            <button
              type="button"
              onClick={() => addFrameAt(0)}
              className="px-3 py-2 rounded-2xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 shadow-sm"
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
                className="px-3 py-2 rounded-2xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Ajouter une frame à la fin"
              >
                <Plus className="w-3.5 h-3.5 text-stone-900" />
                <span>Frame</span>
              </button>

              <button
                type="button"
                onClick={duplicateFrame}
                className="p-2 rounded-2xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 hover:text-stone-900 transition-colors shadow-sm"
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
