import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastFetched: timestamp("last_fetched"),
  articleCount: integer("article_count").notNull().default(0),
});

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
  comments: integer("comments").notNull().default(0),
  shares: integer("shares").notNull().default(0),
});

export const insertSourceSchema = createInsertSchema(sources).omit({
  id: true,
  lastFetched: true,
  articleCount: true,
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  views: true,
  comments: true,
  shares: true,
});

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

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

export const insertUserSchema = createInsertSchema(users)
  .omit({
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
  });

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UpsertUser = typeof users.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type InsertSource = z.infer<typeof insertSourceSchema>;
export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
