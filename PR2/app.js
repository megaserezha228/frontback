const express = require('express');
const app = express();
const port = 3000;

// Товары
let products = [
    { id: 1, name: 'зарядка', price: 800 },
    { id: 2, name: 'мышка', price: 1500 },
    { id: 3, name: 'батарея', price: 10000 }
];
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Вот вроде работает. Добавьте /products ');
});

// все товары
app.get('/products', (req, res) => {
    res.json(products);
});

// id
app.get('/products/:id', (req, res) => {
    const product = products.find(p => p.id == req.params.id);
    
    if (!product) {
        return res.status(404).json({ message: 'Товар не найден' });
    }
    
    res.json(product);
});

// Создание товара
app.post('/products', (req, res) => {
    const { name, price } = req.body;
    
    if (!name || !price) {
        return res.status(400).json({ message: 'Необходимо указать название и стоимость' });
    }
    
    const newProduct = {
        id: Date.now(),
        name,
        price
    };
    
    products.push(newProduct);
    res.status(201).json(newProduct);
});

// Редактирование
app.patch('/products/:id', (req, res) => {
    const product = products.find(p => p.id == req.params.id);
    
    if (!product) {
        return res.status(404).json({ message: 'Товар не найден' });
    }
    
    const { name, price } = req.body;
    
    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;
    
    res.json(product);
});

// Удаление
app.delete('/products/:id', (req, res) => {
    const productExists = products.some(p => p.id == req.params.id);
    
    if (!productExists) {
        return res.status(404).json({ message: 'Товар не найден' });
    }
    
    products = products.filter(p => p.id != req.params.id);
    res.json({ message: 'Товар удален' });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});