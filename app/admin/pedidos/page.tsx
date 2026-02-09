import React, { Suspense } from 'react';
import { getPedidosAdmin } from '@/lib/api/orders';
import PedidosKanban from '@/components/pedidos/PedidosKanban';
import { Loader2 } from 'lucide-react';

// Fuerza la renderización dinámica para obtener pedidos en tiempo real.
export const dynamic = 'force-dynamic'; 

export default async function AdminPedidosPage() {
  
  // 1. OBTENCIÓN DE PEDIDOS
  // Traemos los pedidos desde el servidor. Esto incluye la relación con clientes y detalles.
  const pedidosData = await getPedidosAdmin();

  return (
    // Contenedor con altura calculada para evitar scroll global y usar scroll interno en el Kanban.
    <div className="h-[calc(100vh-100px)] flex flex-col">
       <Suspense fallback={
         <div className="h-full flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
         </div>
       }>
          {/* 2. COMPONENTE CLIENTE (KANBAN)
              Le inyectamos los pedidos obtenidos en el servidor como estado inicial. */}
          <PedidosKanban initialPedidos={pedidosData || []} />
       </Suspense>
    </div>
  );
}