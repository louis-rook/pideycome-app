import React, { Suspense } from 'react';
import { getPersonasAdmin } from '@/lib/api/admin-people';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { Loader2 } from 'lucide-react';
import PersonalManager from '@/components/personal/PersonalManager';

// Asegura que los cambios en el personal (activar/desactivar) se vean al instante.
export const dynamic = 'force-dynamic';

export default async function PersonalPage() {
  
  // 1. CARGA DE LISTADO DE PERSONAL
  // Se obtiene la lista de todas las personas registradas (Clientes y Empleados).
  const personasData = await getPersonasAdmin();

  // 2. VERIFICACIÓN DE PERMISOS DE ALTO NIVEL (SERVER SIDE)
  // Validamos si el usuario que accede es realmente un Administrador (CargoID === 1).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let esAdmin = false;
  if (user) {
    const supabaseAdmin = createAdminClient();
    
    // Buscamos el cargo del usuario actual cruzando tablas.
    const { data: usuarioDB } = await supabaseAdmin
        .from('usuario')
        .select('empleado(CargoID)')
        .eq('auth_user_id', user.id)
        .maybeSingle();
        
    // Lógica para extraer el CargoID manejando el retorno de Supabase (Array u Objeto).
    // @ts-ignore
    const cargoID = usuarioDB?.empleado?.[0]?.CargoID || usuarioDB?.empleado?.CargoID;
    
    // Si el ID es 1, habilitamos funciones administrativas en el cliente.
    if (cargoID === 1) esAdmin = true;
  }

  // 3. RENDERIZADO
  // El componente 'PersonalManager' recibe la lista de personas y el flag de permisos.
  return (
    <Suspense fallback={
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="animate-spin text-[#ff6d22] w-10 h-10"/>
        </div>
    }>
        <PersonalManager 
            initialPersonas={personasData || []} 
            permisoAdmin={esAdmin} 
        />
    </Suspense>
  );
}