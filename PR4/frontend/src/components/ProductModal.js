import React, { useState, useEffect } from 'react';

export default function ProductModal({ mode, product, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setCategory(product.category || '');
      setDescription(product.description || '');
      setPrice(product.price?.toString() || '');
      setStock(product.stock?.toString() || '');
    }
  }, [product]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const numPrice = Number(price);
    const numStock = Number(stock);
    
    if (!name.trim() || !category.trim() || !description.trim()) {
      alert('Заполните все поля');
      return;
    }
    
    if (!Number.isFinite(numPrice) || numPrice < 0) {
      alert('Некорректная цена');
      return;
    }
    
    if (!Number.isInteger(numStock) || numStock < 0) {
      alert('Некорректное количество');
      return;
    }

    onSubmit({
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
      price: numPrice,
      stock: numStock
    });
  };

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const contentStyle = {
    background: 'white',
    padding: '20px',
    borderRadius: '5px',
    width: '400px'
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={e => e.stopPropagation()}>
        <h2>{mode === 'edit' ? 'Редактировать' : 'Создать'} товар</h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Название:</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Категория:</label>
            <input 
              value={category} 
              onChange={e => setCategory(e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Описание:</label>
            <input 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Цена (₽):</label>
            <input 
              type="number"
              value={price} 
              onChange={e => setPrice(e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Количество на складе:</label>
            <input 
              type="number"
              value={stock} 
              onChange={e => setStock(e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}>Отмена</button>
            <button type="submit" style={{ background: '#007bff', color: 'white', border: 'none', padding: '5px 15px' }}>
              {mode === 'edit' ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}