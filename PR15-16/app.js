const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');
const enablePushBtn = document.getElementById('enable-push');
const disablePushBtn = document.getElementById('disable-push');

let socket = null;

function setActiveButton(activeId) {
  [homeBtn, aboutBtn].forEach(btn => btn.classList.remove('active'));
  document.getElementById(activeId).classList.add('active');
}

async function loadContent(page) {
  try {
    const response = await fetch(`/content/${page}.html`);
    const html = await response.text();
    contentDiv.innerHTML = html;

    if (page === 'home') {
      initNotes();
    }
  } catch (err) {
    contentDiv.innerHTML = '<p class="is-center text-error">Ошибка загрузки страницы</p>';
  }
}

function initNotes() {
  const form = document.getElementById('note-form');
  const input = document.getElementById('note-input');
  const list = document.getElementById('notes-list');

  function loadNotes() {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    if (notes.length === 0) {
      list.innerHTML = '<li style="color: gray;">Нет заметок</li>';
      return;
    }
    list.innerHTML = notes.map((note, index) => `
      <li style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="flex: 1;">${escapeHtml(note.text || note)}</span>
        <button class="delete-btn" data-index="${index}" style="background: #ff4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;">Удалить</button>
      </li>
    `).join('');

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(btn.dataset.index);
        deleteNote(index);
      });
    });
  }

  function addNote(text) {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const newNote = { id: Date.now(), text: text, datetime: new Date().toLocaleString() };
    notes.push(newNote);
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes();

    if (socket) {
      socket.emit('newTask', { text: text });
    }
  }

  function deleteNote(index) {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    notes.splice(index, 1);
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes();
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (text) {
        addNote(text);
        input.value = '';
      }
    });
  }

  loadNotes();
}

function escapeHtml(str) {
  if (typeof str !== 'string') str = String(str);
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function connectSocket() {
  socket = io('https://localhost:3000');

  socket.on('connect', () => {
    console.log('WebSocket подключён');
  });

  socket.on('taskAdded', (task) => {
    console.log('Задача от другого клиента:', task);
    const notification = document.createElement('div');
    notification.textContent = `Новая задача: ${task.text}`;
    notification.style.cssText = `
      position: fixed; top: 10px; right: 10px;
      background: #4285f4; color: white; padding: 1rem;
      border-radius: 5px; z-index: 1000;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  });
}

// ПРОСТАЯ ВЕРСИЯ БЕЗ atob
async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push не поддерживается');
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // ВАЖНО: сгенерируйте новые ключи командой ниже и вставьте сюда
    // Запустите в терминале: node -e "const webpush=require('web-push');const k=webpush.generateVAPIDKeys();console.log(k.publicKey);console.log(k.privateKey);"
    const VAPID_PUBLIC_KEY = 'BCL0xc8wQ1cZTX9p6mmwWzFh_8v96NB5BS4xJvUiEzEK2vaeCcyvI1hhqjz7qR45w5i0Sy_T-UcFdKXMPKvzkTw';
    
    // Преобразование через Uint8Array (без atob)
    const applicationServerKey = new Uint8Array(
      atob(VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map(c => c.charCodeAt(0))
    );
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });
    
    const response = await fetch('https://localhost:3000/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    
    if (response.ok) {
      console.log('Подписка на push отправлена');
    } else {
      console.log('Ошибка сервера:', await response.text());
    }
  } catch (err) {
    console.error('Ошибка подписки на push:', err);
  }
}

async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await fetch('https://localhost:3000/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });
    await subscription.unsubscribe();
    console.log('Отписка выполнена');
  }
}

homeBtn.addEventListener('click', () => {
  setActiveButton('home-btn');
  loadContent('home');
});

aboutBtn.addEventListener('click', () => {
  setActiveButton('about-btn');
  loadContent('about');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker зарегистрирован');

      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        enablePushBtn.style.display = 'none';
        disablePushBtn.style.display = 'inline-block';
      } else {
        enablePushBtn.style.display = 'inline-block';
        disablePushBtn.style.display = 'none';
      }

      enablePushBtn.addEventListener('click', async () => {
        if (Notification.permission === 'denied') {
          alert('Уведомления запрещены. Разрешите их в настройках браузера.');
          return;
        }
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            alert('Необходимо разрешить уведомления.');
            return;
          }
        }
        await subscribeToPush();
        enablePushBtn.style.display = 'none';
        disablePushBtn.style.display = 'inline-block';
      });

      disablePushBtn.addEventListener('click', async () => {
        await unsubscribeFromPush();
        disablePushBtn.style.display = 'none';
        enablePushBtn.style.display = 'inline-block';
      });

    } catch (err) {
      console.log('Ошибка регистрации SW:', err);
    }
  });
}

connectSocket();
loadContent('home');