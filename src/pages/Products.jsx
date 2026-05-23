import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(['todos']);
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Leer parámetros de URL al cargar y cuando cambian
  useEffect(() => {
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    
    console.log('Parámetros URL - category:', category, 'search:', search);
    
    if (category && category !== 'todos') {
      setSelectedCategory(category);
    } else {
      setSelectedCategory('todos');
    }
    
    if (search) {
      setSearchTerm(search);
    } else {
      setSearchTerm('');
    }
    
    // Resetear página cuando cambian los filtros
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory !== undefined) {
      fetchProducts();
    }
  }, [page, selectedCategory, searchTerm]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategories(['todos', ...res.data]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Construir parámetros correctamente
      const params = {};
      params.page = page;
      params.limit = 8;
      
      // IMPORTANTE: Enviar la categoría correctamente
      if (selectedCategory && selectedCategory !== 'todos') {
        params.category = selectedCategory;
        console.log('Filtrando por categoría:', selectedCategory);
      }
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      console.log('Enviando params al backend:', params);
      
      const res = await axios.get('/api/products', { params });
      console.log('Productos recibidos:', res.data.products?.length);
      
      setProducts(res.data.products || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category) => {
    console.log('Cambiando a categoría:', category);
    setSelectedCategory(category);
    setPage(1);
    
    // Actualizar URL
    if (category === 'todos') {
      setSearchParams({});
    } else {
      setSearchParams({ category: category });
    }
  };

  const handleClearFilters = () => {
    console.log('Limpiando filtros');
    setSelectedCategory('todos');
    setSearchTerm('');
    setPage(1);
    setSearchParams({});
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { USD: '$', EUR: '€', COP: '$', MXN: '$', ARS: '$', CLP: '$', PEN: 'S/', BOB: 'Bs' };
    return symbols[currency] || '$';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="flex gap-2 mb-6">
            {[1,2,3,4].map(i => <div key={i} className="h-10 w-20 bg-gray-200 rounded"></div>)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-80 bg-gray-200 rounded-xl"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Nuestros Productos</h1>
      
      {searchTerm && (
        <div className="mb-4 p-3 bg-emerald-50 rounded-lg flex justify-between items-center">
          <span>🔍 Resultados para: <strong>"{searchTerm}"</strong></span>
          <button onClick={handleClearFilters} className="text-emerald-600 hover:text-emerald-800">✖ Limpiar</button>
        </div>
      )}

      {selectedCategory !== 'todos' && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex justify-between items-center">
          <span>📂 Categoría: <strong>{selectedCategory}</strong></span>
          <button onClick={handleClearFilters} className="text-blue-600 hover:text-blue-800">✖ Limpiar</button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
              selectedCategory === cat ? 'bg-emerald-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {cat === 'todos' ? 'Todos' : cat}
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron productos en esta categoría</p>
          <button onClick={handleClearFilters} className="text-emerald-600 mt-2 inline-block">Ver todos los productos →</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <div key={product.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition hover:-translate-y-1">
                <Link to={`/products/${product.id}`}>
                  <img 
                    src={product.image || 'https://via.placeholder.com/300'} 
                    alt={product.name} 
                    className="w-full h-48 object-cover hover:scale-105 transition duration-300"
                  />
                </Link>
                <div className="p-4">
                  <Link to={`/products/${product.id}`}>
                    <h3 className="font-bold text-lg mb-1 hover:text-emerald-600 transition line-clamp-1">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-gray-500 text-sm mb-2 line-clamp-2">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-emerald-600">
                      {getCurrencySymbol(product.currency || 'USD')}{product.price}
                    </span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      Stock: {product.stock}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button 
                onClick={() => setPage(p => Math.max(1, p-1))} 
                disabled={page === 1} 
                className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition"
              >
                ← Anterior
              </button>
              <span className="px-4 py-2 text-gray-600">
                Página {page} de {totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p+1))} 
                disabled={page === totalPages} 
                className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Products;