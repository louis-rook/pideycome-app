"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, X, User, Shield, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { crearPersona, actualizarPersona } from '@/actions/people';

interface PersonaModalProps {
  isOpen: boolean;
  personaEditar: any | null;
  listaCompleta: any[]; // Recibimos la lista para buscar y autocompletar
  onClose: () => void;
  onSuccess: () => void;
}

export default function PersonaModal({ isOpen, personaEditar, listaCompleta, onClose, onSuccess }: PersonaModalProps) {
  const [procesando, setProcesando] = useState(false);
  
  // ESTADO CONTROLADO: Para que los campos se actualicen al buscar por teléfono
  const [formData, setFormData] = useState({
    Nombres: '',
    Apellidos: '',
    TipoDocumento: 'CC',
    NumeroDocumento: '',
    Telefono: '',
    Direccion: '',
    Email: '',
    EsEmpleado: false,
    CargoID: '',
    Password: ''
  });

  // AL ABRIR: Cargar datos si es edición, o limpiar si es nuevo
  useEffect(() => {
    if (isOpen) {
        if (personaEditar) {
            // Separamos el documento si viene unido (Ej: "CC 12345")
            const docString = personaEditar.Documento || "";
            const [tipo, ...nums] = docString.includes(" ") ? docString.split(" ") : ["CC", ""];
            const numeroReal = personaEditar.NumeroDocumento || nums.join(" ");

            setFormData({
                Nombres: personaEditar.Nombres || '',
                Apellidos: personaEditar.Apellidos || '',
                TipoDocumento: personaEditar.TipoDocumento || tipo,
                NumeroDocumento: numeroReal || '',
                Telefono: personaEditar.Telefono || '',
                Direccion: personaEditar.Direccion || '',
                Email: personaEditar.Email || '',
                EsEmpleado: personaEditar.EsEmpleado || false,
                CargoID: personaEditar.CargoID || '',
                Password: ''
            });
        } else {
            // Limpiar formulario
            setFormData({
                Nombres: '', Apellidos: '', TipoDocumento: 'CC', NumeroDocumento: '',
                Telefono: '', Direccion: '', Email: '', EsEmpleado: false, CargoID: '', Password: ''
            });
        }
    }
  }, [isOpen, personaEditar]);

  // --- BUSCADOR AUTOMÁTICO POR TELÉFONO ---
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const tel = e.target.value;
      
      // Solo buscamos si es un registro nuevo (no estamos editando uno existente desde el botón)
      let datosEncontrados = null;
      if (!personaEditar && tel.length > 4) {
          const encontrado = listaCompleta.find((p) => p.Telefono === tel);
          if (encontrado) {
              const docString = encontrado.Documento || "";
              const [tipo, ...nums] = docString.includes(" ") ? docString.split(" ") : ["CC", ""];
              
              datosEncontrados = {
                  Nombres: encontrado.Nombres,
                  Apellidos: encontrado.Apellidos,
                  TipoDocumento: encontrado.TipoDocumento || tipo,
                  NumeroDocumento: encontrado.NumeroDocumento || nums.join(" "), // Recuperamos la cédula si existe
                  Direccion: encontrado.Direccion,
                  Email: encontrado.Email,
                  EsEmpleado: encontrado.EsEmpleado,
                  CargoID: encontrado.CargoID || ''
              };
          }
      }

      setFormData(prev => ({
          ...prev,
          Telefono: tel,
          ...(datosEncontrados || {}) // Si encontró, rellena todos los campos. Si no, solo actualiza teléfono.
      }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      // @ts-ignore
      const checked = e.target.checked;
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProcesando(true);
    
    // Construimos el FormData manualmente para enviar los nombres exactos que espera tu Action
    const dataToSend = new FormData();
    dataToSend.append('nombres', formData.Nombres);
    dataToSend.append('apellidos', formData.Apellidos);
    dataToSend.append('tipoDoc', formData.TipoDocumento);
    dataToSend.append('numDoc', formData.NumeroDocumento); // Enviar 'numDoc'
    dataToSend.append('telefono', formData.Telefono);
    dataToSend.append('direccion', formData.Direccion);
    
    if (formData.EsEmpleado) {
        dataToSend.append('esEmpleado', 'on');
        dataToSend.append('email', formData.Email);
        dataToSend.append('cargoID', formData.CargoID.toString());
        if (formData.Password) dataToSend.append('password', formData.Password);
    }

    let res;
    if (personaEditar) {
        dataToSend.append("terceroID", personaEditar.TerceroID);
        res = await actualizarPersona(dataToSend);
    } else {
        res = await crearPersona(dataToSend);
    }

    if (res.success) {
        onSuccess();
        onClose();
    } else {
        alert("Error: " + res.message);
    }
    setProcesando(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            <div className="bg-gray-50 px-8 py-5 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                <div>
                    <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                        {personaEditar ? 'Editar Registro' : 'Nuevo Registro'}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">Gestión de datos personales y accesos</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* SECCIÓN DATOS PERSONALES */}
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-5">
                        <div className="flex items-center gap-2 mb-2 text-[#ff6d22] font-bold text-sm uppercase tracking-wider border-b border-orange-100 pb-2">
                            <User className="w-4 h-4" /> Datos Personales
                        </div>
                        
                        {/* FILA 1: TELÉFONO Y EMAIL */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block flex items-center gap-1"><Phone className="w-3 h-3"/> Teléfono (Celular)</label>
                                <input 
                                    name="Telefono" 
                                    required 
                                    className="input-std font-bold text-gray-800" 
                                    placeholder="Ej: 300 123 4567" 
                                    value={formData.Telefono} 
                                    onChange={handlePhoneChange} 
                                    autoFocus={!personaEditar}
                                    autoComplete="off"
                                />
                                {!personaEditar && <p className="text-[10px] text-blue-500 mt-1 font-medium flex items-center gap-1">✨ Escribe para buscar cliente existente</p>}
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Email (Opcional)</label>
                                <input name="Email" type="email" className="input-std" placeholder="cliente@email.com" value={formData.Email} onChange={handleChange} />
                            </div>
                        </div>

                        {/* FILA 2: NOMBRES Y APELLIDOS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Nombres</label>
                                <input name="Nombres" required className="input-std" placeholder="Ej: Juan Carlos" value={formData.Nombres} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Apellidos</label>
                                <input name="Apellidos" required className="input-std" placeholder="Ej: Pérez" value={formData.Apellidos} onChange={handleChange} />
                            </div>
                        </div>
                        
                        {/* FILA 3: DOCUMENTO - SEPARADO EN 2 COLUMNAS PARA EVITAR ERRORES VISUALES */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Tipo Documento</label>
                                <select 
                                    name="TipoDocumento" 
                                    value={formData.TipoDocumento} 
                                    onChange={handleChange} 
                                    className="input-std bg-white cursor-pointer"
                                >
                                    <option value="CC">Cédula (CC)</option>
                                    <option value="TI">Tarjeta Identidad (TI)</option>
                                    <option value="CE">Cédula Extranjería (CE)</option>
                                    <option value="NIT">NIT</option>
                                    <option value="PAS">Pasaporte</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Número Documento</label>
                                <input 
                                    name="NumeroDocumento" 
                                    value={formData.NumeroDocumento} 
                                    onChange={handleChange}
                                    className="input-std" 
                                    placeholder="Ej: 12345678" 
                                />
                            </div>
                        </div>

                        {/* FILA 4: DIRECCIÓN */}
                        <div>
                             <label className="text-xs font-bold text-gray-600 mb-1 block flex items-center gap-1"><MapPin className="w-3 h-3"/> Dirección</label>
                             <input name="Direccion" className="input-std" placeholder="Ej: Calle 123 # 45 - 67" value={formData.Direccion} onChange={handleChange} />
                        </div>
                    </div>

                    {/* SWITCH EMPLEADO */}
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-orange-200 transition-colors cursor-pointer" onClick={() => setFormData(prev => ({...prev, EsEmpleado: !prev.EsEmpleado}))}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl transition-colors ${formData.EsEmpleado ? 'bg-[#ff6d22] text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-400 border border-gray-200'}`}>
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <p className={`font-bold text-sm ${formData.EsEmpleado ? 'text-[#ff6d22]' : 'text-gray-700'}`}>Vincular como Empleado</p>
                                <p className="text-xs text-gray-500">Habilita credenciales de acceso al sistema</p>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.EsEmpleado ? 'border-[#ff6d22] bg-[#ff6d22]' : 'border-gray-300'}`}>
                            {formData.EsEmpleado && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>
                    </div>

                    {/* SECCIÓN DATOS EMPLEADO */}
                    {formData.EsEmpleado && (
                        <div className="bg-orange-50/60 p-5 rounded-xl border border-orange-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 mb-2 text-[#ff6d22] font-bold text-sm uppercase tracking-wider border-b border-orange-200 pb-2">
                                <Shield className="w-4 h-4" /> Credenciales de Acceso
                            </div>
                            
                            {/* NOTA: El email se pide arriba en datos personales, pero si es empleado, es obligatorio para login */}
                            <p className="text-xs text-orange-600 font-medium">
                                * El correo electrónico ingresado arriba se usará como usuario de acceso.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">Cargo / Rol</label>
                                    <select name="CargoID" required={formData.EsEmpleado} value={formData.CargoID} onChange={handleChange} className="input-std bg-white cursor-pointer">
                                        <option value="" disabled>Seleccione...</option>
                                        <option value="1">Administrador Sistema</option>
                                        <option value="2">Cocinero</option>
                                        <option value="3">Mesero</option>
                                        <option value="4">Cajero</option>
                                        <option value="5">Lider</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">
                                        {personaEditar?.EsEmpleado ? 'Cambiar Contraseña (Opcional)' : 'Crear Contraseña'}
                                    </label>
                                    <input name="Password" type="password" required={formData.EsEmpleado && !personaEditar?.EsEmpleado} className="input-std bg-white" placeholder="******" minLength={6} value={formData.Password} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    )}

                    <button type="submit" disabled={procesando} className="w-full py-4 bg-[#ff6d22] text-white font-bold rounded-xl shadow-lg hover:bg-[#e05e1b] transition-all flex items-center justify-center gap-2 transform active:scale-95">
                        {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : (personaEditar ? "Guardar Cambios" : "Guardar Registro")}
                    </button>
                </form>
            </div>
        </div>
        
        <style jsx>{`
            .input-std { width: 100%; padding: 0.7rem 1rem; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.75rem; outline: none; transition: all 0.2s; font-size: 0.95rem; color: #374151; }
            .input-std:focus { border-color: #ff6d22; background: white; box-shadow: 0 0 0 3px rgba(255, 109, 34, 0.1); }
            .input-std::placeholder { color: #9ca3af; }
        `}</style>
    </div>
  );
}