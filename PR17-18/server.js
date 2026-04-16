const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// VAPID-ключи
const vapidKeys = {
  publicKey: 'BGKzsUAyh6Pijzk2-45lf3bYpysZzRyNJDQVwiRpTLxMUSwI4nQdVT3D0PItoiOKJXO8X6oJrrFla1xLK4Q97w0',
  privateKey: 'FU6u2zgpe_7cc3_oYp1icCIBtSk1ISLszSnXvlekGfw'
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
const reminders = new Map();

// ===== ЛОГ 1: Получение подписки =====
app.post('/subscribe', (req, res) => {
  console.log('=== Получена подписка ===');
  console.log('Endpoint:', req.body.endpoint);
  subscriptions.push(req.body);
  console.log('Всего подписок:', subscriptions.length);
  res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
  console.log('Отписка выполнена. Осталось подписок:', subscriptions.length);
  res.status(200).json({ message: 'Подписка удалена' });
});

app.post('/snooze', (req, res) => {
  const reminderId = parseInt(req.query.reminderId, 10);
  
  if (!reminderId || !reminders.has(reminderId)) {
    return res.status(400).json({ error: 'Reminder not found' });
  }

  const reminder = reminders.get(reminderId);
  clearTimeout(reminder.timeoutId);

  const newDelay = 5 * 60 * 1000;
  const newTimeoutId = setTimeout(() => {
    const payload = JSON.stringify({
      title: 'Напоминание отложено',
      body: reminder.text,
      reminderId: reminderId
    });

    subscriptions.forEach(sub => {
      webpush.sendNotification(sub, payload).catch(err => console.error('Push error:', err));
    });

    reminders.delete(reminderId);
  }, newDelay);

  reminders.set(reminderId, {
    timeoutId: newTimeoutId,
    text: reminder.text,
    reminderTime: Date.now() + newDelay
  });

  res.status(200).json({ message: 'Reminder snoozed for 5 minutes' });
});

// HTTPS сервер
let server;
try {
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'localhost.pem'))
  };
  server = https.createServer(httpsOptions, app);
  console.log('HTTPS сервер запущен');
} catch (err) {
  console.log('Сертификаты не найдены, запускаем HTTP сервер');
  const http = require('http');
  server = http.createServer(app);
}

const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
  console.log('Клиент подключён:', socket.id);

  socket.on('newTask', (task) => {
    console.log('=== Новая задача ===', task.text);
    io.emit('taskAdded', task);

    const payload = JSON.stringify({
      title: 'Новая задача',
      body: task.text
    });

    console.log('Отправка push подписчикам. Количество:', subscriptions.length);
    subscriptions.forEach(sub => {
      webpush.sendNotification(sub, payload).catch(err => console.error('Push error:', err));
    });
  });

  // ===== ЛОГ 2: Получение напоминания =====
  socket.on('newReminder', (reminder) => {
    console.log('=== ПОЛУЧЕНО НАПОМИНАНИЕ ===');
    console.log('ID:', reminder.id);
    console.log('Текст:', reminder.text);
    console.log('Время:', new Date(reminder.reminderTime).toLocaleString());
    
    const { id, text, reminderTime } = reminder;
    const delay = reminderTime - Date.now();
    
    console.log('Задержка (мс):', delay);
    console.log('Задержка (минут):', Math.floor(delay / 60000));
    
    if (delay <= 0) {
      console.log('Ошибка: время напоминания в прошлом');
      return;
    }

    const timeoutId = setTimeout(() => {
      // ===== ЛОГ 3: ТАЙМЕР СРАБОТАЛ =====
      console.log('=== ТАЙМЕР СРАБОТАЛ ===');
      console.log('Отправка push для напоминания:', text);
      console.log('ID напоминания:', id);
      
      const payload = JSON.stringify({
        title: 'Напоминание',
        body: text,
        reminderId: id
      });

      console.log('Отправка push подписчикам. Количество:', subscriptions.length);
      subscriptions.forEach(sub => {
        webpush.sendNotification(sub, payload).catch(err => console.error('Push error:', err));
      });

      reminders.delete(id);
      console.log('Напоминание удалено из хранилища');
    }, delay);

    reminders.set(id, { timeoutId, text, reminderTime });
    console.log('=== НАПОМИНАНИЕ ЗАПЛАНИРОВАНО ===');
    console.log(`Напоминание для "${text}" запланировано на ${new Date(reminderTime).toLocaleString()}`);
    console.log('Активных напоминаний:', reminders.size);
  });

  socket.on('disconnect', () => {
    console.log('Клиент отключён:', socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});