import type { Metadata } from "next";
// Importación de fuentes de Google configuradas como variables CSS
import { Inter, Playfair_Display } from "next/font/google"; 
import "./globals.css";
import { CartProvider } from "@/context/CartContext"; // Estado global del carrito
import MainLayout from "@/components/MainLayout"; // Router inteligente de layout público/privado
import { Toaster } from 'sonner'; // Librería de notificaciones tipo Toast

// Fuente Sans-Serif para cuerpo de texto
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Fuente Serif para títulos elegantes
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Tu Restaurante",
  description: "El mejor sabor de la ciudad",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        {/* Envoltura del proveedor de estado: hace que el carrito sea accesible en toda la app */}
        <CartProvider>
          {/* El MainLayout gestiona si se muestra la Navbar pública o el Sidebar administrativo */}
          <MainLayout>
            {children}
          </MainLayout>
        </CartProvider>
        
        {/* Componente flotante para mostrar alertas (Ej: "Producto agregado") */}
        <Toaster position="top-center" /> 
      </body>
    </html>
  );
}