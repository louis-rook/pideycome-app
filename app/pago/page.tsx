"use client"; // Directiva necesaria para usar Hooks de React (useState, useEffect) y eventos del DOM

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext'; // Acceso al estado global del carrito de compras
import {
  User, MapPin, Phone, CreditCard, Banknote,
  ArrowLeft, Loader2, CheckCircle2, Search, FileText,
  Terminal, Landmark, Globe, Mail, Fingerprint
} from 'lucide-react'; // Biblioteca de iconos vectoriales

import { buscarClientePorTelefono } from '@/lib/api/customers'; // Función para consultar terceros en Supabase
import { crearPedido } from '@/actions/orders'; // Server Action para persistir el pedido

export default function CheckoutPage() {
  // --- EXTRACCIÓN DE CONTEXTO ---
  const { carrito, precioTotal, totalItems, limpiarCarrito } = useCart();
  const router = useRouter();

  // --- ESTADOS DE LA INTERFAZ ---
  const [telefono, setTelefono] = useState(''); // Celular como identificador único del cliente
  const [loadingLookup, setLoadingLookup] = useState(false); // Feedback visual de carga en búsqueda
  const [clienteEncontrado, setClienteEncontrado] = useState(false); // Define si el icono cambia a check verde

  // Estado que agrupa la información del formulario para facilitar el envío

  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    email: '',
    direccion: '',
    tipoDocumento: 'CC',
    numeroDocumento: ''
  });

  const [metodoPago, setMetodoPago] = useState('efectivo'); // Controla la selección del método de pago
  const [requiereFactura, setRequiereFactura] = useState(false); // Switch para obligatoriedad de campos fiscales
  const [procesando, setProcesando] = useState(false); // Estado para deshabilitar botones durante el envío

  // --- CONTROL DE ACCESO ---
  // Si el usuario llega aquí con el carrito vacío, lo expulsamos al menú.
  useEffect(() => {
    if (totalItems === 0) router.push('/products');
  }, [totalItems, router]);

  // --- MANEJADORES DE EVENTOS ---
  // Actualiza el objeto de formulario basándose en el atributo 'name' del input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * BUSCADOR DE TERCEROS:
   * Se dispara al salir del input de teléfono. Si el número existe en la tabla 'tercero',
   * autocompleta el formulario para agilizar el checkout.
   */
  const handlePhoneBlur = async () => {
    if (telefono.length < 7) return;

    setLoadingLookup(true);
    try {
      const cliente = await buscarClientePorTelefono(telefono);
      if (cliente) {

        setFormData(prev => ({
          ...prev,
          nombres: cliente.nombres || '',
          apellidos: cliente.apellidos || '',
          email: cliente.email || '',
          direccion: cliente.direccion || '',
          tipoDocumento: cliente.tipoDocumento || prev.tipoDocumento,
          numeroDocumento: cliente.numeroDocumento || prev.numeroDocumento
        }));
        setClienteEncontrado(true);
      } else {
        setClienteEncontrado(false);
      }
    } catch (error) {
      console.error("Error buscando cliente:", error);
    } finally {
      setLoadingLookup(false);
    }
  };

  /**
   * PROCESAMIENTO FINAL:
   * Valida datos, aplica reglas de facturación y llama a la Server Action.
   */
  const handlePedido = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesando(true);

    try {
      // Validación de datos mínimos requeridos
      if (!telefono || !formData.nombres) {
        alert("Por favor ingresa tu celular y nombre.");
        setProcesando(false);
        return;
      }

      // Validación de campos obligatorios para Factura Electrónica
      if (requiereFactura) {
        if (!formData.tipoDocumento || !formData.numeroDocumento) {
          alert("Para solicitar Factura Electrónica, es OBLIGATORIO ingresar el tipo y número de documento.");
          setProcesando(false);
          return;
        }
        if (!formData.email) {
          alert("Para solicitar Factura Electrónica, el Email es obligatorio.");
          setProcesando(false);
          return;
        }
      }

      // Estructura de datos consolidada
      const pedidoData = {
        cliente: {
          telefono,
          nombres: formData.nombres,
          apellidos: formData.apellidos,
          email: formData.email,
          direccion: formData.direccion,
          tipoDocumento: formData.tipoDocumento,
          numeroDocumento: formData.numeroDocumento
        },
        items: carrito,
        total: precioTotal,
        metodoPago,
        requiereFactura
      };


      const resultado = await crearPedido(pedidoData);

      if (resultado.success) {
        limpiarCarrito();

        // Mensaje dinámico según el flujo de pago
        let mensaje = "";
        if (metodoPago === 'efectivo') mensaje = "Por favor acércate a la caja para pagar en efectivo.";
        else if (metodoPago === 'datafono') mensaje = "El mesero llevará el datáfono a tu mesa.";
        else if (metodoPago === 'transferencia') mensaje = "Por favor realiza la transferencia a la cuenta indicada en caja.";

        alert(`¡Pedido #${resultado.orderId} creado con éxito!\n\n${mensaje}`);
        router.push('/');
      } else {
        alert("Error al crear el pedido: " + resultado.message);
      }

    } catch (error) {
      console.error(error);
      alert("Ocurrió un error inesperado.");
    } finally {
      setProcesando(false);
    }
  };

  if (totalItems === 0) return null;

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Cabecera con botón de retorno */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/products" className="p-2 bg-white rounded-full text-gray-600 hover:text-[#ff6d22] shadow-sm transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 font-playfair">Finalizar Pedido</h1>
        </div>

        {/* Formulario Principal en Grilla de 3 Columnas para Desktop */}
        <form onSubmit={handlePedido} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* COLUMNA IZQUIERDA: Formulario de datos (2/3 del ancho) */}
          <div className="lg:col-span-2 space-y-6">

            {/* BLOQUE: DATOS CLIENTE */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                <User className="w-5 h-5 text-[#ff6d22]" />
                <h2 className="text-lg font-bold text-gray-800">Datos del Cliente</h2>
              </div>

              {/* Input Celular con Icono Dinámico (Lupa / Cargando / Check) */}
              <div className="mb-6 relative">
                <label className="block text-sm font-bold text-gray-700 mb-2">Número de Celular <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff6d22] focus:border-transparent outline-none transition-all font-bold text-lg"
                    placeholder="300 123 4567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    onBlur={handlePhoneBlur}
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {loadingLookup ? <Loader2 className="h-5 w-5 text-[#ff6d22] animate-spin" /> :
                      clienteEncontrado ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                        <Search className="h-5 w-5 text-gray-400" />}
                  </div>
                </div>
              </div>

              {/* Grid: Nombres y Apellidos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Nombres <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="nombres"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#ff6d22] outline-none"
                    value={formData.nombres}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Apellidos</label>
                  <input
                    type="text"
                    name="apellidos"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#ff6d22] outline-none"
                    value={formData.apellidos}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Input: Email (Opcional o Requerido) */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Correo Electrónico
                  {requiereFactura ? <span className="text-red-500 ml-1">*</span> : <span className="text-gray-400 text-xs font-normal ml-1">(Opcional)</span>}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#ff6d22] outline-none"
                    placeholder="cliente@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required={requiereFactura}
                  />
                </div>
              </div>

              {/* Bloque: Documentación Legal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pt-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    Tipo de Documento
                    {requiereFactura && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="relative">
                    <Fingerprint className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <select
                      name="tipoDocumento"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#ff6d22] outline-none appearance-none"
                      value={formData.tipoDocumento}
                      onChange={handleChange}
                    >
                      <option value="CC">Cédula de Ciudadanía</option>
                      <option value="NIT">NIT</option>
                      <option value="CE">Cédula de Extranjería</option>
                      <option value="PAS">Pasaporte</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    Número de Documento
                    {requiereFactura && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    name="numeroDocumento"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#ff6d22] outline-none"
                    placeholder="Ej: 1004567890"
                    value={formData.numeroDocumento}
                    onChange={handleChange}
                    required={requiereFactura}
                  />
                </div>
              </div>

              {/* Input: Dirección */}
              <div className="mt-4 mb-4">
                <label className="block text-sm font-semibold text-gray-600 mb-1">Dirección de Entrega</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="direccion"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#ff6d22] outline-none"
                    placeholder="Calle 123 # 45 - 67"
                    value={formData.direccion}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Checkbox: Activación de Factura Electrónica */}
              <div className="mt-6 bg-orange-50 p-4 rounded-xl border border-orange-100">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-[#ff6d22] rounded focus:ring-[#ff6d22] border-gray-300"
                    checked={requiereFactura}
                    onChange={(e) => setRequiereFactura(e.target.checked)}
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-gray-800">
                      <FileText className="w-4 h-4 text-[#ff6d22]" />
                      <span className="font-bold">Necesito Factura Electrónica</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Al marcar esto, el documento y email son obligatorios.</p>
                  </div>
                </label>
              </div>

            </div>

            {/* BLOQUE: MEDIOS DE PAGO (Botones con estado activo) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                <CreditCard className="w-5 h-5 text-[#ff6d22]" />
                <h2 className="text-lg font-bold text-gray-800">Método de Pago</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tarjeta Efectivo */}
                <div
                  onClick={() => setMetodoPago('efectivo')}
                  className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all hover:shadow-md ${metodoPago === 'efectivo' ? 'border-[#ff6d22] bg-orange-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                >
                  <Banknote className={`w-8 h-8 ${metodoPago === 'efectivo' ? 'text-[#ff6d22]' : 'text-gray-400'}`} />
                  <span className={`font-bold text-sm ${metodoPago === 'efectivo' ? 'text-[#ff6d22]' : 'text-gray-600'}`}>Efectivo</span>
                </div>

                {/* Tarjeta Datáfono */}
                <div
                  onClick={() => setMetodoPago('datafono')}
                  className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all hover:shadow-md ${metodoPago === 'datafono' ? 'border-[#ff6d22] bg-orange-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                >
                  <Terminal className={`w-8 h-8 ${metodoPago === 'datafono' ? 'text-[#ff6d22]' : 'text-gray-400'}`} />
                  <span className={`font-bold text-sm ${metodoPago === 'datafono' ? 'text-[#ff6d22]' : 'text-gray-600'}`}>Datáfono</span>
                </div>


                {/* Tarjeta Transferencia (Ancho completo) */}
                <div
                  onClick={() => setMetodoPago('transferencia')}
                  className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all hover:shadow-md sm:col-span-2 ${metodoPago === 'transferencia' ? 'border-[#ff6d22] bg-orange-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                >
                  <Landmark className={`w-8 h-8 ${metodoPago === 'transferencia' ? 'text-[#ff6d22]' : 'text-gray-400'}`} />
                  <div className="text-center">
                    <span className={`font-bold text-sm block ${metodoPago === 'transferencia' ? 'text-[#ff6d22]' : 'text-gray-600'}`}>Transferencia Bancaria</span>
                    <span className="text-[10px] text-gray-400">Nequi, Daviplata, Bancolombia, etc.</span>
                  </div>
                </div>

                {/* Placeholder: PSE */}
                <div className="border-2 border-gray-100 rounded-xl p-4 flex flex-col items-center justify-center gap-2 opacity-50 cursor-not-allowed bg-gray-50 relative overflow-hidden">
                  <Globe className="w-8 h-8 text-gray-300" />

                  <span className="font-bold text-sm text-gray-400">Pagos PSE</span>
                  <div className="absolute top-2 right-2 bg-gray-200 text-gray-500 text-[9px] px-2 py-0.5 rounded-full font-bold">PRÓXIMAMENTE</div>
                </div>

                {/* Placeholder: Crédito */}
                <div className="border-2 border-gray-100 rounded-xl p-4 flex flex-col items-center justify-center gap-2 opacity-50 cursor-not-allowed bg-gray-50 relative overflow-hidden">
                  <CreditCard className="w-8 h-8 text-gray-300" />
                  <span className="font-bold text-sm text-gray-400">Tarjeta Crédito</span>
                  <div className="absolute top-2 right-2 bg-gray-200 text-gray-500 text-[9px] px-2 py-0.5 rounded-full font-bold">PRÓXIMAMENTE</div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Resumen del Pedido (Sticky) */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 sticky top-24">
              <h3 className="text-xl font-bold font-playfair text-gray-800 mb-6">Resumen del Pedido</h3>

              {/* Listado de Productos en el carrito */}
              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {carrito.map((item) => (
                  <div key={item.uuid} className="flex justify-between items-start text-sm">
                    <div>
                      <p className="font-bold text-gray-800">{item.Nombre} <span className="text-[#ff6d22] ml-1">x{item.cantidad}</span></p>
                      {item.observaciones && <p className="text-xs text-gray-400 italic mt-0.5 max-w-[150px] truncate">{item.observaciones}</p>}
                    </div>
                    <span className="font-semibold text-gray-600">$ {(item.Precio * item.cantidad).toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>

              {/* Totalizador */}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-dashed border-gray-200 mt-2">
                  <span>Total a Pagar</span>
                  <span>$ {precioTotal.toLocaleString('es-CO')}</span>

                </div>
              </div>

              {/* Botón de envío con estado de carga */}


              <button
                type="submit"
                disabled={procesando}
                className="w-full mt-6 btn-primary rounded-xl py-4 font-bold text-lg shadow-xl shadow-orange-100 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform hover:-translate-y-1"
              >
                {procesando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Procesando...
                  </>
                ) : (
                  "Confirmar Pedido"
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}