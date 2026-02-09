import React, { Suspense } from 'react';
import { getProductosAdmin } from '@/lib/api/admin-menu';
import { Loader2 } from 'lucide-react';
import MenuManager from '@/components/menu/MenuManager';

// --- CONFIGURACIÓN DE NEXT.JS ---
// 'force-dynamic' asegura que la página no se guarde en caché estática.
// Esto es vital para que, si editas un producto, el cambio se vea reflejado inmediatamente al recargar.
export const dynamic = 'force-dynamic';

export default async function MenuGestionPage() {
  
  // 1. CARGA DE DATOS (SERVER SIDE)
  // Obtenemos la lista de productos directamente desde la base de datos antes de que la página cargue.
  // Al ser un Server Component, esta consulta es más rápida y segura.
  const productosData = await getProductosAdmin();

  // 2. RENDERIZADO CON SUSPENSE
  // Usamos Suspense para mostrar un spinner de carga mientras los datos terminan de procesarse.
  // Pasamos 'productosData' al componente cliente MenuManager como 'initialProductos'.
  return (
    <Suspense fallback={
        <div className="flex h-screen items-center justify-center text-gray-400">
           <Loader2 className="w-10 h-10 animate-spin text-[#ff6d22]" />
        </div>
    }>
        <MenuManager initialProductos={productosData || []} />
    </Suspense>
  );
}