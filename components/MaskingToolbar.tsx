import React from 'react';

interface MaskingToolbarProps {
  isMasking: boolean;
  onToggleMasking: () => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const MaskingToolbar: React.FC<MaskingToolbarProps> = ({
  isMasking,
  onToggleMasking,
  brushSize,
  onBrushSizeChange,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-4 mb-2">
      <div className="bg-gray-800/50 rounded-lg p-2 flex items-center justify-between space-x-4">
        <button
          onClick={onToggleMasking}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-all flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            isMasking
              ? 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500'
              : 'bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500'
          }`}
          aria-pressed={isMasking}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
          </svg>
          <span>{isMasking ? 'Disable Masking' : 'Enable Masking'}</span>
        </button>
        
        {isMasking && (
          <div className="flex-grow flex items-center space-x-4 text-sm">
            <label htmlFor="brush-size" className="text-gray-300">Brush Size:</label>
            <input
              id="brush-size"
              type="range"
              min="5"
              max="150"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              aria-label="Brush size"
            />
            <span className="text-white font-mono w-8 text-right">{brushSize}</span>

            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Undo last stroke (Ctrl+Z)"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                </svg>
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Redo last stroke (Ctrl+Y)"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 15l3-3m0 0l-3-3m3 3H8m11 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>
            <button
              onClick={onClear}
              disabled={!canUndo}
              className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Clear mask"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaskingToolbar;