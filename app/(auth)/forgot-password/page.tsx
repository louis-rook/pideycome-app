"use client";

import { recuperarPassword } from "@/actions/auth";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await recuperarPassword(formData);
    setMsg(res.error || res.message || "");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <Link href="/login" className="flex items-center text-sm text-gray-400 hover:text-gray-600 mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver al login
        </Link>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Recuperar Acceso</h1>
        <p className="text-sm text-gray-500 mb-6">Te enviaremos un enlace para restablecer tu contraseña.</p>

        {msg && <div className={`p-3 text-sm rounded mb-4 ${msg.includes("Error") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>{msg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
             <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input name="email" type="email" required className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ff6d22]" placeholder="tucorreo@ejemplo.com" />
             </div>
             <button disabled={loading} className="w-full py-3 bg-[#ff6d22] text-white font-bold rounded-xl hover:bg-[#e05e1b] transition-all flex justify-center">
                {loading ? <Loader2 className="animate-spin" /> : "Enviar Enlace"}
            </button>
        </form>
      </div>
    </div>
  );
}