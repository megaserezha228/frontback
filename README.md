# frontback

# ПР7-12
Тестовый администратор

· Email: admin@example.com
· Пароль: admin123

Роли

Роль Права
Пользователь Просмотр товаров
Продавец + Создание/редактирование товаров
Администратор + Управление пользователями

API

· POST /api/auth/register - регистрация
· POST /api/auth/login - вход
· POST /api/auth/refresh - обновление токенов
· GET /api/auth/me - текущий пользователь
· GET /api/users - список пользователей (админ)
· GET /api/products - список товаров
· POST /api/products - создать товар (продавец)
· PUT /api/products/:id - обновить товар (продавец)
· DELETE /api/products/:id - удалить товар (админ)
