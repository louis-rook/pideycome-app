import React, { Suspense } from 'react';
import { getCurrentUser } from '@/lib/api/auth'; // Obtiene la sesión del servidor
import { getDashboardData } from '@/lib/api/dashboard'; // Obtiene métricas (Ventas, pedidos, etc.)
import DashboardView from '@/components/admin/DashboardView'; // Componente cliente que renderiza los gráficos

// --- CONFIGURACIÓN DE RENDIMIENTO ---
// Obliga a que los datos se consulten en cada visita (No estático).
export const dynamic = 'force-dynamic';

// ============================================================================
// COMPONENTE: PÁGINA DE INICIO (DASHBOARD)
// ============================================================================
export default async function AdminPage() {
  
  /**
   * CARGA PARALELA (Optimización):
   * En lugar de esperar a que termine una consulta para empezar la otra (Waterfall),
   * lanzamos ambas al mismo tiempo con Promise.all. Esto reduce el tiempo de carga a la mitad.
   */
  const [user, dashboardData] = await Promise.all([
    getCurrentUser(), // Identidad del administrador
    getDashboardData('semana') // Datos iniciales (por defecto los últimos 7 días)
  ]);

  return (
    /**
     * SUSPENSE:
     * Mientras el servidor procesa los datos y el cliente monta los gráficos de Recharts,
     * se muestra el fallback de "Cargando..." para mejorar la percepción de velocidad.
     */
    <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] text-gray-400 font-bold">
          <div className="flex flex-col items-center gap-2">
            <span className="animate-pulse">Preparando Dashboard...</span>
          </div>
        </div>
    }>
      {/* VISTA FINAL:
          Inyectamos los datos del servidor al componente de cliente.
          'initialStats' permite que el dashboard tenga datos desde el segundo 1.
      */}
      <DashboardView 
          initialStats={dashboardData} 
          currentUser={user} 
      />
    </Suspense>
  );
}