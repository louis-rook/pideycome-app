"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductoConPrecio } from '@/lib/api/products';
import ProductCard from '@/components/products/ProductCard';
import ProductModal from '@/components/products/ProductModal';
import { EggFried, SoupIcon, CupSoda, CakeSlice, UtensilsCrossed } from 'lucide-react';

interface ProductCatalogProps {
  initialProducts: ProductoConPrecio[];
}

export default function ProductCatalog({ initialProducts }: ProductCatalogProps) {
  // Ya no necesitamos 'loading' ni 'useEffect' para cargar datos.
  // Los datos llegan listos por props.
  const [filtro, setFiltro] = useState('todos');
  
  // ESTADOS DEL MODAL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductoConPrecio | null>(null);

  const searchParams = useSearchParams();
  const categoriaURL = searchParams.get('categoria'); 

  // Sincronizar URL con filtro
  useEffect(() => {
    if (!categoriaURL || categoriaURL === 'todos') setFiltro('todos');
    else setFiltro(categoriaURL);
  }, [categoriaURL]);

  // Lógica de filtrado
  const productosFiltrados = filtro === 'todos' 
    ? initialProducts 
    : initialProducts.filter(p => {
        // Mapeo simple de IDs de categorías (Ajusta según tu BD si es necesario)
        // Asumiendo: 1: Desayunos, 2: Platos, 3: Bebidas, 4: Postres
        // Si tu BD usa nombres, cambia esto. Aquí uso un ejemplo genérico:
        const catID = p.CategoriaID;
        if (filtro === 'desayunos') return catID === 1; // Ajusta este ID
        if (filtro === 'platos') return catID === 2;    // Ajusta este ID
        if (filtro === 'bebidas') return catID === 3;   // Ajusta este ID
        if (filtro === 'postres') return catID === 4;   // Ajusta este ID
        return true;
    });

  const handleOpenModal = (producto: ProductoConPrecio) => {
    setSelectedProduct(producto);
    setIsModalOpen(true);
  };

  const categories = [
    { id: 'todos', label: 'Todo', icon: UtensilsCrossed },
    { id: 'desayunos', label: 'Desayunos', icon: EggFried },
    { id: 'platos', label: 'Platos', icon: SoupIcon },
    { id: 'bebidas', label: 'Bebidas', icon: CupSoda },
    { id: 'postres', label: 'Postres', icon: CakeSlice },
  ];

  return (
    <>
      {/* Barra de Filtros */}
      <div className="flex flex-wrap justify-center gap-4 mb-10">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = filtro === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setFiltro(cat.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 shadow-sm ${
                isActive 
                  ? 'bg-[#ff6d22] text-white scale-105 shadow-orange-200' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Grilla de Productos */}
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
        <div className="text-center py-20">
           <p className="text-gray-400 text-lg">No encontramos productos en esta categoría.</p>
        </div>
      )}

      {/* Modal */}
      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        producto={selectedProduct} 
      />
    </>
  );
}