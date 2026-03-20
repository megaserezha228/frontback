const express = require('express');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());


const ACCESS_SECRET = 'access_secret';
const REFRESH_SECRET = 'refresh_secret';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';


const users = [];
const products = [];
const refreshTokens = new Set();

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function findUserByEmail(email) {
  return users.find(user => user.email === email);
}

function findUserById(id) {
  return users.find(user => user.id === id);
}

function findProductById(id) {
  return products.find(product => product.id === id);
}


function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}


function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}


function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient rights' });
    }
    
    next();
  };
}

app.post('/api/auth/register', async (req, res) => {
  const { email, first_name, last_name, password } = req.body;

  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  if (findUserByEmail(email)) {
    return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
  }

  const newUser = {
    id: nanoid(),
    email,
    first_name,
    last_name,
    password: await hashPassword(password),
    role: 'user'
  };

  users.push(newUser);
  
  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: 'Неверный пароль' });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  refreshTokens.add(refreshToken);

  res.status(200).json({ 
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    }
  });
});


app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = findUserById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    refreshTokens.delete(refreshToken);
    
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    refreshTokens.add(newRefreshToken);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const userId = req.user.sub;
  const user = findUserById(userId);
  
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.status(200).json(userWithoutPassword);
});


app.get('/api/users', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const usersWithoutPasswords = users.map(({ password, ...user }) => user);
  res.status(200).json(usersWithoutPasswords);
});


app.get('/api/users/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const user = findUserById(req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const { password, ...userWithoutPassword } = user;
  res.status(200).json(userWithoutPassword);
});


app.put('/api/users/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  const user = findUserById(req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const { first_name, last_name, email, role } = req.body;

  if (first_name !== undefined) user.first_name = first_name;
  if (last_name !== undefined) user.last_name = last_name;
  if (email !== undefined) user.email = email;
  if (role !== undefined && ['user', 'seller', 'admin'].includes(role)) {
    user.role = role;
  }

  const { password, ...userWithoutPassword } = user;
  res.status(200).json(userWithoutPassword);
});


app.delete('/api/users/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const index = users.findIndex(u => u.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  users.splice(index, 1);
  res.status(200).json({ message: 'Пользователь удален' });
});


app.post('/api/products', authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
  const { title, category, description, price } = req.body;

  if (!title || !category || !description || price === undefined) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'Цена должна быть положительным числом' });
  }

  const newProduct = {
    id: nanoid(),
    title,
    category,
    description,
    price
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});


app.get('/api/products', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
  res.status(200).json(products);
});


app.get('/api/products/:id', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
  const product = findProductById(req.params.id);
  
  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  res.status(200).json(product);
});


app.put('/api/products/:id', authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
  const product = findProductById(req.params.id);
  
  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  const { title, category, description, price } = req.body;

  if (title !== undefined) product.title = title;
  if (category !== undefined) product.category = category;
  if (description !== undefined) product.description = description;
  
  if (price !== undefined) {
    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ error: 'Цена должна быть положительным числом' });
    }
    product.price = price;
  }

  res.status(200).json(product);
});


app.delete('/api/products/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const index = products.findIndex(p => p.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  products.splice(index, 1);
  res.status(200).json({ message: 'Товар удален' });
});


(async () => {
  const adminExists = users.some(u => u.email === 'admin@example.com');
  if (!adminExists) {
    const adminUser = {
      id: nanoid(),
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'Adminov',
      password: await hashPassword('admin123'),
      role: 'admin'
    };
    users.push(adminUser);
    console.log('✅ Тестовый администратор создан: admin@example.com / admin123');
  }
  console.log('👥 Всего пользователей:', users.length);
})();

app.listen(port, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${port}`);
});