"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import {
  DollarSign, ShoppingBag, CheckCircle, TrendingUp, Calendar,
  Wallet, Utensils, Clock, Filter, Calculator, Loader2
} from "lucide-react";


// TUS IMPORTS ORIGINALES
import { getDashboardData } from "@/lib/api/dashboard";
import { getCurrentUser } from "@/lib/api/auth";
import { ROLES, PERMISOS } from "@/lib/constants/roles";

// IMPORTS ARQUEO
import { getHistorialArqueos } from '@/lib/api/admin-arqueo';
import ArqueoModal from '@/components/admin/ArqueoModal';

const COLORS = ['#ff6d22', '#FFBB28', '#FF8042', '#00C49F', '#0088FE'];

// Componente Tarjeta KPI
function KpiCard({ title, value, icon: Icon, trend }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-orange-50 rounded-xl">
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
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtro, setFiltro] = useState<'hoy' | 'semana' | 'mes' | 'custom'>('semana');
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // ESTADOS ARQUEO
  const [showArqueoModal, setShowArqueoModal] = useState(false);
  const [historialArqueos, setHistorialArqueos] = useState<any[]>([]);

  const router = useRouter();

  // --- CARGA DE DATOS ---
  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      try {
        const u = await getCurrentUser();
        if (!isMounted) return;
        setUser(u);

        // Si es Lider o Admin, cargamos la data
        if (u && (u.CargoID === ROLES.ADMIN || u.CargoID === ROLES.LIDER)) {

          // 1. CARGAR DASHBOARD
          try {
            let customRange;
            if (filtro === 'custom' && fechaInicio && fechaFin) {
              customRange = { from: new Date(fechaInicio), to: new Date(fechaFin) };
            }
            const data = await getDashboardData(filtro, customRange, null);
            if (isMounted) setStats(data);
          } catch (error) {
            console.error("Error cargando Dashboard:", error);
          }

          // 2. CARGAR HISTORIAL ARQUEO
          try {
            const history = await getHistorialArqueos();
            if (isMounted) setHistorialArqueos(Array.isArray(history) ? history : []);
          } catch (error) {
            console.error("Error cargando Historial:", error);
            if (isMounted) setHistorialArqueos([]);
          }
        }
      } catch (e) {
        console.error("Error General:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();

    return () => { isMounted = false; };
  }, [filtro, fechaInicio, fechaFin]);

  // Handler para cerrar modal y recargar tabla
  const handleCloseArqueo = async () => {
    setShowArqueoModal(false);
    try {
      const history = await getHistorialArqueos();
      setHistorialArqueos(Array.isArray(history) ? history : []);
    } catch (e) { console.error(e); }
  };

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const esFinanciero = PERMISOS.VER_DASHBOARD_FINANCIERO?.includes(user?.CargoID);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa]">
        <div className="animate-spin h-10 w-10 border-4 border-[#ff6d22] border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-400 font-medium animate-pulse">Cargando panel...</p>
      </div>
    );
  }

  const esOperativo = user && (
    user.CargoID === ROLES.MESERO ||
    user.CargoID === ROLES.COCINERO ||
    user.CargoID === ROLES.CAJERO
  );

  if (esOperativo) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] bg-gray-50/50">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 text-center max-w-md mx-4">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">👨‍🍳</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Hola, {user.Nombres}</h2>
          <p className="text-gray-500 mb-8">Tu perfil de <strong>{user.Cargo}</strong> está enfocado en la operación diaria.</p>
          <button
            onClick={() => router.push('/admin/pedidos')}
            className="w-full bg-[#ff6d22] hover:bg-[#e05e1a] text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2"
          >
            Ir a mis Pedidos 🚀
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-[#F8F9FA] min-h-screen pb-24">

      {/* HEADER & FILTROS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-playfair tracking-tight">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Bienvenido de nuevo, <span className="font-bold text-[#ff6d22]">{user?.Nombres}</span></p>
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
          <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <input type="date" className="text-xs border-none bg-gray-50 rounded-lg px-3 py-2 text-gray-600 focus:ring-1 focus:ring-[#ff6d22]" onChange={(e) => { setFechaInicio(e.target.value); setFiltro('custom'); }} />
            <span className="text-gray-300">-</span>
            <input type="date" className="text-xs border-none bg-gray-50 rounded-lg px-3 py-2 text-gray-600 focus:ring-1 focus:ring-[#ff6d22]" onChange={(e) => { setFechaFin(e.target.value); setFiltro('custom'); }} />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {esFinanciero && (
          <>
            <KpiCard title="Ventas Totales" value={formatMoney(stats?.total_ventas || 0)} icon={DollarSign} trend="+12% vs semana pasada" />
            <KpiCard title="Ticket Promedio" value={formatMoney(stats?.ticket_promedio || 0)} icon={Wallet} />
          </>
        )}
        <KpiCard title="Pedidos Totales" value={stats?.pedidos_totales || 0} icon={ShoppingBag} />
        <KpiCard title="Tasa de Entrega" value={`${stats?.pedidos_completados || 0}`} icon={CheckCircle} />
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {esFinanciero && (
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col min-w-0">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#ff6d22]" /> Comportamiento de Ventas</h3>
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
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(val: any) => formatMoney(Number(val))} labelStyle={{ color: '#6b7280' }} />
                  <Area type="monotone" dataKey="total" stroke="#ff6d22" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* --- CORRECCIÓN AQUÍ: SEPARAMOS GRÁFICO Y LEYENDA --- */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col min-w-0">
          <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Utensils className="w-5 h-5 text-gray-400" /> Ventas por Categoría</h3>

          {/* 1. Contenedor exclusivo para el gráfico (Altura fija) */}
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

          {/* 2. Contenedor exclusivo para la leyenda (Fuera del gráfico, flujo natural) */}
          <div className="mt-4 space-y-3 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
            {stats?.ventas_por_categoria?.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-gray-600 font-medium truncate">{entry.categoria}</span>
                </div>
                <span className="font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded-md">{entry.cantidad} und</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col min-w-0">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-gray-400" /> Horas Pico</h3>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.horas_pico || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hora" tickFormatter={(val) => `${val}:00`} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="cantidad_pedidos" fill="#FFBB28" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-6">Top Productos Más Vendidos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-400 font-medium text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left rounded-l-lg">Producto</th>
                  <th className="px-4 py-3 text-center">Cantidad</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Impacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats?.top_productos?.map((p: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-700 flex items-center gap-3">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-orange-100 text-[#ff6d22]' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                      {p.Nombre}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{p.cantidad}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                        <div className="bg-[#ff6d22] h-1.5 rounded-full" style={{ width: `${Math.min(p.cantidad * 5, 100)}%` }}></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- TABLA ARQUEO --- */}
      {user?.CargoID === ROLES.LIDER && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#ff6d22]" /> Últimos Cierres de Caja
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Fecha</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 ">Venta Total</th>
                  <th className="px-4 py-3 ">Total Fisico</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(!historialArqueos || historialArqueos.length === 0) ? (
                  <tr><td colSpan={6} className="p-4 text-center text-gray-400">No hay arqueos registrados.</td></tr>
                ) : (
                  historialArqueos.slice(0, 7).map((arq: any) => (
                    <tr key={arq.ArqueoID} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{new Date(arq.Fecha).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">{arq.responsable?.tercero?.Nombres}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${arq.Estado === 'CUADRADO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{arq.Estado}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatMoney(arq.TotalSistema)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatMoney(arq.TotalFisico)}
                      </td>
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

      {/* BOTÓN FLOTANTE */}
      {user?.CargoID === ROLES.LIDER && (
        <div className="fixed bottom-8 right-8 z-30">
          <button onClick={() => setShowArqueoModal(true)} className="bg-[#ff6d22] text-white px-6 py-4 rounded-full shadow-xl hover:bg-[#e05e1a] hover:scale-105 transition-all font-bold flex items-center gap-3">
            <Wallet className="w-5 h-5" /> Realizar Cuadre
          </button>
        </div>
      )}

      <ArqueoModal isOpen={showArqueoModal} onClose={handleCloseArqueo} />

    </div>
  );
}