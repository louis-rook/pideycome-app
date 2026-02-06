import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google"; // Tus fuentes
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import MainLayout from "@/components/MainLayout"; // <--- IMPORTANTE
import { Toaster } from 'sonner';

// Configuración de fuentes (mantenla como la tengas)
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
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
        <CartProvider>
          {/* Envolvemos todo en MainLayout para que decida qué mostrar */}
          <MainLayout>
            {children}
          </MainLayout>
        </CartProvider>
        <Toaster position="top-center" /> {/* <--- AGREGA ESTO AL FINAL */}
      </body>
    </html>
  );
}