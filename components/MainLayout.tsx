"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar"; // Asegúrate que la ruta sea correcta
import Footer from "@/components/layout/Footer"; // Asegúrate que la ruta sea correcta
import CartSidebar from "@/components/cart/CartSidebar"; // Si tienes el carrito lateral

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Detectamos si estamos en panel admin o login
  const isPrivatePage = pathname.startsWith("/admin") || pathname.startsWith("/login");

  return (
    <>
      {/* Solo mostramos Navbar, Footer y Carrito si NO es página privada */}
      {!isPrivatePage && <Navbar />}
      {!isPrivatePage && <CartSidebar />}
      
      {children}
      
      {!isPrivatePage && <Footer />}
    </>
  );
}