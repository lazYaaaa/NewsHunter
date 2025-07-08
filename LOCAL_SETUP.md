# Локальная установка NewsFlow

Инструкция для запуска NewsFlow на вашем компьютере без Replit.

## Быстрая установка

### 1. Клонируйте проект или скачайте архив
```bash
cd newsflow
```

### 2. Установите зависимости
```bash
npm install
```

### 3. Настройте переменные окружения
Создайте файл `.env` в корне проекта:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/newsflow?sslmode=disable
SESSION_SECRET=your-super-secret-key-here
NODE_ENV=development
```

### 4. Настройте базу данных PostgreSQL

#### Установка PostgreSQL:
- **Windows**: Скачайте с postgresql.org
- **macOS**: `brew install postgresql`
- **Linux**: `sudo apt install postgresql`

#### Создайте базу данных:
```bash
psql -U postgres
CREATE DATABASE newsflow;
\q
```

### 5. Примените схему базы данных
```bash
npm run db:push
```

### 6. Запустите проект
```bash
npm run dev
```

Откройте http://localhost:5173 в браузере.

## Авторизация

Используется только локальная авторизация (логин/пароль). 

## Альтернатива: База данных в памяти

Если не хотите настраивать PostgreSQL, можете использовать упрощенную версию с хранением в памяти:

1. Откройте `server/storage.ts`
2. Измените последнюю строку:
   ```typescript
   // Замените эту строку:
   export const storage = new DatabaseStorage();
   // На эту:
   export const storage = new MemStorage();
   ```
3. Закомментируйте в `.env`:
   ```env
   # DATABASE_URL=postgresql://...
   ```
**Внимание**: При перезапуске все данные будут потеряны!

## Устранение проблем

### Ошибка подключения к базе данных
1. Убедитесь, что PostgreSQL запущен
2. Проверьте правильность `DATABASE_URL` в `.env`
3. Проверьте, что база данных создана

### Порт уже занят
Если порт 5173 занят, измените его в `vite.config.ts` или используйте переменную окружения VITE_PORT.

## Переход на продакшн

Для развертывания на сервере:

1. Установите переменные окружения:
   ```env
   NODE_ENV=production
   DATABASE_URL=your_production_database_url
   SESSION_SECRET=strong-random-secret
   ```
2. Соберите проект:
   ```bash
   npm run build
   ```
3. Запустите:
   ```bash
   npm start
   ```

## Рекомендации

- **Для разработки**: Используйте локальную установку
- **Для продакшна**: Развертывание на любом сервере с Node.js и PostgreSQL
- **Для тестирования**: Версия с MemStorage самая простая

Готово! Теперь вы можете разрабатывать и тестировать NewsFlow локально.