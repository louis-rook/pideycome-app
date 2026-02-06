"use client";

import React, { useState } from 'react';
import { login } from '@/actions/auth';
// 1. AGREGAMOS ArrowLeft A LAS IMPORTACIONES
import { Lock, Mail, Loader2, ArrowLeft } from 'lucide-react';
import Image from 'next/image'; 
import Link from 'next/link';
// 2. IMPORTAMOS useRouter
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // 3. INICIALIZAMOS EL ROUTER
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result?.error) {
      setErrorMsg(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        
        {/* 4. BOTÓN VOLVER ATRÁS */}
        <div className="w-full flex justify-start mb-2">
            <button 
                onClick={() => router.push('/')} // Redirige al inicio (o usa router.back() si prefieres historial)
                className="flex items-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Volver
            </button>
        </div>

        {/* Encabezado */}
        <div className="text-center mb-6">
         <div className="logo-circle">
             <Image 
               src="/img/logoPyC.png" 
               alt="Logo Restaurante"
               fill
               priority
               sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
               className="object-contain p-2" 
             />
          </div>
          <h1 className="h3">Bienvenido</h1>
          <p className="text-muted" style={{fontSize: '0.95rem'}}>
            Ingresa tus credenciales para acceder
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <span className="input-group-text">
              <Mail className="w-5 h-5" />
            </span>
            <input
              name="email"
              type="email"
              placeholder="usuario@restaurante.com"
              className="form-control"
              required
            />
          </div>
          <div className="input-group">
            <span className="input-group-text">
              <Lock className="w-5 h-5" />
            </span>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              className="form-control"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin w-5 h-5" />
                Ingresando...
              </div>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>

        <div className="mt-5 text-center" style={{fontSize: '0.9rem'}}>
          <p className="text-muted">
            ¿Olvidaste tu contraseña?{' '}
            <Link href="/forgot-password" className="link-primary">
              Recuperar
            </Link>
          </p>
        </div>

      </div>
      
      <div className="fixed bottom-4 w-full text-center text-xs text-muted">
        &copy; {new Date().getFullYear()} Pide y Come
      </div>
      
    </div>
    
  );
}