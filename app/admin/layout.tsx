"use client";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar'; // Menú lateral navegable
import TopBar from '@/components/admin/TopBar'; // Barra superior (Perfil, Notificaciones)
import { NotificationProvider } from '@/context/NotificationContext'; // Proveedor de estados para alertas

// ============================================================================
// COMPONENTE: LAYOUT ADMINISTRATIVO
// ============================================================================
/**
 * Envuelve todas las páginas dentro de /admin.
 * Maneja la sincronización visual entre el Sidebar y el contenido principal.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  
  // --- ESTADO GLOBAL DEL SIDEBAR ---
  // true: El menú está expandido (w-64)
  // false: El menú está contraído (w-20)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Función para alternar el estado del sidebar desde el botón de hamburguesa en el TopBar
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    // Proveedor de Notificaciones: Permite que cualquier página hija dispare alertas visuales
    <NotificationProvider>
    <div className="min-h-screen bg-[#F8F9FA]">
      
      {/* 1. SIDEBAR (Lateral)
          Se le pasa la función 'setIsOpen' para que pueda autocerrarse en móviles (Lógica agregada anteriormente)
      */}
      <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* 2. TOPBAR (Superior)
          Se mantiene fijo arriba. Recibe el estado para saber si debe mostrar el logo o alinearse.
      */}
      <TopBar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* 3. CONTENIDO PRINCIPAL (Main)
          [RESPONSIVE]: 
          - pt-[100px]: Espacio para no quedar debajo del TopBar fijo.
          - transition-all: Suaviza el movimiento cuando el sidebar se abre o cierra.
          - style dynamic padding: Ajusta el margen izquierdo para no ser tapado por el sidebar.
      */}
      <main 
        className={`pt-[100px] px-6 pb-6 min-h-screen transition-all duration-300 ease-in-out`}
        style={{ paddingLeft: isSidebarOpen ? '17.5rem' : '6.5rem' }}
      >
        {/* Contenedor con ancho máximo para que en pantallas Ultra-Wide no se estire infinitamente */}
        <div className="max-w-[1600px] mx-auto h-full">
            {children}
        </div>
      </main>
      
    </div>
    </NotificationProvider>
  );
}