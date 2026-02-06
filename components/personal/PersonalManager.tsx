"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, User, Users, Shield, Mail, Phone, CheckCircle2, 
  XCircle, Eye, EyeOff, Edit, ShieldAlert, Loader2 
} from 'lucide-react';
import { toast } from 'sonner'; 

import { toggleEstadoEmpleado } from '@/actions/people';
import PersonaModal from '@/components/personal/PersonaModal';

interface PersonalManagerProps {
  initialPersonas: any[];
  permisoAdmin: boolean;
}

export default function PersonalManager({ initialPersonas, permisoAdmin }: PersonalManagerProps) {
  const router = useRouter();
  
  // ESTADOS (Sincronizados con el servidor)
  const [personas, setPersonas] = useState<any[]>(initialPersonas);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('TODOS'); 

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [personaEditar, setPersonaEditar] = useState<any>(null);

  // Sincronización: Si el servidor manda nuevos datos, actualizamos
  useEffect(() => {
    setPersonas(initialPersonas);
  }, [initialPersonas]);

  // --- LOGICA DE ACCIONES ---
  const recargarDatos = () => {
    router.refresh(); // Recarga los datos del servidor sin perder estado
  };

  const handleToggleEstado = async (id: number, estadoActual: boolean) => {
      const accion = estadoActual ? 'bloquear' : 'activar';
      if(!confirm(`¿Deseas ${accion} el acceso a este empleado?`)) return;

      setProcesandoId(id);
      try {
          const res = await toggleEstadoEmpleado(id, !estadoActual);
          if(res.success) {
              toast.success(`Acceso ${estadoActual ? 'bloqueado' : 'activado'} correctamente`);
              recargarDatos();
          } else {
              alert(res.message);
          }
      } catch (error: any) {
          alert("Error: " + error.message);
      } finally {
          setProcesandoId(null);
      }
  };

  const abrirModal = (persona?: any) => {
      setPersonaEditar(persona || null);
      setShowModal(true);
  };

  // --- FILTROS (Tu lógica original) ---
  const personasFiltradas = personas.filter(p => {
      const texto = busqueda.toLowerCase();
      const coincideTexto = 
          (p.Nombres || '').toLowerCase().includes(texto) || 
          (p.Apellidos || '').toLowerCase().includes(texto) ||
          (p.Documento || '').includes(texto);
      
      let coincideRol = true;
      if (filtroRol === 'EMPLEADOS') coincideRol = p.EsEmpleado;
      if (filtroRol === 'CLIENTES') coincideRol = !p.EsEmpleado;

      return coincideTexto && coincideRol;
  });

  // --- RENDERIZADO DE SEGURIDAD VISUAL ---
  if (!permisoAdmin) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-600">
              <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-800">Acceso Restringido</h1>
              <p className="mt-2">Este módulo es exclusivo para el Administrador.</p>
          </div>
      );
  }

  // --- RENDERIZADO VISUAL EXACTO AL ORIGINAL ---
  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-12 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto pt-8">
          
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-black font-playfair text-gray-800">Personal y Clientes</h1>
                <p className="text-gray-500 text-sm mt-1">Administración centralizada de usuarios del sistema.</p>
            </div>
            <button 
                onClick={() => abrirModal()} 
                className="bg-[#ff6d22] hover:bg-[#e05e1b] text-white px-5 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 font-bold text-sm"
            >
                <Plus className="w-5 h-5" /> <span>Nuevo Registro</span>
            </button>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col lg:flex-row gap-4">
              <div className="relative flex-grow">
                  <Search className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                  <input type="text" placeholder="Buscar por nombre o documento..." className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ff6d22] transition-all text-sm font-medium" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </div>
              <div className="relative w-full sm:w-56">
                  <Users className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <select className="w-full pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ff6d22] appearance-none cursor-pointer text-sm font-medium text-gray-700" value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
                      <option value="TODOS">Todos los Registros</option>
                      <option value="EMPLEADOS">Solo Empleados</option>
                      <option value="CLIENTES">Solo Clientes</option>
                  </select>
              </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Persona</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contacto</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Rol / Cargo</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Estado Acceso</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {personasFiltradas.map((p) => {
                            // LOGICA VISUAL ORIGINAL
                            const esVisualmenteEmpleado = p.EsEmpleado && p.EmpleadoActivo;

                            return (
                            <tr key={p.TerceroID} className={`group transition-colors ${!p.EmpleadoActivo && p.EsEmpleado ? 'bg-red-50/20' : 'hover:bg-orange-50/20'}`}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${esVisualmenteEmpleado ? 'bg-orange-100 text-[#ff6d22]' : 'bg-gray-100 text-gray-500'}`}>
                                            {p.Nombres?.charAt(0)}{p.Apellidos?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">{p.Nombres} {p.Apellidos}</p>
                                            <p className="text-xs text-gray-400 font-mono">{p.Documento}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs text-gray-600 space-y-1">
                                        {p.Email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-gray-400" /> {p.Email}</p>}
                                        <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400" /> {p.Telefono || 'Sin teléfono'}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {/* VISUALIZACIÓN CORREGIDA CON TUS CLASES ORIGINALES */}
                                    {esVisualmenteEmpleado ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                                            <Shield className="w-3 h-3" /> {p.Cargo}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-50 text-gray-600 border border-gray-200">
                                            <User className="w-3 h-3" /> Cliente
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {p.EsEmpleado ? (
                                        p.EmpleadoActivo ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3" /> Habilitado</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full"><XCircle className="w-3 h-3" /> Bloqueado</span>
                                        )
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">No aplica</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => abrirModal(p)} className="p-2 bg-white border border-gray-200 text-gray-500 hover:text-[#ff6d22] hover:border-orange-200 rounded-lg transition-all shadow-sm">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        {p.EsEmpleado && (
                                            <button 
                                                onClick={() => handleToggleEstado(p.TerceroID, p.EmpleadoActivo)} 
                                                disabled={procesandoId === p.TerceroID}
                                                className={`p-2 bg-white border border-gray-200 rounded-lg transition-all shadow-sm ${p.EmpleadoActivo ? 'text-gray-400 hover:text-red-600 hover:border-red-200' : 'text-gray-400 hover:text-green-600 hover:border-green-200'}`}
                                                title={p.EmpleadoActivo ? "Bloquear Acceso" : "Habilitar Acceso"}
                                            >
                                                {procesandoId === p.TerceroID ? <Loader2 className="w-4 h-4 animate-spin"/> : (p.EmpleadoActivo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />)}
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
              </div>
          </div>
      </div>

      <PersonaModal 
        isOpen={showModal}
        personaEditar={personaEditar}
        listaCompleta={personas}
        onClose={() => setShowModal(false)}
        onSuccess={recargarDatos}
      />
    </div>
  );
}