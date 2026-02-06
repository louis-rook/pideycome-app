import React from 'react';
import { Utensils, Award, Users, Clock, Heart, ChefHat } from 'lucide-react';
import Image from 'next/image';

export default function NosotrosPage() {
  return (
    <div className="bg-white min-h-screen pb-20">
      
      {/* HERO SECTION */}
      <div className="relative bg-gray-900 h-[300px] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 z-10"></div>
        {/* Puedes poner una imagen de fondo real aquí si tienes */}
        <div className="absolute inset-0 bg-[url('/img/Fondo.jpg')] bg-cover bg-center opacity-50"></div>
        
        <div className="relative z-20 text-center text-white px-4">
          <h1 className="text-4xl md:text-6xl font-playfair font-bold mb-4">Nuestra Historia</h1>
          <p className="text-lg md:text-xl font-light text-gray-200 max-w-2xl mx-auto">
            Pasión por la cocina, amor por el servicio y el sabor auténtico que nos une.
          </p>
        </div>
      </div>

      {/* HISTORIA */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-[#ff6d22] font-bold tracking-widest text-sm uppercase">Sobre PideyCome</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 font-playfair">
              Más que un restaurante, <br/> una experiencia culinaria.
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Fundado con la visión de transformar la comida rápida en una experiencia gourmet accesible, 
              PideyCome nació de la pasión por los ingredientes frescos y las recetas tradicionales con un toque moderno.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Creemos que la buena comida tiene el poder de unir a las personas. Por eso, cada plato que sale 
              de nuestra cocina es preparado con dedicación, higiene y el mejor sazón de la región.
            </p>
            
            <div className="pt-4 flex gap-8">
              <div className="text-center">
                <h3 className="text-3xl font-bold text-[#ff6d22]">10+</h3>
                <p className="text-xs text-gray-500 font-bold uppercase mt-1">Años de experiencia</p>
              </div>
              <div className="text-center">
                <h3 className="text-3xl font-bold text-[#ff6d22]">15k+</h3>
                <p className="text-xs text-gray-500 font-bold uppercase mt-1">Clientes Felices</p>
              </div>
              <div className="text-center">
                <h3 className="text-3xl font-bold text-[#ff6d22]">50+</h3>
                <p className="text-xs text-gray-500 font-bold uppercase mt-1">Platos Únicos</p>
              </div>
            </div>
          </div>
          
          <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
             {/* Usa una imagen real de tu local o cocina si tienes */}
             <img 
               src="img/Restaurante.png" 
               alt="Interior del restaurante" 
               className="object-cover w-full h-full"
             />
          </div>
        </div>
      </div>

      {/* VALORES */}
      <div className="bg-orange-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 font-playfair">Nuestros Valores</h2>
            <p className="text-gray-500 mt-2">Lo que nos hace diferentes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ValueCard 
              icon={Utensils} 
              title="Calidad Premium" 
              desc="Seleccionamos los ingredientes más frescos del mercado cada mañana." 
            />
            <ValueCard 
              icon={Heart} 
              title="Hecho con Amor" 
              desc="Cocinamos cada pedido como si fuera para nuestra propia familia." 
            />
            <ValueCard 
              icon={Clock} 
              title="Servicio Rápido" 
              desc="Entendemos tu tiempo. Sabor increíble sin largas esperas." 
            />
          </div>
        </div>
      </div>

    </div>
  );
}

function ValueCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-orange-100 text-center hover:shadow-lg transition-all hover:-translate-y-1">
      <div className="w-16 h-16 bg-orange-100 text-[#ff6d22] rounded-full flex items-center justify-center mx-auto mb-6">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-3">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}