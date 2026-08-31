import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Paintbrush, 
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
  Image as ImageIcon,
  Type,
  FlipHorizontal,
  FlipVertical,
  Sparkles,
  Lasso,
  Move,
  Check,
  Film,
  ZoomIn,
  ZoomOut,
  Stamp,
  Moon
} from 'lucide-react';

interface FlipanimCanvasProps {
  initialFrames?: string[];
  onChange?: (frames: string[]) => void;
  onTogglePlayAnim?: (isPlaying: boolean) => void;
  fps?: number;
  onFpsChange?: (fps: number) => void;
  readOnly?: boolean;
}

type CanvasTool = 
  | 'pen' 
  | 'marker' 
  | 'spray'
  | 'fill' 
  | 'rect' 
  | 'circle' 
  | 'line' 
  | 'arrow' 
  | 'text'
  | 'eraser' 
  | 'pipette'
  | 'lasso'
  | 'select_rect'
  | 'transform';

interface FloatingObject {
  canvas: HTMLCanvasElement;
  x: number;          // Centre X
  y: number;          // Centre Y
  width: number;      // Largeur originale
  height: number;     // Hauteur originale
  scaleX: number;     // Échelle X (1.0 = 100%)
  scaleY: number;     // Échelle Y (1.0 = 100%)
  rotation: number;   // Rotation en degrés
}

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

const FPS_OPTIONS = [1, 2, 4, 6];

