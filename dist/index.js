"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/index.ts
var import_express2 = __toESM(require("express"));

// server/routes.ts
var import_http = require("http");

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  articles: () => articles,
  insertArticleSchema: () => insertArticleSchema,
  insertSourceSchema: () => insertSourceSchema,
  insertUserSchema: () => insertUserSchema,
  sessions: () => sessions,
  sources: () => sources,
  users: () => users
});
var import_pg_core = require("drizzle-orm/pg-core");
var import_drizzle_zod = require("drizzle-zod");
var sources = (0, import_pg_core.pgTable)("sources", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  name: (0, import_pg_core.text)("name").notNull(),
  url: (0, import_pg_core.text)("url").notNull().unique(),
  category: (0, import_pg_core.text)("category").notNull(),
  isActive: (0, import_pg_core.boolean)("is_active").notNull().default(true),
  lastFetched: (0, import_pg_core.timestamp)("last_fetched"),
  articleCount: (0, import_pg_core.integer)("article_count").notNull().default(0)
});
var articles = (0, import_pg_core.pgTable)("articles", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  title: (0, import_pg_core.text)("title").notNull(),
  content: (0, import_pg_core.text)("content").notNull(),
  excerpt: (0, import_pg_core.text)("excerpt").notNull(),
  url: (0, import_pg_core.text)("url").notNull().unique(),
  imageUrl: (0, import_pg_core.text)("image_url"),
  category: (0, import_pg_core.text)("category").notNull(),
  sourceId: (0, import_pg_core.integer)("source_id").notNull(),
  sourceName: (0, import_pg_core.text)("source_name").notNull(),
  publishedAt: (0, import_pg_core.timestamp)("published_at").notNull(),
  views: (0, import_pg_core.integer)("views").notNull().default(0),
  comments: (0, import_pg_core.integer)("comments").notNull().default(0),
  shares: (0, import_pg_core.integer)("shares").notNull().default(0)
});
var insertSourceSchema = (0, import_drizzle_zod.createInsertSchema)(sources).omit({
  id: true,
  lastFetched: true,
  articleCount: true
});
var insertArticleSchema = (0, import_drizzle_zod.createInsertSchema)(articles).omit({
  id: true,
  views: true,
  comments: true,
  shares: true
});
var sessions = (0, import_pg_core.pgTable)(
  "sessions",
  {
    sid: (0, import_pg_core.varchar)("sid").primaryKey(),
    sess: (0, import_pg_core.jsonb)("sess").notNull(),
    expire: (0, import_pg_core.timestamp)("expire").notNull()
  },
  (table) => [(0, import_pg_core.index)("IDX_session_expire").on(table.expire)]
);
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.varchar)("id").primaryKey().notNull(),
  email: (0, import_pg_core.varchar)("email").unique(),
  firstName: (0, import_pg_core.varchar)("first_name"),
  lastName: (0, import_pg_core.varchar)("last_name"),
  profileImageUrl: (0, import_pg_core.varchar)("profile_image_url"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
});
var insertUserSchema = (0, import_drizzle_zod.createInsertSchema)(users).omit({
  createdAt: true,
  updatedAt: true
});

// server/db.ts
var import_config = require("dotenv/config");
var import_pg = require("pg");
var import_node_postgres = require("drizzle-orm/node-postgres");
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
var pool = new import_pg.Pool({ connectionString: process.env.DATABASE_URL });
var db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });
(async () => {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    console.log("\u2705 \u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u043A \u0431\u0430\u0437\u0435 \u0434\u0430\u043D\u043D\u044B\u0445 \u0443\u0441\u043F\u0435\u0448\u043D\u043E!");
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u043A \u0431\u0430\u0437\u0435 \u0434\u0430\u043D\u043D\u044B\u0445:", error.message);
    console.error("\u041F\u043E\u043B\u043D\u044B\u0439 \u043E\u0431\u044A\u0435\u043A\u0442 \u043E\u0448\u0438\u0431\u043A\u0438:", err);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
})();

