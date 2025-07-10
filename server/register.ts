import { Request, Response } from 'express';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Схема валидации входящих данных
const registrationSchema = z.object({
  email: z.string().email('Некорректный формат email'),
  password: z.string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
    .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру'),
  firstName: z.string().min(1, 'Имя обязательно').max(50, 'Слишком длинное имя').optional(),
  lastName: z.string().min(1, 'Фамилия обязательна').max(50, 'Слишком длинная фамилия').optional()
});

export const registerUser = async (req: Request, res: Response) => {
  try {
    console.log('Получен запрос на регистрацию:', {
      headers: req.headers,
      body: req.body
    });

    // Валидация входящих данных
    const validationResult = registrationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.log('Ошибка валидации:', validationResult.error.flatten());
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации данных',
        errors: validationResult.error.flatten()
      });
    }

    const { email, password, firstName, lastName } = validationResult.data;

    // Проверка существующего пользователя
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUser) {
      console.log('Пользователь уже существует:', email);
      return res.status(409).json({
        success: false,
        message: 'Пользователь с таким email уже зарегистрирован'
      });
    }

    // Хеширование пароля
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Пароль хеширован');

    // Создание пользователя
    const [newUser] = await db
      .insert(users)
      .values({
        id: uuidv4(),
        email: email.toLowerCase(), // Нормализация email
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        profileImageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt
      });

    console.log('Пользователь создан:', newUser.id);

    // Успешный ответ
    return res.status(201).json({
      success: true,
      message: 'Регистрация прошла успешно',
      data: {
        user: newUser
      }
    });

  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    
    // Детали ошибки только для разработки
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error instanceof Error ? error.message : 'Неизвестная ошибка'
      : 'Произошла ошибка при регистрации';

    return res.status(500).json({
      success: false,
      message: 'Ошибка сервера',
      error: errorMessage
    });
  }
};