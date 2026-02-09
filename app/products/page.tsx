"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
						 
import { getProductos, ProductoConPrecio } from '@/lib/api/products'; 
													   
import ProductCard from '@/components/products/ProductCard';
import ProductModal from '@/components/products/ProductModal';
import { Loader2 } from 'lucide-react';

/**
 * COMPONENTE DE CONTENIDO:
 * Encapsulado para evitar errores de renderizado de Next.js al usar hooks de navegación.
 */
function MenuContent() {
  const [productos, setProductos] = useState<ProductoConPrecio[]>([]); // Lista global de productos
  const [filtro, setFiltro] = useState('todos'); // ID de categoría seleccionada
  const [loading, setLoading] = useState(true); // Control del spinner inicial
  
  // Estado para el control del detalle/modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductoConPrecio | null>(null);

  const searchParams = useSearchParams();
  const categoriaURL = searchParams.get('categoria'); 

  // Carga inicial de datos desde Supabase
  useEffect(() => {
    async function loadData() {
      try {
        const data = await getProductos();
        setProductos(data);
      } catch (error) {
        console.error("Error cargando productos:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Sincronización del filtro con los parámetros de la URL
  useEffect(() => {
    if (!categoriaURL || categoriaURL === 'todos') setFiltro('todos');
    else if(categoriaURL === 'desayunos') setFiltro('1'); 
    else if(categoriaURL === 'platos') setFiltro('2');
    else if(categoriaURL === 'bebidas') setFiltro('3');
    else if(categoriaURL === 'postres') setFiltro('4');
  }, [categoriaURL]);

  // Manejadores del Modal
  const handleOpenModal = (product: ProductoConPrecio) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedProduct(null), 200); 
  };

  // Filtrado de la lista en memoria según la categoría activa
  const productosFiltrados = productos.filter(p => {
    if (filtro === 'todos') return true;
    return p.CategoriaID.toString() === filtro;
  });

  if (loading) {
    return (
        <div className="flex h-[50vh] w-full items-center justify-center">
            <Loader2 className="animate-spin text-[#ff6d22] w-12 h-12" />
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      
      {/* Encabezado Principal */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-2 font-playfair">Nuestro Menú</h1>
        <p className="text-gray-500 text-lg font-light">Elije tu comida favorita y disfruta</p>
        <div className="w-20 h-1.5 bg-[#ff6d22] mx-auto rounded-full mt-4"></div>
      </div>

      {/* Barra de Filtros (Categorías) */}
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        {[
            { id: 'todos', label: 'Todos' },
            { id: '1', label: 'Desayunos' },
            { id: '2', label: 'Platos Fuertes' },
            { id: '3', label: 'Bebidas' },
            { id: '4', label: 'Postres' }
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFiltro(cat.id)}
            className={`rounded-pill px-8 py-2.5 font-semibold transition-all duration-300 text-sm tracking-wide ${
              filtro === cat.id 
                ? 'bg-[#ff6d22] text-white shadow-lg scale-105 border border-[#ff6d22]' 
                : 'bg-white text-gray-500 border border-gray-200 hover:border-[#ff6d22] hover:text-[#ff6d22] hover:shadow-sm'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grilla de Productos (Responsive 1 a 4 columnas) */}
      {productosFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-10">
          {productosFiltrados.map((producto) => (
             <ProductCard 
               key={producto.ProductoID} 
               product={producto} 
               onOpenModal={handleOpenModal} 
             />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
           <p className="text-gray-500 text-lg">No hay productos en esta categoría.</p>
        </div>
      )}

      {/* Modal de Detalle */}
      <ProductModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        producto={selectedProduct} 
      />
    </div>
  );
}

// COMPONENTE PRINCIPAL: Requerido por Next.js para manejar hooks de cliente
export default function ProductsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>}>
            <MenuContent />
        </Suspense>
    );
}