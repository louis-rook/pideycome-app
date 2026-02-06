"use client";

import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2 } from 'lucide-react';

export default function ContactoPage() {
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulación de envío
    setTimeout(() => {
      setLoading(false);
      setEnviado(true);
    }, 1500);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      
      {/* HEADER SIMPLE */}
      <div className="bg-white py-12 border-b border-gray-200">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold font-playfair text-gray-900 mb-2">Contáctanos</h1>
          <p className="text-gray-500">Estamos aquí para escucharte. ¿Tienes alguna duda o sugerencia?</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* INFORMACIÓN DE CONTACTO (Izquierda) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Tarjeta Info */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">Información</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-50 rounded-lg text-[#ff6d22]">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-700">Ubicación</p>
                    <p className="text-gray-500 text-sm mt-1">Calle 123 #45-67<br/>Barrio Central, Ciudad</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-50 rounded-lg text-[#ff6d22]">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-700">Teléfono / WhatsApp</p>
                    <p className="text-gray-500 text-sm mt-1">+57 300 123 4567</p>
                    <p className="text-gray-500 text-sm">+57 601 234 5678</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-50 rounded-lg text-[#ff6d22]">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-700">Email</p>
                    <p className="text-gray-500 text-sm mt-1">contacto@pideycome.com</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta Horarios */}
            <div className="bg-[#ff6d22] p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="w-6 h-6" />
                <h3 className="text-xl font-bold">Horarios de Atención</h3>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between border-b border-white/20 pb-2">
                  <span>Lunes - Jueves</span>
                  <span className="font-bold">07:00 AM - 9:00 PM</span>
                </li>
                <li className="flex justify-between border-b border-white/20 pb-2">
                  <span>Viernes - Sábado</span>
                  <span className="font-bold">07:00 AM - 11:00 PM</span>
                </li>
                <li className="flex justify-between">
                  <span>Domingos y Festivos</span>
                  <span className="font-bold">07:00 PM - 9:00 PM</span>
                </li>
              </ul>
            </div>

          </div>

          {/* FORMULARIO DE CONTACTO (Derecha) */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-full">
              {enviado ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 animate-in zoom-in">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Mensaje Enviado!</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Gracias por escribirnos. Nuestro equipo revisará tu mensaje y te responderá lo antes posible.
                  </p>
                  <button 
                    onClick={() => setEnviado(false)}
                    className="mt-8 text-[#ff6d22] font-bold hover:underline"
                  >
                    Enviar otro mensaje
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">Envíanos un mensaje</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Completo</label>
                      <input 
                        type="text" 
                        required 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff6d22] outline-none transition-all"
                        placeholder="Juan Pérez"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Correo Electrónico</label>
                      <input 
                        type="email" 
                        required 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff6d22] outline-none transition-all"
                        placeholder="juan@ejemplo.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Asunto</label>
                    <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff6d22] outline-none transition-all">
                      <option>Consulta General</option>
                      <option>Reservas</option>
                      <option>Sugerencia</option>
                      <option>Trabaja con nosotros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Mensaje</label>
                    <textarea 
                      rows={5} 
                      required 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff6d22] outline-none transition-all resize-none"
                      placeholder="Escribe tu mensaje aquí..."
                    ></textarea>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 bg-[#ff6d22] hover:bg-[#e5621f] text-white font-bold rounded-xl shadow-lg shadow-orange-200 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Enviando...' : (
                      <>
                        Enviar Mensaje <Send className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MAPA (Opcional - Imagen de placeholder o iframe real) */}
      <div className="container mx-auto px-4 mt-8">
        <div className="w-full h-[400px] bg-gray-200 rounded-2xl overflow-hidden shadow-lg relative">
             <iframe 
               // 👇 PEGA TU ENLACE AQUÍ DONDE DICE src="..."
               src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3923.463672872455!2d-73.2481502!3d10.464066299999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e8ab9bebed99ac7%3A0x60bb415040d35b21!2sSupermercado%20Mi%20Futuro%20Mercado!5e0!3m2!1ses-419!2sco!4v1770068818004!5m2!1ses-419!2sco"
               width="100%" 
               height="100%" 
               style={{ border: 0 }} 
               allowFullScreen={true} 
               loading="lazy" 
               referrerPolicy="no-referrer-when-downgrade"
               className="absolute inset-0"
             ></iframe>
        </div>
      </div>
    </div>
  );
}