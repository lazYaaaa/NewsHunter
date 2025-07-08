import type { Express, RequestHandler } from "express";
import session from "express-session";
import MemoryStore from "memorystore";

// Simple local authentication for development
export function getLocalSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const MemStore = MemoryStore(session);
  
  return session({
    secret: process.env.SESSION_SECRET || 'local-dev-secret-key',
    store: new MemStore({
      checkPeriod: sessionTtl,
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // false for local development
      maxAge: sessionTtl,
    },
  });
}

export async function setupLocalAuth(app: Express) {
  app.use(getLocalSession());

  // Mock login endpoint for local development
  app.get("/api/login", (req, res) => {
    // Create a mock user session
    (req as any).user = {
      claims: {
        sub: "local-user-123",
        email: "dev@example.com",
        first_name: "Local",
        last_name: "User",
        profile_image_url: null,
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };
    
    res.redirect("/");
  });

  // Mock logout endpoint
  app.get("/api/logout", (req, res) => {
    req.session?.destroy(() => {
      res.redirect("/");
    });
  });

  // Mock authentication check
  app.use((req, res, next) => {
    if ((req as any).user) {
      (req as any).isAuthenticated = () => true;
    } else {
      (req as any).isAuthenticated = () => false;
    }
    next();
  });
}

export const isLocalAuthenticated: RequestHandler = async (req, res, next) => {
  if (!(req as any).isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};