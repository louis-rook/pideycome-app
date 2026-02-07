"use client";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// Iconos
import { RefreshCw, Clock, ChefHat, CheckCircle, Banknote, Package, X } from 'lucide-react';

// Acciones y API
import { cambiarEstadoPedido } from '@/actions/orders';
import { getCurrentUser } from '@/lib/api/auth';

// Componentes Hijos
import OrderCard from '@/components/pedidos/OrderCard';
import PaymentModal from '@/components/pedidos/PaymentModal';

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

// IDs de los estados en Base de Datos (Para legibilidad)
const ESTADO = {
  POR_CONFIRMAR: 1,
  EN_COLA: 2,
  PREPARANDO: 3,
  LISTO: 4,
  ENTREGADO: 5,
  CANCELADO: 6
};

// Configuración Visual de las Columnas del Kanban
const COLUMNAS = [
  { id: ESTADO.POR_CONFIRMAR, ids: [1], titulo: 'Por Confirmar', color: 'text-yellow-600', border: 'border-l-yellow-400', bg: 'bg-yellow-50', icon: Clock },
  { id: ESTADO.EN_COLA,       ids: [2], titulo: 'En Cola',       color: 'text-cyan-600',   border: 'border-l-cyan-400',   bg: 'bg-cyan-50',   icon: Banknote },
  { id: ESTADO.PREPARANDO,    ids: [3, 7], titulo: 'Preparando', color: 'text-orange-600', border: 'border-l-orange-500', bg: 'bg-orange-50', icon: ChefHat },
  { id: ESTADO.LISTO,         ids: [4], titulo: 'Listos',        color: 'text-blue-600',   border: 'border-l-blue-500',   bg: 'bg-blue-50',   icon: CheckCircle },
  { id: ESTADO.ENTREGADO,     ids: [5], titulo: 'Entregados',    color: 'text-green-600',  border: 'border-l-green-500',  bg: 'bg-green-50',  icon: Package },
  { id: ESTADO.CANCELADO,     ids: [6], titulo: 'Cancelados',    color: 'text-red-600',    border: 'border-l-red-500',    bg: 'bg-red-50',    icon: X }
];

interface PedidosKanbanProps {
  initialPedidos: any[]; // Datos iniciales del servidor
}

