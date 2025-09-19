import React, { useState, useEffect, useCallback } from 'react';
import ImageUploader from './ImageUploader';
import Generator from './Generator';
import CharacterUploader from './CharacterUploader';
import SuggestionBox from './SuggestionBox';
import { Character } from '../types';
import { generateInitialTextSuggestions } from '../services/geminiService';

interface Placeholder {
  number: number;
  name: string;
  fullMatch: string;
}

interface InitialViewProps {
  onImageUpload: (base64: string, mimeType: string) => void;
  onImageGenerate: (prompt: string) => void;
  isLoading: boolean;
  characters: Character[];
  onCharacterUpload: (id: Character['id'], base64: string, mimeType: string) => void;
  onAnalyzeCharacters: () => void;
  onSetCharacterDefinition: (id: Character['id'], definition: string) => void;
  isAnalyzing: boolean;
  analyzeCount: number;
  setError: (error: string | null) => void;
}

const InitialView: React.FC<InitialViewProps> = ({ 
    onImageUpload, 
    onImageGenerate, 
    isLoading,
    characters,
    onCharacterUpload,
    onAnalyzeCharacters,
    onSetCharacterDefinition,
    isAnalyzing,
    analyzeCount,
    setError
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'upload'>('generate');
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [detectedPlaceholders, setDetectedPlaceholders] = useState<Placeholder[]>([]);
  
  const [textSuggestions, setTextSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  useEffect(() => {
    // Regex to find patterns like "HOA woman (image 1)" or just "(image 2)"
    const regex = /(?:([\w\s]+?)\s*)?\(image (\d+)\)/gi;
    const matches = [...generatePrompt.matchAll(regex)];
    const placeholders: Placeholder[] = matches.map(match => ({
      number: parseInt(match[2], 10),
      name: match[1]?.trim() || `Character ${match[2]}`,
      fullMatch: match[0]
    })).filter((p, i, self) => self.findIndex(s => s.number === p.number) === i); // Ensure unique by number
    
    setDetectedPlaceholders(placeholders);
  }, [generatePrompt]);

  const handleGenerateTextSuggestions = useCallback(async () => {
    if (!generatePrompt.trim() || isSuggesting) return;
    setIsSuggesting(true);
    setTextSuggestions([]);
    setError(null);
    try {
      const suggestions = await generateInitialTextSuggestions(generatePrompt);
      setTextSuggestions(suggestions);
    } catch (e: any) {
      setError(e.message || "Failed to get suggestions.");
    } finally {
      setIsSuggesting(false);
    }
  }, [generatePrompt, isSuggesting, setError]);

  const handleSelectSuggestion = (suggestion: string) => {
      setSelectedSuggestion(suggestion === selectedSuggestion ? null : suggestion);
  };

  const handleGenerateSubmit = () => {
    let finalPrompt = generatePrompt;

    if (selectedSuggestion) {
      finalPrompt += `\n\n${selectedSuggestion}`;
      finalPrompt += "\n\nIMPORTANT INSTRUCTION: When generating the image, you MUST include the requested text. Ensure the text does not cover or obscure the faces or bodies of any people. Intelligently adjust the composition, slightly shifting subjects or extending the background, to create a clean, non-obtrusive space for the text while preserving the scene's core elements, characters, and poses.";
    }
    
    onImageGenerate(finalPrompt);
  };

  const injectableCount = characters.filter((char) => {
    const charNum = parseInt(char.id.slice(-1), 10);
    const placeholder = detectedPlaceholders.find(p => p.number === charNum);
    return placeholder && char.isAnalyzed && char.definition !== 'Analysis failed.';
  }).length;
  
  const handleInjectDefinitions = () => {
      let newPrompt = generatePrompt;
      characters.forEach((char) => {
        const charNum = parseInt(char.id.slice(-1), 10);
        const placeholder = detectedPlaceholders.find(p => p.number === charNum);
        if (placeholder && char.isAnalyzed && char.definition && char.definition !== 'Analysis failed.') {
          let definition = char.definition;
          if (placeholder.name.toLowerCase().includes('hoa')) {
              definition += ' The woman MUST be wearing a prominent, stylish red outfit, like a red blazer or dress suit.';
          }
          newPrompt = newPrompt.replace(placeholder.fullMatch, `[${definition}]`);
        }
      });
      setGeneratePrompt(newPrompt);
      // Clear placeholders after injection to hide the character uploader
      setDetectedPlaceholders([]);
  };
  
  const charactersWithRoles = characters.map(char => {
      const charNum = parseInt(char.id.slice(-1), 10);
      const placeholder = detectedPlaceholders.find(p => p.number === charNum);
      // Only show up to the number of detected placeholders
      if (placeholder) {
          return { ...char, roleName: placeholder.name };
      }
      return null;
  }).filter(Boolean) as Character[];


  return (
    <div className="w-full h-full flex flex-col">
        <div className="flex justify-center border-b border-gray-700 mb-4">
            <button 
                onClick={() => setActiveTab('generate')}
                className={`px-6 py-3 text-lg font-medium transition-colors ${activeTab === 'generate' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                aria-pressed={activeTab === 'generate'}
            >
                Generate with AI
            </button>
            <button 
                onClick={() => setActiveTab('upload')}
                className={`px-6 py-3 text-lg font-medium transition-colors ${activeTab === 'upload' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                aria-pressed={activeTab === 'upload'}
            >
                Upload Image
            </button>
        </div>
        <div className="flex-grow">
            {activeTab === 'generate' && (
                <>
                <Generator 
                    prompt={generatePrompt}
                    setPrompt={setGeneratePrompt}
                    onSubmit={handleGenerateSubmit}
                    isLoading={isLoading}
                    onSuggest={handleGenerateTextSuggestions}
                    isSuggesting={isSuggesting}
                    hasPrompt={generatePrompt.trim().length > 0}
                />
                <SuggestionBox
                    suggestions={textSuggestions}
                    isLoading={isSuggesting}
                    onSelectSuggestion={handleSelectSuggestion}
                    selectedSuggestion={selectedSuggestion}
                />
                </>
            )}
            {activeTab === 'upload' && (
                <ImageUploader onImageUpload={onImageUpload} />
            )}
        </div>
        
        {activeTab === 'generate' && charactersWithRoles.length > 0 && (
            <div className="mt-8">
                <p className="text-center text-gray-400 text-sm mb-2">Character placeholder(s) detected. Upload reference images or write definitions below.</p>
                <CharacterUploader 
                    characters={charactersWithRoles}
                    onUpload={onCharacterUpload}
                    onSetDefinition={onSetCharacterDefinition}
                    onAnalyze={onAnalyzeCharacters}
                    isAnalyzing={isAnalyzing}
                    analyzeCount={analyzeCount}
                    onInject={handleInjectDefinitions}
                    injectableCount={injectableCount}
                />
            </div>
        )}
    </div>
  )
};

export default InitialView;