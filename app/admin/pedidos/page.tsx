import React, { Suspense } from 'react';
import { getPedidosAdmin } from '@/lib/api/orders';
import PedidosKanban from '@/components/pedidos/PedidosKanban';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic'; // Esto asegura que siempre traiga datos frescos

export default async function AdminPedidosPage() {
  // 1. OBTENEMOS LOS DATOS EN EL SERVIDOR (Instantáneo)
  const pedidosData = await getPedidosAdmin();

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
       <Suspense fallback={
         <div className="h-full flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
         </div>
       }>
          {/* 2. SE LOS PASAMOS A TU COMPONENTE VISUAL */}
          <PedidosKanban initialPedidos={pedidosData || []} />
       </Suspense>
    </div>
  );
}