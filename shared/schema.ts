import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Таблица источников
export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastFetched: timestamp("last_fetched"),
  articleCount: integer("article_count").notNull().default(0),
});
export const insertSourceSchema = z.object({
  name: z.string().min(1, "Введите название"),
  url: z.string().url("Введите корректный URL"),
  category: z.string().min(1, "Введите категорию"),
});

// Таблица статей
export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt").notNull(),
  url: text("url").notNull().unique(),
  imageUrl: text("image_url"),
  category: text("category").notNull(),
  sourceId: integer("source_id").notNull(),
  sourceName: text("source_name").notNull(),
  publishedAt: timestamp("published_at").notNull(),
  views: integer("views").notNull().default(0),
  comments: integer("comments").notNull().default(0), // Кол-во комментариев
  shares: integer("shares").notNull().default(0),
  likes: integer("likes").notNull().default(0), // Кол-во лайков
});
// Схема вставки для статей (без id, views, comments, shares, likes по умолчанию)
export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  views: true,
  comments: true,
  shares: true,
  likes: true,
});

// Типы на основе схем
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UpsertUser = typeof users.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type InsertSource = z.infer<typeof insertSourceSchema>;
export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;

// Таблица пользователей
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Таблица категорий
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).unique(),
});

// Таблица комментариев
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey(),
  articleId: integer("article_id").notNull(),
  authorId: varchar("author_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export type Comment = {
  id: string;
  articleId: number;
  authorId: string;
  content: string;
  createdAt: Date | null;
};

// Интерфейс для хранения
export interface IStorage {
  // Пользователи
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Источники
  getSources(): Promise<Source[]>;
  getSourceById(id: number): Promise<Source | undefined>;
  createSource(source: InsertSource): Promise<Source>;
  updateSource(id: number, updates: Partial<Source>): Promise<Source | undefined>;
  deleteSource(id: number): Promise<boolean>;

  // Статьи
  getArticles(params?: {
    category?: string;
    sourceId?: number;
    search?: string;
    limit?: number;
    offset?: number;
    publishedAfter?: Date;
  }): Promise<Article[]>;
  getArticleById(id: number): Promise<Article | undefined>;
  getArticleByUrl(url: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  updateArticle(id: number, updates: Partial<Article>): Promise<Article | undefined>;
  deleteArticle(id: number): Promise<boolean>;

  // Статистика
  getStats(): Promise<{ totalArticles: number; activeSources: number; lastUpdate: string }>;

  // Категории
  getCategories(): Promise<Array<{ name: string; count: number }>>;

  // Комментарии
  getCommentsByArticleId(articleId: number): Promise<Comment[]>;
  createComment(comment: { articleId: number; authorId: string; content: string }): Promise<Comment>;
  deleteComment(id: string): Promise<boolean>;

  // Лайки
  incrementLikes(articleId: number): Promise<void>;
  decrementLikes(articleId: number): Promise<void>;

  // Комментарии (подсчет)
  updateCommentsCount(articleId: number, count: number): Promise<void>;

  getArticleLikesCount(articleId: number): Promise<number>;
  getCommentsCount(articleId: number): Promise<number>;
}