// server/storage.ts
var import_drizzle_orm = require("drizzle-orm");
var DatabaseStorage = class {
  // User operations for Replit Auth
  async getUser(id) {
    const [user] = await db.select().from(users).where((0, import_drizzle_orm.eq)(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  async initializeDefaultSources() {
    const existingSources = await db.select().from(sources);
    if (existingSources.length > 0) {
      const existingArticles = await db.select().from(articles);
      if (existingArticles.length === 0) {
        const firstSource = existingSources[0];
        const now = /* @__PURE__ */ new Date();
        for (let i = 1; i <= 3; i++) {
          await this.createArticle({
            title: `\u0422\u0435\u0441\u0442\u043E\u0432\u0430\u044F \u043D\u043E\u0432\u043E\u0441\u0442\u044C ${i}`,
            excerpt: `\u041A\u0440\u0430\u0442\u043A\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0442\u0435\u0441\u0442\u043E\u0432\u043E\u0439 \u043D\u043E\u0432\u043E\u0441\u0442\u0438 ${i}`,
            content: `\u041F\u043E\u043B\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 \u0442\u0435\u0441\u0442\u043E\u0432\u043E\u0439 \u043D\u043E\u0432\u043E\u0441\u0442\u0438 ${i}`,
            url: `https://example.com/article${i}`,
            imageUrl: null,
            publishedAt: new Date(now.getTime() - i * 3600 * 1e3),
            category: firstSource.category,
            sourceId: firstSource.id,
            sourceName: firstSource.name
          });
        }
      }
      return;
    }
    const defaultSources = [
      { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Technology", isActive: true },
      { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", category: "General", isActive: true },
      { name: "Hacker News", url: "https://hnrss.org/frontpage", category: "Technology", isActive: true }
    ];
    for (const source of defaultSources) {
      await this.createSource(source);
    }
  }
  async getSources() {
    const result = await db.select().from(sources);
    return result;
  }
  async getSourceById(id) {
    const [source] = await db.select().from(sources).where((0, import_drizzle_orm.eq)(sources.id, id));
    return source || void 0;
  }
  async createSource(insertSource) {
    const [source] = await db.insert(sources).values(insertSource).returning();
    return source;
  }
  async updateSource(id, updates) {
    const [source] = await db.update(sources).set(updates).where((0, import_drizzle_orm.eq)(sources.id, id)).returning();
    return source || void 0;
  }
  async deleteSource(id) {
    const result = await db.delete(sources).where((0, import_drizzle_orm.eq)(sources.id, id));
    return (result.rowCount || 0) > 0;
  }
  async getArticles(params) {
    const where = [];
    if (params?.category) {
      where.push((0, import_drizzle_orm.eq)(articles.category, params.category));
    }
    if (params?.sourceId) {
      where.push((0, import_drizzle_orm.eq)(articles.sourceId, params.sourceId));
    }
    if (params?.search) {
      const searchPattern = `%${params.search}%`;
      where.push((0, import_drizzle_orm.or)(
        (0, import_drizzle_orm.like)(articles.title, searchPattern),
        (0, import_drizzle_orm.like)(articles.content, searchPattern),
        (0, import_drizzle_orm.like)(articles.sourceName, searchPattern)
      ));
    }
    const query = db.select().from(articles).where(where.length ? (0, import_drizzle_orm.and)(...where) : void 0).orderBy((0, import_drizzle_orm.desc)(articles.publishedAt)).limit(params?.limit || 20).offset(params?.offset || 0);
    return await query;
  }
  async getArticleById(id) {
    const [article] = await db.select().from(articles).where((0, import_drizzle_orm.eq)(articles.id, id));
    return article || void 0;
  }
  async getArticleByUrl(url) {
    const [article] = await db.select().from(articles).where((0, import_drizzle_orm.eq)(articles.url, url));
    return article || void 0;
  }
  async createArticle(insertArticle) {
    const [article] = await db.insert(articles).values(insertArticle).returning();
    return article;
  }
  async updateArticle(id, updates) {
    const [article] = await db.update(articles).set(updates).where((0, import_drizzle_orm.eq)(articles.id, id)).returning();
    return article || void 0;
  }
  async deleteArticle(id) {
    const result = await db.delete(articles).where((0, import_drizzle_orm.eq)(articles.id, id));
    return (result.rowCount || 0) > 0;
  }
  async getStats() {
    const [totalArticlesResult] = await db.select({ count: (0, import_drizzle_orm.count)() }).from(articles);
    const [activeSourcesResult] = await db.select({ count: (0, import_drizzle_orm.count)() }).from(sources).where((0, import_drizzle_orm.eq)(sources.isActive, true));
    const [latestArticle] = await db.select({ publishedAt: articles.publishedAt }).from(articles).orderBy((0, import_drizzle_orm.desc)(articles.publishedAt)).limit(1);
    const lastUpdate = latestArticle?.publishedAt || /* @__PURE__ */ new Date();
    const minutesAgo = Math.floor((Date.now() - lastUpdate.getTime()) / (1e3 * 60));
    const lastUpdateStr = minutesAgo < 60 ? `${minutesAgo} min` : `${Math.floor(minutesAgo / 60)} hours`;
    return {
      totalArticles: totalArticlesResult.count,
      activeSources: activeSourcesResult.count,
      lastUpdate: lastUpdateStr
    };
  }
  async getCategories() {
    const result = await db.select({
      name: articles.category,
      count: (0, import_drizzle_orm.count)(articles.id)
    }).from(articles).groupBy(articles.category);
    return result.map((row) => ({ name: row.name, count: row.count }));
  }
};
var storage = new DatabaseStorage();

// server/services/rssParser.ts
var RSSParser = class {
  async parseFeed(url) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "NewsFlow RSS Aggregator 1.0"
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const xmlText = await response.text();
      return this.parseXML(xmlText);
    } catch (error) {
      console.error(`Error parsing RSS feed ${url}:`, error);
      return [];
    }
  }
  parseXML(xmlText) {
    const items = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1];
      const title = this.extractTag(itemXml, "title") || "Untitled";
      const description = this.extractTag(itemXml, "description") || this.extractTag(itemXml, "summary") || "";
      const link = this.extractTag(itemXml, "link") || this.extractTag(itemXml, "guid") || "";
      const pubDateStr = this.extractTag(itemXml, "pubDate") || this.extractTag(itemXml, "published") || "";
      let pubdate = /* @__PURE__ */ new Date();
      if (pubDateStr) {
        pubdate = new Date(pubDateStr);
        if (isNaN(pubdate.getTime())) {
          pubdate = /* @__PURE__ */ new Date();
        }
      }
      let image;
      const enclosureMatch = itemXml.match(/<enclosure[^>]+url="([^"]+)"[^>]*>/i);
      if (enclosureMatch) {
        image = enclosureMatch[1];
      } else {
        const imgMatch = description.match(/<img[^>]+src="([^"]+)"/i);
        if (imgMatch) {
          image = imgMatch[1];
        }
      }
      const categories = [];
      const categoryRegex = /<category[^>]*>([^<]+)<\/category>/gi;
      let categoryMatch;
      while ((categoryMatch = categoryRegex.exec(itemXml)) !== null) {
        categories.push(categoryMatch[1].trim());
      }
      items.push({
        title: this.cleanText(title),
        description: this.cleanText(description),
        link: link.trim(),
        pubdate,
        image,
        categories
      });
    }
    return items;
  }
  extractTag(xml, tagName) {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }
  cleanText(text2) {
    return text2.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, "").trim();
  }
  createArticleFromFeedItem(item, sourceId, sourceName, defaultCategory) {
    const excerpt = this.extractExcerpt(item.description);
    const category = item.categories && item.categories.length > 0 ? item.categories[0] : defaultCategory;
    return {
      title: item.title,
      content: item.description,
      excerpt,
      url: item.link,
      imageUrl: item.image || null,
      category,
      sourceId,
      sourceName,
      publishedAt: item.pubdate
    };
  }
  extractExcerpt(description, maxLength = 200) {
    const text2 = description.replace(/<[^>]*>/g, "");
    const trimmed = text2.trim();
    if (trimmed.length <= maxLength) {
      return trimmed;
    }
    const truncated = trimmed.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + "..." : truncated + "...";
  }
};

