"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cambiarEstadoPedido } from '@/actions/orders';
import { getCurrentUser } from '@/lib/api/auth';
import { RefreshCw, Clock, ChefHat, CheckCircle, Banknote, Package, X } from 'lucide-react';

import OrderCard from '@/components/pedidos/OrderCard';
import PaymentModal from '@/components/pedidos/PaymentModal';

const ESTADO = {
  POR_CONFIRMAR: 1,
  EN_COLA: 2,
  PREPARANDO: 3,
  LISTO: 4,
  ENTREGADO: 5,
  CANCELADO: 6
};

// TUS COLUMNAS ORIGINALES (INTACTAS)
const COLUMNAS = [
  { id: ESTADO.POR_CONFIRMAR, ids: [1], titulo: 'Por Confirmar', color: 'text-yellow-600', border: 'border-l-yellow-400', bg: 'bg-yellow-50', icon: Clock },
  { id: ESTADO.EN_COLA,       ids: [2], titulo: 'En Cola',       color: 'text-cyan-600',   border: 'border-l-cyan-400',   bg: 'bg-cyan-50',   icon: Banknote },
  { id: ESTADO.PREPARANDO,    ids: [3, 7], titulo: 'Preparando', color: 'text-orange-600', border: 'border-l-orange-500', bg: 'bg-orange-50', icon: ChefHat },
  { id: ESTADO.LISTO,         ids: [4], titulo: 'Listos',        color: 'text-blue-600',   border: 'border-l-blue-500',   bg: 'bg-blue-50',   icon: CheckCircle },
  { id: ESTADO.ENTREGADO,     ids: [5], titulo: 'Entregados',    color: 'text-green-600',  border: 'border-l-green-500',  bg: 'bg-green-50',  icon: Package },
  { id: ESTADO.CANCELADO,     ids: [6], titulo: 'Cancelados',    color: 'text-red-600',    border: 'border-l-red-500',    bg: 'bg-red-50',    icon: X }
];

interface PedidosKanbanProps {
  initialPedidos: any[]; // Recibimos los datos del servidor
}

