import React, { useRef, useEffect, useState, useCallback } from 'react';

interface MaskingCanvasProps {
  imageSrc: string;
  isEnabled: boolean;
  brushSize: number;
  onCompositeImageChange: (base64: string | null) => void;
  onMaskImageChange: (base64: string | null) => void; // New callback for the data mask
  onHistoryChange: (history: { canUndo: boolean; canRedo: boolean }) => void;
  onRegionsChange: (regions: { id: number }[]) => void;
  undoTrigger: number;
  redoTrigger: number;
  clearTrigger: number;
}

type Point = { x: number; y: number };
type Path = Point[];
type Bbox = { minX: number; minY: number; maxX: number; maxY: number };
type Region = { id: number; paths: Path[]; bbox: Bbox };

const MERGE_THRESHOLD_MULTIPLIER = 2.5;

const getPathBbox = (path: Path): Bbox => {
  return path.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxX: Math.max(acc.maxX, point.x),
      maxY: Math.max(acc.maxY, point.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );
};

const mergeBboxes = (b1: Bbox, b2: Bbox): Bbox => ({
  minX: Math.min(b1.minX, b2.minX),
  minY: Math.min(b1.minY, b2.minY),
  maxX: Math.max(b1.maxX, b2.maxX),
  maxY: Math.max(b1.maxY, b2.maxY),
});

const areBboxesClose = (b1: Bbox, b2: Bbox, threshold: number): boolean => {
  const expandedB1 = {
    minX: b1.minX - threshold,
    minY: b1.minY - threshold,
    maxX: b1.maxX + threshold,
    maxY: b1.maxY + threshold,
  };
  return (
    expandedB1.minX <= b2.maxX &&
    expandedB1.maxX >= b2.minX &&
    expandedB1.minY <= b2.maxY &&
    expandedB1.maxY >= b2.minY
  );
};

