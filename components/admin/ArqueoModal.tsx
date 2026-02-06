"use client";

import React, { useState, useEffect } from 'react';
import { X, Calculator, DollarSign, CreditCard, Smartphone, CheckCircle2, AlertTriangle } from 'lucide-react';

// --- CORRECCIÓN AQUÍ: SEPARAMOS LAS IMPORTACIONES ---
import { getEmpleadosConVentasHoy } from '@/lib/api/admin-arqueo'; // <-- Viene de la API (Consultas)
import { realizarArqueo } from '@/actions/arqueo'; // <-- Viene de Actions (Guardar en BD)

interface ArqueoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ArqueoModal({ isOpen, onClose }: ArqueoModalProps) {
    const [step, setStep] = useState<'FORM' | 'RESULT'>('FORM');
    const [loading, setLoading] = useState(false);
    const [empleados, setEmpleados] = useState<any[]>([]);
    
    // Resultado del arqueo
    const [resultado, setResultado] = useState<any>(null);

    useEffect(() => {
        if (isOpen) {
            setStep('FORM');
            setResultado(null);
            // Cargar empleados que han vendido hoy
            getEmpleadosConVentasHoy().then(setEmpleados);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        
        const formData = new FormData(e.currentTarget);
        const res = await realizarArqueo(formData);
        
        if (res.success) {
            setResultado(res.data);
            setStep('RESULT');
        } else {
            alert("Error: " + res.message);
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                
                {/* Header */}
                <div className="bg-[#ff6d22] px-6 py-4 flex justify-between items-center text-white">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Calculator className="w-5 h-5" /> Arqueo de Caja (Cierre)
                    </h2>
                    <button onClick={onClose}><X className="w-6 h-6" /></button>
                </div>

                <div className="p-6">
                    {step === 'FORM' ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Responsable (Cajero/Mesero)</label>
                                <select name="responsableId" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ff6d22]">
                                    <option value="">Seleccione empleado...</option>
                                    {empleados.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-400 mt-1">Solo aparecen empleados con ventas hoy.</p>
                            </div>

                            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-3">
                                <p className="text-sm font-bold text-[#ff6d22] uppercase border-b border-orange-200 pb-2 mb-2">Conteo Físico (Dinero Real)</p>
                                
                                <div className="flex items-center gap-3">
                                    <DollarSign className="w-5 h-5 text-green-600" />
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500">Efectivo en Caja</label>
                                        <input type="number" name="efectivo" placeholder="0" className="w-full p-2 border rounded-lg" required step="100" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <CreditCard className="w-5 h-5 text-blue-600" />
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500">Voucher Datáfono</label>
                                        <input type="number" name="datafono" placeholder="0" className="w-full p-2 border rounded-lg" step="100" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Smartphone className="w-5 h-5 text-purple-600" />
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500">Transferencias (Nequi/Bcol)</label>
                                        <input type="number" name="transferencia" placeholder="0" className="w-full p-2 border rounded-lg" step="100" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Observaciones</label>
                                <textarea name="observaciones" rows={2} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Opcional..."></textarea>
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all">
                                {loading ? 'Calculando...' : 'Cerrar Caja y Verificar'}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center space-y-6">
                            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${resultado.estado === 'CUADRADO' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {resultado.estado === 'CUADRADO' ? <CheckCircle2 className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
                            </div>
                            
                            <div>
                                <h3 className="text-2xl font-black text-gray-800">{resultado.estado}</h3>
                                <p className="text-gray-500">Resultado del arqueo</p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl grid grid-cols-2 gap-4 text-left">
                                <div>
                                    <p className="text-xs text-gray-500">Sistema Esperaba</p>
                                    <p className="text-lg font-bold text-gray-800">${resultado.totalSistema.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Tú Contaste</p>
                                    <p className="text-lg font-bold text-blue-600">${resultado.totalFisico.toLocaleString()}</p>
                                </div>
                                <div className="col-span-2 border-t pt-2 mt-2">
                                    <p className="text-xs text-gray-500">Diferencia</p>
                                    <p className={`text-xl font-black ${resultado.diferencia === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ${resultado.diferencia.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <button onClick={onClose} className="w-full py-3 bg-[#ff6d22] text-white font-bold rounded-xl shadow-lg shadow-orange-200">
                                Finalizar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}