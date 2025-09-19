import React from 'react';

interface GeneratorProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  onSuggest: () => void;
  isSuggesting: boolean;
  hasPrompt: boolean;
}

const Generator: React.FC<GeneratorProps> = ({ prompt, setPrompt, onSubmit, isLoading, onSuggest, isSuggesting, hasPrompt }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit();
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center p-8 bg-gray-800/50 rounded-lg">
        <h3 className="text-xl font-semibold text-white mb-4">Generate Thumbnail from a Prompt</h3>
        <form onSubmit={handleSubmit} className="w-full max-w-xl">
          <div className="flex items-start space-x-2 bg-gray-800 rounded-2xl p-2 shadow-lg">
            <textarea
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A defeated HOA woman (image 1) looks down in shame while a triumphant homeowner (image 2) holds up a violation document..."
              disabled={isLoading}
              className="w-full bg-transparent text-white placeholder-gray-400 border-none focus:ring-0 text-base p-2 resize-none"
            />
          </div>
          <div className="flex justify-center items-center space-x-4 mt-4">
              <button
                type="button"
                onClick={onSuggest}
                disabled={isLoading || isSuggesting || !hasPrompt}
                className="bg-purple-600 text-white font-semibold px-6 py-2 rounded-md transition-colors hover:bg-purple-500 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                aria-label="Suggest text overlays"
              >
                 {isSuggesting ? (
                    <>
                     <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                     <span>Suggesting...</span>
                    </>
                 ) : (
                    <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM5.5 8.5a.5.5 0 01.5-.5h2.5a.5.5 0 01.5.5v3.5a.5.5 0 01-.5.5h-2.5a.5.5 0 01-.5-.5v-3.5zm6.5 0a.5.5 0 01.5-.5h2.5a.5.5 0 01.5.5v3.5a.5.5 0 01-.5.5h-2.5a.5.5 0 01-.5-.5v-3.5z" clipRule="evenodd" />
                        </svg>
                    <span>Suggest Text</span>
                    </>
                 )}
              </button>
             <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="bg-blue-600 text-white font-semibold px-8 py-2 rounded-md transition-colors hover:bg-blue-500 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              aria-label="Generate image"
            >
              {isLoading ? (
                <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Generating...</span>
                </>
              ) : (
                <>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 3a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-3.5v3.5a.75.75 0 01-1.5 0v-3.5h-3.5a.75.75 0 010-1.5h3.5v-3.5A.75.75 0 0110 3zM6.5 15.5a1 1 0 100-2 1 1 0 000 2zM15 8a1 1 0 11-2 0 1 1 0 012 0zM5 8a1 1 0 11-2 0 1 1 0 012 0zM13.5 15.5a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                 <span>Generate Image</span>
                </>
              )}
            </button>
          </div>
        </form>
    </div>
  );
};

export default Generator;
