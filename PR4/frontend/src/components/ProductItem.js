import React from 'react';

export default function ProductItem({ product, onEdit, onDelete }) {
  const itemStyle = {
    border: '1px solid #ddd',
    padding: '15px',
    borderRadius: '5px',
    background: 'white'
  };

  return (
    <div style={itemStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h3>{product.name}</h3>
          <p><strong>Категория:</strong> {product.category}</p>
          <p><strong>Описание:</strong> {product.description}</p>
          <p><strong>Цена:</strong> {product.price} ₽</p>
          <p><strong>В наличии:</strong> {product.stock} шт.</p>
        </div>
        <div>
          <button onClick={() => onEdit(product)} style={{ marginRight: '8px' }}>
            Редактировать
          </button>
          <button onClick={() => onDelete(product.id)} style={{ background: '#ff4444', color: 'white', border: 'none' }}>
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}