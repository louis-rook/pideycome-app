import React, { Suspense } from 'react';
import { getCurrentUser } from '@/lib/api/auth';
import { getDashboardData } from '@/lib/api/dashboard';
import DashboardView from '@/components/admin/DashboardView';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  
  // Carga paralela inicial
  const [user, dashboardData] = await Promise.all([
    getCurrentUser(),
    getDashboardData('semana') 
  ]);

  return (
    <Suspense fallback={
       <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] text-gray-400">
          Cargando...
       </div>
    }>
      <DashboardView 
         initialStats={dashboardData} 
         currentUser={user} 
      />
    </Suspense>
  );
}