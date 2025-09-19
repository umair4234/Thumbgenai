import React from 'react';

interface HeaderProps {
  onMenuToggle: () => void;
  onNewThumbnail: () => void;
  showNewButton: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, onNewThumbnail, showNewButton }) => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm p-4 text-white fixed top-0 left-0 right-0 z-20">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
           <h1 className="text-xl font-bold tracking-tight">Thumbnail AI Editor</h1>
           {showNewButton && (
             <button
               onClick={onNewThumbnail}
               className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1 text-sm rounded-md transition-colors"
             >
               + New Thumbnail
             </button>
           )}
        </div>
        <div className="flex items-center space-x-2">
            {/* FIX: Removed API Key Manager button to align with API key handling guidelines. */}
            <button
              onClick={onMenuToggle}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Open menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01"
                />
              </svg>
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
