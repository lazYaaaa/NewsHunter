import React from 'react';
import { ArticleList } from '../components/ArticleList.tsx';

export const Home: React.FC = () => (
  <div className="w-full min-h-screen bg-gradient-to-b from-blue-100 to-blue-300 dark:from-gray-900 dark:to-gray-800 py-8">
    <h1 className="text-4xl font-extrabold mb-10 text-center text-blue-900 dark:text-yellow-300 drop-shadow-lg tracking-wide">
      NewsFlow
    </h1>
    <div className="w-full flex-1 flex flex-col">
      <ArticleList />
    </div>
  </div>
);

export default Home;
