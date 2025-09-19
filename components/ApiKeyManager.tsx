import React, { useState } from 'react';

interface ApiKeyManagerProps {
  isOpen: boolean;
  onClose: () => void;
  keys: string[];
  onAddKey: (key: string) => void;
  onDeleteKey: (key: string) => void;
}

const maskKey = (key: string) => {
  if (key.length < 10) return '***';
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
};

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ isOpen, onClose, keys, onAddKey, onDeleteKey }) => {
  const [newKey, setNewKey] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleAddClick = () => {
    if (newKey.trim()) {
      onAddKey(newKey.trim());
      setNewKey('');
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-manager-title"
    >
      <div 
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="api-key-manager-title" className="text-2xl font-bold text-white mb-2">API Key Manager</h2>
        <p className="text-sm text-gray-400 mb-6">
          Add one or more Gemini API keys. The app will automatically rotate between them if one reaches its rate limit.
        </p>

        <div className="flex space-x-2 mb-6">
          <input
            type="password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Enter new Gemini API key"
            className="flex-grow bg-gray-900 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="New Gemini API key"
          />
          <button
            onClick={handleAddClick}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-md transition-colors text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
            disabled={!newKey.trim()}
          >
            Add Key
          </button>
        </div>
        
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {keys.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">No API keys added yet.</p>
            ) : (
                keys.map((key) => (
                    <div key={key} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
                        <span className="font-mono text-sm text-gray-300">{maskKey(key)}</span>
                        <button
                            onClick={() => onDeleteKey(key)}
                            className="text-red-400 hover:text-red-300 font-semibold text-xs px-2 py-1 rounded hover:bg-red-900/50 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                ))
            )}
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-500 text-white font-semibold px-4 py-2 rounded-md transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyManager;
