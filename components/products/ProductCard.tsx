"use client";

import React from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';

export interface Product {
  ProductoID: number;
  Nombre: string;
  Descripcion: string | null;
  Precio: number;
  Imagen: string | null;
  CategoriaID: number;
  Ingredientes: string | null;
}

interface ProductCardProps {
  product: Product;
  onOpenModal: (product: Product) => void; // <--- NUEVA PROPIEDAD
}

export default function ProductCard({ product, onOpenModal }: ProductCardProps) {
  
  // Usamos la función que viene del padre
  const handleClick = () => {
    onOpenModal(product);
  };  

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 h-full flex flex-col group">
      
      {/* 1. CONTENEDOR DE IMAGEN (Con elementos flotantes) */}
      <div className="relative w-full h-[200px] bg-gray-100">
        {/* Imagen */}
        {product.Imagen ? (
          <Image 
            src={product.Imagen} 
            alt={product.Nombre}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <span className="text-sm">Sin imagen</span>
          </div>
        )}

        {/* PRECIO FLOTANTE (Arriba Izquierda - Estilo Píldora) */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-gray-100">
          <span className="font-extrabold text-[#000000] text-sm">
            $ {product.Precio.toLocaleString('es-CO')}
          </span>
        </div>

        {/* BOTÓN AGREGAR (Abajo Derecha - Círculo Naranja) */}
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Evita doble click si pusiste click en el div
            onOpenModal(product);
          }}
          className="absolute bottom-3 right-3 w-10 h-10 bg-[#ff6d22] hover:bg-[#e65c19] text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
          aria-label="Agregar al carrito"
        >
          <Plus className="w-6 h-6" strokeWidth={3} />
        </button>
      </div>

      {/* 2. CUERPO DE LA TARJETA */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Título */}
        <h3 className="text-lg font-bold text-gray-800 mb-1 leading-tight">
          {product.Nombre}
        </h3>
        
        {/* Separador Naranja Pequeño (Detalle estético opcional) */}
        <div className="w-10 h-1 bg-[#ff6d22]/30 rounded-full mb-2"></div>

        {/* Descripción */}
        <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed">
          {product.Descripcion || "Deliciosa opción preparada con los mejores ingredientes de la casa."}
        </p>
      </div>
    </div>
  );
}