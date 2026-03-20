const API_URL = 'http://localhost:3000/api';

let accessToken = localStorage.getItem('accessToken');
let refreshToken = localStorage.getItem('refreshToken');
let currentUser = null;

const guestView = document.getElementById('guest-view');
const appView = document.getElementById('app-view');
const userInfo = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-btn');
const rolePanel = document.getElementById('role-panel');
const sellerActions = document.getElementById('seller-actions');
const usersSection = document.getElementById('users-section');

function updateUIBasedOnRole() {
    if (!currentUser) return;

    const role = currentUser.role;
    rolePanel.textContent = `Ваша роль: ${getRoleName(role)}`;

    if (role === 'seller' || role === 'admin') {
        sellerActions.style.display = 'block';
    } else {
        sellerActions.style.display = 'none';
    }

    if (role === 'admin') {
        usersSection.style.display = 'block';
        loadUsers();
    } else {
        usersSection.style.display = 'none';
    }
}

function getRoleName(role) {
    const roles = {
        'user': 'Пользователь',
        'seller': 'Продавец',
        'admin': 'Администратор'
    };
    return roles[role] || role;
}

async function apiRequest(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        let response = await fetch(url, config);
        
        if (response.status === 401 && refreshToken) {
            const refreshed = await refreshTokens();
            if (refreshed) {
                headers['Authorization'] = `Bearer ${accessToken}`;
                response = await fetch(url, config);
            }
        }
        
        return response;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function refreshTokens() {
    try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        if (response.ok) {
            const data = await response.json();
            accessToken = data.accessToken;
            refreshToken = data.refreshToken;
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            return true;
        } else {
            logout();
            return false;
        }
    } catch (error) {
        console.error('Refresh error:', error);
        logout();
        return false;
    }
}

function logout() {
    accessToken = null;
    refreshToken = null;
    currentUser = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    showGuestView();
}

function showGuestView() {
    guestView.style.display = 'block';
    appView.style.display = 'none';
    userInfo.textContent = '';
    logoutBtn.style.display = 'none';
}

function showAppView() {
    guestView.style.display = 'none';
    appView.style.display = 'block';
    userInfo.textContent = `${currentUser.first_name} ${currentUser.last_name} (${getRoleName(currentUser.role)})`;
    logoutBtn.style.display = 'block';
    updateUIBasedOnRole();
}

async function loadCurrentUser() {
    const response = await apiRequest('/auth/me');
    if (response.ok) {
        currentUser = await response.json();
        showAppView();
        loadProducts();
    } else {
        logout();
    }
}

async function loadProducts() {
    const response = await apiRequest('/products');
    if (response.ok) {
        const products = await response.json();
        displayProducts(products);
    }
}

function displayProducts(products) {
    const container = document.getElementById('products-container');
    
    if (products.length === 0) {
        container.innerHTML = '<p>Товаров пока нет</p>';
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="product-card" data-id="${product.id}">
            <div class="product-info">
                <h4>${product.title}</h4>
                <p>Категория: ${product.category}</p>
                <p>${product.description}</p>
                <p>Цена: ${product.price} руб.</p>
            </div>
            <div class="product-actions">
                ${currentUser.role === 'seller' || currentUser.role === 'admin' ? `
                    <button class="edit-btn" onclick="editProduct('${product.id}')">Редактировать</button>
                ` : ''}
                ${currentUser.role === 'admin' ? `
                    <button class="delete-btn" onclick="deleteProduct('${product.id}')">Удалить</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const product = {
        title: document.getElementById('product-title').value,
        category: document.getElementById('product-category').value,
        description: document.getElementById('product-description').value,
        price: Number(document.getElementById('product-price').value)
    };

    const response = await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(product)
    });

    if (response.ok) {
        e.target.reset();
        loadProducts();
    } else {
        const error = await response.json();
        alert('Ошибка: ' + error.error);
    }
});

window.editProduct = async function(id) {
    const newPrice = prompt('Введите новую цену:');
    if (!newPrice) return;

    const response = await apiRequest(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ price: Number(newPrice) })
    });

    if (response.ok) {
        loadProducts();
    } else {
        alert('Ошибка при обновлении');
    }
};

window.deleteProduct = async function(id) {
    if (!confirm('Удалить товар?')) return;

    const response = await apiRequest(`/products/${id}`, {
        method: 'DELETE'
    });

    if (response.ok) {
        loadProducts();
    } else {
        alert('Ошибка при удалении');
    }
};

async function loadUsers() {
    const response = await apiRequest('/users');
    if (response.ok) {
        const users = await response.json();
        displayUsers(users);
    }
}

function displayUsers(users) {
    const container = document.getElementById('users-container');
    
    container.innerHTML = users.map(user => `
        <div class="user-card" data-id="${user.id}">
            <div>
                <strong>${user.first_name} ${user.last_name}</strong><br>
                Email: ${user.email}<br>
                Роль: 
                <select class="user-role-select" onchange="changeUserRole('${user.id}', this.value)">
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>Пользователь</option>
                    <option value="seller" ${user.role === 'seller' ? 'selected' : ''}>Продавец</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Администратор</option>
                </select>
            </div>
            <button class="block-btn" onclick="blockUser('${user.id}')">Заблокировать</button>
        </div>
    `).join('');
}

window.changeUserRole = async function(userId, newRole) {
    console.log('Изменение роли:', userId, newRole); // для отладки
    
    try {
        const response = await apiRequest(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ role: newRole })
        });

        console.log('Ответ статус:', response.status);
        
        if (response.ok) {
            const updatedUser = await response.json();
            console.log('Пользователь обновлен:', updatedUser);
            
            await loadUsers();
            
            if (userId === currentUser?.id) {
                currentUser.role = updatedUser.role;
                updateUIBasedOnRole();
                userInfo.textContent = `${currentUser.first_name} ${currentUser.last_name} (${getRoleName(currentUser.role)})`;
                alert('Ваша роль изменена!');
            }
        } else {
            const error = await response.json();
            console.error('Ошибка сервера:', error);
            alert('Ошибка: ' + (error.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка при смене роли:', error);
        alert('Ошибка соединения с сервером');
    }
};

window.blockUser = async function(userId) {
    if (!confirm('Заблокировать пользователя?')) return;

    const response = await apiRequest(`/users/${userId}`, {
        method: 'DELETE'
    });

    if (response.ok) {
        if (userId === currentUser?.id) {
            logout();
        } else {
            loadUsers();
        }
    }
};

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userData = {
        email: document.getElementById('reg-email').value,
        first_name: document.getElementById('reg-firstname').value,
        last_name: document.getElementById('reg-lastname').value,
        password: document.getElementById('reg-password').value
    };

    const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });

    if (response.ok) {
        alert('Регистрация успешна! Теперь войдите.');
        e.target.reset();
    } else {
        const error = await response.json();
        alert('Ошибка: ' + error.error);
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const credentials = {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
    };

    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    });

    if (response.ok) {
        const data = await response.json();
        accessToken = data.accessToken;
        refreshToken = data.refreshToken;
        currentUser = data.user;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        e.target.reset();
        showAppView();
        loadProducts();
    } else {
        const error = await response.json();
        alert('Ошибка входа: ' + error.error);
    }
});

logoutBtn.addEventListener('click', logout);

(async function init() {
    if (accessToken && refreshToken) {
        await loadCurrentUser();
    } else {
        showGuestView();
    }
})();