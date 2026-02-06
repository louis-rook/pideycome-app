"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, User, Menu, LogOut, ChevronDown, Calendar } from 'lucide-react';
import { getCurrentUser } from '@/lib/api/auth';
import { logout } from '@/actions/auth';
import Link from 'next/link';
import Image from 'next/image';
import NotificationBtn from '@/components/layout/NotificationBtn';

interface TopBarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export default function TopBar({ isSidebarOpen, toggleSidebar }: TopBarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Fecha actual formateada
  const fechaHoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' });

  // Título dinámico según la ruta
  const getTitle = () => {
    if (pathname.includes('/admin/pedidos')) return 'Gestión de Pedidos';
    if (pathname.includes('/admin/menu')) return 'Gestión de Menú';
    if (pathname.includes('/admin/personas')) return 'Gestión de Personal';
    if (pathname.includes('/admin/perfil')) return 'Mi Perfil';
    return 'Resumen General';
  };

  useEffect(() => {
    async function loadUser() {
      const datos = await getCurrentUser();
      if (datos) setUser(datos);
    }
    loadUser();
  }, [pathname]);

  return (
    <header
      className={`fixed top-0 right-0 h-[80px] bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 z-40 transition-all duration-300 ease-in-out shadow-sm`}
      style={{ left: isSidebarOpen ? '16rem' : '5rem' }}
    >

      {/* IZQUIERDA: Toggle + Título Limpio */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 text-gray-500 hover:bg-gray-100 hover:text-[#ff6d22] rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800 leading-tight">{getTitle()}</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3" /> {fechaHoy}
          </p>
        </div>
      </div>

      {/* DERECHA: Usuario y Acciones */}
      <div className="flex items-center gap-6">

        {/* Notificaciones */}
       <NotificationBtn />

        <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

        {/* Perfil Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 focus:outline-none group"
          >
            <div className="text-right hidden md:block">
              {/* Solo mostramos el Nombre en el botón, no en el título grande */}
              <p className="text-sm font-bold text-gray-700 leading-none group-hover:text-[#ff6d22] transition-colors">
                {user?.Nombres || 'Usuario'}
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                {user?.Cargo || '...'}
              </p>
            </div>

            <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200/50 shadow-sm">
              {user?.FotoPerfil ? (
                <Image
                  src={user.FotoPerfil}
                  alt="Perfil"
                  // 2. Definimos el tamaño de salida (Next.js creará una versión de este tamaño)
                  width={40}
                  height={40}
                  // 3. Calidad al máximo para evitar ruido en el redimensionamiento
                  quality={100}
                  // 4. Clases para el ajuste visual
                  className="object-cover w-full h-full antialiased"
                  // 5. Prioridad para que el Header cargue de inmediato
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {/* Menú Flotante */}
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div>
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-sm font-bold text-gray-800">{user?.Nombres} {user?.Apellidos}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.Email}</p>
                </div>
                {/* ✅ BOTÓN MI PERFIL (AGREGAR ESTO) */}
                <Link
                  href="/admin/perfil"
                  className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-[#ff6d22] transition-colors border-b border-gray-100"

                >
                  <User className="w-4 h-4" />
                  <span>Mi Perfil</span>
                </Link>            <button onClick={() => logout()} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors text-left">
                  <LogOut className="w-4 h-4" /> Cerrar Sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}