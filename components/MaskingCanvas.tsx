import React, { useRef, useEffect, useState, useCallback } from 'react';

interface MaskingCanvasProps {
  imageSrc: string;
  isEnabled: boolean;
  brushSize: number;
  onMaskChange: (base64: string | null) => void;
  undoTrigger: number;
  clearTrigger: number;
}

type Point = { x: number; y: number };
type Path = Point[];

const MaskingCanvas: React.FC<MaskingCanvasProps> = ({
  imageSrc,
  isEnabled,
  brushSize,
  onMaskChange,
  undoTrigger,
  clearTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  
  const [paths, setPaths] = useState<Path[]>([]);
  const currentPath = useRef<Path>([]);

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

  const drawPaths = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!isEnabled) return;
    
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; // Semi-transparent red
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    [...paths, currentPath.current].forEach(path => {
      if (path.length < 2) return;
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    });
  }, [paths, brushSize, isEnabled]);

  const generateMaskImage = useCallback(async () => {
    if (paths.length === 0) {
      onMaskChange(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    // Fill background with black
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Draw paths in white
    ctx.strokeStyle = 'white';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    paths.forEach(path => {
      if (path.length < 2) return;
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    });

    const base64 = maskCanvas.toDataURL('image/png');
    onMaskChange(base64);
  }, [paths, brushSize, onMaskChange]);

  const startDrawing = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isEnabled) return;
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
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) drawPaths(ctx);
    }
  }, [isEnabled, drawPaths]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (currentPath.current.length > 0) {
      setPaths(prev => [...prev, currentPath.current]);
    }
    currentPath.current = [];
  }, []);

  // Effect for drawing logic and event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDrawing);
    
    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      window.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      window.removeEventListener('touchend', stopDrawing);
    };
  }, [startDrawing, draw, stopDrawing]);

  // Effect to resize canvas to match image dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) drawPaths(ctx);
    };
  }, [imageSrc, drawPaths]);

  // Effect to redraw when paths change (e.g., after undo)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) drawPaths(ctx);
    generateMaskImage();
  }, [paths, drawPaths, generateMaskImage]);
  
  // Effect for undo trigger
  useEffect(() => {
    if (undoTrigger > 0) {
        setPaths(prev => prev.slice(0, -1));
    }
  }, [undoTrigger]);

  // Effect for clear trigger
  useEffect(() => {
    if (clearTrigger > 0) {
        setPaths([]);
    }
  }, [clearTrigger]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${ isEnabled ? `cursor-none` : 'pointer-events-none'}`}
      style={{
        '--brush-size': `${brushSize}px`,
        '--cursor-url': `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 ${brushSize} ${brushSize}"><circle cx="${brushSize/2}" cy="${brushSize/2}" r="${brushSize/2 - 1}" stroke="white" stroke-width="1.5" fill="rgba(255,255,255,0.2)"/></svg>')`
      } as React.CSSProperties}
    >
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${isEnabled ? 'custom-cursor' : ''}`}
        style={isEnabled ? { cursor: 'var(--cursor-url) 50 50, crosshair' } : {}}
      />
      <style>{`
        .custom-cursor {
            cursor: var(--cursor-url) ${brushSize / 2} ${brushSize / 2}, crosshair;
        }
      `}</style>
    </div>
  );
};

export default MaskingCanvas;
