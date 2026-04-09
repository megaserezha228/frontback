const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// VAPID-ключи (сгенерируйте свои через webpush.generateVAPIDKeys())
const vapidKeys = {
  publicKey: 'BCL0xc8wQ1cZTX9p6mmwWzFh_8v96NB5BS4xJvUiEzEK2vaeCcyvI1hhqjz7qR45w5i0Sy_T-UcFdKXMPKvzkTw',
  privateKey: 'z_b_IVEnLjRgYOG3T5X1r4W9uwoFbeKovIb5S6B9EMo'
};

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

let subscriptions = [];

// Эндпоинты для push-подписок
app.post('/subscribe', (req, res) => {
  subscriptions.push(req.body);
  res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
  res.status(200).json({ message: 'Подписка удалена' });
});

// HTTPS сервер
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost.pem'))
};

const server = https.createServer(httpsOptions, app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
  console.log('Клиент подключён:', socket.id);

  socket.on('newTask', (task) => {
    // Рассылка через WebSocket всем клиентам
    io.emit('taskAdded', task);

    // Отправка push-уведомлений всем подписанным клиентам
    const payload = JSON.stringify({
      title: 'Новая задача',
      body: task.text
    });

    subscriptions.forEach(sub => {
      webpush.sendNotification(sub, payload).catch(err => {
        console.error('Push error:', err);
      });
    });
  });

  socket.on('disconnect', () => {
    console.log('Клиент отключён:', socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на https://localhost:${PORT}`);
});