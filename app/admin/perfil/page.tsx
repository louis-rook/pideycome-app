import React from 'react';
import { getPerfilUsuario } from '@/lib/api/profile';
import ProfileView from '@/components/admin/ProfileView'; // Importamos la vista

export const metadata = {
  title: 'Mi Perfil | Pide & Come',
};

export default async function PerfilPage() {
    // 1. Fetch de datos en el Servidor (Rápido y Seguro)
    const usuario = await getPerfilUsuario();

    // 2. Manejo de caso borde (no usuario)
    if (!usuario) {
        return (
            <div className="p-10 text-center">
                <h2 className="text-red-500 font-bold">Error de Sesión</h2>
                <p className="text-gray-500">No se pudo cargar la información del usuario.</p>
            </div>
        );
    }

    // 3. Renderizamos la Vista (Cliente) pasando los datos iniciales
    return <ProfileView user={usuario} />;
}