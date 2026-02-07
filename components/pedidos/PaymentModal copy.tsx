"use client";

import React, { useState, useEffect } from 'react';
import { Banknote, RefreshCw, DollarSign, CheckCircle, X, User, Clock, AlertTriangle, Hash } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  pedido: any;
  rolUsuario: string; // <--- Nuevo: Recibimos el rol
  onClose: () => void;
  onConfirm: (detallesPago: any) => void;
}

export default function PaymentModal({ isOpen, pedido, rolUsuario, onClose, onConfirm }: PaymentModalProps) {
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [codigoAuth, setCodigoAuth] = useState('');

    // Lógica: ¿Puede aceptar efectivo? (Solo Admin o Cajero)
  const puedeAceptarEfectivo = rolUsuario.includes('admin') || 
                               rolUsuario.includes('cajero');

  useEffect(() => {
    if (pedido && isOpen) {
        // Si no puede efectivo, forzamos a Datafono por defecto
        if (!puedeAceptarEfectivo) {
            setMetodoPago('Datafono');
        } else {
            setMetodoPago(pedido.MetodoPago || 'Efectivo');
        }
        setMontoRecibido('');
        setCodigoAuth('');
    }
  }, [pedido, isOpen, puedeAceptarEfectivo]);

  if (!isOpen || !pedido) return null;

  const calcularVueltas = () => {
    const recibido = parseFloat(montoRecibido) || 0;
    return Math.max(0, recibido - (pedido?.Total || 0));
  };

  const handleConfirm = () => {
    if (metodoPago === 'Efectivo') {
        if (!montoRecibido || parseFloat(montoRecibido) < pedido.Total) {
            alert("El monto recibido es insuficiente.");
            return;
        }
    } else {
        if (!codigoAuth || codigoAuth.trim().length < 4) {
            alert("Por favor ingrese una Referencia válida.");
            return;
        }
    }

    onConfirm({
        metodo: metodoPago,
        monto: montoRecibido || pedido.Total,
        referencia: codigoAuth
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
        
        {/* Modal Ancho (max-w-4xl) para replicar tu diseño original */}
        <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-gray-900 text-white p-4 flex justify-between items-center shrink-0">
                <h3 className="font-bold flex items-center gap-2 text-lg">
                    <Banknote className="w-5 h-5 text-yellow-400" /> Facturar Pedido #{pedido.PedidoID}
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                    <X className="w-6 h-6"/>
                </button>
            </div>

            <div className="flex flex-col md:flex-row h-full overflow-hidden">
                
                {/* COLUMNA IZQUIERDA: INFO COMPLETA (Restaurada) */}
                <div className="w-full md:w-1/2 bg-gray-50 p-6 border-r border-gray-200 flex flex-col overflow-y-auto">
                     
                     {/* Datos Cliente */}
                     <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                            <User className="w-4 h-4 text-[#ff6d22]" /> Datos del Cliente
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-bold">Nombre</p>
                                <p className="font-medium text-gray-800">{pedido.cliente?.tercero?.Nombres} {pedido.cliente?.tercero?.Apellidos}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-bold">Documento</p>
                                <p className="font-medium text-gray-800">{pedido.cliente?.tercero?.NumeroDocumento || 'No registrado'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-bold">Teléfono</p>
                                <p className="font-medium text-gray-800">{pedido.cliente?.tercero?.Telefono || 'No registrado'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-bold">Dirección</p>
                                <p className="font-medium text-gray-800 truncate" title={pedido.cliente?.tercero?.Direccion}>
                                    {pedido.cliente?.tercero?.Direccion || 'En local'}
                                </p>
                            </div>
                        </div>
                     </div>

                     {/* Resumen Items */}
                     <div className="flex-1">
                         <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                             <Clock className="w-4 h-4 text-gray-400" /> Resumen de Consumo
                         </h4>
                         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                             <div className="overflow-y-auto max-h-[200px] p-3 space-y-2">
                                {pedido.detallepedido.map((d: any, i: number) => (
                                    <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                                        <span><b className="text-[#ff6d22]">{d.Cantidad}x</b> {d.producto?.Nombre}</span>
                                        <span className="font-bold text-gray-700">
                                            $ {((d.producto?.precios?.[0]?.Precio || 0) * d.Cantidad).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                             </div>
                             <div className="bg-gray-100 p-3 flex justify-between items-center border-t border-gray-200">
                                 <span className="font-bold text-gray-600">TOTAL A PAGAR</span>
                                 <span className="font-black text-2xl text-[#ff6d22]">$ {pedido.Total.toLocaleString()}</span>
                             </div>
                         </div>
                     </div>
                </div>

                {/* COLUMNA DERECHA: PAGO */}
                <div className="w-full md:w-1/2 p-6 bg-white overflow-y-auto flex flex-col justify-center">
                    <h6 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider text-center">Seleccione Método de Pago</h6>
                    
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        {['Efectivo', 'Datafono', 'Transferencia'].map((m) => {
                            // SI es Efectivo Y NO tiene permiso, no mostramos el botón
                            if (m === 'Efectivo' && !puedeAceptarEfectivo) return null;

                            return (
                                <button
                                    key={m}
                                    onClick={() => setMetodoPago(m)}
                                    className={`py-3 px-2 text-xs font-bold uppercase rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                        metodoPago === m 
                                        ? 'bg-gray-800 text-white border-gray-800 shadow-md transform scale-105' 
                                        : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
                                    }`}
                                >
                                    {m === 'Efectivo' && <DollarSign className="w-5 h-5"/>}
                                    {m === 'Datafono' && <Banknote className="w-5 h-5"/>}
                                    {m === 'Transferencia' && <RefreshCw className="w-5 h-5"/>}
                                    {m}
                                </button>
                            );
                        })}
                    </div>

                    {!puedeAceptarEfectivo && (
                        <div className="mb-4 p-2 bg-yellow-50 text-yellow-700 text-xs rounded text-center border border-yellow-200">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            Como mesero, solo puedes registrar pagos digitales.
                        </div>
                    )}

                    {metodoPago === 'Efectivo' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Dinero Recibido</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-gray-400 font-bold text-lg">$</span>
                                    <input 
                                        type="number" 
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-2xl outline-none focus:border-[#ff6d22] focus:bg-white transition-all text-gray-800"
                                        value={montoRecibido}
                                        onChange={(e) => setMontoRecibido(e.target.value)}
                                        placeholder="0"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            {montoRecibido && parseFloat(montoRecibido) >= pedido.Total && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex justify-between items-center shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-green-800 uppercase">Cambio</span>
                                        <span className="text-[10px] text-green-600">Devolver al cliente</span>
                                    </div>
                                    <span className="font-black text-3xl text-green-700">
                                        $ {calcularVueltas().toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-xl mb-6 flex items-start gap-3 border border-blue-100">
                                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                <span>
                                    Estás registrando un pago por <strong>{metodoPago}</strong> de <strong>
                                        <br/>$ {pedido.Total.toLocaleString()}</strong>.
                                    <br/>Por favor verifica la transacción.
                                </span>
                            </div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Referencia / Aprobación</label>
                            <div className="relative">
                                <Hash className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                <input 
                                    type="text" 
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-lg outline-none focus:border-[#ff6d22] focus:bg-white transition-all uppercase"
                                    value={codigoAuth}
                                    onChange={(e) => setCodigoAuth(e.target.value)}
                                    placeholder={metodoPago === 'Datafono' ? 'Ej: 004582' : 'Ej: NEQUI-8829'}
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={handleConfirm}
                        className="w-full mt-8 py-4 bg-[#ff6d22] text-white font-bold text-lg rounded-xl hover:bg-[#e65c19] transition-all shadow-lg hover:shadow-orange-200 flex justify-center items-center gap-3 transform hover:-translate-y-1"
                    >
                        Confirmar Pago <CheckCircle className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
}