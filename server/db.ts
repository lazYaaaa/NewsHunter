import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Автоматическая проверка подключения к базе данных
(async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Подключение к базе данных успешно!');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('❌ Ошибка подключения к базе данных:', error.message);
    console.error('Полный объект ошибки:', err);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
})();