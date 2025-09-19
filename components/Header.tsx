import React from 'react';

interface HeaderProps {
  onMenuToggle: () => void;
  onNewThumbnail: () => void;
  showNewButton: boolean;
  onApiKeyManagerToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, onNewThumbnail, showNewButton, onApiKeyManagerToggle }) => {
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
            <button
              onClick={onApiKeyManagerToggle}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Open API Key Manager"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
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
