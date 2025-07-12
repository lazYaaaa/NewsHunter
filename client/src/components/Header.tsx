import React, { useContext, useEffect } from 'react';
import { Link } from 'wouter';
import { useTheme } from '../context/context.tsx';
import { UserContext } from '../context/UserContext.tsx';

// Компонент NewsHunter (логотип + название)
const NewsHunter: React.FC = () => {
  return (
    <Link
      to="/"
      className="flex items-center space-x-3 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
    >
      {/* Логотип */}
      <img src="/vite.svg" alt="Логотип" className="h-8 w-8" />
      {/* Название */}
      <span className="text-xl font-semibold text-gray-800 hover:text-gray-900 transition-colors">
        NewsFlow
      </span>
    </Link>
  );
};

export const Header: React.FC = () => {
  const { darkMode, toggleDarkMode } = useTheme();

  const { user, isAuthenticated, setUser, setAuthenticated } = useContext(UserContext)!;

  useEffect(() => {
    // Проверка аутентификации при загрузке
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('Fetched user data:', userData);
          setUser(userData);
          setAuthenticated(true);
        } else {
          console.log('Auth API response not ok, status:', response.status);
          setUser(null);
          setAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
        setAuthenticated(false);
      }
    };

    if (!isAuthenticated) {
      checkAuth();
    }
  }, [isAuthenticated, setUser, setAuthenticated]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setUser(null);
        setAuthenticated(false);
        console.log('Logout successful, state updated');
      } else {
        console.log('Logout response not ok, status:', response.status);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-blue-700 dark:bg-gray-900 text-white py-4 mb-6 shadow-lg transition-colors duration-300">
      <div className="container mx-auto px-4 flex justify-between items-center">
        {/* Логотип и название - клик по главной */}
        <NewsHunter />

        {/* Панель управления */}
        <div className="flex items-center gap-4">
          {/* Переключение темы */}
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

          {/* Профиль / вход */}
          {isAuthenticated && user ? (
            <>
              {/* Аватар и имя */}
              <div className="flex items-center space-x-2">
                {user.image && (
                  <img
                    src={user.image}
                    alt="Аватар"
                    className="w-8 h-8 rounded-full object-cover border-2 border-gray-300"
                  />
                )}
                <Link
                  to="/profile"
                  className="bg-blue-400 hover:bg-blue-300 text-white font-bold py-2 px-3 rounded shadow transition-all duration-200 flex items-center"
                >
                  {user.firstName || 'Профиль'}
                </Link>
              </div>
              {/* Выйти */}
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded shadow transition-all duration-200"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              {/* Вход и регистрация */}
              <Link
                to="/login"
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded shadow transition-all duration-200"
              >
                Войти
              </Link>
              <Link
                to="/register"
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded shadow transition-all duration-200"
              >
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};