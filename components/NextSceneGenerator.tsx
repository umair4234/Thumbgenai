import React, { useState } from 'react';

interface NextSceneGeneratorProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  onCancel: () => void;
}

const NextSceneGenerator: React.FC<NextSceneGeneratorProps> = ({ onSubmit, isLoading, onCancel }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-6">
      <form onSubmit={handleSubmit} className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-2 text-center">Generate Next Scene</h3>
        <p className="text-xs text-gray-400 text-center mb-4">Describe the next scene. The AI will use the existing characters and try to keep the background consistent.</p>
        
        <textarea
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., The HOA is being arrested, and the homeowner is laughing victoriously."
          disabled={isLoading}
          className="w-full bg-gray-900 text-white placeholder-gray-400 border border-gray-600 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-3 resize-none transition"
        />

        <div className="flex justify-center items-center space-x-4 mt-4">
          <button 
                type="button"
                onClick={onCancel} 
                className="text-gray-400 hover:text-white text-sm font-semibold transition-colors px-6 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
                disabled={isLoading}
            >
                Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="bg-blue-600 text-white font-semibold px-8 py-2 rounded-md transition-colors hover:bg-blue-500 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                <span>Generate Scene</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NextSceneGenerator;