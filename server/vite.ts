import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger, ServerOptions } from "vite";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

// Получение __dirname для CommonJS
const __dirname = path.resolve();

const viteLogger = createLogger();

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

async function setupVite(app: express.Express, server: any) {
  // Используем правильный тип
  const serverOptions: ServerOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true, // Разрешить все хосты
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      // Добавляем уникальный параметр к src, чтобы избежать кеширования
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

function serveStatic(app: express.Express) {
  // Исправить путь: Express должен искать статику в dist/public относительно NewsHunter
  const distPath = path.resolve(__dirname, "dist/public");
  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
  }
  app.use(express.static(distPath));
  app.use("*", (_req: express.Request, res: express.Response) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

export { log, serveStatic, setupVite };
