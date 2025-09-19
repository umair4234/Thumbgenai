import React, { useState, useCallback, useRef, useEffect } from 'react';
import Header from './components/Header';
import InitialView from './components/InitialView';
import EditControls from './components/EditControls';
import CharacterUploader from './components/CharacterUploader';
import VersionHistory from './components/VersionHistory';
import SuggestionBox from './components/SuggestionBox';
import Spinner from './components/Spinner';
import NextSceneGenerator from './components/NextSceneGenerator';
import ApiKeyManager from './components/ApiKeyManager';
import MaskingCanvas from './components/MaskingCanvas';
import MaskingToolbar from './components/MaskingToolbar';
import { ImageVersion, Character, ImageSet } from './types';
import { editImageWithPrompt, generateImageWithPrompt, generateCharacterDefinition, generateTextOverlaySuggestions } from './services/geminiService';
import * as apiKeyManager from './services/apiKeyManager';

const initialCharactersState: Character[] = [
  { id: 'char1', name: 'Character 1', roleName: undefined, base64: null, mimeType: null, definition: null, isLoading: false, isAnalyzed: false },
  { id: 'char2', name: 'Character 2', roleName: undefined, base64: null, mimeType: null, definition: null, isLoading: false, isAnalyzed: false },
];

const App: React.FC = () => {
  const [imageSets, setImageSets] = useState<ImageSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [textSuggestions, setTextSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Brewing AI magic...');
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [characters, setCharacters] = useState<Character[]>(initialCharactersState);
  const [showNewVersionGenerator, setShowNewVersionGenerator] = useState(false);
  const [isApiKeyManagerOpen, setIsApiKeyManagerOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  
  // Masking state
  const [isMasking, setIsMasking] = useState(false);
  const [maskData, setMaskData] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(40);
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [clearTrigger, setClearTrigger] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load keys from localStorage on initial load
    setApiKeys(apiKeyManager.getKeys());

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAddApiKey = (key: string) => {
    apiKeyManager.addKey(key);
    setApiKeys(apiKeyManager.getKeys());
  };

  const handleDeleteApiKey = (key: string) => {
    apiKeyManager.deleteKey(key);
    setApiKeys(apiKeyManager.getKeys());
  };

  const handleGenerateSuggestions = useCallback(async (image: ImageVersion | null) => {
    if (!image) {
      setTextSuggestions([]);
      return;
    }
    setIsSuggesting(true);
    setTextSuggestions([]); // Clear old suggestions immediately
    setError(null);
    try {
      const suggestions = await generateTextOverlaySuggestions({
        base64: image.base64,
        mimeType: image.mimeType,
      });
      setTextSuggestions(suggestions);
    } catch (e: any) {
      // Non-blocking error for suggestions
      console.error("Failed to get suggestions:", e.message);
      setTextSuggestions([]);
    } finally {
      setIsSuggesting(false);
    }
  }, []);
  
  const handleImageUpload = useCallback(async (base64: string, mimeType: string) => {
    const newVersion: ImageVersion = { id: crypto.randomUUID(), base64, mimeType };
    const newSet: ImageSet = {
      id: crypto.randomUUID(),
      name: `Image ${imageSets.length + 1}`,
      versions: [newVersion]
    };
    setImageSets(prev => [...prev, newSet]);
    setActiveSetId(newSet.id);
    setActiveVersionId(newVersion.id);
    setError(null);
    await handleGenerateSuggestions(newVersion);
  }, [imageSets.length, handleGenerateSuggestions]);

  const handleImageGenerate = async (generationPrompt: string) => {
    if (!generationPrompt.trim()) return;

    setIsLoading(true);
    setLoadingMessage('Generating your thumbnail...');
    setError(null);
    try {
      const { newBase64, newMimeType } = await generateImageWithPrompt(generationPrompt);
      const newVersion: ImageVersion = { id: crypto.randomUUID(), base64: newBase64, mimeType: newMimeType };
      const newSet: ImageSet = {
        id: crypto.randomUUID(),
        name: `Image ${imageSets.length + 1}`,
        versions: [newVersion]
      };
      setImageSets(prev => [...prev, newSet]);
      setActiveSetId(newSet.id);
      setActiveVersionId(newVersion.id);
      await handleGenerateSuggestions(newVersion);
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCharacterUpload = useCallback(async (id: Character['id'], base64: string, mimeType: string) => {
    setCharacters(prev => 
      prev.map(char => 
        char.id === id ? { ...char, base64, mimeType, definition: null, isLoading: false, isAnalyzed: false } : char
      )
    );
    setError(null);
  }, []);

   const handleSetCharacterDefinition = (id: Character['id'], definition: string) => {
    setCharacters(prev => 
      prev.map(char => 
        char.id === id ? { ...char, definition, isAnalyzed: !!definition.trim() } : char
      )
    );
  };

  const handleAnalyzeCharacters = async () => {
    const toAnalyze = characters.filter(c => c.base64 && !c.isAnalyzed);
    if (toAnalyze.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    setCharacters(prev => prev.map(c => toAnalyze.find(ta => ta.id === c.id) ? { ...c, isLoading: true } : c));

    const analyses = toAnalyze.map(async (char) => {
      try {
        const definition = await generateCharacterDefinition({ base64: char.base64!, mimeType: char.mimeType! });
        setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, definition, isAnalyzed: true, isLoading: false } : c));
      } catch (e: any) {
        setError(e.message || 'An unknown error occurred.');
        setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, definition: 'Analysis failed.', isAnalyzed: false, isLoading: false } : c));
      }
    });

    await Promise.all(analyses);
    setIsAnalyzing(false);
  };

  const handleSelectVersion = useCallback((setId: string, versionId: string) => {
    setActiveSetId(setId);
    setActiveVersionId(versionId);
    setShowNewVersionGenerator(false);
    setIsMasking(false); // Reset masking when changing version
    setMaskData(null);
    const set = imageSets.find(s => s.id === setId);
    const version = set?.versions.find(v => v.id === versionId);
    handleGenerateSuggestions(version || null);
  }, [imageSets, handleGenerateSuggestions]);

  const handleSubmitEdit = async () => {
    const activeSet = imageSets.find(s => s.id === activeSetId);
    const currentVersion = activeSet?.versions.find(v => v.id === activeVersionId);
    if (!currentVersion || !prompt.trim()) return;
    
    // Check if masking is enabled but no mask is drawn
    if (isMasking && !maskData) {
        setError("Masking is enabled, but nothing has been drawn on the mask. Please draw on the image or disable masking.");
        return;
    }


    setIsLoading(true);
    setLoadingMessage('Applying your edit...');
    setError(null);
    try {
      let finalPrompt = prompt;
      let characterImages: { base64: string; mimeType: string; }[] = [];
      const usesCharacterTags = /\[C[12]\]/.test(prompt);

      if (usesCharacterTags) {
        const relevantCharacters = characters.filter(c => 
          c.base64 && c.isAnalyzed && prompt.includes(`[C${c.id.slice(-1)}]`)
        );
        
        if (relevantCharacters.length > 0) {
            let promptParts = ["The following are character definitions for reference images provided after the main image."];
            
            relevantCharacters.forEach(char => {
                promptParts.push(`Definition for [C${char.id.slice(-1)}]: ${char.definition}`);
            });
            
            characterImages = relevantCharacters.map(char => ({ base64: char.base64!, mimeType: char.mimeType! }));

            promptParts.push(`\nUser request: "${prompt}"`);
            promptParts.push(`\nInstruction: Fulfill the user's request on the primary image. Use the provided character definitions and their corresponding images to replace people when tags like [C1] are mentioned. IMPORTANT: Only change the face and hair to match the reference character. Keep the original pose, clothing, expression, and lighting of the person in the primary image.`);
            finalPrompt = promptParts.join('\n');
        }
      }
      
      const isTextOverlayPrompt = /add text overlay|add the text/i.test(prompt);
      if (isTextOverlayPrompt) {
        finalPrompt += "\n\nIMPORTANT INSTRUCTION: When adding the text as requested, you MUST ensure it does not cover or obscure the faces or bodies of any people in the image. If necessary, intelligently adjust the image composition, for example by slightly shifting or scaling the subjects or extending the background, to create a clean, non-obtrusive space for the text. The overall scene, characters' expressions, and poses must be preserved.";
      }

      const { newBase64, newMimeType } = await editImageWithPrompt(
        { base64: currentVersion.base64, mimeType: currentVersion.mimeType },
        finalPrompt,
        characterImages,
        isMasking && maskData ? { base64: maskData, mimeType: 'image/png' } : null
      );

      const newVersion: ImageVersion = { id: crypto.randomUUID(), base64: newBase64, mimeType: newMimeType };
      
      const newImageSets = imageSets.map(set => {
        if (set.id === activeSetId) {
          return { ...set, versions: [...set.versions, newVersion] };
        }
        return set;
      });

      setImageSets(newImageSets);
      setActiveVersionId(newVersion.id);
      setPrompt('');
      setIsMasking(false); // Turn off masking after successful edit
      setMaskData(null);
      await handleGenerateSuggestions(newVersion);
    } catch (e: any)
    {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateNextScene = async (newScenePrompt: string) => {
    if (!newScenePrompt.trim() || !activeSetId) return;

    setIsLoading(true);
    setLoadingMessage('Generating next scene...');
    setError(null);

    let updatedSets = [...imageSets];
    const currentActiveSetId = activeSetId;
    
    const activeSetIndex = updatedSets.findIndex(s => s.id === currentActiveSetId);
    if (activeSetIndex !== -1 && !updatedSets[activeSetIndex].name.startsWith('Scene')) {
        updatedSets[activeSetIndex] = { ...updatedSets[activeSetIndex], name: 'Scene 1' };
    }
    
    const sceneCount = updatedSets.filter(s => s.name.startsWith('Scene')).length;
    const newSceneName = `Scene ${sceneCount + 1}`;

    try {
        let finalPrompt = newScenePrompt;
        const analyzedCharacters = characters.filter(c => c.isAnalyzed && c.definition && c.definition !== 'Analysis failed.');
        
        if (analyzedCharacters.length > 0) {
            const definitions = analyzedCharacters.map(char => {
                const characterIdentifier = char.roleName || char.name;
                return `The character '${characterIdentifier}' is defined as: [${char.definition}].`;
            }).join(' ');
            finalPrompt = `${definitions} The setting and background should be consistent with the previous scene unless otherwise specified. \n\nUser request: "${newScenePrompt}"`;
        }
        
        const { newBase64, newMimeType } = await generateImageWithPrompt(finalPrompt);
        
        const newVersion: ImageVersion = { id: crypto.randomUUID(), base64: newBase64, mimeType: newMimeType };
        const newSet: ImageSet = {
          id: crypto.randomUUID(),
          name: newSceneName,
          versions: [newVersion]
        };

        updatedSets.push(newSet);

        setImageSets(updatedSets);
        setActiveSetId(newSet.id);
        setActiveVersionId(newVersion.id);
        setShowNewVersionGenerator(false);
        await handleGenerateSuggestions(newVersion);

    } catch (e: any) {
        setError(e.message || 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  };


  const handleDeleteVersion = (setId: string, versionId: string) => {
    setImageSets(prevSets => {
      const newSets = prevSets.map(set => {
        if (set.id === setId) {
          const newVersions = set.versions.filter(v => v.id !== versionId);
          if (newVersions.length === 0) {
            return null; // This set will be filtered out
          }
          return { ...set, versions: newVersions };
        }
        return set;
      }).filter(Boolean) as ImageSet[];

      if (activeVersionId === versionId) {
        const currentSet = newSets.find(s => s.id === setId);
        if (currentSet && currentSet.versions.length > 0) {
          setActiveVersionId(currentSet.versions[currentSet.versions.length - 1].id);
        } else {
          setActiveSetId(null);
          setActiveVersionId(null);
          setTextSuggestions([]);
        }
      }
      return newSets;
    });
  };

  const handleDeleteSet = (setId: string) => {
    setImageSets(prevSets => prevSets.filter(s => s.id !== setId));
    if (activeSetId === setId) {
      setActiveSetId(null);
      setActiveVersionId(null);
      setTextSuggestions([]);
    }
  };
  
  const handleDownloadVersion = (version: ImageVersion) => {
    const link = document.createElement('a');
    link.href = version.base64;
    link.download = `thumbnail_version_${version.id.substring(0, 6)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleNewThumbnail = () => {
    setActiveSetId(null);
    setActiveVersionId(null);
    setPrompt('');
    setError(null);
    setTextSuggestions([]);
    setCharacters(initialCharactersState);
    setShowNewVersionGenerator(false);
    setIsMasking(false);
    setMaskData(null);
  };

  const activeSet = imageSets.find(s => s.id === activeSetId);
  const activeImage = activeSet?.versions.find(v => v.id === activeVersionId);
  const toAnalyzeCount = characters.filter(c => c.base64 && !c.isAnalyzed).length;

  return (
    <div className="min-h-screen text-white flex flex-col">
      <Header 
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} 
        onNewThumbnail={handleNewThumbnail}
        showNewButton={!!activeImage}
        onApiKeyManagerToggle={() => setIsApiKeyManagerOpen(true)}
      />
      <main className="flex-grow pt-20 flex">
        <div className="flex-1 flex flex-col items-center px-4 overflow-y-auto pb-8">
          {error && (
            <div className="w-full max-w-4xl mx-auto bg-red-800/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-4" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
              <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3" aria-label="Close error message">
                <svg className="fill-current h-6 w-6 text-red-200" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
              </button>
            </div>
          )}

          {!activeImage ? (
            <div className="w-full max-w-4xl mx-auto mt-8">
              <InitialView 
                onImageUpload={handleImageUpload} 
                onImageGenerate={handleImageGenerate}
                isLoading={isLoading}
                characters={characters}
                onCharacterUpload={handleCharacterUpload}
                onAnalyzeCharacters={handleAnalyzeCharacters}
                onSetCharacterDefinition={handleSetCharacterDefinition}
                isAnalyzing={isAnalyzing}
                analyzeCount={toAnalyzeCount}
                setError={setError}
              />
            </div>
          ) : (
            <>
              <div className="w-full max-w-4xl mx-auto relative mb-4 aspect-[16/9] bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
                {isLoading && <Spinner message={loadingMessage} />}
                <img src={activeImage.base64} alt="Current thumbnail" className="w-full h-full object-contain" />
                <MaskingCanvas
                  imageSrc={activeImage.base64}
                  isEnabled={isMasking}
                  brushSize={brushSize}
                  onMaskChange={setMaskData}
                  undoTrigger={undoTrigger}
                  clearTrigger={clearTrigger}
                />
              </div>
              
              <div className="w-full max-w-4xl mx-auto mt-2 mb-4">
                  <button
                      onClick={() => handleDownloadVersion(activeImage)}
                      className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download Full Resolution</span>
                  </button>
              </div>

              <MaskingToolbar
                isMasking={isMasking}
                onToggleMasking={() => setIsMasking(prev => !prev)}
                brushSize={brushSize}
                onBrushSizeChange={setBrushSize}
                onUndo={() => setUndoTrigger(c => c + 1)}
                onClear={() => {
                  setClearTrigger(c => c + 1);
                  setMaskData(null);
                }}
                hasMask={!!maskData}
              />

              <EditControls 
                prompt={prompt}
                setPrompt={setPrompt}
                onSubmit={handleSubmitEdit}
                isLoading={isLoading}
                isMasking={isMasking}
              />

              <SuggestionBox
                suggestions={textSuggestions}
                isLoading={isSuggesting}
                onSelectSuggestion={setPrompt}
              />

              {!showNewVersionGenerator ? (
                <div className="w-full max-w-4xl mx-auto px-4 mt-6">
                  <button
                    onClick={() => setShowNewVersionGenerator(true)}
                    className="w-full border-2 border-dashed border-gray-600 hover:border-blue-500 hover:text-blue-400 text-gray-400 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    <span>Generate Next Scene</span>
                  </button>
                </div>
              ) : (
                <NextSceneGenerator
                  onSubmit={handleGenerateNextScene}
                  isLoading={isLoading}
                  onCancel={() => setShowNewVersionGenerator(false)}
                />
              )}
              
              <CharacterUploader 
                 characters={characters}
                 onUpload={handleCharacterUpload}
                 onSetDefinition={handleSetCharacterDefinition}
                 onAnalyze={handleAnalyzeCharacters}
                 isAnalyzing={isAnalyzing}
                 analyzeCount={toAnalyzeCount}
              />

              <VersionHistory 
                imageSets={imageSets}
                activeVersionId={activeVersionId}
                onSelectVersion={handleSelectVersion}
                onDeleteVersion={handleDeleteVersion}
                onDeleteSet={handleDeleteSet}
                onDownloadVersion={handleDownloadVersion}
              />
            </>
          )}
        </div>
        
        <div 
          ref={menuRef}
          className={`fixed top-0 right-0 h-full bg-gray-900/95 backdrop-blur-md shadow-2xl transition-transform duration-300 ease-in-out z-30 w-full max-w-md ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-title"
        >
          <div className="p-6">
             <div className="flex justify-between items-center mb-6">
                <h2 id="menu-title" className="text-2xl font-bold text-white">Menu</h2>
                <button 
                  onClick={() => setIsMenuOpen(false)} 
                  className="p-2 rounded-full hover:bg-gray-700"
                  aria-label="Close menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="prose prose-invert">
                <p>Welcome to the Thumbnail AI Editor!</p>
                <p>
                    This tool uses Google's Gemini models to help you generate and edit stunning YouTube thumbnails.
                </p>
                <h3 className="text-xl font-semibold mt-6">How to Use:</h3>
                <ol>
                    <li>Start by generating a new image with a text prompt or uploading your own.</li>
                    <li>Use the prompt box to describe changes you want. You can change backgrounds, add objects, or modify styles.</li>
                     <li>For precise edits, enable <strong>Masking Mode</strong> to paint over the exact area you want to change.</li>
                    <li>(Optional) Define reference characters by uploading an image for AI analysis or writing a definition yourself. Then use tags like <code>[C1]</code> in your prompt to replace people in your thumbnail while keeping their pose.</li>
                    <li>Each edit creates a new version, allowing you to track your creative process and compare different ideas.</li>
                </ol>
            </div>
          </div>
        </div>
      </main>
      <ApiKeyManager
        isOpen={isApiKeyManagerOpen}
        onClose={() => setIsApiKeyManagerOpen(false)}
        keys={apiKeys}
        onAddKey={handleAddApiKey}
        onDeleteKey={handleDeleteApiKey}
      />
    </div>
  );
};

export default App;