// server/localAuth.ts
var import_express_session = __toESM(require("express-session"));
var import_memorystore = __toESM(require("memorystore"));
function getLocalSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const MemStore = (0, import_memorystore.default)(import_express_session.default);
  return (0, import_express_session.default)({
    secret: process.env.SESSION_SECRET || "local-dev-secret-key",
    store: new MemStore({
      checkPeriod: sessionTtl
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      // false for local development
      maxAge: sessionTtl
    }
  });
}
async function setupLocalAuth(app2) {
  app2.use(getLocalSession());
  app2.get("/api/login", (req, res) => {
    req.user = {
      claims: {
        sub: "local-user-123",
        email: "dev@example.com",
        first_name: "Local",
        last_name: "User",
        profile_image_url: null
      },
      expires_at: Math.floor(Date.now() / 1e3) + 3600
      // 1 hour from now
    };
    res.redirect("/");
  });
  app2.get("/api/logout", (req, res) => {
    req.session?.destroy(() => {
      res.redirect("/");
    });
  });
  app2.use((req, res, next) => {
    if (req.user) {
      req.isAuthenticated = () => true;
    } else {
      req.isAuthenticated = () => false;
    }
    next();
  });
}
var isLocalAuthenticated = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// server/routes.ts
var import_zod = require("zod");
var rssParser = new RSSParser();
var setupAuth = setupLocalAuth;
var isAuthenticated = isLocalAuthenticated;
async function registerRoutes(app2) {
  await setupAuth(app2);
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.get("/api/sources", async (req, res) => {
    try {
      const sources2 = await storage.getSources();
      res.json(sources2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sources" });
    }
  });
  app2.post("/api/sources", async (req, res) => {
    try {
      const sourceData = insertSourceSchema.parse(req.body);
      const source = await storage.createSource(sourceData);
      res.status(201).json(source);
    } catch (error) {
      if (error instanceof import_zod.z.ZodError) {
        res.status(400).json({ error: "Invalid source data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create source" });
      }
    }
  });
  app2.delete("/api/sources/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSource(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Source not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete source" });
    }
  });
  app2.get("/api/articles", async (req, res) => {
    try {
      const { category, sourceId, search, limit, offset } = req.query;
      const params = {
        category,
        sourceId: sourceId ? parseInt(sourceId) : void 0,
        search,
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0
      };
      const articles2 = await storage.getArticles(params);
      res.json(articles2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });
  app2.get("/api/articles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const article = await storage.getArticleById(id);
      if (article) {
        await storage.updateArticle(id, { views: article.views + 1 });
        res.json({ ...article, views: article.views + 1 });
      } else {
        res.status(404).json({ error: "Article not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });
  app2.post("/api/articles", async (req, res) => {
    try {
      const articleData = insertArticleSchema.parse(req.body);
      const article = await storage.createArticle(articleData);
      res.status(201).json(article);
    } catch (error) {
      if (error instanceof import_zod.z.ZodError) {
        res.status(400).json({ error: "Invalid article data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create article" });
      }
    }
  });
  app2.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  app2.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });
  app2.post("/api/refresh", async (req, res) => {
    try {
      const sources2 = await storage.getSources();
      let totalNewArticles = 0;
      for (const source of sources2.filter((s) => s.isActive)) {
        try {
          const feedItems = await rssParser.parseFeed(source.url);
          for (const item of feedItems) {
            const existing = await storage.getArticleByUrl(item.link);
            if (!existing) {
              const articleData = rssParser.createArticleFromFeedItem(
                item,
                source.id,
                source.name,
                source.category
              );
              await storage.createArticle(articleData);
              totalNewArticles++;
            }
          }
          await storage.updateSource(source.id, { lastFetched: /* @__PURE__ */ new Date() });
        } catch (error) {
          console.error(`Failed to parse feed for source ${source.name}:`, error);
        }
      }
      res.json({
        message: `Refresh completed. Added ${totalNewArticles} new articles.`,
        newArticles: totalNewArticles
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh feeds" });
    }
  });
  const httpServer = (0, import_http.createServer)(app2);
  return httpServer;
}

// server/vite.ts
var import_express = __toESM(require("express"));
var import_fs = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_vite2 = require("vite");

// vite.config.ts
var import_vite = require("vite");
var import_plugin_react = __toESM(require("@vitejs/plugin-react"));
var import_path = __toESM(require("path"));
var __dirname = import_path.default.resolve();
var vite_config_default = (0, import_vite.defineConfig)(() => {
  return {
    plugins: [
      (0, import_plugin_react.default)()
    ],
    resolve: {
      alias: {
        "@": import_path.default.resolve(__dirname, "client", "src"),
        "@shared": import_path.default.resolve(__dirname, "shared"),
        "@assets": import_path.default.resolve(__dirname, "attached_assets")
      }
    },
    root: import_path.default.resolve(__dirname, "client"),
    build: {
      outDir: import_path.default.resolve(__dirname, "dist/public"),
      emptyOutDir: true
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"]
      }
    }
  };
});

// server/vite.ts
var import_nanoid = require("nanoid");
var __dirname2 = import_path2.default.resolve();
var viteLogger = (0, import_vite2.createLogger)();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
    // Разрешить все хосты
  };
  const vite = await (0, import_vite2.createServer)({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = import_path2.default.resolve(__dirname2, "..", "client", "index.html");
      let template = await import_fs.default.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${(0, import_nanoid.nanoid)()}"`);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = import_path2.default.resolve(__dirname2, "public");
  if (!import_fs.default.existsSync(distPath)) {
    throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
  }
  app2.use(import_express.default.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(import_path2.default.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = (0, import_express2.default)();
app.use(import_express2.default.json());
app.use(import_express2.default.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    if ("initializeDefaultSources" in storage) {
      await storage.initializeDefaultSources();
      console.log("Database initialized with default sources");
    }
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5002;
  server.listen({
    port,
    host: "0.0.0.0"
    // reusePort: true, // Удалено для совместимости с Node.js 22+
  }, () => {
    log(`serving on port ${port}`);
  });
})();
