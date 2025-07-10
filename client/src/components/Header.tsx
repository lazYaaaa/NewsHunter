import React, { useContext, useEffect } from 'react';
import { Link } from 'wouter';
import { useTheme } from '../context/context.tsx';
import { UserContext } from '../context/UserContext.tsx';

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
          console.log('Fetched user data:', userData); // Лог данных из API
          setUser(userData);
          setAuthenticated(true);
        } else {
          console.log('Auth API response not ok, status:', response.status); // Лог статуса
          setUser(null);
          setAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
        setAuthenticated(false);
      }
    };

    // Проверяем только, если пользователь еще не аутентифицирован
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
        console.log('Logout successful, state updated'); // Лог после выхода
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
        {/* Логотип и название */}
        <div className="flex items-center space-x-3">
          <img src="/vite.svg" alt="Logo" className="h-8 w-8 object-contain" />
          <h1 className="text-2xl font-bold tracking-wide">NewsFlow</h1>
        </div>

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

          {/* Ссылка "Главная" */}
          <Link
            to="/"
            className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-bold py-2 px-4 rounded shadow transition-all duration-200 border-2 border-yellow-500"
          >
            Главная
          </Link>

          {/* Условие отображения для авторизованных */}
          {isAuthenticated && user ? (
            <>
              {/* Профиль */}
              <Link
                to="/profile"
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded shadow transition-all duration-200"
              >
                {user.firstName || 'Профиль'}
              </Link>
              {/* Выход */}
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
