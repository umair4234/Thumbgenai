
import React from 'react';

interface SpinnerProps {
  message?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ message = 'Brewing AI magic...' }) => {
  return (
    <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center z-10 rounded-lg">
      <div className="w-16 h-16 border-4 border-t-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="mt-4 text-white text-lg font-semibold">{message}</p>
    </div>
  );
};

export default Spinner;
