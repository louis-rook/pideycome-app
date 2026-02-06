"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Edit, EyeOff, Image as ImageIcon, Search, Filter, 
  Eye, Utensils, CheckCircle2, XCircle, ShieldAlert, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

// TUS ACTIONS & API
import { toggleEstadoProducto } from '@/actions/products'; 
import { getCurrentUser } from '@/lib/api/auth'; // <--- USAMOS TU API ORIGINAL

import ProductModal from '@/components/menu/ProductModal';

interface MenuManagerProps {
  initialProductos: any[];
}

export default function MenuManager({ initialProductos }: MenuManagerProps) {
  const router = useRouter();

  const [productos, setProductos] = useState<any[]>(initialProductos);
  const [procesandoAccion, setProcesandoAccion] = useState<number | null>(null);
  
  // ESTADOS DE SEGURIDAD
  const [autorizado, setAutorizado] = useState(false);
  const [loadingSeguridad, setLoadingSeguridad] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [productoEditar, setProductoEditar] = useState<any>(null); 

  // --- EFECTO: SEGURIDAD + SINCRONIZACIÓN ---
  useEffect(() => {
    async function init() {
        try {
            // 1. Validar Usuario con TU lógica original
            const user: any = await getCurrentUser();
            
            // Validamos Roles (Admin=1, Lider=5 o strings 'admin'/'lider')
            if (user && (user.CargoID === 1 || user.CargoID === 5 || user.rol === 'admin' || user.rol === 'lider')) {
                setAutorizado(true);
            }
        } catch (error) {
            console.error("Error verificando permisos", error);
        } finally {
            setLoadingSeguridad(false);
        }
    }
    init();

    // Sincronizar productos si el servidor manda nuevos
    setProductos(initialProductos);
  }, [initialProductos]);


  // --- FILTROS ---
  const productosFiltrados = productos.filter(prod => {
    const texto = busqueda.toLowerCase();
    const coincideTexto = (prod.Nombre || '').toLowerCase().includes(texto);
    const coincideCategoria = filtroCategoria === 'TODAS' || prod.CategoriaID?.toString() === filtroCategoria;
    
    let coincideEstado = true;
    if (filtroEstado === 'ACTIVOS') coincideEstado = prod.Activo === true;
    if (filtroEstado === 'INACTIVOS') coincideEstado = prod.Activo === false;
    
    return coincideTexto && coincideCategoria && coincideEstado;
  });

  const getCategoriaBadge = (nombreCat: string, idCat: number) => {
    const cat = (nombreCat || '').toLowerCase();
    if (idCat === 1 || cat.includes('desayuno')) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (idCat === 2 || cat.includes('rapida') || cat.includes('hamburguesa')) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (idCat === 3 || cat.includes('fuerte') || cat.includes('plato')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (idCat === 4 || cat.includes('bebida')) return 'bg-sky-50 text-sky-700 border-sky-200';
    if (cat.includes('postre')) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  // --- MANEJADORES ---
  const abrirModal = (producto?: any) => {
    setProductoEditar(producto || null);
    setShowModal(true);
  };

  const handleToggleEstado = async (id: number, estadoActual: boolean) => {
    setProcesandoAccion(id);
    const backup = [...productos];
    setProductos(prev => prev.map(p => p.ProductoID === id ? { ...p, Activo: !estadoActual } : p));

    try {
        const res = await toggleEstadoProducto(id, !estadoActual); 
        if(res.success) {
            toast.success(estadoActual ? "Producto desactivado" : "Producto activado");
            router.refresh(); 
        } else {
            throw new Error(res.message);
        }
    } catch (error: any) {
        toast.error("Error: " + error.message);
        setProductos(backup);
    } finally {
        setProcesandoAccion(null);
    }
  };

  // --- RENDER: CARGANDO SEGURIDAD ---
  if (loadingSeguridad) {
      return (
          <div className="flex h-screen items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-[#ff6d22]" />
          </div>
      );
  }

  // --- RENDER: SIN PERMISOS ---
  if (!autorizado) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-600">
              <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
              <h1 className="text-2xl font-bold text-gray-800">Acceso Restringido</h1>
              <p className="mt-2">Solo usuarios con perfil <b className="text-gray-800">Líder</b> o <b className="text-gray-800">Administrador</b> pueden gestionar el menú.</p>
          </div>
      );
  }

  // --- RENDER: PRINCIPAL ---
  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-12 px-4 sm:px-8 pt-6">
      <div className="max-w-7xl mx-auto">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-black font-playfair text-gray-800">Productos</h1>
                <p className="text-gray-500 text-sm mt-1">Gestiona el catálogo visible para tus clientes.</p>
            </div>
            <button 
                onClick={() => abrirModal()} 
                className="bg-[#ff6d22] hover:bg-[#e05e1b] text-white px-5 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 font-bold text-sm transform active:scale-95"
            >
                <Plus className="w-5 h-5" /> <span>Crear Producto</span>
            </button>
          </div>

          {/* BARRA DE FILTROS */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col lg:flex-row gap-4">
              <div className="relative flex-grow">
                  <Search className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                  <input type="text" placeholder="Buscar..." className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ff6d22] transition-all text-sm font-medium" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </div>
              <div className="flex gap-4">
                 <div className="relative w-full sm:w-56">
                      <Utensils className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <select className="w-full pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ff6d22] appearance-none cursor-pointer text-sm font-medium text-gray-700" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                          <option value="TODAS">Todas las Categorías</option>
                          <option value="1">Desayunos</option>
                          <option value="2">Platos Principales</option>
                          <option value="3">Bebidas</option>
                          <option value="4">Postres</option>
                      </select>
                  </div>
                  <div className="relative w-full sm:w-48">
                      <Filter className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <select className="w-full pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ff6d22] appearance-none cursor-pointer text-sm font-medium text-gray-700" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                          <option value="TODOS">Todos los Estados</option>
                          <option value="ACTIVOS">Solo Activos</option>
                          <option value="INACTIVOS">Solo Inactivos</option>
                      </select>
                  </div>
              </div>
          </div>

          {/* TABLA */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Producto</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Categoría</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Precio</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {productosFiltrados.map((prod) => (
                            <tr key={prod.ProductoID} className={`group transition-colors ${!prod.Activo ? 'bg-gray-50 opacity-60' : 'hover:bg-orange-50/20'}`}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                                            {prod.Imagen ? (
                                                <img src={prod.Imagen} alt={prod.Nombre} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon className="w-6 h-6" /></div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm leading-tight">{prod.Nombre}</p>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-1 max-w-[200px]">{prod.Descripcion || 'Sin descripción'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${getCategoriaBadge(prod.NombreCategoria, prod.CategoriaID)}`}>
                                        {prod.NombreCategoria || 'General'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {prod.Activo ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100"><CheckCircle2 className="w-3 h-3" /> Activo</span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200"><XCircle className="w-3 h-3" /> Inactivo</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-800 text-sm">$ {prod.Precio?.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => abrirModal(prod)} 
                                            className="p-2 bg-white border border-gray-200 text-gray-500 hover:text-[#ff6d22] hover:border-orange-200 rounded-lg transition-all shadow-sm"
                                            title="Editar"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleToggleEstado(prod.ProductoID, prod.Activo)} 
                                            disabled={procesandoAccion === prod.ProductoID}
                                            className={`p-2 bg-white border border-gray-200 rounded-lg transition-all shadow-sm ${
                                                prod.Activo 
                                                ? 'text-gray-500 hover:text-red-600 hover:border-red-200' 
                                                : 'text-gray-400 hover:text-green-600 hover:border-green-200'
                                            }`} 
                                            title={prod.Activo ? "Desactivar" : "Activar"}
                                        >
                                            {procesandoAccion === prod.ProductoID ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                prod.Activo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      </div>

      <ProductModal 
        isOpen={showModal}
        productoEditar={productoEditar}
        onClose={() => setShowModal(false)}
        onSuccess={() => { router.refresh(); }} 
      />
    </div>
  );
}