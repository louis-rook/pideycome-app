"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Minus, Plus, ShoppingBag, MessageSquareText } from 'lucide-react';
import { ProductoConPrecio } from '@/lib/api/products';
import { useCart } from '@/context/CartContext'; // Lo crearemos a continuación

interface ProductModalProps {
  producto: ProductoConPrecio | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProductModal = ({ producto, isOpen, onClose }: ProductModalProps) => {
  const { agregarAlCarrito } = useCart(); // Hook de tu lógica original
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCantidad(1);
      setObservaciones('');
    }
  }, [isOpen, producto]);

  if (!isOpen || !producto) return null;

  const handleAddToCart = () => {
    agregarAlCarrito(producto, cantidad, observaciones);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop con desenfoque */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Contenedor Modal */}
      <div className="relative bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        
        {/* Cabecera con Imagen */}
        <div className="relative h-64 w-full bg-gray-100">
          {producto.Imagen ? (
            <Image 
              src={producto.Imagen} 
              alt={producto.Nombre} 
              fill 
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">Sin Imagen</div>
          )}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/90 hover:bg-white p-2 rounded-full text-gray-800 transition-all shadow-md z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto">
          <div className="flex justify-between items-start mb-3">
            <h2 className="text-3xl font-extrabold text-gray-900 font-playfair">{producto.Nombre}</h2>
            <div className="bg-orange-50 px-4 py-1 rounded-full border border-orange-100">
               <span className="text-xl font-black text-[#ff6d22]">$ {producto.Precio.toLocaleString('es-CO')}</span>
            </div>
          </div>

          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            {producto.Descripcion || "Un plato exquisito preparado con nuestra receta especial y los mejores ingredientes."}
          </p>

          {/* Observaciones (Mejorado visualmente) */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 text-gray-700">
              <MessageSquareText className="w-4 h-4 text-[#ff6d22]" />
              <label className="text-xs font-bold uppercase tracking-wider">Instrucciones especiales</label>
            </div>
            <textarea
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#ff6d22] focus:border-transparent outline-none transition-all resize-none"
              placeholder="¿Alguna alergia o preferencia? Escríbela aquí..."
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          {/* Control de Cantidad */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="font-bold text-gray-800">Cantidad</span>
            <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-gray-200">
              <button 
                onClick={() => setCantidad(prev => Math.max(1, prev - 1))}
                className="p-1 text-gray-400 hover:text-[#ff6d22] transition-colors"
                disabled={cantidad <= 1}
              >
                <Minus className="w-5 h-5" strokeWidth={3} />
              </button>
              <span className="text-lg font-black w-8 text-center">{cantidad}</span>
              <button 
                onClick={() => setCantidad(prev => prev + 1)}
                className="p-1 text-gray-400 hover:text-[#ff6d22] transition-colors"
              >
                <Plus className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer con Botón de Acción */}
        <div className="p-6 bg-white border-t border-gray-50">
          <button 
            onClick={handleAddToCart}
            className="w-full bg-[#ff6d22] hover:bg-[#e65c19] text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1 active:scale-95"
          >
            <ShoppingBag className="w-6 h-6" />
            Añadir por ${(producto.Precio * cantidad).toLocaleString('es-CO')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;