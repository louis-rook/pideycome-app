import React, { Suspense } from 'react';
import { getProductosAdmin } from '@/lib/api/admin-menu';
import { Loader2 } from 'lucide-react';
import MenuManager from '@/components/menu/MenuManager';

export const dynamic = 'force-dynamic';

export default async function MenuGestionPage() {
  
  // 1. CARGA DE DATOS (SERVER SIDE)
  // Obtenemos los productos rápido desde el servidor
  const productosData = await getProductosAdmin();

  // 2. RENDERIZADO
  // Pasamos los datos al componente cliente. 
  // La seguridad la manejará el componente usando tu lógica de siempre.
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