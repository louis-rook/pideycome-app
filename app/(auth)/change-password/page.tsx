"use client";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import { actualizarPassword } from "@/actions/auth"; // Acción del servidor para el cambio de clave
import { Lock, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export default function ChangePasswordPage() {
  // --- ESTADOS ---
  const [loading, setLoading] = useState(false); // Controla el estado de carga del botón
  const [msg, setMsg] = useState(""); // Almacena mensajes de error o éxito

  // --- MANEJADOR DEL FORMULARIO ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    
    // Extraemos datos del form y llamamos a la Server Action
    const formData = new FormData(e.currentTarget);
    const res = await actualizarPassword(formData);
    
    // Si hay error, lo mostramos y detenemos el spinner
    if(res?.error) {
        setMsg(res.error);
        setLoading(false);
    }
    // Si tiene éxito, la acción del servidor redirigirá automáticamente a /admin
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      {/* Tarjeta Central */}
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        
        {/* Logo */}
        <div className="w-20 h-20 mx-auto relative mb-4">
             <Image src="/img/logoPyC.png" alt="Logo" fill className="object-contain" />
        </div>

        {/* Textos Informativos */}
        <h1 className="text-xl font-bold text-gray-800">Cambio de Contraseña</h1>
        <p className="text-sm text-gray-500 mb-6">Por seguridad, debes cambiar tu contraseña genérica.</p>
        
        {/* Alerta de Error */}
        {msg && <div className="p-3 bg-red-50 text-red-600 text-sm rounded mb-4">{msg}</div>}

        {/* Formulario de Cambio */}
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-left">
                <label className="text-xs font-bold text-gray-600 block mb-1">Nueva Contraseña</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input 
                      name="password" 
                      type="password" 
                      required 
                      minLength={6} 
                      className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-[#ff6d22]" 
                      placeholder="******" 
                    />
                </div>
            </div>
            
            {/* Botón de Acción */}
            <button 
              disabled={loading} 
              className="w-full py-3 bg-[#ff6d22] text-white font-bold rounded-xl hover:bg-[#e05e1b] transition-all flex justify-center"
            >
                {loading ? <Loader2 className="animate-spin" /> : "Actualizar Contraseña"}
            </button>
        </form>
      </div>
    </div>
  );
}