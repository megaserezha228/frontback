import React from 'react';
import ProductItem from './ProductItem';

export default function ProductsList({ products, onEdit, onDelete }) {
  if (!products.length) {
    return <div>Товаров нет</div>;
  }

  return (
    <div style={{ display: 'grid', gap: '10px', marginTop: '20px' }}>
      {products.map(product => (
        <ProductItem 
          key={product.id}
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}