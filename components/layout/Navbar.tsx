"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ShoppingCart, User, Menu, X, ChevronDown, LayoutDashboard, LogOut } from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface NavbarProps {
  onOpenCart?: () => void;
}

const Navbar = ({ onOpenCart }: NavbarProps) => {  
  const { totalItems, openCart } = useCart();

  const [user, setUser] = useState<any>(null);
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);

  // Estados para nombres
  const [username, setUsername] = useState<string>('');      // Para el botón (corto)
  const [nombreCompleto, setNombreCompleto] = useState<string>(''); // Para el menú (largo)

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        // Valor por defecto mientras carga la BD
        setUsername(session.user.email?.split('@')[0] || 'Cuenta');
        cargarDatosUsuario(session.user.id);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        cargarDatosUsuario(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const cargarDatosUsuario = async (userId: string) => {
    try {
      // AQUI ESTÁ EL CAMBIO: Traemos explícitamente el 'Username'
      const { data, error } = await supabase
        .from('usuario')
        .select(`
            Username,
            fotoperfil,
            empleado (
                tercero ( Nombres, Apellidos )
            )
        `)
        .eq('auth_user_id', userId)
        .single();

      if (data) {
        if (data.fotoperfil) setFotoPerfil(data.fotoperfil);

        // 1. Configurar Nombre Completo (Real)
        // @ts-ignore
        const nombres = data.empleado?.tercero?.Nombres;
        // @ts-ignore
        const apellidos = data.empleado?.tercero?.Apellidos;

        const nombreReal = nombres ? `${nombres} ${apellidos || ''}`.trim() : '';
        setNombreCompleto(nombreReal || data.Username || 'Usuario');

        // 2. Configurar Username para el Botón (Prioridad: Username DB -> Primer Nombre -> Email)
        if (data.Username) {
          setUsername(data.Username);
        } else if (nombres) {
          setUsername(nombres.split(' ')[0]);
        }
      }
    } catch (e) {
      console.error("Error cargando perfil:", e);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const navLinkClass = (path: string) =>
    `text-sm font-bold transition-colors hover:text-[#ff6d22] ${pathname === path ? 'text-[#ff6d22]' : 'text-gray-600'}`;

  return (
    <nav className="bg-white sticky top-0 z-50 shadow-sm h-[80px] flex items-center border-b border-gray-100">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">

        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-[140px] h-[60px]">
            <Image
              src="/img/logoPyC.png"
              alt="Pide y Come Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* ENLACES ESCRITORIO */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className={navLinkClass('/')}>INICIO</Link>
          <Link href="/products" className={navLinkClass('/products')}>MENÚ</Link>
          <Link href="/nosotros" className={navLinkClass('/nosotros')}>NOSOTROS</Link>
          <Link href="/contacto" className={navLinkClass('/contacto')}>CONTACTO</Link>
        </div>

        {/* ACCIONES */}
        <div className="flex items-center gap-4">

          {/* BOTÓN CARRITO */}
          <button onClick={openCart} className="relative p-2 text-gray-500 hover:text-[#ff6d22] transition-colors group">
            <ShoppingCart className="w-6 h-6 group-hover:scale-110 transition-transform" />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 bg-[#ff6d22] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white translate-x-1/4 -translate-y-1/4 shadow-sm animate-in zoom-in">
                {totalItems}
              </span>
            )}
          </button>

          {/* USUARIO / LOGIN */}
          {user ? (
            <div className="relative hidden md:block">

              {/* BOTÓN PERFIL (Usa Username de la BD) */}
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-full pl-1 pr-4 py-1 transition-all duration-200 group shadow-sm hover:shadow-md"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                  {user?.fotoPerfil ? (
                    <Image
                      src={user.fotoPerfil}
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

                {/* Aquí mostramos el Username obtenido de la BD */}
                <span className="text-sm font-bold text-gray-700 group-hover:text-[#ff6d22] transition-colors max-w-[120px] truncate">
                  {username}
                </span>

                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* DROPDOWN DESPLEGABLE */}
              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 animate-in fade-in zoom-in-95 duration-200">

                    {/* Cabecera Info */}
                    <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
                        Conectado como:
                      </p>
                      <p className="text-sm font-bold text-gray-800 truncate">
                        {nombreCompleto}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>

                    {/* Opciones */}
                    <div className="p-2">
                      <Link
                        href="/admin"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-[#ff6d22] rounded-lg transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <LayoutDashboard className="w-4 h-4" /> Panel Admin
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" /> Cerrar Sesión
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden md:inline-flex btn-primary rounded-pill px-8 py-2.5 min-w-[150px] items-center justify-center font-bold shadow-sm hover:shadow-md transition-all"
              style={{ marginTop: 0 }}
            >
              Iniciar Sesión
            </Link>
          )}

          {/* MENU MOVIL */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* DROPDOWN MOVIL */}
      {isMobileMenuOpen && (
        <div className="absolute top-[80px] left-0 w-full bg-white border-b border-gray-200 shadow-lg md:hidden flex flex-col p-4 gap-4 z-40">
          <Link href="/" className="text-lg font-bold text-gray-700" onClick={() => setIsMobileMenuOpen(false)}>INICIO</Link>
          <Link href="/products" className="text-lg font-bold text-gray-700" onClick={() => setIsMobileMenuOpen(false)}>MENÚ</Link>
          <hr />
          {!user ? (
            <Link href="/login" className="btn-primary rounded-pill py-3 text-center text-white font-bold" onClick={() => setIsMobileMenuOpen(false)}>
              Iniciar Sesión
            </Link>
          ) : (
            <Link href="/admin" className="btn-primary rounded-pill py-3 text-center text-white font-bold" onClick={() => setIsMobileMenuOpen(false)}>
              Ir al Panel ({username})
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;