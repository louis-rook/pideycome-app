"use client";

import React from 'react';
import { 
  Clock, ChefHat, CheckCircle, Package, DollarSign, 
  Trash2, MapPin, AlertCircle // <--- Agregamos AlertCircle
} from 'lucide-react';

const ESTADO = {
  POR_CONFIRMAR: 1,
  EN_COLA: 2,
  PREPARANDO: 3,
  LISTO: 4,
  ENTREGADO: 5,
  CANCELADO: 6
};

interface OrderCardProps {
  pedido: any;
  rolUsuario: string;
  colBorder: string;
  onAction: (pedido: any, nuevoEstado: number) => void;
  canMove: boolean;
}

export default function OrderCard({ pedido, rolUsuario, colBorder, onAction, canMove }: OrderCardProps) {
  
  const puedeCancelar = (pedido.EstadoID === ESTADO.POR_CONFIRMAR) && 
                        (rolUsuario.includes('admin') || rolUsuario.includes('cajero') || rolUsuario.includes('mesero') || !rolUsuario);

  return (
    <div className={`bg-white p-3 rounded-lg shadow-sm border border-gray-100 border-l-[4px] ${colBorder} group relative transition-all hover:shadow-md ${!canMove ? 'opacity-70' : ''}`}>
        
        {/* Header Tarjeta */}
        <div className="flex justify-between items-start mb-1 pr-1">
            <div className="flex flex-col">
                {/* Número General */}
                <span className="font-bold text-gray-800 text-sm">#{pedido.PedidoID}</span>
                {/* Número Diario */}
                <span className="text-[10px] font-bold text-[#ff6d22] bg-orange-50 px-1 rounded border border-orange-100 w-fit">
                    Día: #{pedido.NroDiario}
                </span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1 rounded">
                {new Date(pedido.Fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>

        {/* Cliente */}
        <div className="mb-2 mt-1">
            <p className="text-xs font-bold text-gray-700 truncate" title={pedido.cliente?.tercero?.Nombres}>
                {pedido.cliente?.tercero?.Nombres}
            </p>
            {pedido.cliente?.tercero?.Telefono && (
                <p className="text-[10px] text-gray-500 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3" /> {pedido.cliente.tercero.Telefono}
                </p>
            )}
        </div>

        {/* Items Resumen (CON OBSERVACIONES) */}
        <div className="bg-gray-50 rounded p-1.5 mb-2 space-y-2 border border-gray-100 max-h-[150px] overflow-y-auto custom-scrollbar">
            {pedido.detallepedido.map((d: any, i: number) => (
                <div key={i} className="flex flex-col text-[10px] leading-tight border-b border-gray-200 last:border-0 pb-1 last:pb-0">
                    
                    {/* Nombre del Producto */}
                    <div className="flex justify-between">
                        <span className="text-gray-600 font-medium truncate">
                            <b className="text-[#ff6d22]">{d.Cantidad}x</b> {d.producto?.Nombre}                        
                        </span>
                    </div>

                    {/* === AQUÍ ESTÁ LA MAGIA DE LAS OBSERVACIONES === */}
                    {d.Observaciones && d.Observaciones.trim() !== "" && (
                  <div className="flex items-start gap-1 mt-1 text-orange-700 bg-orange-100/50 px-1.5 py-1 rounded border border-orange-200 w-full">
                    {/* Si te da error AlertCircle, impórtalo de 'lucide-react' o usa un <span>⚠️</span> */}
                    <span className="text-[10px]">⚠️</span> 
                    <span className="font-bold italic break-words whitespace-normal">
                        {d.Observaciones}
                    </span>
                  </div>
            )}
                </div>
            ))}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center pt-1 mb-2 border-t border-gray-50">
            <span className="text-[10px] font-bold uppercase text-gray-400 truncate max-w-[60px]">{pedido.MetodoPago}</span>
            <span className="font-bold text-gray-800 text-sm">$ {pedido.Total.toLocaleString()}</span>
        </div>

        {/* ACCIONES */}
        {canMove && (
            <div className="grid gap-1">
                {pedido.EstadoID === ESTADO.POR_CONFIRMAR && (
                    <div className="flex gap-1">
                        <button 
                            onClick={() => onAction(pedido, ESTADO.EN_COLA)}
                            className="flex-1 py-1.5 bg-green-600 text-white rounded text-[10px] font-bold hover:bg-green-700 flex items-center justify-center gap-1 transition-colors"
                        >
                            <DollarSign className="w-3 h-3" /> Cobrar
                        </button>
                        {puedeCancelar && (
                            <button 
                                onClick={() => onAction(pedido, ESTADO.CANCELADO)}
                                className="w-8 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )}

                {pedido.EstadoID === ESTADO.EN_COLA && (
                    <button 
                        onClick={() => onAction(pedido, ESTADO.PREPARANDO)}
                        className="w-full py-1.5 bg-orange-500 text-white rounded text-[10px] font-bold hover:bg-orange-600 flex items-center justify-center gap-1"
                    >
                        <ChefHat className="w-3 h-3" /> Cocinar
                    </button>
                )}

                {(pedido.EstadoID === ESTADO.PREPARANDO || pedido.EstadoID === 7) && (
                    <button 
                        onClick={() => onAction(pedido, ESTADO.LISTO)}
                        className="w-full py-1.5 bg-blue-500 text-white rounded text-[10px] font-bold hover:bg-blue-600 flex items-center justify-center gap-1"
                    >
                        <CheckCircle className="w-3 h-3" /> ¡Listo!
                    </button>
                )}

                {pedido.EstadoID === ESTADO.LISTO && (
                    <button 
                        onClick={() => onAction(pedido, ESTADO.ENTREGADO)}
                        className="w-full py-1.5 bg-green-700 text-white rounded text-[10px] font-bold hover:bg-green-800 flex items-center justify-center gap-1"
                    >
                        <Package className="w-3 h-3" /> Entregar
                    </button>
                )}
            </div>
        )}
    </div>
  );
}