export default function PedidosKanban({ initialPedidos }: PedidosKanbanProps) {
  const router = useRouter();
  
  // Inicializamos con los datos del servidor, pero aplicaremos el filtro en el efecto
  const [pedidos, setPedidos] = useState<any[]>([]); 
  const [rolUsuario, setRolUsuario] = useState("");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<any>(null);

  // TU LÓGICA DE PROCESAMIENTO (LA MOVÍ AQUÍ PARA REUTILIZARLA)
  const procesarPedidos = (data: any[]) => {
    // 1. Filtrar solo pedidos de HOY
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const fechaHoyString = `${year}-${month}-${day}`;

    const pedidosHoy = data.filter((p: any) => p.Fecha.startsWith(fechaHoyString));

    // 2. Calcular Contador Diario (1, 2, 3...)
    pedidosHoy.sort((a: any, b: any) => new Date(a.Fecha).getTime() - new Date(b.Fecha).getTime());

    const pedidosConContador = pedidosHoy.map((p: any, index: number) => ({
        ...p,
        NroDiario: index + 1
    }));

    // 3. Volver a ordenar descendente (nuevo a viejo) para el Kanban
    pedidosConContador.sort((a: any, b: any) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime());

    return pedidosConContador;
  };

  useEffect(() => {
    const init = async () => {
        // Cargamos usuario como lo hacías tú
        const user: any = await getCurrentUser();
        if (user) setRolUsuario(user.Cargo?.toLowerCase() || "");
        
        // Procesamos los pedidos que llegaron del servidor
        setPedidos(procesarPedidos(initialPedidos));
        setLoading(false);
    };
    init();

    // TU INTERVALO (Usamos router.refresh para actualizar los datos del servidor)
    const interval = setInterval(() => {
        router.refresh(); 
    }, 5000);
    return () => clearInterval(interval);
  }, [initialPedidos, router]); // Se ejecuta cuando initialPedidos cambia (updates del server)

  // TU LÓGICA DE PERMISOS (INTACTA)
  const puedeMover = (estadoOrigen: number) => {
      if (!rolUsuario) return true;
      if (rolUsuario.includes('admin')) return true;
      if (rolUsuario.includes('cocinero')) {
          return estadoOrigen === ESTADO.EN_COLA || estadoOrigen === ESTADO.PREPARANDO;
      }
      if (rolUsuario.includes('mesero') || rolUsuario.includes('cajero')) {
          return estadoOrigen === ESTADO.POR_CONFIRMAR || estadoOrigen === ESTADO.LISTO;
      }
      if (rolUsuario.includes('mesero') || rolUsuario.includes('cajero') || rolUsuario.includes('lider')) {
          return estadoOrigen === ESTADO.LISTO;
      }
      return false;
  };

  // TU LÓGICA DE AVANZAR ESTADO (INTACTA)
  const handleAvanzarEstado = async (pedido: any, nuevoEstado: number) => {
      if (nuevoEstado === ESTADO.EN_COLA) {
          setSelectedPedido(pedido);
          setShowModal(true);
          return;
      }

      if (nuevoEstado === ESTADO.CANCELADO) {
          if(!confirm("¿Estás seguro de cancelar este pedido? Esta acción no se puede deshacer.")) return;
      }

      try {
          // Optimistic update (opcional, pero ayuda a la velocidad)
          const nuevos = pedidos.map(p => p.PedidoID === pedido.PedidoID ? {...p, EstadoID: nuevoEstado} : p);
          setPedidos(nuevos);

          await cambiarEstadoPedido(pedido.PedidoID, nuevoEstado);
          router.refresh(); // Pedimos datos nuevos al servidor
      } catch (error: any) {
          alert("Error: " + error.message);
      }
  };

  // TU LÓGICA DE PAGO (INTACTA)
  const handlePagoConfirmado = async (detallesPago: any) => {
      if (!selectedPedido) return;
      try {
          await cambiarEstadoPedido(selectedPedido.PedidoID, ESTADO.EN_COLA, detallesPago);
          setShowModal(false);
          router.refresh();
      } catch (error: any) {
          alert(error.message);
      }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Cargando tablero...</div>;

  // TU DISEÑO VISUAL (INTACTO)
  return (
    <div className="h-full flex flex-col">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-3 px-1">
         <h1 className="text-xl font-bold text-gray-800 font-playfair">Tablero de Pedidos (Hoy)</h1>
         <button onClick={() => router.refresh()} className="p-1.5 bg-white border rounded-lg hover:shadow-sm text-gray-500 hover:text-[#ff6d22] transition-colors">
            <RefreshCw className="w-4 h-4" />
         </button>
      </div>

      {/* KANBAN BOARD */}
      <div className="flex-1 min-h-0">
        <div className="flex h-full gap-3 w-full">
            
            {COLUMNAS.map(col => {
                const pedidosColumna = pedidos.filter(p => col.ids.includes(p.EstadoID));

                return (
                    <div key={col.id} className="flex flex-col flex-1 min-w-0 h-full bg-gray-50/50 rounded-xl border border-gray-200/60 shadow-sm">
                        
                        {/* Cabecera Columna */}
                        <div className={`p-2 flex items-center justify-between bg-white rounded-t-xl border-b border-gray-100 sticky top-0 z-10`}>
                            <div className="flex items-center gap-1.5 font-bold text-gray-700 text-sm truncate">
                                <col.icon className={`w-4 h-4 shrink-0 ${col.color}`} />
                                <span className="truncate">{col.titulo}</span>
                            </div>
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-200 shrink-0">
                                {pedidosColumna.length}
                            </span>
                        </div>

                        {/* Cuerpo Columna */}
                        <div className="flex-1 p-2 overflow-y-auto space-y-2 custom-scrollbar">
                            {pedidosColumna.map(p => (
                                <OrderCard 
                                    key={p.PedidoID}
                                    pedido={p}
                                    rolUsuario={rolUsuario}
                                    colBorder={col.border}
                                    canMove={puedeMover(p.EstadoID)}
                                    onAction={handleAvanzarEstado}
                                />
                            ))}
                            
                            {pedidosColumna.length === 0 && (
                                <div className="h-full flex items-center justify-center opacity-30">
                                    <col.icon className="w-8 h-8 text-gray-400" />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

     <PaymentModal 
        isOpen={showModal}
        pedido={selectedPedido}
        rolUsuario={rolUsuario} 
        onClose={() => setShowModal(false)}
        onConfirm={handlePagoConfirmado}
      />
    </div>
  );
}