const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');

// Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

// Промежуточные обработчики
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3001' }));

// Логирование запросов
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
    if (req.method === 'POST' || req.method === 'PATCH') {
      console.log('Тело запроса:', req.body);
    }
  });
  next();
});

// Начальные данные
let products = [
  { id: nanoid(6), name: 'Ноутбук', category: 'Электроника', description: '15.6"', price: 50000, stock: 10 },
  { id: nanoid(6), name: 'Мышь', category: 'Электроника', description: 'Беспроводная', price: 1500, stock: 25 },
  { id: nanoid(6), name: 'Клавиатура', category: 'Электроника', description: 'Механическая', price: 3000, stock: 15 },
  { id: nanoid(6), name: 'Монитор', category: 'Электроника', description: '27" 4K', price: 25000, stock: 8 },
  { id: nanoid(6), name: 'Кружка', category: 'Посуда', description: 'Керамическая', price: 500, stock: 50 },
  { id: nanoid(6), name: 'Чайник', category: 'Посуда', description: 'Электрический', price: 2000, stock: 12 },
  { id: nanoid(6), name: 'Книга', category: 'Книги', description: 'Фантастика', price: 600, stock: 30 },
  { id: nanoid(6), name: 'Ручка', category: 'Канцелярия', description: 'Шариковая', price: 50, stock: 100 },
  { id: nanoid(6), name: 'Блокнот', category: 'Канцелярия', description: 'А5', price: 150, stock: 40 },
  { id: nanoid(6), name: 'Рюкзак', category: 'Аксессуары', description: 'Для ноутбука', price: 3000, stock: 7 }
];

// Вспомогательная функция
function найтиТоварИли404(id, res) {
  const product = products.find(p => p.id === id);
  if (!product) {
    res.status(404).json({ error: 'Товар не найден' });
    return null;
  }
  return product;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - description
 *         - price
 *         - stock
 *       properties:
 *         id:
 *           type: string
 *           description: Уникальный идентификатор товара
 *         name:
 *           type: string
 *           description: Название товара
 *         category:
 *           type: string
 *           description: Категория товара
 *         description:
 *           type: string
 *           description: Описание товара
 *         price:
 *           type: number
 *           description: Цена в рублях
 *         stock:
 *           type: integer
 *           description: Количество на складе
 *       example:
 *         id: "abc123"
 *         name: "Ноутбук"
 *         category: "Электроника"
 *         description: "15.6 дюймов"
 *         price: 50000
 *         stock: 10
 */

// Настройки Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API интернет-магазина',
      version: '1.0.0',
      description: 'API для управления товарами'
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Локальный сервер'
      }
    ]
  },
  apis: ['./server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Настройки внешнего вида Swagger
const options = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { margin: 10px 0 }
    .swagger-ui .btn { background: #007bff }
  `,
  customSiteTitle: "API интернет-магазина"
};

// Подключаем Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, options));

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     tags: [Товары]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - description
 *               - price
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *                 description: Название товара
 *               category:
 *                 type: string
 *                 description: Категория товара
 *               description:
 *                 type: string
 *                 description: Описание товара
 *               price:
 *                 type: number
 *                 description: Цена в рублях
 *               stock:
 *                 type: integer
 *                 description: Количество на складе
 *     responses:
 *       201:
 *         description: Товар успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Ошибка в данных запроса
 */
app.post('/api/products', (req, res) => {
  const { name, category, description, price, stock } = req.body;
  
  if (!name?.trim() || !category?.trim() || !description?.trim() || price === undefined || stock === undefined) {
    return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
  }

  const newProduct = {
    id: nanoid(6),
    name: name.trim(),
    category: category.trim(),
    description: description.trim(),
    price: Number(price),
    stock: Number(stock)
  };
  
  products.push(newProduct);
  res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список всех товаров
 *     tags: [Товары]
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get('/api/products', (req, res) => {
  res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по идентификатору
 *     tags: [Товары]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Идентификатор товара
 *     responses:
 *       200:
 *         description: Данные товара
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.get('/api/products/:id', (req, res) => {
  const product = найтиТоварИли404(req.params.id, res);
  if (!product) return;
  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Обновить данные товара
 *     tags: [Товары]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Идентификатор товара
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Новое название
 *               category:
 *                 type: string
 *                 description: Новая категория
 *               description:
 *                 type: string
 *                 description: Новое описание
 *               price:
 *                 type: number
 *                 description: Новая цена
 *               stock:
 *                 type: integer
 *                 description: Новое количество
 *     responses:
 *       200:
 *         description: Обновленный товар
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Нет данных для обновления
 *       404:
 *         description: Товар не найден
 */
app.patch('/api/products/:id', (req, res) => {
  const id = req.params.id;
  const product = найтиТоварИли404(id, res);
  if (!product) return;

  const { name, category, description, price, stock } = req.body;
  
  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Нет данных для обновления' });
  }

  if (name !== undefined) product.name = name.trim();
  if (category !== undefined) product.category = category.trim();
  if (description !== undefined) product.description = description.trim();
  if (price !== undefined) product.price = Number(price);
  if (stock !== undefined) product.stock = Number(stock);

  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Товары]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Идентификатор товара
 *     responses:
 *       204:
 *         description: Товар успешно удален
 *       404:
 *         description: Товар не найден
 */
app.delete('/api/products/:id', (req, res) => {
  const id = req.params.id;
  const exists = products.some(p => p.id === id);
  if (!exists) return res.status(404).json({ error: 'Товар не найден' });
  
  products = products.filter(p => p.id !== id);
  res.status(204).send();
});

// Обработка всех остальных маршрутов
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Необработанная ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
  console.log(`Документация Swagger: http://localhost:${port}/api-docs`);
});