import React from 'react';

interface EditControlsProps {
  prompt: string;
  setPrompt: (prompt:string) => void;
  regionPrompts: { id: number; prompt: string }[];
  onRegionPromptChange: (id: number, newPrompt: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isMasking: boolean;
}

const EditControls: React.FC<EditControlsProps> = ({
  prompt,
  setPrompt,
  regionPrompts,
  onRegionPromptChange,
  onSubmit,
  isLoading,
  isMasking,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      onSubmit();
    }
  };

  const hasAnyRegionPrompt = regionPrompts.some(p => p.prompt.trim() !== '');
  const canSubmit = isMasking ? hasAnyRegionPrompt : prompt.trim() !== '';

  const placeholderText = "e.g., Replace the person on the right with [C1]";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto px-4 mt-4">
      <div className="flex items-start space-x-2 bg-gray-800 rounded-2xl p-2 shadow-lg">
        <button
          type="submit"
          disabled={isLoading || !canSubmit}
          className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-800 hover:bg-gray-200 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Submit edit"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          )}
        </button>

        <div className="w-full">
          {isMasking && regionPrompts.length > 0 ? (
            <div className="space-y-2 py-1">
              {regionPrompts.map(({ id, prompt: regionPrompt }) => (
                <div key={id} className="flex items-center space-x-2">
                  <label
                    htmlFor={`region-prompt-${id}`}
                    className="text-sm font-bold text-white bg-gray-700 w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0"
                  >
                    {id}
                  </label>
                  <input
                    id={`region-prompt-${id}`}
                    type="text"
                    value={regionPrompt}
                    onChange={(e) => onRegionPromptChange(id, e.target.value)}
                    placeholder={`Describe edit for region ${id}...`}
                    disabled={isLoading}
                    className="w-full bg-transparent text-white placeholder-gray-400 border-none focus:ring-0 text-base"
                  />
                </div>
              ))}
            </div>
          ) : (
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={isMasking ? "Draw on the image to create editable regions." : placeholderText}
              disabled={isLoading || (isMasking && regionPrompts.length === 0)}
              className="w-full bg-transparent text-white placeholder-gray-400 border-none focus:ring-0 text-base p-2 resize-none"
            />
          )}
        </div>
      </div>
    </form>
  );
};

export default EditControls;