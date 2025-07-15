import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import cors from 'cors';
import { setupLocalAuth } from './localAuth';
import session from "express-session";

async function main() {
  const app = express();

  // 1. Middleware в правильном порядке
  app.use(cors({
    origin: true,
    credentials: true
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // 2. Инициализация аутентификации
  app.use(session({
  secret: 'your-secret-key', // Замените на свой секрет
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 неделя
    secure: false, // true если HTTPS, иначе false
    sameSite: 'lax' // или 'none' при необходимости
  }
}));
  await setupLocalAuth(app);

  // 3. Логирование запросов
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          const jsonString = JSON.stringify(capturedJsonResponse);
          if (jsonString.length < 30) {
             logLine += ` :: ${jsonString}`;
          }
        }
        log(logLine);
      }
    });

    next();
  });

  // Инициализация базы данных
  try {
    if ('initializeDefaultSources' in storage) {
      await (storage as any).initializeDefaultSources();
      console.log('Database initialized with default sources');
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }

  const server = await registerRoutes(app);

  // Обработчик ошибок
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Настройка Vite в development
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Запуск сервера
  const port = 5002;
  server.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`Server running on port ${port}`);
  });
}

// Запуск основного приложения
main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
