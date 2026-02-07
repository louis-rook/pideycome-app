"use client";

import React, { useEffect } from 'react'; // 1. Importamos useEffect
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ClipboardList, 
  UtensilsCrossed, 
  Users,
  ArrowLeft
} from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void; // 2. Agregamos esta función para poder cambiar el estado
}

export default function AdminSidebar({ isOpen, setIsOpen }: AdminSidebarProps) {
  const pathname = usePathname();

  // 3. LÓGICA RESPONSIVE: Detectar cambio de tamaño
  useEffect(() => {
    const handleResize = () => {
      // Si el ancho de la pantalla es menor a 768px (Tablet/Móvil)
      // y el sidebar está abierto, lo cerramos automáticamente.
      if (window.innerWidth < 768) {
        setIsOpen(false);
      }
    };

    // Ejecutamos la función una vez al cargar por si entra directo desde el móvil
    handleResize();

    // Escuchamos el evento de redimensionar
    window.addEventListener('resize', handleResize);

    // Limpiamos el evento cuando el componente se desmonta
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsOpen]);

  const menuItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/pedidos', icon: ClipboardList, label: 'Pedidos' },
    { href: '/admin/menu', icon: UtensilsCrossed, label: 'Menú' },
    { href: '/admin/personal', icon: Users, label: 'Personal' },
  ];

  return (
    <aside 
      className={`fixed left-0 top-0 h-full bg-white border-r border-gray-100 flex flex-col py-6 z-50 transition-all duration-300 ease-in-out shadow-lg ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* 1. CABECERA: LOGO + NOMBRE */}
      <div className="px-4 mb-8">
        
        <div className={`flex items-center gap-3 transition-all duration-300 ${isOpen ? 'justify-start' : 'justify-center'}`}>
            <div className={`relative shrink-0 transition-all duration-300 ${isOpen ? 'w-10 h-10' : 'w-12 h-12'}`}>
                <Image 
                  src="/img/logoPyC.png" 
                  alt="Logo" 
                  fill 
                  className="object-contain items-center"
                  priority
                />
            </div>
            
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                <h1 className="font-playfair font-bold text-gray-800 text-lg leading-tight">Pide&Come</h1>
                <p className="text-[10px] text-[#ff6d22] font-bold tracking-widest uppercase">Panel Admin</p>
            </div>
        </div>

      </div>

      {/* 2. MENÚ DE NAVEGACIÓN */}
      <nav className="flex-1 flex flex-col gap-2 px-3">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden whitespace-nowrap
                ${isActive 
                  ? 'bg-[#ff6d22] text-white shadow-md shadow-orange-200' 
                  : 'text-gray-500 hover:bg-orange-50 hover:text-[#ff6d22]'}
                ${!isOpen && 'justify-center'}
              `}
            >
              <item.icon className={`w-6 h-6 shrink-0 ${isActive ? '' : 'text-gray-400 group-hover:text-[#ff6d22]'}`} />
              
              <span className={`font-medium transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                {item.label}
              </span>

              {/* Tooltip flotante (Solo cerrado) */}
              {!isOpen && (
                <div className="absolute left-14 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none shadow-lg">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 3. FOOTER: VOLVER AL SITIO */}
      <div className="px-3 mt-auto">
        <Link 
            href="/"
            className={`
                flex items-center gap-3 px-3 py-3 w-full rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all border border-transparent hover:border-gray-200
                ${!isOpen && 'justify-center'}
            `}
        >
            <ArrowLeft className="w-6 h-6 shrink-0" />
            <span className={`font-bold text-sm whitespace-nowrap transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                Volver al Sitio Web
            </span>
             
             {!isOpen && (
                <div className="absolute left-14 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none shadow-lg">
                  Volver
                </div>
              )}
        </Link>
        
        <div className={`mt-4 text-[10px] text-center text-gray-300 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
              v2.1.0
        </div>
      </div>
    </aside>
  );
}