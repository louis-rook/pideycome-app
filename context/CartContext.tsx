"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProductoConPrecio } from '@/lib/api/products';
import { toast } from 'sonner';

export interface CartItem extends ProductoConPrecio {
  cantidad: number;
  observaciones: string;
  uuid: string;
}

interface CartContextType {
  carrito: CartItem[];
  agregarAlCarrito: (producto: ProductoConPrecio, cantidad: number, observaciones: string) => void;
  eliminarDelCarrito: (uuid: string) => void;
  actualizarCantidad: (uuid: string, nuevaCantidad: number) => void;
  limpiarCarrito: () => void;
  totalItems: number;
  precioTotal: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // Para evitar error de hidratación

  // 1. Cargar del storage SOLO en el cliente
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('pideycome_cart');
    if (saved) {
      try { setCarrito(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  // 2. Guardar cambios
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('pideycome_cart', JSON.stringify(carrito));
    }
  }, [carrito, mounted]);

  const agregarAlCarrito = (producto: ProductoConPrecio, cantidad: number, observaciones: string) => {
    setCarrito(prev => {
      const newItem: CartItem = { 
        ...producto, 
        cantidad, 
        observaciones, 
        uuid: `${producto.ProductoID}-${Date.now()}` // ID único para item
      };
      toast.success("Producto agregado");
      return [...prev, newItem];
    });
    setIsCartOpen(true);
  };

  const eliminarDelCarrito = (uuid: string) => {
    setCarrito(prev => prev.filter(item => item.uuid !== uuid));
  };

  const actualizarCantidad = (uuid: string, cant: number) => {
    setCarrito(prev => prev.map(item => item.uuid === uuid ? { ...item, cantidad: Math.max(1, cant) } : item));
  };

  const limpiarCarrito = () => {
    setCarrito([]);
    localStorage.removeItem('pideycome_cart');
  };

  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const precioTotal = carrito.reduce((sum, item) => sum + (item.Precio * item.cantidad), 0);

  // Evitar renderizar hijos hasta que estemos en cliente para que coincida el HTML
  if (!mounted) return null;

  return (
    <CartContext.Provider value={{ 
      carrito, agregarAlCarrito, eliminarDelCarrito, actualizarCantidad, limpiarCarrito, 
      totalItems, precioTotal, isCartOpen, openCart: () => setIsCartOpen(true), closeCart: () => setIsCartOpen(false) 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider');
  return context;
};