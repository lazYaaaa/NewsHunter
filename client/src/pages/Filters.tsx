import React, { useState, useEffect } from 'react'
import {
  PlusIcon,
  TrashIcon,
  ClipboardIcon,
  FolderIcon
} from '@heroicons/react/20/solid'

interface Category {
  id: number;
  name: string;
}

interface Source {
  id: number;
  name: string;
}

const Filters: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [sources, setSources] = useState<Source[]>([])

  const [newCategory, setNewCategory] = useState('')
  const [newSource, setNewSource] = useState('')

  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [showSourceMenu, setShowSourceMenu] = useState(false)

  // Загрузка существующих категорий и источников с API
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(console.error)
    fetch('/api/sources')
      .then(res => res.json())
      .then(data => setSources(data))
      .catch(console.error)
  }, [])

  // Добавление новой категории
  const handleAddCategory = () => {
    fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategory }),
    })
      .then(res => res.json())
      .then((newCat) => {
        setCategories(prev => [...prev, newCat])
        setNewCategory('')
        setShowCategoryMenu(false)
      })
      .catch(console.error)
  }

  const handleDeleteCategory = (id: number) => {
    fetch(`/api/categories/${id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          setCategories(prev => prev.filter(cat => cat.id !== id))
        }
      })
      .catch(console.error)
  }

  // Аналогичные функции для источников
  const handleAddSource = () => {
    fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSource }),
    })
      .then(res => res.json())
      .then((newSrc) => {
        setSources(prev => [...prev, newSrc])
        setNewSource('')
        setShowSourceMenu(false)
      })
      .catch(console.error)
  }

  const handleDeleteSource = (id: number) => {
    fetch(`/api/sources/${id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          setSources(prev => prev.filter(src => src.id !== id))
        }
      })
      .catch(console.error)
  }

  return (
    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md">
      {/* Категории */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-lg flex items-center">
            <ClipboardIcon className="w-5 h-5 mr-1" />
            Категории
          </h3>
          {/* Кнопка для открытия/закрытия меню добавления */}
          <button
            onClick={() => setShowCategoryMenu(prev => !prev)}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            aria-label="Добавить категорию"
          >
            <PlusIcon className="w-5 h-5 text-green-500" />
          </button>
        </div>
        {/* Выпадающее меню для добавления */}
        {showCategoryMenu && (
          <div className="mt-2 flex flex-col space-y-2 max-w-sm">
            <input
              type="text"
              placeholder="Новая категория"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleAddCategory}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
            >
              Добавить
            </button>
          </div>
        )}
      </div>
      {/* Отображение категорий */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center bg-blue-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
            {cat.name}
            <button
              onClick={() => handleDeleteCategory(cat.id)}
              className="ml-2 text-red-500 hover:text-red-700"
              aria-label="Удалить категорию"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Источники */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-lg flex items-center">
            <FolderIcon className="w-5 h-5 mr-1" />
            Источники
          </h3>
          {/* Кнопка для открытия/закрытия меню добавления */}
          <button
            onClick={() => setShowSourceMenu(prev => !prev)}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            aria-label="Добавить источник"
          >
            <PlusIcon className="w-5 h-5 text-green-500" />
          </button>
        </div>
        {showSourceMenu && (
          <div className="mt-2 flex flex-col space-y-2 max-w-sm">
            <input
              type="text"
              placeholder="Новый источник"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleAddSource}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
            >
              Добавить
            </button>
          </div>
        )}
      </div>
      {/* Отображение источников */}
      <div className="flex flex-wrap gap-2">
        {sources.map((src) => (
          <div key={src.id} className="flex items-center bg-green-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
            {src.name}
            <button
              onClick={() => handleDeleteSource(src.id)}
              className="ml-2 text-red-500 hover:text-red-700"
              aria-label="Удалить источник"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Filters