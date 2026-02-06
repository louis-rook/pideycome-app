"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProductoConPrecio } from '@/lib/api/products';

// Definimos la estructura del item en el carrito
export interface CartItem extends ProductoConPrecio {
  cantidad: number;
  observaciones: string;
  uuid: string; // Identificador único para diferenciar items iguales con notas distintas
}

interface CartContextType {
  carrito: CartItem[];
  agregarAlCarrito: (producto: ProductoConPrecio, cantidad: number, observaciones: string) => void;
  eliminarDelCarrito: (uuid: string) => void;
  actualizarCantidad: (uuid: string, nuevaCantidad: number) => void;
  limpiarCarrito: () => void;
  totalItems: number;
  precioTotal: number;
  // NUEVO: Control visual del carrito
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false); // Estado para abrir/cerrar

  // Cargar desde localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('pideycome_cart');
    if (savedCart) setCarrito(JSON.parse(savedCart));
  }, []);

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem('pideycome_cart', JSON.stringify(carrito));
  }, [carrito]);

  const agregarAlCarrito = (producto: ProductoConPrecio, cantidad: number, observaciones: string) => {
    setCarrito(prev => {
      // Generamos un ID único simple para manejar duplicados con notas distintas
      const newItem = { 
        ...producto, 
        cantidad, 
        observaciones,
        uuid: `${producto.ProductoID}-${Date.now()}` 
      };
      return [...prev, newItem];
    });
    setIsCartOpen(true); // Abrimos el carrito automáticamente al agregar
  };

  const eliminarDelCarrito = (uuid: string) => {
    setCarrito(prev => prev.filter(item => item.uuid !== uuid));
  };

  const actualizarCantidad = (uuid: string, nuevaCantidad: number) => {
    setCarrito(prev => prev.map(item => {
      if (item.uuid === uuid) {
        return { ...item, cantidad: Math.max(1, nuevaCantidad) };
      }
      return item;
    }));
  };

  const limpiarCarrito = () => setCarrito([]);

  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const precioTotal = carrito.reduce((sum, item) => sum + (item.Precio * item.cantidad), 0);

  return (
    <CartContext.Provider value={{ 
      carrito, 
      agregarAlCarrito, 
      eliminarDelCarrito, 
      actualizarCantidad,
      limpiarCarrito, 
      totalItems, 
      precioTotal,
      isCartOpen,
      openCart: () => setIsCartOpen(true),
      closeCart: () => setIsCartOpen(false)
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de un CartProvider");
  return context;
};