export const FlipanimCanvas: React.FC<FlipanimCanvasProps> = ({
  initialFrames = [],
  onChange,
  onTogglePlayAnim,
  fps = 3,
  onFpsChange,
  readOnly = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [frames, setFrames] = useState<string[]>(
    initialFrames.length > 0 ? initialFrames : ['']
  );
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  
  // Outils et modes
  const [activeTool, setActiveTool] = useState<CanvasTool>('pen');
  const [previousTool, setPreviousTool] = useState<CanvasTool>('pen');
  const [color, setColor] = useState<string>('#ffffff');
  const [brushSize, setBrushSize] = useState<number>(3);
  const [onionSkin, setOnionSkin] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showShapeMenu, setShowShapeMenu] = useState<boolean>(false);
  const [showSelectMenu, setShowSelectMenu] = useState<boolean>(false);
  const [fillShape, setFillShape] = useState<boolean>(false);

  // État annotation texte
  const [textInputState, setTextInputState] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState<string>('');

  // État Objet Flottant & Transformation (Lasso / Rect / Redimensionner / Pivoter / Déplacer)
  const [floatingObject, setFloatingObject] = useState<FloatingObject | null>(null);
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const [selectionRect, setSelectionRect] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  
  // État d'interaction sur l'objet transformable
  const [transformInteraction, setTransformInteraction] = useState<{
    mode: 'move' | 'scale-tl' | 'scale-tr' | 'scale-bl' | 'scale-br' | 'rotate';
    startMouseX: number;
    startMouseY: number;
    startObjX: number;
    startObjY: number;
    startScaleX: number;
    startScaleY: number;
    startRotation: number;
  } | null>(null);

  // État de dessin standard
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
  const MAX_HISTORY_STEPS = 25;
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
      let newHist = prev.slice(0, historyStep + 1);
      newHist.push(imageData);
      if (newHist.length > MAX_HISTORY_STEPS) {
        newHist = newHist.slice(newHist.length - MAX_HISTORY_STEPS);
      }
      return newHist;
    });
    setHistoryStep((prev) => Math.min(prev + 1, MAX_HISTORY_STEPS - 1));
  }, [historyStep]);

  // Sauvegarder la frame active dans la liste
  const saveCurrentFrameToState = useCallback((frameIdx: number = currentFrameIndex) => {
    const canvas = canvasRef.current;
    if (!canvas) return frames;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    if (exportCtx) {
      exportCtx.fillStyle = '#1c1917';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      exportCtx.drawImage(canvas, 0, 0);
      const dataUrl = exportCanvas.toDataURL('image/webp', 0.85);
      const updated = [...frames];
      updated[frameIdx] = dataUrl;
      setFrames(updated);
      if (onChange) onChange(updated);
      return updated;
    }

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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const frameData = framesList[index];
    if (frameData) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            if (Math.abs(d[i] - 28) < 8 && Math.abs(d[i + 1] - 25) < 8 && Math.abs(d[i + 2] - 23) < 8) {
              d[i + 3] = 0;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (_) {}
        saveHistoryState();
      };
      img.src = frameData;
    } else {
      saveHistoryState();
    }
  }, [frames, saveHistoryState]);

  useEffect(() => {
    if (!isPlayingAnim) {
      loadFrame(currentFrameIndex, frames);
    }
  }, [currentFrameIndex]);

  // Boucle de lecture d'animation Flipbook
  useEffect(() => {
    if (!isPlayingAnim || frames.length === 0) return;

    const interval = setInterval(() => {
      setPlayFrameIndex((prev) => (prev + 1) % frames.length);
    }, 1000 / animFps);

    return () => clearInterval(interval);
  }, [isPlayingAnim, frames.length, animFps]);

  const toggleAnimation = useCallback(() => {
    if (floatingObject) {
      commitFloatingObject();
    }
    const nextState = !isPlayingAnim;
    setIsPlayingAnim(nextState);
    if (onTogglePlayAnim) {
      onTogglePlayAnim(nextState);
    }
  }, [isPlayingAnim, onTogglePlayAnim, floatingObject]);

  // Bloquer le défilement tactile natif sur le canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventTouchScroll = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('touchstart', preventTouchScroll, { passive: false });
    canvas.addEventListener('touchmove', preventTouchScroll, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventTouchScroll);
      canvas.removeEventListener('touchmove', preventTouchScroll);
    };
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement> | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && (e as TouchEvent).touches && (e as TouchEvent).touches.length > 0) {
      clientX = (e as TouchEvent).touches[0].clientX;
      clientY = (e as TouchEvent).touches[0].clientY;
    } else if ('changedTouches' in e && (e as TouchEvent).changedTouches && (e as TouchEvent).changedTouches.length > 0) {
      clientX = (e as TouchEvent).changedTouches[0].clientX;
      clientY = (e as TouchEvent).changedTouches[0].clientY;
    } else {
      const mouseEvent = e as MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }

    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY)
    };
  };

  // =========================================================================
  // 🎛️ GESTION DU LASSO, SÉLECTION, TRANSFORMATION & MULTI-FRAMES ANIMATION
  // =========================================================================

  // 1. Rendu de l'overlay de transformation & contours Lasso en direct
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Dessin du tracé Lasso en cours
    if (activeTool === 'lasso' && lassoPoints.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
      for (let i = 1; i < lassoPoints.length; i++) {
        ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Dessin du rectangle de sélection en cours
    if (activeTool === 'select_rect' && selectionRect) {
      ctx.save();
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      const w = selectionRect.currentX - selectionRect.startX;
      const h = selectionRect.currentY - selectionRect.startY;
      ctx.strokeRect(selectionRect.startX, selectionRect.startY, w, h);
      ctx.fillStyle = 'rgba(225, 29, 72, 0.1)';
      ctx.fillRect(selectionRect.startX, selectionRect.startY, w, h);
      ctx.restore();
    }

    // Dessin de l'Objet Flottant en cours de transformation (avec poignées)
    if (floatingObject) {
      ctx.save();
      ctx.translate(floatingObject.x, floatingObject.y);
      ctx.rotate((floatingObject.rotation * Math.PI) / 180);
      ctx.scale(floatingObject.scaleX, floatingObject.scaleY);

      const halfW = floatingObject.width / 2;
      const halfH = floatingObject.height / 2;

      // Dessin de l'image de l'objet
      ctx.drawImage(floatingObject.canvas, -halfW, -halfH);

      // Cadre de délimitation (Bounding Box)
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5 / Math.max(Math.abs(floatingObject.scaleX), 0.1);
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(-halfW, -halfH, floatingObject.width, floatingObject.height);

      // Poignées aux 4 coins (Scale)
      const handleSize = 8 / Math.max(Math.abs(floatingObject.scaleX), 0.1);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e11d48';
      ctx.setLineDash([]);

      // Top-Left
      ctx.fillRect(-halfW - handleSize/2, -halfH - handleSize/2, handleSize, handleSize);
      ctx.strokeRect(-halfW - handleSize/2, -halfH - handleSize/2, handleSize, handleSize);
      // Top-Right
      ctx.fillRect(halfW - handleSize/2, -halfH - handleSize/2, handleSize, handleSize);
      ctx.strokeRect(halfW - handleSize/2, -halfH - handleSize/2, handleSize, handleSize);
      // Bottom-Left
      ctx.fillRect(-halfW - handleSize/2, halfH - handleSize/2, handleSize, handleSize);
      ctx.strokeRect(-halfW - handleSize/2, halfH - handleSize/2, handleSize, handleSize);
      // Bottom-Right
      ctx.fillRect(halfW - handleSize/2, halfH - handleSize/2, handleSize, handleSize);
      ctx.strokeRect(halfW - handleSize/2, halfH - handleSize/2, handleSize, handleSize);

      // Poignée de Rotation (Haut avec tige)
      const stemHeight = 16 / Math.max(Math.abs(floatingObject.scaleX), 0.1);
      ctx.beginPath();
      ctx.moveTo(0, -halfH);
      ctx.lineTo(0, -halfH - stemHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -halfH - stemHeight, handleSize / 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }, [activeTool, lassoPoints, selectionRect, floatingObject]);

  // 2. Extraire la zone dessinée au Lasso et créer l'objet flottant
  const extractLassoSelection = () => {
    if (lassoPoints.length < 3) {
      setLassoPoints([]);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calcul de la Bounding Box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    lassoPoints.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });

    const width = Math.max(8, maxX - minX);
    const height = Math.max(8, maxY - minY);

    // Canvas temporaire pour stocker l'objet découpé
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Découpage au masque Lasso
    tempCtx.save();
    tempCtx.beginPath();
    tempCtx.moveTo(lassoPoints[0].x - minX, lassoPoints[0].y - minY);
    for (let i = 1; i < lassoPoints.length; i++) {
      tempCtx.lineTo(lassoPoints[i].x - minX, lassoPoints[i].y - minY);
    }
    tempCtx.closePath();
    tempCtx.clip();
    tempCtx.drawImage(canvas, -minX, -minY);
    tempCtx.restore();

    // Effacer la zone découpée du canvas d'origine
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
    for (let i = 1; i < lassoPoints.length; i++) {
      ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
    }
    ctx.closePath();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill();
    ctx.restore();

    setFloatingObject({
      canvas: tempCanvas,
      x: minX + width / 2,
      y: minY + height / 2,
      width,
      height,
      scaleX: 1.0,
      scaleY: 1.0,
      rotation: 0,
    });

    setLassoPoints([]);
    setActiveTool('transform');
    saveHistoryState();
    saveCurrentFrameToState();
  };

  // 3. Extraire une sélection rectangulaire
  const extractRectSelection = () => {
    if (!selectionRect) return;

    const minX = Math.min(selectionRect.startX, selectionRect.currentX);
    const minY = Math.min(selectionRect.startY, selectionRect.currentY);
    const width = Math.abs(selectionRect.currentX - selectionRect.startX);
    const height = Math.abs(selectionRect.currentY - selectionRect.startY);

    if (width < 6 || height < 6) {
      setSelectionRect(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);

    // Effacer la zone du canvas d'origine
    ctx.clearRect(minX, minY, width, height);

    setFloatingObject({
      canvas: tempCanvas,
      x: minX + width / 2,
      y: minY + height / 2,
      width,
      height,
      scaleX: 1.0,
      scaleY: 1.0,
      rotation: 0,
    });

    setSelectionRect(null);
    setActiveTool('transform');
    saveHistoryState();
    saveCurrentFrameToState();
  };

  // 4. Transformer toute l'image de la frame en un objet manipulable
  const transformEntireFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(canvas, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    setFloatingObject({
      canvas: tempCanvas,
      x: canvas.width / 2,
      y: canvas.height / 2,
      width: canvas.width,
      height: canvas.height,
      scaleX: 1.0,
      scaleY: 1.0,
      rotation: 0,
    });

    setActiveTool('transform');
    saveHistoryState();
    saveCurrentFrameToState();
  };

  // 5. Valider et fusionner l'objet flottant sur la frame actuelle
  const commitFloatingObject = () => {
    if (!floatingObject) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(floatingObject.x, floatingObject.y);
    ctx.rotate((floatingObject.rotation * Math.PI) / 180);
    ctx.scale(floatingObject.scaleX, floatingObject.scaleY);
    ctx.drawImage(floatingObject.canvas, -floatingObject.width / 2, -floatingObject.height / 2);
    ctx.restore();

    setFloatingObject(null);
    setActiveTool('pen');
    saveHistoryState();
    saveCurrentFrameToState();
  };

  // 6. Tamponner l'objet à sa position actuelle (sans quitter le mode)
  const stampFloatingObject = () => {
    if (!floatingObject) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(floatingObject.x, floatingObject.y);
    ctx.rotate((floatingObject.rotation * Math.PI) / 180);
    ctx.scale(floatingObject.scaleX, floatingObject.scaleY);
    ctx.drawImage(floatingObject.canvas, -floatingObject.width / 2, -floatingObject.height / 2);
    ctx.restore();

    saveHistoryState();
    saveCurrentFrameToState();
  };

  // 7. 🎬 COPIER & ANIMER SUR LA FRAME SUIVANTE (Hero Feature)
  const animateToNextFrame = () => {
    if (!floatingObject) return;

    // A. Fixer l'objet sur la frame en cours
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.save();
      ctx.translate(floatingObject.x, floatingObject.y);
      ctx.rotate((floatingObject.rotation * Math.PI) / 180);
      ctx.scale(floatingObject.scaleX, floatingObject.scaleY);
      ctx.drawImage(floatingObject.canvas, -floatingObject.width / 2, -floatingObject.height / 2);
      ctx.restore();
    }

    const updatedFrames = saveCurrentFrameToState();

    // B. Passer à la frame suivante ou en créer une nouvelle
    const nextIndex = currentFrameIndex + 1;
    let nextFramesList = [...updatedFrames];

    if (nextIndex >= nextFramesList.length) {
      // Nouvelle frame
      nextFramesList.push('');
      setFrames(nextFramesList);
      if (onChange) onChange(nextFramesList);
    }

    setCurrentFrameIndex(nextIndex);
    loadFrame(nextIndex, nextFramesList);

    // C. Conserver l'objet flottant avec un léger décalage dynamique (suggestion de mouvement)
    setFloatingObject((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        x: Math.min(600, prev.x + 8), // Glissement naturel
      };
    });
  };

  // 8. Modifications rapides de rotation / zoom
  const rotateFloatingObject = (degreesDelta: number) => {
    if (!floatingObject) return;
    setFloatingObject({
      ...floatingObject,
      rotation: (floatingObject.rotation + degreesDelta) % 360,
    });
  };

  const scaleFloatingObject = (multiplier: number) => {
    if (!floatingObject) return;
    setFloatingObject({
      ...floatingObject,
      scaleX: Math.max(0.1, Math.min(5, floatingObject.scaleX * multiplier)),
      scaleY: Math.max(0.1, Math.min(5, floatingObject.scaleY * multiplier)),
    });
  };

  const flipFloatingObjectH = () => {
    if (!floatingObject) return;
    setFloatingObject({
      ...floatingObject,
      scaleX: floatingObject.scaleX * -1,
    });
  };

  const flipFloatingObjectV = () => {
    if (!floatingObject) return;
    setFloatingObject({
      ...floatingObject,
      scaleY: floatingObject.scaleY * -1,
    });
  };

  // =========================================================================
  // 🎨 OUTILS DE DESSIN STANDARDS
  // =========================================================================

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

  const applyPipette = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    if (pixel[3] < 10) {
      setColor('#ffffff');
    } else {
      const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
      setColor(hex);
    }
    setActiveTool(previousTool !== 'pipette' && previousTool !== 'eraser' ? previousTool : 'pen');
  };

  const drawSpray = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25;
    const radius = Math.max(6, brushSize * 2.5);
    const density = Math.max(12, brushSize * 3.5);

    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const offsetX = Math.cos(angle) * r;
      const offsetY = Math.sin(angle) * r;
      ctx.fillRect(x + offsetX, y + offsetY, 1.5, 1.5);
    }
    ctx.restore();
  };

  const commitTextAnnotation = () => {
    if (!textInputState || !textValue.trim()) {
      setTextInputState(null);
      setTextValue('');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = color;
    const fontSize = Math.max(13, Math.min(36, brushSize * 3.5));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(textValue.trim(), textInputState.x, textInputState.y);
    ctx.restore();

    setTextInputState(null);
    setTextValue('');
    saveHistoryState();
    saveCurrentFrameToState();
  };

  const flipHorizontal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();

    saveHistoryState();
    saveCurrentFrameToState();
  }, [saveHistoryState, saveCurrentFrameToState]);

  // =========================================================================
  // 🖱️ GESTION DES CLICS / DESSIN / TRANSFORMATIONS
  // =========================================================================

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly || isPlayingAnim) return;
    const coords = getCoordinates(e);

    // Si on est en mode transformation d'objet flottant : interaction de poignées
    if (floatingObject) {
      const dx = coords.x - floatingObject.x;
      const dy = coords.y - floatingObject.y;
      const rad = (-floatingObject.rotation * Math.PI) / 180;
      const localX = (dx * Math.cos(rad) - dy * Math.sin(rad)) / floatingObject.scaleX;
      const localY = (dx * Math.sin(rad) + dy * Math.cos(rad)) / floatingObject.scaleY;

      const halfW = floatingObject.width / 2;
      const halfH = floatingObject.height / 2;
      const handleTolerance = 14;

      // Poignée de rotation (Haut)
      if (Math.abs(localX) < handleTolerance && Math.abs(localY - (-halfH - 16)) < handleTolerance) {
        setTransformInteraction({
          mode: 'rotate',
          startMouseX: coords.x,
          startMouseY: coords.y,
          startObjX: floatingObject.x,
          startObjY: floatingObject.y,
          startScaleX: floatingObject.scaleX,
          startScaleY: floatingObject.scaleY,
          startRotation: floatingObject.rotation,
        });
        return;
      }

      // Poignée Scale Top-Left
      if (Math.abs(localX - (-halfW)) < handleTolerance && Math.abs(localY - (-halfH)) < handleTolerance) {
        setTransformInteraction({
          mode: 'scale-tl',
          startMouseX: coords.x,
          startMouseY: coords.y,
          startObjX: floatingObject.x,
          startObjY: floatingObject.y,
          startScaleX: floatingObject.scaleX,
          startScaleY: floatingObject.scaleY,
          startRotation: floatingObject.rotation,
        });
        return;
      }

      // Poignée Scale Bottom-Right
      if (Math.abs(localX - halfW) < handleTolerance && Math.abs(localY - halfH) < handleTolerance) {
        setTransformInteraction({
          mode: 'scale-br',
          startMouseX: coords.x,
          startMouseY: coords.y,
          startObjX: floatingObject.x,
          startObjY: floatingObject.y,
          startScaleX: floatingObject.scaleX,
          startScaleY: floatingObject.scaleY,
          startRotation: floatingObject.rotation,
        });
        return;
      }

      // Poignée Scale Top-Right
      if (Math.abs(localX - halfW) < handleTolerance && Math.abs(localY - (-halfH)) < handleTolerance) {
        setTransformInteraction({
          mode: 'scale-tr',
          startMouseX: coords.x,
          startMouseY: coords.y,
          startObjX: floatingObject.x,
          startObjY: floatingObject.y,
          startScaleX: floatingObject.scaleX,
          startScaleY: floatingObject.scaleY,
          startRotation: floatingObject.rotation,
        });
        return;
      }

      // Poignée Scale Bottom-Left
      if (Math.abs(localX - (-halfW)) < handleTolerance && Math.abs(localY - halfH) < handleTolerance) {
        setTransformInteraction({
          mode: 'scale-bl',
          startMouseX: coords.x,
          startMouseY: coords.y,
          startObjX: floatingObject.x,
          startObjY: floatingObject.y,
          startScaleX: floatingObject.scaleX,
          startScaleY: floatingObject.scaleY,
          startRotation: floatingObject.rotation,
        });
        return;
      }

      // Clic à l'intérieur de l'objet -> Déplacement
      if (Math.abs(localX) <= halfW && Math.abs(localY) <= halfH) {
        setTransformInteraction({
          mode: 'move',
          startMouseX: coords.x,
          startMouseY: coords.y,
          startObjX: floatingObject.x,
          startObjY: floatingObject.y,
          startScaleX: floatingObject.scaleX,
          startScaleY: floatingObject.scaleY,
          startRotation: floatingObject.rotation,
        });
        return;
      }

      // Clic hors de l'objet -> Valider l'objet et reprendre le dessin
      commitFloatingObject();
      return;
    }

    // ✏️ Lasso Libre (Dessiner une zone de sélection)
    if (activeTool === 'lasso') {
      setIsDrawing(true);
      setLassoPoints([coords]);
      return;
    }

    // ⛶ Sélection Rectangulaire
    if (activeTool === 'select_rect') {
      setIsDrawing(true);
      setSelectionRect({
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
      });
      return;
    }

    // Outil Texte
    if (activeTool === 'text') {
      setTextInputState(coords);
      setTextValue('');
      return;
    }

    // Pot de peinture
    if (activeTool === 'fill') {
      applyFloodFill(coords.x, coords.y);
      return;
    }

    // Pipette
    if (activeTool === 'pipette') {
      applyPipette(coords.x, coords.y);
      return;
    }

    // Spray
    if (activeTool === 'spray') {
      setIsDrawing(true);
      drawSpray(coords.x, coords.y);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setStartPoint(coords);

    if (['rect', 'circle', 'line', 'arrow'].includes(activeTool)) {
      setPreviewSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
      return;
    }

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = brushSize * 3;
      ctx.globalAlpha = 1.0;
    } else if (activeTool === 'marker') {
      // 🌒 Véritable outil d'ombrage : mode Multiply / Assombrissement volumétrique
      ctx.globalCompositeOperation = 'multiply';
      const isNeutralColor = color === '#ffffff' || color === '#1c1917' || color === '#000000' || color === '#1f2937';
      ctx.strokeStyle = isNeutralColor ? 'rgba(0, 0, 0, 0.35)' : color;
      ctx.lineWidth = brushSize * 2.8;
      ctx.globalAlpha = 0.38;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = 1.0;
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly || isPlayingAnim) return;
    const coords = getCoordinates(e);

    // Manipulation active d'un objet flottant (Déplacement / Scale / Rotation)
    if (transformInteraction && floatingObject) {
      const deltaX = coords.x - transformInteraction.startMouseX;
      const deltaY = coords.y - transformInteraction.startMouseY;

      if (transformInteraction.mode === 'move') {
        setFloatingObject({
          ...floatingObject,
          x: transformInteraction.startObjX + deltaX,
          y: transformInteraction.startObjY + deltaY,
        });
        return;
      }

      if (transformInteraction.mode === 'rotate') {
        const centerToCurrentAngle = Math.atan2(coords.y - floatingObject.y, coords.x - floatingObject.x) * (180 / Math.PI);
        const centerToStartAngle = Math.atan2(transformInteraction.startMouseY - floatingObject.y, transformInteraction.startMouseX - floatingObject.x) * (180 / Math.PI);
        const angleDiff = centerToCurrentAngle - centerToStartAngle;

        setFloatingObject({
          ...floatingObject,
          rotation: Math.round(transformInteraction.startRotation + angleDiff),
        });
        return;
      }

      if (transformInteraction.mode.startsWith('scale')) {
        const startDist = Math.hypot(
          transformInteraction.startMouseX - floatingObject.x,
          transformInteraction.startMouseY - floatingObject.y
        );
        const currentDist = Math.hypot(coords.x - floatingObject.x, coords.y - floatingObject.y);
        const factor = Math.max(0.1, currentDist / Math.max(startDist, 1));

        setFloatingObject({
          ...floatingObject,
          scaleX: transformInteraction.startScaleX * factor,
          scaleY: transformInteraction.startScaleY * factor,
        });
        return;
      }
    }

    if (!isDrawing) return;

    // Lasso libre
    if (activeTool === 'lasso') {
      setLassoPoints((prev) => [...prev, coords]);
      return;
    }

    // Sélection rectangulaire
    if (activeTool === 'select_rect' && selectionRect) {
      setSelectionRect({
        ...selectionRect,
        currentX: coords.x,
        currentY: coords.y,
      });
      return;
    }

    // Spray continu
    if (activeTool === 'spray') {
      drawSpray(coords.x, coords.y);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Formes géométriques
    if (['rect', 'circle', 'line', 'arrow'].includes(activeTool) && startPoint && previewSnapshot) {
      ctx.putImageData(previewSnapshot, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = 1.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (activeTool === 'rect') {
        const w = coords.x - startPoint.x;
        const h = coords.y - startPoint.y;
        if (fillShape) ctx.fillRect(startPoint.x, startPoint.y, w, h);
        else ctx.strokeRect(startPoint.x, startPoint.y, w, h);
      } else if (activeTool === 'circle') {
        const rx = Math.abs(coords.x - startPoint.x) / 2;
        const ry = Math.abs(coords.y - startPoint.y) / 2;
        const cx = Math.min(startPoint.x, coords.x) + rx;
        const cy = Math.min(startPoint.y, coords.y) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
        if (fillShape) ctx.fill();
        else ctx.stroke();
      } else if (activeTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else if (activeTool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();

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

  const handlePointerUp = () => {
    if (transformInteraction) {
      setTransformInteraction(null);
      return;
    }

    if (!isDrawing || readOnly || isPlayingAnim) return;

    if (activeTool === 'lasso') {
      setIsDrawing(false);
      extractLassoSelection();
      return;
    }

    if (activeTool === 'select_rect') {
      setIsDrawing(false);
      extractRectSelection();
      return;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    setIsDrawing(false);
    setStartPoint(null);
    setPreviewSnapshot(null);
    saveHistoryState();
    saveCurrentFrameToState();
  };

  // 🌐 Écouteurs globaux Window pour continuer à glisser en dehors de la surface du canvas sans couper le tracé (lignes, lasso, brush, déplacement)
  useEffect(() => {
    if (!isDrawing && !transformInteraction) return;

    const onWindowMove = (e: MouseEvent | TouchEvent) => {
      handlePointerMove(e as any);
    };

    const onWindowUp = () => {
      handlePointerUp();
    };

    window.addEventListener('mousemove', onWindowMove);
    window.addEventListener('mouseup', onWindowUp);
    window.addEventListener('touchmove', onWindowMove, { passive: false });
    window.addEventListener('touchend', onWindowUp);

    return () => {
      window.removeEventListener('mousemove', onWindowMove);
      window.removeEventListener('mouseup', onWindowUp);
      window.removeEventListener('touchmove', onWindowMove);
      window.removeEventListener('touchend', onWindowUp);
    };
  }, [isDrawing, transformInteraction]);

  // 🔄 Annuler & Rétablir
  const undo = useCallback(() => {
    if (floatingObject) {
      setFloatingObject(null);
      setActiveTool('pen');
      return;
    }
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
  }, [historyStep, history, saveCurrentFrameToState, floatingObject]);

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
    if (floatingObject) {
      setFloatingObject(null);
      setActiveTool('pen');
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveHistoryState();
    saveCurrentFrameToState();
  };

  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        tempCtx.drawImage(img, 0, 0);

        setFloatingObject({
          canvas: tempCanvas,
          x: canvas.width / 2,
          y: canvas.height / 2,
          width: img.width,
          height: img.height,
          scaleX: Math.min(canvas.width / img.width, canvas.height / img.height, 1),
          scaleY: Math.min(canvas.width / img.width, canvas.height / img.height, 1),
          rotation: 0,
        });

        setActiveTool('transform');
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  // =========================================================================
  // 🎞️ GESTION DES FRAMES D'ANIMATION
  // =========================================================================

  const addFrame = () => {
    if (floatingObject) commitFloatingObject();
    const updated = saveCurrentFrameToState();
    const nextList = [...updated, ''];
    setFrames(nextList);
    setCurrentFrameIndex(nextList.length - 1);
    if (onChange) onChange(nextList);
  };

  const duplicateFrame = useCallback(() => {
    if (floatingObject) commitFloatingObject();
    const updated = saveCurrentFrameToState();
    const currentData = updated[currentFrameIndex] || '';
    const nextList = [
      ...updated.slice(0, currentFrameIndex + 1),
      currentData,
      ...updated.slice(currentFrameIndex + 1)
    ];
    setFrames(nextList);
    setCurrentFrameIndex(currentFrameIndex + 1);
    if (onChange) onChange(nextList);
  }, [currentFrameIndex, saveCurrentFrameToState, onChange, floatingObject]);

  const deleteFrame = (index: number) => {
    if (frames.length <= 1) {
      clearCanvas();
      return;
    }
    if (floatingObject) setFloatingObject(null);
    const nextList = frames.filter((_, i) => i !== index);
    setFrames(nextList);
    const newIdx = Math.min(currentFrameIndex, nextList.length - 1);
    setCurrentFrameIndex(newIdx);
    if (onChange) onChange(nextList);
  };

  const moveFrame = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (floatingObject) commitFloatingObject();
    const nextList = [...frames];
    const [moved] = nextList.splice(fromIndex, 1);
    nextList.splice(toIndex, 0, moved);
    setFrames(nextList);
    setCurrentFrameIndex(toIndex);
    if (onChange) onChange(nextList);
  };

  // Raccourcis Clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (isCtrlOrCmd && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      } else if (e.code === 'Space') {
        e.preventDefault();
        toggleAnimation();
      } else if (e.key === 'ArrowLeft') {
        if (currentFrameIndex > 0) {
          if (floatingObject) commitFloatingObject();
          saveCurrentFrameToState();
          setCurrentFrameIndex((prev) => prev - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (currentFrameIndex < frames.length - 1) {
          if (floatingObject) commitFloatingObject();
          saveCurrentFrameToState();
          setCurrentFrameIndex((prev) => prev + 1);
        }
      } else if (e.key === 'd' || e.key === 'D') {
        duplicateFrame();
      } else if (e.key === 'b' || e.key === 'B') {
        if (floatingObject) commitFloatingObject();
        setActiveTool('pen');
      } else if (e.key === 'l' || e.key === 'L') {
        if (floatingObject) commitFloatingObject();
        setActiveTool('lasso');
      } else if (e.key === 'm' || e.key === 'M') {
        if (floatingObject) commitFloatingObject();
        setActiveTool('marker');
      } else if (e.key === 's' || e.key === 'S') {
        if (floatingObject) commitFloatingObject();
        setActiveTool('spray');
      } else if (e.key === 't' || e.key === 'T') {
        if (floatingObject) commitFloatingObject();
        setActiveTool('text');
      } else if (e.key === 'e' || e.key === 'E') {
        if (floatingObject) commitFloatingObject();
        setActiveTool('eraser');
      } else if (e.key === 'g' || e.key === 'G') {
        if (floatingObject) commitFloatingObject();
        setActiveTool('fill');
      } else if (e.key === '[' || e.key === '-') {
        setBrushSize(prev => Math.max(1, prev - 2));
      } else if (e.key === ']' || e.key === '+' || e.key === '=') {
        setBrushSize(prev => Math.min(64, prev + 2));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, toggleAnimation, duplicateFrame, currentFrameIndex, frames.length, saveCurrentFrameToState, floatingObject]);

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
  const isSelectTool = ['lasso', 'select_rect', 'transform'].includes(activeTool);

  return (
    <div className="flex flex-col bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-gallery space-y-0 isolate">
      {/* 🎛️ BARRE D'OUTILS PRINCIPALE */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-stone-50 border-b border-stone-200 text-xs">
          {/* Groupe 1 : Outils de Tracé, Lasso, Formes, Gomme */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Crayon standard */}
            <button
              type="button"
              onClick={() => { if (floatingObject) commitFloatingObject(); setActiveTool('pen'); setShowShapeMenu(false); setShowSelectMenu(false); }}
              className={`p-2 rounded-xl transition-all flex items-center gap-1 font-semibold ${
                activeTool === 'pen'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200/70 text-stone-700 border border-stone-200'
              }`}
              title="Crayon net (B)"
            >
              <Paintbrush className="w-4 h-4" />
              <span className="hidden md:inline text-[11px]">Crayon</span>
            </button>

            {/* ✏️ Lasso & Sélection d'Objets (Nouveau) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSelectMenu(!showSelectMenu)}
                className={`p-2 rounded-xl transition-all flex items-center gap-1 font-semibold ${
                  isSelectTool
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white hover:bg-stone-200/70 text-stone-700 border border-stone-200'
                }`}
                title="Lasso libre & Sélection de zone à animer"
              >
                <Lasso className="w-4 h-4" />
                <span className="hidden md:inline text-[11px]">Zone & Lasso</span>
              </button>

              {showSelectMenu && (
                <div className="absolute top-full left-0 mt-1.5 z-20 bg-white rounded-2xl border border-stone-200 shadow-2xl p-2 flex flex-col gap-1.5 min-w-[220px] animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      if (floatingObject) commitFloatingObject();
                      setActiveTool('lasso');
                      setShowSelectMenu(false);
                    }}
                    className={`p-2 rounded-xl text-left text-xs flex items-center gap-2 transition-colors ${
                      activeTool === 'lasso' ? 'bg-rose-50 text-rose-700 font-bold' : 'hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <Lasso className="w-4 h-4 text-rose-600" />
                    <div>
                      <p className="font-bold text-[11px]">Lasso Libre (Main levée)</p>
                      <p className="text-[10px] text-stone-500">Entourez une forme à déplacer</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (floatingObject) commitFloatingObject();
                      setActiveTool('select_rect');
                      setShowSelectMenu(false);
                    }}
                    className={`p-2 rounded-xl text-left text-xs flex items-center gap-2 transition-colors ${
                      activeTool === 'select_rect' ? 'bg-rose-50 text-rose-700 font-bold' : 'hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <Square className="w-4 h-4 text-rose-600" />
                    <div>
                      <p className="font-bold text-[11px]">Cadre Rectangulaire</p>
                      <p className="text-[10px] text-stone-500">Sélectionnez un rectangle</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSelectMenu(false);
                      transformEntireFrame();
                    }}
                    className="p-2 rounded-xl text-left text-xs flex items-center gap-2 hover:bg-stone-100 text-stone-700 transition-colors border-t border-stone-100 pt-2"
                  >
                    <Move className="w-4 h-4 text-stone-700" />
                    <div>
                      <p className="font-bold text-[11px]">Transformer Toute l'Image</p>
                      <p className="text-[10px] text-stone-500">Zoomer / Pivoter tout le dessin</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Outil Ombrage / Assombrir */}
            <button
              type="button"
              onClick={() => { if (floatingObject) commitFloatingObject(); setActiveTool('marker'); setShowShapeMenu(false); setShowSelectMenu(false); }}
              className={`p-2 rounded-xl transition-all flex items-center gap-1 font-semibold ${
                activeTool === 'marker'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200/70 text-stone-700 border border-stone-200'
              }`}
              title="Ombrage / Assombrir (M) - Assombrit progressivement la zone pour donner du volume et du relief"
            >
              <Moon className="w-4 h-4 text-violet-400" />
              <span className="hidden md:inline text-[11px]">Ombrage</span>
            </button>

            {/* Aérographe & Texture */}
            <button
              type="button"
              onClick={() => { if (floatingObject) commitFloatingObject(); setActiveTool('spray'); setShowShapeMenu(false); setShowSelectMenu(false); }}
              className={`p-2 rounded-xl transition-all flex items-center gap-1 font-semibold ${
                activeTool === 'spray'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200/70 text-stone-700 border border-stone-200'
              }`}
              title="Aérographe / Texture cinéma (S)"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="hidden md:inline text-[11px]">Texture</span>
            </button>

            {/* Pot de peinture */}
            <button
              type="button"
              onClick={() => { if (floatingObject) commitFloatingObject(); setActiveTool('fill'); setShowShapeMenu(false); setShowSelectMenu(false); }}
              className={`p-2 rounded-xl transition-all flex items-center gap-1 font-semibold ${
                activeTool === 'fill'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200/70 text-stone-700 border border-stone-200'
              }`}
              title="Pot de peinture (G)"
            >
              <PaintBucket className="w-4 h-4 text-rose-500" />
              <span className="hidden md:inline text-[11px]">Remplir</span>
            </button>

            {/* Formes Géométriques */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowShapeMenu(!showShapeMenu)}
                className={`p-2 rounded-xl transition-all flex items-center gap-1 font-semibold ${
                  isShapeTool
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white hover:bg-stone-200/70 text-stone-700 border border-stone-200'
                }`}
                title="Formes géométriques simples"
              >
                {activeTool === 'circle' && <CircleIcon className="w-4 h-4" />}
                {activeTool === 'line' && <Minus className="w-4 h-4" />}
                {activeTool === 'arrow' && <ArrowUpRight className="w-4 h-4 text-sky-400" />}
                {(!isShapeTool || activeTool === 'rect') && <Square className="w-4 h-4" />}
                <span className="hidden md:inline text-[11px]">Formes</span>
              </button>

              {showShapeMenu && (
                <div className="absolute top-full left-0 mt-1.5 z-20 bg-white rounded-2xl border border-stone-200 shadow-xl p-2 flex flex-col gap-2 min-w-[200px] animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { if (floatingObject) commitFloatingObject(); setActiveTool('rect'); setShowShapeMenu(false); }}
                      className={`p-1.5 rounded-xl text-xs flex items-center gap-1.5 flex-1 ${
                        activeTool === 'rect' ? 'bg-stone-900 text-white font-bold' : 'hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Cadre</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (floatingObject) commitFloatingObject(); setActiveTool('circle'); setShowShapeMenu(false); }}
                      className={`p-1.5 rounded-xl text-xs flex items-center gap-1.5 flex-1 ${
                        activeTool === 'circle' ? 'bg-stone-900 text-white font-bold' : 'hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <CircleIcon className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Cercle</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { if (floatingObject) commitFloatingObject(); setActiveTool('line'); setShowShapeMenu(false); }}
                      className={`p-1.5 rounded-xl text-xs flex items-center gap-1.5 flex-1 ${
                        activeTool === 'line' ? 'bg-stone-900 text-white font-bold' : 'hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Ligne</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (floatingObject) commitFloatingObject(); setActiveTool('arrow'); setShowShapeMenu(false); }}
                      className={`p-1.5 rounded-xl text-xs flex items-center gap-1.5 flex-1 ${
                        activeTool === 'arrow' ? 'bg-stone-900 text-white font-bold' : 'hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-[11px]">Flèche</span>
                    </button>
                  </div>
                  <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[10px] text-stone-500 font-semibold">Mode :</span>
                    <button
                      type="button"
                      onClick={() => setFillShape(!fillShape)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors ${
                        fillShape ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {fillShape ? '■ Plein' : '□ Contour'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Texte / Annotation */}
            <button
              type="button"
              onClick={() => { if (floatingObject) commitFloatingObject(); setActiveTool('text'); setShowShapeMenu(false); setShowSelectMenu(false); }}
              className={`p-2 rounded-xl transition-all flex items-center gap-1 font-semibold ${
                activeTool === 'text'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200/70 text-stone-700 border border-stone-200'
              }`}
              title="Texte / Annotation (T)"
            >
              <Type className="w-4 h-4 text-emerald-600" />
              <span className="hidden md:inline text-[11px]">Texte</span>
            </button>

            {/* Gomme */}
            <button
              type="button"
              onClick={() => { if (floatingObject) commitFloatingObject(); setActiveTool('eraser'); setShowShapeMenu(false); setShowSelectMenu(false); }}
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
              onClick={() => {
                if (activeTool !== 'pipette') setPreviousTool(activeTool);
                setActiveTool('pipette');
                setShowShapeMenu(false);
                setShowSelectMenu(false);
              }}
              className={`p-2 rounded-xl transition-all flex items-center gap-1 font-semibold ${
                activeTool === 'pipette'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white hover:bg-stone-200/70 text-stone-700 border border-stone-200'
              }`}
              title="Pipette"
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

          {/* Épaisseur du pinceau */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="w-5 h-5 flex items-center justify-center bg-stone-100 rounded-full shrink-0">
              <span
                className="rounded-full transition-all duration-75"
                style={{
                  width: `${Math.max(2, Math.min(18, brushSize))}px`,
                  height: `${Math.max(2, Math.min(18, brushSize))}px`,
                  backgroundColor: activeTool === 'eraser' ? '#78716c' : color === '#ffffff' ? '#1c1917' : color,
                }}
              />
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
              className="w-16 sm:w-20 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
            />
            <span className="font-mono text-[11px] font-bold text-stone-900 w-8 text-right shrink-0">
              {brushSize}px
            </span>
          </div>

          {/* Actions : Miroir, Grille, Oignon, Import, Undo, Redo, Effacer */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={flipHorizontal}
              className="p-2 rounded-xl text-xs flex items-center gap-1 bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 transition-all shadow-sm"
              title="Symétrie Horizontale"
            >
              <FlipHorizontal className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px]">Miroir</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-xl text-xs flex items-center gap-1 transition-all ${
                showGrid
                  ? 'bg-stone-900 text-white font-semibold shadow-sm'
                  : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
              }`}
              title="Grille des tiers"
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px]">Grille</span>
            </button>

            <button
              type="button"
              onClick={() => setOnionSkin(!onionSkin)}
              className={`p-2 rounded-xl text-xs flex items-center gap-1 transition-all ${
                onionSkin
                  ? 'bg-stone-900 text-white font-semibold shadow-sm'
                  : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
              }`}
              title="Pelure d'oignon"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px]">Oignon</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-xs flex items-center gap-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 transition-colors shadow-sm"
              title="Importer une image"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px]">Image</span>
            </button>

            <div className="flex items-center gap-0.5 bg-white p-1 rounded-2xl border border-stone-200 shadow-sm">
              <button
                type="button"
                onClick={undo}
                disabled={historyStep <= 0 && !floatingObject}
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

      {/* 🎛️ HUD FLOTTANT DE TRANSFORMATION & MULTI-FRAMES (Affiché quand un objet est sélectionné) */}
      {floatingObject && !readOnly && !isPlayingAnim && (
        <div className="bg-stone-900 text-white px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-stone-800 animate-in slide-in-from-top-2">
          {/* Outils de Rotation & Zoom Rapides */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Move className="w-3 h-3" />
              Objet en main :
            </span>

            {/* Rotation */}
            <div className="flex items-center bg-stone-800 rounded-xl p-0.5 border border-stone-700">
              <button
                type="button"
                onClick={() => rotateFloatingObject(-45)}
                className="px-2 py-1 hover:bg-stone-700 rounded-lg text-[10px] font-bold"
                title="Pivoter -45°"
              >
                ↺ -45°
              </button>
              <button
                type="button"
                onClick={() => rotateFloatingObject(45)}
                className="px-2 py-1 hover:bg-stone-700 rounded-lg text-[10px] font-bold"
                title="Pivoter +45°"
              >
                ↻ +45°
              </button>
              <button
                type="button"
                onClick={() => rotateFloatingObject(90)}
                className="px-2 py-1 hover:bg-stone-700 rounded-lg text-[10px] font-bold"
                title="Pivoter 90°"
              >
                90°
              </button>
            </div>

            {/* Taille / Zoom */}
            <div className="flex items-center bg-stone-800 rounded-xl p-0.5 border border-stone-700">
              <button
                type="button"
                onClick={() => scaleFloatingObject(0.9)}
                className="p-1 hover:bg-stone-700 rounded-lg"
                title="Réduire (-10%)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-[10px] font-mono font-bold text-stone-300">
                {Math.round(Math.abs(floatingObject.scaleX) * 100)}%
              </span>
              <button
                type="button"
                onClick={() => scaleFloatingObject(1.1)}
                className="p-1 hover:bg-stone-700 rounded-lg"
                title="Agrandir (+10%)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Miroir H / V */}
            <div className="flex items-center bg-stone-800 rounded-xl p-0.5 border border-stone-700">
              <button
                type="button"
                onClick={flipFloatingObjectH}
                className="p-1 hover:bg-stone-700 rounded-lg text-stone-300"
                title="Miroir Horizontal"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={flipFloatingObjectV}
                className="p-1 hover:bg-stone-700 rounded-lg text-stone-300"
                title="Miroir Vertical"
              >
                <FlipVertical className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tamponner */}
            <button
              type="button"
              onClick={stampFloatingObject}
              className="px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-[10px] font-bold flex items-center gap-1"
              title="Dupliquer et coller sur cette frame tout en gardant l'objet en main"
            >
              <Stamp className="w-3 h-3" />
              <span>Tamponner</span>
            </button>
          </div>

          {/* Boutons d'Action Clés : Animer vers Frame Suivante & Valider */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={animateToNextFrame}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-rose-900/40 transition-transform hover:scale-105"
              title="Fixe sur cette frame et avance sur la suivante pour continuer l'animation"
            >
              <Film className="w-3.5 h-3.5" />
              <span>🎬 Animer sur Frame Suivante ➡️</span>
            </button>

            <button
              type="button"
              onClick={commitFloatingObject}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1"
              title="Valider et fusionner sur la frame actuelle"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Valider</span>
            </button>
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
            {/* 🧅 Calque Pelure d'Oignon */}
            {onionSkin && currentFrameIndex > 0 && frames[currentFrameIndex - 1] && (
              <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden flex items-center justify-center opacity-30 select-none">
                <img
                  src={frames[currentFrameIndex - 1]}
                  alt="Pelure d'oignon"
                  className="w-full h-full object-contain select-none"
                />
              </div>
            )}

            {onionSkin && currentFrameIndex > 0 && frames[currentFrameIndex - 1] && (
              <div className="absolute top-2 left-2 text-[9px] font-mono font-bold text-amber-300 bg-black/75 border border-amber-500/40 px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none z-[3] flex items-center gap-1 shadow-sm">
                <span>🧅</span>
                <span>Oignon (#{currentFrameIndex})</span>
              </div>
            )}

            {/* Canvas de dessin actif (z-[2]) */}
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              className="w-full h-full object-contain relative z-[2]"
            />

            {/* Canvas Overlay interactif pour Lasso, Bounding Box et Transformation (z-[4]) */}
            <canvas
              ref={overlayCanvasRef}
              width={640}
              height={360}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className={`w-full h-full object-contain absolute inset-0 z-[4] ${
                readOnly 
                  ? 'cursor-default'
                  : floatingObject
                    ? 'cursor-move'
                    : activeTool === 'lasso'
                      ? 'cursor-crosshair'
                      : activeTool === 'select_rect'
                        ? 'cursor-crosshair'
                        : activeTool === 'eraser' 
                          ? 'canvas-cursor-eraser' 
                          : activeTool === 'fill' 
                            ? 'cursor-crosshair' 
                            : activeTool === 'pipette' 
                              ? 'cursor-help' 
                              : 'canvas-cursor-brush'
              }`}
            />

            {/* Grille de Composition */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none z-[5] mix-blend-difference">
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 border border-white/40">
                  <div className="border-r border-b border-white/70" />
                  <div className="border-r border-b border-white/70" />
                  <div className="border-b border-white/70" />
                  <div className="border-r border-b border-white/70" />
                  <div className="border-r border-b border-white/70" />
                  <div className="border-b border-white/70" />
                  <div className="border-r border-b border-white/70" />
                  <div className="border-r border-b border-white/70" />
                  <div />
                </div>
              </div>
            )}

            {/* Champ d'annotation texte */}
            {textInputState && (
              <div 
                className="absolute z-[6] bg-stone-900/95 border border-white/30 p-2 rounded-2xl shadow-2xl flex items-center gap-1.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                style={{
                  left: `${Math.min(80, Math.max(10, (textInputState.x / 640) * 100))}%`,
                  top: `${Math.min(80, Math.max(10, (textInputState.y / 360) * 100))}%`,
                  transform: 'translate(-20%, -50%)',
                }}
              >
                <input
                  type="text"
                  autoFocus
                  value={textValue}
                  placeholder="Texte / Annotation cinéma..."
                  onChange={(e) => setTextValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitTextAnnotation();
                    if (e.key === 'Escape') {
                      setTextInputState(null);
                      setTextValue('');
                    }
                  }}
                  className="bg-stone-800 border border-stone-700 text-white text-xs px-3 py-1.5 rounded-xl focus:outline-none focus:border-emerald-500 font-medium min-w-[160px] sm:min-w-[200px]"
                />
                <button
                  type="button"
                  onClick={commitTextAnnotation}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-transform hover:scale-105 shadow-sm"
                >
                  Poser
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTextInputState(null);
                    setTextValue('');
                  }}
                  className="p-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-white text-xs transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
          </>
        )}

        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-stone-400 pointer-events-none bg-black/60 px-2.5 py-0.5 rounded-full backdrop-blur-sm z-[5]">
          16:9 • Frame {currentFrameIndex + 1} / {frames.length}
        </div>
      </div>

      {/* BANDEAU DE GESTION DES FRAMES & LECTURE FLIPBOOK */}
      <div className="p-3 bg-stone-50 border-t border-stone-200 flex flex-col gap-2.5">
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
              {isPlayingAnim ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Jouer l'Animation Flipbook</span>
                </>
              )}
            </button>

            {/* Vitesse FPS */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-stone-200 text-xs">
              <span className="text-[11px] text-stone-500 font-semibold">FPS :</span>
              {FPS_OPTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setAnimFps(f);
                    if (onFpsChange) onFpsChange(f);
                  }}
                  className={`px-2 py-0.5 rounded-lg font-mono text-xs font-bold transition-colors ${
                    animFps === f
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={duplicateFrame}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                title="Dupliquer la frame active"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Dupliquer</span>
              </button>

              <button
                type="button"
                onClick={addFrame}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-1 shadow-sm transition-all"
                title="Ajouter une nouvelle frame vierge"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle Frame</span>
              </button>
            </div>
          )}
        </div>

        {/* Timeline des Frames (Thumbnails Drag & Drop) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          {frames.map((frame, index) => (
            <div
              key={index}
              draggable={!readOnly}
              onDragStart={() => !readOnly && setDraggedIndex(index)}
              onDragOver={(e) => !readOnly && handleDragOver(e, index)}
              onDrop={(e) => !readOnly && handleDrop(e, index)}
              onDragEnd={() => !readOnly && handleDragEnd()}
              onClick={() => {
                if (floatingObject) commitFloatingObject();
                saveCurrentFrameToState();
                setCurrentFrameIndex(index);
              }}
              className={`group relative aspect-video w-20 sm:w-24 rounded-xl overflow-hidden cursor-pointer border-2 transition-all shrink-0 bg-stone-900 flex items-center justify-center ${
                currentFrameIndex === index
                  ? 'border-rose-600 ring-2 ring-rose-300 scale-105'
                  : 'border-stone-200 hover:border-stone-400 opacity-70 hover:opacity-100'
              } ${dragOverIndex === index ? 'border-amber-500 scale-110' : ''}`}
            >
              {frame ? (
                <img
                  src={frame}
                  alt={`Frame ${index + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <span className="text-[10px] text-stone-500 font-mono">Vide</span>
              )}

              <div className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold text-white">
                #{index + 1}
              </div>

              {!readOnly && frames.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFrame(index);
                  }}
                  className="absolute top-1 right-1 p-1 rounded-lg bg-black/75 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Supprimer la frame"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageImport}
        className="hidden"
      />
    </div>
  );
};
