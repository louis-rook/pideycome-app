import React, { Suspense } from 'react';
import { getPersonasAdmin } from '@/lib/api/admin-people';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { Loader2 } from 'lucide-react';
import PersonalManager from '@/components/personal/PersonalManager';

export const dynamic = 'force-dynamic';

export default async function PersonalPage() {
  
  // 1. CARGA DE DATOS (SERVER SIDE - ¡Rápido!)
  const personasData = await getPersonasAdmin();

  // 2. SEGURIDAD (SERVER SIDE - ¡Seguro!)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let esAdmin = false;
  if (user) {
    const supabaseAdmin = createAdminClient();
    // Verificamos si es Admin (ID 1)
    const { data: usuarioDB } = await supabaseAdmin
        .from('usuario')
        .select('empleado(CargoID)')
        .eq('auth_user_id', user.id)
        .maybeSingle();
        
    // @ts-ignore
    const cargoID = usuarioDB?.empleado?.[0]?.CargoID || usuarioDB?.empleado?.CargoID;
    if (cargoID === 1) esAdmin = true;
  }

  // 3. ENVIAMOS TODO AL CLIENTE
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin"/></div>}>
        <PersonalManager 
            initialPersonas={personasData || []} 
            permisoAdmin={esAdmin} 
        />
    </Suspense>
  );
}