export default function PedidosKanban({ initialPedidos }: PedidosKanbanProps) {
  const router = useRouter();
  
  // ============================================================================
  // ESTADOS (Hooks)
  // ============================================================================
  const [pedidos, setPedidos] = useState<any[]>([]); 
  const [rolUsuario, setRolUsuario] = useState("");
  const [loading, setLoading] = useState(true);

  // Control del Modal de Pago
  const [showModal, setShowModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<any>(null);

  // ============================================================================
  // LÓGICA DE PROCESAMIENTO
  // ============================================================================
  
  /**
   * Filtra los pedidos para mostrar solo los de HOY y les asigna un número consecutivo diario.
   */
  const procesarPedidos = (data: any[]) => {
    // 1. Filtrar solo pedidos de HOY
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const fechaHoyString = `${year}-${month}-${day}`;

    const pedidosHoy = data.filter((p: any) => p.Fecha.startsWith(fechaHoyString));

    // 2. Ordenar cronológicamente para asignar turno (1, 2, 3...)
    pedidosHoy.sort((a: any, b: any) => new Date(a.Fecha).getTime() - new Date(b.Fecha).getTime());

    const pedidosConContador = pedidosHoy.map((p: any, index: number) => ({
        ...p,
        NroDiario: index + 1 // Turno del día
    }));

    // 3. Reordenar descendente (Lo más nuevo arriba) para visualizar en el Kanban
    pedidosConContador.sort((a: any, b: any) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime());

    return pedidosConContador;
  };

  // ============================================================================
  // EFECTOS
  // ============================================================================
  
  // Carga inicial y suscripción a cambios
  useEffect(() => {
    const init = async () => {
        // Obtener rol del usuario actual para permisos
        const user: any = await getCurrentUser();
        if (user) setRolUsuario(user.Cargo?.toLowerCase() || "");
        
        // Procesar datos iniciales
        setPedidos(procesarPedidos(initialPedidos));
        setLoading(false);
    };
    init();

    // Polling: Actualizar datos cada 5 segundos
    const interval = setInterval(() => {
        router.refresh(); 
    }, 5000);
    return () => clearInterval(interval);
  }, [initialPedidos, router]);

  // ============================================================================
  // LÓGICA DE PERMISOS Y ACCIONES
  // ============================================================================

  // Define si el usuario actual puede mover una tarjeta desde su estado actual
  const puedeMover = (estadoOrigen: number) => {
      if (!rolUsuario) return true; // Fallback por seguridad
      if (rolUsuario.includes('admin')) return true;
      
      // Cocineros solo mueven lo que está en cocina
      if (rolUsuario.includes('cocinero')) {
          return estadoOrigen === ESTADO.EN_COLA || estadoOrigen === ESTADO.PREPARANDO;
      }
      // Meseros/Cajeros confirman pedidos y entregan
      if (rolUsuario.includes('mesero') || rolUsuario.includes('cajero')) {
          return estadoOrigen === ESTADO.POR_CONFIRMAR || estadoOrigen === ESTADO.LISTO;
      }
      // Líderes también pueden entregar
      if (rolUsuario.includes('lider')) {
          return estadoOrigen === ESTADO.LISTO;
      }
      return false;
  };

  // Maneja el cambio de columna
  const handleAvanzarEstado = async (pedido: any, nuevoEstado: number) => {
      // Si va a "En Cola", requiere confirmar Pago primero (Modal)
      if (nuevoEstado === ESTADO.EN_COLA) {
          setSelectedPedido(pedido);
          setShowModal(true);
          return;
      }

      // Confirmación para cancelar
      if (nuevoEstado === ESTADO.CANCELADO) {
          if(!confirm("¿Estás seguro de cancelar este pedido? Esta acción no se puede deshacer.")) return;
      }

      try {
          // Actualización Optimista (UI instantánea)
          const nuevos = pedidos.map(p => p.PedidoID === pedido.PedidoID ? {...p, EstadoID: nuevoEstado} : p);
          setPedidos(nuevos);

          // Actualización Servidor
          await cambiarEstadoPedido(pedido.PedidoID, nuevoEstado);
          router.refresh(); 
      } catch (error: any) {
          alert("Error: " + error.message);
      }
  };

  // Callback cuando se completa el pago en el Modal
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

  if (loading) return <div className="p-10 text-center text-gray-500 animate-pulse">Cargando tablero...</div>;

  // ============================================================================
  // RENDERIZADO (JSX)
  // ============================================================================
  return (
    <div className="h-full flex flex-col bg-[#F8F9FA]">
      
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center mb-3 px-4 pt-2">
         <h1 className="text-xl font-bold text-gray-800 font-playfair">Tablero de Pedidos (Hoy)</h1>
         <button 
            onClick={() => router.refresh()} 
            className="p-2 bg-white border border-gray-200 rounded-lg hover:shadow-md text-gray-500 hover:text-[#ff6d22] transition-all active:scale-95"
            title="Actualizar Tablero"
         >
            <RefreshCw className="w-4 h-4" />
         </button>
      </div>

      {/* --- KANBAN BOARD CONTAINER --- */}
      {/* [RESPONSIVE]: 
          - overflow-x-auto: Permite scroll horizontal en móviles si las columnas no caben.
          - pb-2: Espacio para la barra de desplazamiento.
      */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-2 px-2">
        
        {/* --- FLEX WRAPPER --- */}
        {/* [RESPONSIVE]: 
            - h-full: Ocupa toda la altura disponible.
            - w-max md:w-full: En móvil el ancho es la suma de las columnas (scroll), en PC es 100%.
        */}
        <div className="flex h-full gap-4 px-2 w-max md:w-full">
            
            {COLUMNAS.map(col => {
                const pedidosColumna = pedidos.filter(p => col.ids.includes(p.EstadoID));

                return (
                    // --- COLUMNA INDIVIDUAL ---
                    // [RESPONSIVE]: 
                    // - shrink-0: Evita que la columna se aplaste en móviles.
                    // - w-[300px]: Ancho fijo en móviles para legibilidad.
                    // - md:flex-1: En PC se distribuye el espacio equitativamente.
                    <div key={col.id} className="flex flex-col h-full bg-gray-50/50 rounded-xl border border-gray-200/60 shadow-sm shrink-0 w-[300px] md:w-auto md:flex-1">
                        
                        {/* Cabecera Columna */}
                        <div className={`p-3 flex items-center justify-between bg-white rounded-t-xl border-b border-gray-100 sticky top-0 z-10`}>
                            <div className="flex items-center gap-2 font-bold text-gray-700 text-sm truncate">
                                <col.icon className={`w-4 h-4 shrink-0 ${col.color}`} />
                                <span className="truncate">{col.titulo}</span>
                            </div>
                            <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-gray-200 shrink-0 shadow-sm">
                                {pedidosColumna.length}
                            </span>
                        </div>

                        {/* Cuerpo Columna (Scroll Vertical interno) */}
                        <div className="flex-1 p-2 overflow-y-auto space-y-3 custom-scrollbar">
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
                            
                            {/* Placeholder Vacío */}
                            {pedidosColumna.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2">
                                    <col.icon className="w-10 h-10 text-gray-400" />
                                    <span className="text-xs font-medium text-gray-400">Sin pedidos</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* --- MODAL DE PAGO --- */}
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