const MaskingCanvas: React.FC<MaskingCanvasProps> = ({
  imageSrc,
  isEnabled,
  brushSize,
  onCompositeImageChange,
  onMaskImageChange,
  onHistoryChange,
  onRegionsChange,
  undoTrigger,
  redoTrigger,
  clearTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isDrawing = useRef(false);
  const currentPath = useRef<Path>([]);
  
  const [history, setHistory] = useState<Region[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ x: -100, y: -100 });
  
  const regions = history[historyIndex] || [];

  const updateHistory = useCallback((newRegions: Region[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newRegions);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const getCanvasCoordinates = (event: MouseEvent | TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else if (event.touches[0]) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      return null;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const drawRegionsOnContext = useCallback((ctx: CanvasRenderingContext2D, color: string, isForMask: boolean) => {
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;
       if (isForMask) {
           ctx.fillStyle = color;
       }
      regions.forEach(region => {
          region.paths.forEach(path => {
              if (path.length < 1) return;
              ctx.beginPath();
              ctx.moveTo(path[0].x, path[0].y);
              for (let i = 1; i < path.length; i++) {
                  ctx.lineTo(path[i].x, path[i].y);
              }
              ctx.stroke();
               if (isForMask) {
                   ctx.fill(); // Fill the path on the mask
               }
          });
      });
  }, [regions, brushSize]);

  const drawRegionNumbersOnContext = useCallback((ctx: CanvasRenderingContext2D, isForMask: boolean) => {
      const smallerDim = Math.min(ctx.canvas.width, ctx.canvas.height);
      const baseFontSize = Math.max(24, smallerDim * 0.05);

      ctx.font = `bold ${baseFontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      regions.forEach(region => {
          const centerX = region.bbox.minX + (region.bbox.maxX - region.bbox.minX) / 2;
          const centerY = region.bbox.minY + (region.bbox.maxY - region.bbox.minY) / 2;
          
          if (isForMask) {
              ctx.fillStyle = '#FFFFFF'; // White text for the mask
              ctx.fillText(String(region.id), centerX, centerY);
          } else {
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
              ctx.lineWidth = baseFontSize * 0.15;
              ctx.strokeText(String(region.id), centerX, centerY);
              
              ctx.fillStyle = '#FFFF00'; // Bright yellow for display
              ctx.fillText(String(region.id), centerX, centerY);
          }
      });
  }, [regions]);

  const drawCurrentPath = useCallback((ctx: CanvasRenderingContext2D) => {
      const path = currentPath.current;
      if (path.length < 1) return;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
  }, [brushSize]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!isEnabled) return;
    
    drawRegionsOnContext(ctx, 'rgba(239, 68, 68, 0.7)', false);
    if (!isDrawing.current) {
      drawRegionNumbersOnContext(ctx, false);
    } else {
      drawCurrentPath(ctx);
    }
  }, [isEnabled, drawRegionsOnContext, drawRegionNumbersOnContext, drawCurrentPath]);

  const generateOutputImages = useCallback(async () => {
    if (regions.length === 0) {
      onCompositeImageChange(null);
      onMaskImageChange(null);
      return;
    }

    const image = imageRef.current;
    if (!image || !image.complete) return;

    // Create Composite Image for Display
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = image.naturalWidth;
    compositeCanvas.height = image.naturalHeight;
    const compositeCtx = compositeCanvas.getContext('2d');
    if (compositeCtx) {
        compositeCtx.drawImage(image, 0, 0);
        drawRegionsOnContext(compositeCtx, 'rgba(239, 68, 68, 0.5)', false);
        drawRegionNumbersOnContext(compositeCtx, false);
        onCompositeImageChange(compositeCanvas.toDataURL('image/png'));
    }

    // Create Black and White Mask Image for API
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = image.naturalWidth;
    maskCanvas.height = image.naturalHeight;
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
        maskCtx.fillStyle = '#000000';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        drawRegionsOnContext(maskCtx, '#FFFFFF', true);
        drawRegionNumbersOnContext(maskCtx, true);
        onMaskImageChange(maskCanvas.toDataURL('image/png'));
    }
  }, [regions, onCompositeImageChange, onMaskImageChange, drawRegionsOnContext, drawRegionNumbersOnContext]);

  const startDrawing = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isEnabled || (event instanceof MouseEvent && event.button !== 0)) return;
    isDrawing.current = true;
    const point = getCanvasCoordinates(event);
    if (point) {
      currentPath.current = [point];
    }
  }, [isEnabled]);

  const draw = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDrawing.current || !isEnabled) return;
    event.preventDefault();
    const point = getCanvasCoordinates(event);
    if (point) {
      currentPath.current.push(point);
      redrawCanvas();
    }
  }, [isEnabled, redrawCanvas]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    if (currentPath.current.length > 0) {
      const newPath = [...currentPath.current];
      const newPathBbox = getPathBbox(newPath);
      let merged = false;
      const newRegions = regions.map(region => {
        if (!merged && areBboxesClose(region.bbox, newPathBbox, brushSize * MERGE_THRESHOLD_MULTIPLIER)) {
          merged = true;
          return {
            ...region,
            paths: [...region.paths, newPath],
            bbox: mergeBboxes(region.bbox, newPathBbox),
          };
        }
        return region;
      });

      if (!merged) {
        newRegions.push({
          id: (regions.length > 0 ? Math.max(...regions.map(r => r.id)) : 0) + 1,
          paths: [newPath],
          bbox: newPathBbox,
        });
      }
      updateHistory(newRegions);
    }
    currentPath.current = [];
    redrawCanvas();
  }, [regions, brushSize, updateHistory, redrawCanvas]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
          setCursorPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const stop = (e: MouseEvent | TouchEvent) => {
      if (isDrawing.current) {
        stopDrawing();
      }
    };

    container.addEventListener('mousedown', startDrawing);
    container.addEventListener('mousemove', draw);
    container.addEventListener('mouseup', stopDrawing);
    container.addEventListener('mouseleave', stop);
    container.addEventListener('touchstart', startDrawing, { passive: false });
    container.addEventListener('touchmove', draw, { passive: false });
    container.addEventListener('touchend', stopDrawing);
    
    return () => {
      container.removeEventListener('mousedown', startDrawing);
      container.removeEventListener('mousemove', draw);
      container.removeEventListener('mouseup', stopDrawing);
      container.removeEventListener('mouseleave', stop);
      container.removeEventListener('touchstart', startDrawing);
      container.removeEventListener('touchmove', draw);
      container.removeEventListener('touchend', stopDrawing);
    };
  }, [startDrawing, draw, stopDrawing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const img = new Image();
    img.crossOrigin = "anonymous"; // Handle potential CORS issues if image is not a data URL
    img.src = imageSrc;
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      imageRef.current = img;
      redrawCanvas();
      generateOutputImages(); // Generate initial composite in case there are saved regions
    };
  }, [imageSrc, redrawCanvas, generateOutputImages]);

  useEffect(() => {
    redrawCanvas();
    generateOutputImages();
    onHistoryChange({ canUndo: historyIndex > 0, canRedo: historyIndex < history.length - 1 });
    onRegionsChange(regions.map(r => ({ id: r.id })));
  }, [regions, redrawCanvas, generateOutputImages, onHistoryChange, onRegionsChange, history.length, historyIndex]);
  
  useEffect(() => {
    if (undoTrigger > 0) setHistoryIndex(i => Math.max(0, i - 1));
  }, [undoTrigger]);

  useEffect(() => {
    if (redoTrigger > 0) setHistoryIndex(i => Math.min(history.length - 1, i + 1));
  }, [redoTrigger]);

  useEffect(() => {
    if (clearTrigger > 0) {
        const newHistory = [[]];
        setHistory(newHistory);
        setHistoryIndex(0);
    }
  }, [clearTrigger]);

  useEffect(() => {
    redrawCanvas();
  }, [isEnabled, redrawCanvas]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${ isEnabled ? `cursor-none` : 'pointer-events-none'}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setCursorPosition({ x: -100, y: -100 })}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
      {isEnabled && (
          <div
              className="absolute pointer-events-none rounded-full border border-white bg-white/25"
              style={{
                  width: brushSize,
                  height: brushSize,
                  left: cursorPosition.x,
                  top: cursorPosition.y,
                  transform: `translate(-50%, -50%)`,
                  willChange: 'transform, left, top',
              }}
          />
      )}
    </div>
  );
};

export default MaskingCanvas;
