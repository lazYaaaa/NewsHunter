import type { Express, RequestHandler } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { db } from './db';

// 1. Определяем интерфейс для аутентифицированного запроса
interface AuthenticatedRequest extends Express.Request {
  session: session.Session & Partial<session.SessionData> & { userId?: string };
  user?: typeof users.$inferSelect;
  isAuthenticated: () => boolean;
}

// 2. Type guard для проверки аутентификации
function isAuthenticated(req: Express.Request): req is AuthenticatedRequest {
  return typeof (req as AuthenticatedRequest).isAuthenticated === 'function';
}

export function getLocalSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const MemStore = MemoryStore(session);
  
  return session({
    secret: process.env.SESSION_SECRET || 'local-dev-secret-key',
    store: new MemStore({ checkPeriod: sessionTtl }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

export async function setupLocalAuth(app: Express) {
  app.use(getLocalSession());

  app.use(async (req: Express.Request, res, next) => {
    try {
      // 3. Безопасное приведение типа с проверкой
      const sessionWithUserId = req.session as session.Session & Partial<session.SessionData> & { userId?: string };
      
      if (sessionWithUserId.userId) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, sessionWithUserId.userId));

        if (user) {
          // 4. Добавляем свойства через Object.assign
          Object.assign(req, {
            user,
            isAuthenticated: () => true
          });
          return next();
        }
      }
      
      Object.assign(req, {
        isAuthenticated: () => false
      });
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      next(error);
    }
  });
}

export const isLocalAuthenticated: RequestHandler = async (req, res, next) => {
  // 5. Используем type guard для проверки
  if (!isAuthenticated(req) ){
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  next();
};