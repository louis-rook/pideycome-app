"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import {
  DollarSign, ShoppingBag, CheckCircle, TrendingUp, Calendar,
  Wallet, Utensils, Clock, Filter, Calculator, Loader2, ArrowRight
} from "lucide-react";

import { getDashboardData } from "@/lib/api/dashboard";
import { ROLES, PERMISOS } from "@/lib/constants/roles";
import { getHistorialArqueos } from '@/lib/api/admin-arqueo';
import ArqueoModal from '@/components/admin/ArqueoModal';
import OrdersDetailModal from '@/components/admin/OrdersDetailModal';

const COLORS = ['#ff6d22', '#FFBB28', '#FF8042', '#00C49F', '#0088FE'];

// --- KPI CARD ---
function KpiCard({ title, value, icon: Icon, trend, onClick, isClickable }: any) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 ${isClickable ? 'cursor-pointer hover:shadow-lg hover:border-orange-200 group' : 'hover:shadow-lg'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${isClickable ? 'bg-orange-50 text-[#ff6d22]' : 'bg-orange-50'}`}>
          <Icon className="w-6 h-6 text-[#ff6d22]" />
        </div>
        {trend && (
          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm text-gray-400 font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-extrabold text-gray-800">{value}</h3>
        {isClickable && (
          <p className="text-xs text-[#ff6d22] mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
            Ver detalle <ArrowRight className="w-3 h-3" />
          </p>
        )}
      </div>
    </div>
  );
}

// --- VIEW COMPONENT ---
interface DashboardViewProps {
  initialStats: any;
  currentUser: any;
}

export default function DashboardView({ initialStats, currentUser }: DashboardViewProps) {
  const [stats, setStats] = useState<any>(initialStats);
  const [loading, setLoading] = useState(false);
  const user = currentUser;

  const [filtro, setFiltro] = useState<'hoy' | 'semana' | 'mes' | 'custom'>('semana');
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const isFirstRender = useRef(true);

  // Modales
  const [showArqueoModal, setShowArqueoModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [historialArqueos, setHistorialArqueos] = useState<any[]>([]);

  const router = useRouter();

  // 1. UPDATE DATA (Filtros)
  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }

    async function updateData() {
      setLoading(true);
      try {
          let customRange;
          if (filtro === 'custom' && fechaInicio && fechaFin) {
            customRange = { from: new Date(fechaInicio), to: new Date(fechaFin) };
          }
          
          const newData = await getDashboardData(filtro, customRange, null);
          if (newData) setStats(newData);
          
      } catch (error) {
        console.error("Error actualizando filtro:", error);
      } finally {
        setLoading(false);
      }
    }

    updateData();
  }, [filtro, fechaInicio, fechaFin]);

  // 2. CARGAR ARQUEOS
  useEffect(() => {
     async function loadArqueos() {
        try {
            const history = await getHistorialArqueos();
            setHistorialArqueos(Array.isArray(history) ? history : []);
        } catch(e) { console.error(e); }
     }

     if (user && (user.CargoID === ROLES.ADMIN || user.CargoID === ROLES.LIDER)) {
         loadArqueos();
     }
  }, [user, showArqueoModal]); 

  const handleCloseArqueo = async () => {
    setShowArqueoModal(false);
    try {
      const history = await getHistorialArqueos();
      setHistorialArqueos(Array.isArray(history) ? history : []);
    } catch (e) { console.error(e); }
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  
  const esFinanciero = user && (user.CargoID === ROLES.ADMIN || user.CargoID === ROLES.LIDER);
  const puedeHacerArqueo = user && (user.CargoID === ROLES.ADMIN || user.CargoID === ROLES.LIDER);

  // -----------------------------------------------------------------------
  // 3. RESTAURACIÓN DE LA VISTA OPERATIVA (Meseros, Cajeros, Cocineros)
  // -----------------------------------------------------------------------
  if (user && !esFinanciero && (user.CargoID === ROLES.MESERO || user.CargoID === ROLES.COCINERO || user.CargoID === ROLES.CAJERO)) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] bg-[#F8F9FA]">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center max-w-md mx-4 animate-in zoom-in-95 duration-300">
          
          {/* Avatar / Icono */}
          <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <span className="text-5xl">👨‍🍳</span>
          </div>

          {/* Saludo Personalizado */}
          <h2 className="text-3xl font-bold text-gray-800 mb-3 font-playfair">
            Hola, <span className="text-[#ff6d22]">{user.Nombres}</span>
          </h2>
          
          <p className="text-gray-500 mb-8 leading-relaxed">
            Tu perfil de <strong className="text-gray-700">{user.Cargo || 'Operativo'}</strong> está enfocado en la atención y operación diaria.
          </p>

          {/* Botón de Acción Principal */}
          <button
            onClick={() => router.push('/admin/pedidos')}
            className="w-full bg-[#ff6d22] hover:bg-[#e05e1a] text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 hover:scale-105 transition-all flex items-center justify-center gap-2 group"
          >
            <ShoppingBag className="w-5 h-5 group-hover:animate-bounce" />
            Ir a mis Pedidos 🚀
          </button>

        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // VISTA FINANCIERA (Admin / Líder)
  // -----------------------------------------------------------------------
  return (
    <div className="p-6 space-y-8 bg-[#F8F9FA] min-h-screen pb-24">
      
      {/* HEADER & FILTROS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-playfair tracking-tight">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Hola, <span className="font-bold text-[#ff6d22]">{user?.Nombres}</span></p>
        </div>

        <div className="flex flex-wrap gap-3 items-center bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(['hoy', 'semana', 'mes'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFiltro(f); setFechaInicio(""); setFechaFin(""); }}
                className={`px-4 py-2 text-xs font-bold rounded-lg capitalize transition-all ${filtro === f ? 'bg-white text-[#ff6d22] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="date" className="text-xs border-none bg-gray-50 rounded-lg px-3 py-2 text-gray-600 focus:ring-1 focus:ring-[#ff6d22]" onChange={(e) => { setFechaInicio(e.target.value); setFiltro('custom'); }} />
            <span className="text-gray-300">-</span>
            <input type="date" className="text-xs border-none bg-gray-50 rounded-lg px-3 py-2 text-gray-600 focus:ring-1 focus:ring-[#ff6d22]" onChange={(e) => { setFechaFin(e.target.value); setFiltro('custom'); }} />
          </div>
        </div>
      </div>

      {/* LOADER */}
      {loading && (
          <div className="fixed top-20 right-8 bg-white px-4 py-2 rounded-full shadow-lg border border-orange-100 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#ff6d22]" />
              <span className="text-xs font-bold text-gray-600">Actualizando...</span>
          </div>
      )}

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Ventas Totales" value={formatMoney(stats?.total_ventas || 0)} icon={DollarSign} trend="+12%" />
        
        {/* TARJETA CLICKABLE PARA PEDIDOS */}
        <KpiCard 
           title="Pedidos (Ver Detalle)" 
           value={stats?.pedidos_totales || 0} 
           icon={ShoppingBag} 
           isClickable={true}
           onClick={() => setShowOrdersModal(true)}
        />
        
        <KpiCard title="Ticket Promedio" value={formatMoney(stats?.ticket_promedio || 0)} icon={Wallet} />
        <KpiCard title="Tasa de Entrega" value={`${stats?.pedidos_completados || 0}`} icon={CheckCircle} />
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col min-w-0">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#ff6d22]" /> Ventas</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.ventas_por_dia || []}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff6d22" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ff6d22" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="dia_nombre" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(val) => `$${val / 1000}k`} />
                  <RechartsTooltip formatter={(val: any) => formatMoney(Number(val))} />
                  <Area type="monotone" dataKey="total" stroke="#ff6d22" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col min-w-0">
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Utensils className="w-5 h-5 text-gray-400" /> Categorías</h3>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats?.ventas_por_categoria || []} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="cantidad">
                    {stats?.ventas_por_categoria?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto">
                {stats?.ventas_por_categoria?.map((entry: any, index: number) => (
                    <div key={index} className="flex justify-between text-xs">
                        <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                            {entry.categoria}
                        </span>
                        <span className="font-bold">{entry.cantidad}</span>
                    </div>
                ))}
            </div>
          </div>
      </div>
      
      {/* SECCIÓN ARQUEOS */}
      {puedeHacerArqueo && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#ff6d22]" /> Últimos Cierres de Caja
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3">Total Físico</th>
                  <th className="px-4 py-3 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!historialArqueos.length ? (
                   <tr><td colSpan={5} className="p-4 text-center text-gray-400">Sin registros recientes.</td></tr>
                ) : (
                   historialArqueos.map((arq) => (
                     <tr key={arq.ArqueoID}>
                        <td className="px-4 py-3 text-gray-500">{new Date(arq.Fecha).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-medium">{arq.responsable?.tercero?.Nombres}</td>
                        <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${arq.Estado==='CUADRADO'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{arq.Estado}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatMoney(arq.TotalFisico)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${arq.Diferencia === 0 ? 'text-gray-400' : 'text-red-600'}`}>
                           {arq.Diferencia > 0 ? '+' : ''}{parseInt(arq.Diferencia).toLocaleString()}
                        </td>
                     </tr>
                   ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE ARQUEO */}
      {puedeHacerArqueo && (
        <div className="fixed bottom-8 right-8 z-30">
          <button onClick={() => setShowArqueoModal(true)} className="bg-[#ff6d22] text-white px-6 py-4 rounded-full shadow-xl hover:bg-[#e05e1a] hover:scale-105 transition-all font-bold flex items-center gap-3">
            <Calculator className="w-5 h-5" /> Realizar Cuadre
          </button>
        </div>
      )}

      <ArqueoModal isOpen={showArqueoModal} onClose={handleCloseArqueo} />
      
      <OrdersDetailModal 
         isOpen={showOrdersModal} 
         onClose={() => setShowOrdersModal(false)}
         pedidos={stats?.ultimos_pedidos || []} 
      />

    </div>
  );
}