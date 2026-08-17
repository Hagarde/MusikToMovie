import React, { useRef, useState, useEffect } from 'react';
import { 
  Paintbrush, 
  Eraser, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Download, 
  Check, 
  Maximize2 
} from 'lucide-react';

interface StoryboardCanvasProps {
  initialImage?: string;
  onSave?: (imageDataUrl: string) => void;
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

export const StoryboardCanvas: React.FC<StoryboardCanvasProps> = ({
  initialImage,
  onSave,
  readOnly = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState<string>('#ffffff');
  const [brushSize, setBrushSize] = useState<number>(3);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  
  // Historique pour Undo / Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);

  // Initialisation du Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fond cinéma sombre par défaut
    ctx.fillStyle = '#12141c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessin du cadre 16:9 cinématographique subtil
    ctx.strokeStyle = '#1e2230';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    if (initialImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        saveState();
      };
      img.src = initialImage;
    } else {
      saveState();
    }
  }, []);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);

    if (onSave) {
      // Export compressé WebP / JPEG pour optimiser le stockage Supabase
      const compressedData = canvas.toDataURL('image/webp', 0.85);
      onSave(compressedData);
    }
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
    if (readOnly) return;
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
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);
    saveState();
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
      if (onSave) onSave(canvas.toDataURL('image/webp', 0.85));
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
      if (onSave) onSave(canvas.toDataURL('image/webp', 0.85));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#12141c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  return (
    <div className="flex flex-col bg-cinema-850 rounded-xl border border-cinema-700/60 overflow-hidden shadow-lg">
      {/* Barre d'outils de dessin */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-cinema-800/80 border-b border-cinema-700/60 text-xs">
          {/* Outils & Pinceau / Gomme */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEraser(false)}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 font-medium ${
                !isEraser
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-cinema-700/50 text-slate-300 hover:bg-cinema-700'
              }`}
              title="Pinceau"
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>Dessin</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEraser(true)}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 font-medium ${
                isEraser
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-cinema-700/50 text-slate-300 hover:bg-cinema-700'
              }`}
              title="Gomme"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Gomme</span>
            </button>
          </div>

          {/* Palette de couleurs */}
          {!isEraser && (
            <div className="flex items-center gap-1.5 bg-cinema-900/60 px-2 py-1 rounded-lg border border-cinema-700/40">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    color === c ? 'scale-125 border-brand-400 ring-2 ring-brand-400/40' : 'border-cinema-600 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={`Couleur ${c}`}
                />
              ))}
            </div>
          )}

          {/* Épaisseur de trait */}
          <div className="flex items-center gap-1 bg-cinema-900/60 px-2 py-1 rounded-lg border border-cinema-700/40">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setBrushSize(size)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  brushSize === size ? 'bg-brand-500/30 text-brand-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {size}px
              </button>
            ))}
          </div>

          {/* Actions Undo / Redo / Clear */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={undo}
              disabled={historyStep <= 0}
              className="p-1.5 rounded hover:bg-cinema-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Annuler"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={historyStep >= history.length - 1}
              className="p-1.5 rounded hover:bg-cinema-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Rétablir"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={clearCanvas}
              className="p-1.5 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors ml-1"
              title="Effacer tout"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Surface du Canvas (Ratio 16:9 Cinéma) */}
      <div className="relative aspect-video w-full bg-[#12141c] flex items-center justify-center">
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
        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-500 pointer-events-none bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
          16:9 Storyboard Frame
        </div>
      </div>
    </div>
  );
};
