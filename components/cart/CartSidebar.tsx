"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function CartSidebar() {
  const { 
    carrito, 
    isCartOpen, 
    closeCart, 
    eliminarDelCarrito, 
    actualizarCantidad, 
    precioTotal 
  } = useCart();

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[1040] transition-opacity duration-300 ${
          isCartOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
        onClick={closeCart}
      />

      {/* Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[1050] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2 text-[#ff6d22]">
            <ShoppingBag className="w-6 h-6" />
            <h2 className="text-xl font-bold font-playfair text-gray-800">Tu Pedido</h2>
          </div>
          <button 
            onClick={closeCart}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Lista de Items */}
        <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-gray-50/50">
          {carrito.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
              <ShoppingBag className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">Tu carrito está vacío</p>
              <button onClick={closeCart} className="mt-4 text-[#ff6d22] font-bold hover:underline">
                Volver al menú
              </button>
            </div>
          ) : (
            carrito.map((item) => (
              <div key={item.uuid} className="flex gap-4 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  {item.Imagen ? (
                    <Image src={item.Imagen} alt={item.Nombre} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Sin foto</div>
                  )}
                </div>

                <div className="flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{item.Nombre}</h3>
                    {item.observaciones && (
                      <p className="text-xs text-gray-500 italic mt-1 line-clamp-1">"{item.observaciones}"</p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-[#ff6d22] text-sm">
                      $ {(item.Precio * item.cantidad).toLocaleString('es-CO')}
                    </span>
                    
                    <div className="flex items-center bg-gray-100 rounded-lg h-7">
                      <button 
                        onClick={() => actualizarCantidad(item.uuid, item.cantidad - 1)}
                        className="w-7 h-full flex items-center justify-center text-gray-600 hover:text-[#ff6d22]"
                        disabled={item.cantidad <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-6 text-center">{item.cantidad}</span>
                      <button 
                         onClick={() => actualizarCantidad(item.uuid, item.cantidad + 1)}
                         className="w-7 h-full flex items-center justify-center text-gray-600 hover:text-[#ff6d22]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => eliminarDelCarrito(item.uuid)}
                  className="text-gray-300 hover:text-red-500 self-start p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {carrito.length > 0 && (
          <div className="p-5 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500 font-medium">Subtotal</span>
              <span className="text-2xl font-extrabold text-gray-900">$ {precioTotal.toLocaleString('es-CO')}</span>
            </div>
            
            {/* BOTÓN ARREGLADO: Estilos directos para asegurar visibilidad */}
            <Link 
              href="/pago" 
              onClick={closeCart}
              className="w-full bg-[#ff6d22] text-white rounded-full py-4 flex items-center justify-center gap-2 font-bold text-lg shadow-lg hover:bg-[#e65c19] hover:scale-[1.02] active:scale-95 transition-all duration-200"
            >
              Ir a Pagar <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}