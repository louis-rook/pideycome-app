"use client";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import React, { useState, useMemo, useEffect } from 'react';
import { 
    X, FileText, User, CheckCircle2, Search, ChevronDown, ChevronUp,
    Clock, AlertCircle, ChefHat, Banknote, BellRing, PackageCheck, HelpCircle, ShoppingCart, 
    Printer 
} from 'lucide-react';
import { imprimirTicket } from '@/utils/printer';

// ============================================================================
// INTERFAZ DE PROPS
// ============================================================================
// Define qué datos necesita este modal para funcionar
interface OrdersDetailModalProps {
  isOpen: boolean;       // Controla si el modal está visible o no
  onClose: () => void;   // Función para cerrar el modal
  pedidos: any[];        // Lista completa de pedidos a mostrar
}

export default function OrdersDetailModal({ isOpen, onClose, pedidos }: OrdersDetailModalProps) {
  
  // ============================================================================
  // ESTADOS (Hooks)
  // ============================================================================
  const [searchTerm, setSearchTerm] = useState(""); // Texto del buscador
  const [expandedPedidoId, setExpandedPedidoId] = useState<number | null>(null); // ID de la fila expandida

  // ============================================================================
  // EFECTOS
  // ============================================================================
  // Verifica si hay datos válidos al abrir el modal (útil para debugging)
  useEffect(() => {
    if (isOpen && pedidos && pedidos.length > 0) {
        const primer = pedidos[0];
        if(!primer.detallepedido) console.warn("⚠️ Detalles vacíos. Revisa permisos.");
    }
  }, [isOpen, pedidos]);

  // ============================================================================
  // FUNCIONES AUXILIARES (Helpers)
  // ============================================================================
  
  /**
   * Verifica si un objeto es un array y extrae el primer elemento, o devuelve el objeto.
   * Esto corrige problemas con la estructura de datos que devuelve Supabase a veces.
   */
  const safeGetObject = (data: any) => {
      if (!data) return null;
      if (Array.isArray(data)) return data.length > 0 ? data[0] : null;
      return data;
  };

  /**
   * Filtra los pedidos en tiempo real según lo que el usuario escriba en el buscador.
   * Busca por: ID, Nombre Cliente, Usuario (Mesero).
   */
  const filteredPedidos = useMemo(() => {
      if (!pedidos) return [];
      return pedidos.filter((p: any) => {
          const clienteObj = safeGetObject(p.cliente);
          const terceroObj = clienteObj ? safeGetObject(clienteObj.tercero) : null;
          const nombreCliente = terceroObj ? `${terceroObj.Nombres} ${terceroObj.Apellidos || ''}` : '';
          const usuarioObj = safeGetObject(p.usuario);
          const username = usuarioObj?.Username || '';
          const search = searchTerm.toLowerCase();

          return (
              p.PedidoID.toString().includes(search) ||
              nombreCliente.toLowerCase().includes(search) ||
              username.toLowerCase().includes(search)
          );
      });
  }, [pedidos, searchTerm]);

  /**
   * Devuelve el color, etiqueta e icono correspondiente a cada EstadoID.
   */
  const getEstadoInfo = (id: number) => {
      switch(id) {
          case 7: return { label: 'RECIBIDO', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: BellRing };
          case 1: return { label: 'CONFIRMAR', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock };
          case 3: return { label: 'COCINA', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: ChefHat };
          case 4: return { label: 'LISTO', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: PackageCheck };
          case 2: return { label: 'PAGADO', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Banknote };
          case 5: return { label: 'ENTREGADO', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 };
          case 6: return { label: 'CANCELADO', color: 'bg-red-50 text-red-700 border-red-200', icon: AlertCircle };
          default: return { label: `ESTADO ${id}`, color: 'bg-gray-50 text-gray-600 border-gray-200', icon: HelpCircle };
      }
  };

  // Expande o contrae los detalles de una fila
  const toggleRow = (id: number) => {
      if (expandedPedidoId === id) setExpandedPedidoId(null);
      else setExpandedPedidoId(id);
  };

  // Maneja el clic en la impresora evitando que se expanda la fila (stopPropagation)
  const handlePrintClick = (e: React.MouseEvent, pedidoId: number) => {
      e.stopPropagation(); 
      imprimirTicket(pedidoId);
  };

  // Si no está abierto, no renderiza nada
  if (!isOpen) return null;

  // ============================================================================
  // RENDERIZADO (JSX)
  // ============================================================================
  return (
    // Overlay oscuro de fondo (z-index alto para estar encima de todo)
    // [RESPONSIVE]: p-0 en móvil para aprovechar espacio, p-4 en escritorio
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* CONTENEDOR DEL MODAL
         [RESPONSIVE]: 
         - h-[95vh]: Ocupa casi toda la altura en móviles.
         - w-full: Ancho completo.
         - rounded-t-2xl: Bordes redondeados solo arriba en móvil (tipo hoja inferior).
         - sm:h-auto: En PC la altura es automática según el contenido.
      */}
      <div className="relative bg-white w-full max-w-6xl h-[95vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 flex flex-col">
        
        {/* --- HEADER --- */}
        <div className="bg-[#ff6d22] px-4 py-3 md:px-6 md:py-4 flex justify-between items-center text-white shrink-0">
          <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
             <FileText className="w-5 h-5" /> 
             {/* Ocultamos texto "Gestión de" en móvil para ahorrar espacio */}
             <span className="hidden sm:inline">Gestión de</span> Pedidos
          </h2>
          <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* --- BUSCADOR --- */}
        {/* [RESPONSIVE]: flex-col en móvil (uno debajo del otro), flex-row en PC */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row gap-3 justify-between items-center shrink-0">
             <div className="relative w-full sm:w-80 md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Buscar cliente, ID..." 
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#ff6d22] outline-none text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <div className="text-xs text-gray-500 font-medium w-full sm:w-auto text-center sm:text-right">
                 Resultados: <span className="text-[#ff6d22] font-bold">{filteredPedidos.length}</span>
             </div>
        </div>

        {/* --- TABLA DE DATOS --- */}
        {/* [RESPONSIVE]: overflow-auto permite hacer scroll si la tabla es muy grande */}
        <div className="flex-1 overflow-auto bg-gray-50/50">
          
          {/* [RESPONSIVE CRÍTICO]: min-w-[900px]
             Esto fuerza a que la tabla tenga un ancho mínimo de 900px.
             Si la pantalla del celular mide 350px, aparecerá scroll horizontal
             automáticamente, evitando que las columnas se aplasten.
          */}
          <table className="w-full text-left text-sm border-collapse min-w-[900px]">
            
            {/* Encabezados Fijos (Sticky) */}
            <thead className="bg-white text-gray-500 font-bold sticky top-0 z-10 border-b border-gray-200 shadow-sm">
              <tr>
                <th className="px-6 py-4 w-20 whitespace-nowrap">ID</th>
                <th className="px-6 py-4 whitespace-nowrap">Fecha</th>
                <th className="px-6 py-4 whitespace-nowrap">Cliente</th>
                <th className="px-6 py-4 whitespace-nowrap">Atendido por</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Estado</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Total</th>
                <th className="px-6 py-4 w-24 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredPedidos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400 italic">
                    {searchTerm ? 'No se encontraron resultados.' : 'No hay pedidos disponibles.'}
                  </td>
                </tr>
              ) : (
                filteredPedidos.map((p: any) => {
                   
                   // Procesamiento de datos seguro
                   const clienteObj = safeGetObject(p.cliente);
                   const terceroObj = clienteObj ? safeGetObject(clienteObj.tercero) : null;
                   const nombreCliente = terceroObj 
                      ? `${terceroObj.Nombres} ${terceroObj.Apellidos || ''}`.trim() 
                      : 'Cliente General';

                   const usuarioObj = safeGetObject(p.usuario);
                   const username = usuarioObj?.Username || 'Sin asignar';
                   
                   const estado = getEstadoInfo(p.EstadoID);
                   const EstadoIcon = estado.icon;
                   const isExpanded = expandedPedidoId === p.PedidoID;
                   const detalles = p.detallepedido || [];

                   return (
                    <React.Fragment key={p.PedidoID}>
                        
                        {/* --- FILA PRINCIPAL --- */}
                        <tr 
                            onClick={() => toggleRow(p.PedidoID)}
                            className={`cursor-pointer transition-colors border-l-4 ${isExpanded ? 'bg-orange-50 border-l-[#ff6d22]' : 'hover:bg-gray-50 border-l-transparent'}`}
                        >
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">#{p.PedidoID}</span>
                            </td>
                            <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-700 text-xs">{new Date(p.Fecha).toLocaleDateString()}</span>
                                    <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">{new Date(p.Fecha).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-700 whitespace-nowrap">
                                <div className="flex items-center gap-2"><User className="w-3 h-3 text-gray-400" /> <span className="truncate max-w-[150px]">{nombreCliente}</span></div>
                            </td>
                            <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[11px] font-bold uppercase border border-blue-100">@{username}</span>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border shadow-sm ${estado.color}`}>
                                    <EstadoIcon className="w-3 h-3" /> {estado.label}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-gray-800 text-sm whitespace-nowrap">${p.Total?.toLocaleString()}</td>
                            
                            {/* Acciones: Imprimir y Expandir */}
                            <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                                <div className="flex items-center justify-end gap-3">
                                    <button 
                                        onClick={(e) => handlePrintClick(e, p.PedidoID)}
                                        className="p-1.5 hover:bg-[#ff6d22] hover:text-white rounded-full transition-all text-gray-400"
                                        title="Imprimir Copia"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </button>
                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                            </td>
                        </tr>

                        {/* --- FILA DETALLE (Expandible) --- */}
                        {isExpanded && (
                            <tr className="bg-orange-50/50 animate-in fade-in duration-200">
                                <td colSpan={7} className="p-0 border-b border-orange-100">
                                    {/* Padding responsivo: menos espacio en móvil */}
                                    <div className="p-4 sm:pl-14 sm:pr-14">
                                        <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden">
                                            <div className="bg-orange-100/50 px-4 py-2 flex items-center gap-2 text-xs font-bold text-[#ff6d22] uppercase tracking-wider">
                                                <ShoppingCart className="w-4 h-4" /> Productos ({detalles.length})
                                            </div>
                                            
                                            {/* Sub-tabla con scroll horizontal propio si es necesario */}
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm min-w-[600px]">
                                                    <thead className="bg-gray-50 text-gray-500 text-xs">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left">Producto</th>
                                                            <th className="px-4 py-2 text-center">Cant.</th>
                                                            <th className="px-4 py-2 text-right">Observacion</th>
                                                            <th className="px-4 py-2 text-right">Precio Unit.</th>
                                                            <th className="px-4 py-2 text-right">Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {detalles.length === 0 ? (
                                                            <tr><td colSpan={5} className="p-4 text-center text-gray-400 italic">Error cargando detalles.</td></tr>
                                                        ) : (
                                                            detalles.map((d: any) => {
                                                                const prod = safeGetObject(d.producto);
                                                                return (
                                                                    <tr key={d.DetalleID}>
                                                                        <td className="px-4 py-2 font-medium text-gray-700">{prod?.Nombre || 'N/A'}</td>
                                                                        <td className="px-4 py-2 text-center text-gray-600">x{d.Cantidad}</td>
                                                                        <td className="px-4 py-2 text-right text-gray-500 italic text-xs">{d.Observaciones || '-'}</td>
                                                                        <td className="px-4 py-2 text-right text-gray-500">${d.PrecioUnit?.toLocaleString()}</td>
                                                                        <td className="px-4 py-2 text-right font-bold text-gray-800">${(d.Cantidad * d.PrecioUnit).toLocaleString()}</td>
                                                                    </tr>
                                                                )
                                                            })
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                   );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}