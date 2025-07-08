import React from 'react';
import { useTheme } from '../context/context.tsx';

export const Header: React.FC = () => {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <header className="bg-blue-700 dark:bg-gray-900 text-white py-4 mb-6 shadow-lg transition-colors duration-300">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          
          <img src="/vite.svg" alt="Logo" className="h-8 w-8 object-contain" />
          <h1 className="text-2xl font-bold tracking-wide">NewsFlow</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-blue-600 dark:hover:bg-gray-700 transition-colors duration-200"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <a href="/" className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-bold py-2 px-4 rounded shadow transition-all duration-200 border-2 border-yellow-500">
            Главная
          </a>
        </div>
      </div>
    </header>
  );
};
