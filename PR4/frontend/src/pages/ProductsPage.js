import React, { useState, useEffect } from 'react';
import ProductsList from '../components/ProductsList';
import ProductModal from '../components/ProductModal';
import { api } from '../api';
import './ProductsPage.css';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      alert('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setModalMode('create');
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setModalMode('edit');
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить товар?')) return;
    try {
      await api.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert('Ошибка удаления');
    }
  };

  const handleSubmit = async (productData) => {
    try {
      if (modalMode === 'create') {
        const newProduct = await api.createProduct(productData);
        setProducts(prev => [...prev, newProduct]);
      } else {
        const updated = await api.updateProduct(editingProduct.id, productData);
        setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      }
      setModalOpen(false);
    } catch (err) {
      alert('Ошибка сохранения');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Интернет-магазин</h1>
        <button onClick={openCreate} style={{ padding: '8px 16px' }}>+ Добавить товар</button>
      </header>

      <main>
        {loading ? (
          <div>Загрузка...</div>
        ) : (
          <ProductsList 
            products={products} 
            onEdit={openEdit} 
            onDelete={handleDelete} 
          />
        )}
      </main>

      {modalOpen && (
        <ProductModal
          mode={modalMode}
          product={editingProduct}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}