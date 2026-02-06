"use client";

import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import TopBar from '@/components/admin/TopBar';
import { NotificationProvider } from '@/context/NotificationContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Estado del Sidebar (true = Expandido, false = Colapsado)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <NotificationProvider>
    <div className="min-h-screen bg-[#F8F9FA]">
      
      {/* 1. Sidebar Controlado */}
      <AdminSidebar isOpen={isSidebarOpen} />

      {/* 2. TopBar Controlado */}
      <TopBar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* 3. Contenido Principal */}
      <main 
        className={`pt-[100px] px-6 pb-6 min-h-screen transition-all duration-300 ease-in-out`}
        // Ajustamos el padding izquierdo según el estado del sidebar
        style={{ paddingLeft: isSidebarOpen ? '17.5rem' : '6.5rem' }}
      >
        <div className="max-w-[1600px] mx-auto h-full">
            {children}
        </div>
      </main>
      
    </div>
    </NotificationProvider>
  );
}