
import React from 'react';
import { Character } from '../types';

interface CharacterUploaderProps {
  characters: Character[];
  onUpload: (id: Character['id'], base64: string, mimeType: string) => void;
  onSetDefinition: (id: Character['id'], definition: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  analyzeCount: number;
  onInject?: () => void;
  injectableCount?: number;
}

const CharacterCard: React.FC<{
  character: Character;
  onUpload: (id: Character['id'], base64: string, mimeType: string) => void;
  onSetDefinition: (id: Character['id'], definition: string) => void;
}> = ({ character, onUpload, onSetDefinition }) => {

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(character.id, reader.result as string, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDefinitionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onSetDefinition(character.id, e.target.value);
  };
  
  const characterTag = `[C${character.id.slice(-1)}]`;
  const displayName = character.roleName || character.name;

  return (
    <div className="flex flex-col items-center space-y-2 flex-1 min-w-0 max-w-xs">
      <h4 className="font-semibold text-white text-center truncate w-full" title={displayName}>
        {displayName}
        <span className="ml-2 text-xs font-mono bg-gray-600 text-gray-200 px-1.5 py-0.5 rounded">{characterTag}</span>
      </h4>
      <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-gray-600 relative">
        {character.base64 ? (
          <img src={character.base64} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
        {character.isLoading && (
          <div className="absolute inset-0 bg-black/70 flex justify-center items-center rounded-full">
            <div className="w-8 h-8 border-2 border-t-2 border-gray-500 border-t-blue-400 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      <label htmlFor={`char-upload-${character.id}`} className="cursor-pointer text-center text-sm font-medium text-blue-400 hover:text-blue-300">
        {character.base64 ? 'Change Image' : 'Upload Image'}
      </label>
      <input
        id={`char-upload-${character.id}`}
        type="file"
        className="sr-only"
        accept="image/*"
        onChange={handleFileChange}
      />
      <textarea
        rows={4}
        className="w-full bg-gray-900 text-xs text-gray-300 p-2 rounded-md mt-1 border border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition"
        placeholder="Or write character definition here..."
        value={character.definition || ''}
        onChange={handleDefinitionChange}
        aria-label={`Definition for ${displayName}`}
      />
       {character.definition === 'Analysis failed.' && (
          <p className="text-xs text-red-300 text-center">Analysis failed. Please try a clearer image or write a definition manually.</p>
       )}
    </div>
  );
};


const CharacterUploader: React.FC<CharacterUploaderProps> = ({ characters, onUpload, onSetDefinition, onAnalyze, isAnalyzing, analyzeCount, onInject, injectableCount = 0 }) => {
  const canAnalyze = analyzeCount > 0 && !isAnalyzing;
  const canInject = injectableCount > 0 && !isAnalyzing;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-6">
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2 text-center uppercase tracking-wider">Reference Characters</h3>
        <p className="text-xs text-gray-500 text-center mb-4">Upload images for AI analysis or write definitions manually. Then use tags (e.g., [C1]) in your prompt.</p>
        <div className="flex justify-center items-start flex-wrap gap-y-4 gap-x-8">
          {characters.map(char => (
            <CharacterCard key={char.id} character={char} onUpload={onUpload} onSetDefinition={onSetDefinition} />
          ))}
        </div>
        <div className="flex justify-center items-center mt-4 space-x-4">
          <button
            onClick={onAnalyze}
            disabled={!canAnalyze}
            className="bg-green-600 text-white font-semibold px-6 py-2 rounded-md transition-colors hover:bg-green-500 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Analyzing...</span>
              </>
            ) : (
              <span>Analyze Images ({analyzeCount})</span>
            )}
          </button>
          {onInject && (
              <button
                onClick={onInject}
                disabled={!canInject}
                className="bg-blue-600 text-white font-semibold px-6 py-2 rounded-md transition-colors hover:bg-blue-500 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Inject Definitions ({injectableCount})
              </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterUploader;