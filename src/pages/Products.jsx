import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProductCard from '../components/ProductCard';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [page]);

  const fetchProducts = async () => {
    setLoading(true);
    const res = await axios.get(`/api/products?page=${page}&limit=8`);
    setProducts(res.data.products);
    setTotalPages(res.data.totalPages);
    setLoading(false);
  };

  if (loading) return <div className="text-center py-20">Cargando...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Todos los Productos</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50">Anterior</button>
          <span className="px-4 py-2">Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50">Siguiente</button>
        </div>
      )}
    </div>
  );
};

export default Products;