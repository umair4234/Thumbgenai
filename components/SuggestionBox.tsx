import React from 'react';

interface SuggestionBoxProps {
  suggestions: string[];
  isLoading: boolean;
  onSelectSuggestion: (suggestion: string) => void;
  selectedSuggestion?: string | null;
}

const SuggestionBox: React.FC<SuggestionBoxProps> = ({ suggestions, isLoading, onSelectSuggestion, selectedSuggestion }) => {
  if (suggestions.length === 0 && !isLoading) {
    return null; // Don't render anything if there are no suggestions and it's not loading
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {suggestions.map((suggestion, index) => {
          const isSelected = suggestion === selectedSuggestion;
          return (
            <button
              key={index}
              onClick={() => onSelectSuggestion(suggestion)}
              className={`text-left p-3 rounded-lg transition-all text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isSelected 
                  ? 'bg-blue-600 ring-2 ring-blue-500 shadow-lg' 
                  : 'bg-gray-800/70 hover:bg-gray-700'
              }`}
              aria-pressed={isSelected}
              aria-label={`Use suggestion: ${suggestion}`}
            >
              {suggestion}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestionBox;