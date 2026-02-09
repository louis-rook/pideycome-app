import React from 'react';
import { getPerfilUsuario } from '@/lib/api/profile';
import ProfileView from '@/components/admin/ProfileView';

// Metadatos de la página para SEO y pestañas del navegador.
export const metadata = {
  title: 'Mi Perfil | Pide & Come',
};

export default async function PerfilPage() {
    
    // 1. FETCH DE DATOS (SERVER SIDE)
    // Obtenemos la información del usuario logueado (Tercero, Empleado, Usuario).
    const usuario = await getPerfilUsuario();

    // 2. CONTROL DE ACCESO BÁSICO
    // Si por alguna razón la sesión falla o no se encuentra el usuario, 
    // mostramos un mensaje de error amigable.
    if (!usuario) {
        return (
            <div className="p-10 text-center">
                <h2 className="text-red-500 font-bold">Error de Sesión</h2>
                <p className="text-gray-500">No se pudo cargar la información del usuario.</p>
            </div>
        );
    }

    // 3. RENDERIZADO DE LA VISTA
    // Enviamos el objeto 'usuario' completo al componente cliente ProfileView.
    return <ProfileView user={usuario} />;
}