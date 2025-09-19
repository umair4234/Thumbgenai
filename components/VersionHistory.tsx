import React from 'react';
import { ImageVersion, ImageSet } from '../types';

interface VersionHistoryProps {
  imageSets: ImageSet[];
  activeVersionId: string | null;
  onSelectVersion: (setId: string, versionId: string) => void;
  onDeleteVersion: (setId: string, versionId: string) => void;
  onDeleteSet: (setId: string) => void;
  onDownloadVersion: (version: ImageVersion) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({
  imageSets,
  activeVersionId,
  onSelectVersion,
  onDeleteSet,
  onDeleteVersion,
  onDownloadVersion
}) => {
  if (imageSets.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-6 pb-4">
      <h2 className="text-sm font-semibold text-gray-400 px-4 mb-3 uppercase tracking-wider">Version History</h2>
      <div className="space-y-6">
        {imageSets.map(set => (
          <div key={set.id} className="bg-gray-800/50 rounded-lg p-4 mx-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-white">{set.name}</h3>
              <button
                onClick={() => onDeleteSet(set.id)}
                className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 rounded-md hover:bg-red-900/50 transition-colors"
                aria-label={`Delete all versions for ${set.name}`}
              >
                Delete All
              </button>
            </div>
            <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
              {set.versions.map((version, index) => (
                <div
                  key={version.id}
                  className="flex-shrink-0 cursor-pointer group relative"
                >
                  <img
                    src={version.base64}
                    alt={`${set.name} - Version ${index + 1}`}
                    onClick={() => onSelectVersion(set.id, version.id)}
                    className={`w-40 h-auto object-cover rounded-md aspect-[16/9] border-2 transition-all duration-200 ${
                      activeVersionId === version.id ? 'border-blue-500 scale-105' : 'border-transparent group-hover:border-gray-600'
                    }`}
                  />
                  <p className={`text-center text-xs mt-1 ${activeVersionId === version.id ? 'text-white' : 'text-gray-400'}`}>
                    V{index + 1}
                  </p>
                   <div className="absolute top-1 right-1 flex space-x-1 opacity-50 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDownloadVersion(version); }}
                      className="p-1.5 bg-gray-900/70 rounded-full text-white hover:bg-gray-700"
                      aria-label="Download version in high resolution"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button
                       onClick={(e) => { e.stopPropagation(); onDeleteVersion(set.id, version.id); }}
                       className="p-1.5 bg-red-800/80 rounded-full text-white hover:bg-red-700"
                       aria-label="Delete version"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VersionHistory;
