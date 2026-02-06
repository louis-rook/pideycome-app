import React from 'react';
import Link from 'next/link';
// Iconos
import { Coffee, UtensilsCrossed, CupSoda, CakeSlice, ArrowRight, EggFried, Beef, SoupIcon } from 'lucide-react';


export default function HomePage() {
  
  const categorias = [
    {
      id: "desayunos",
      icono: <EggFried className="w-10 h-10" />, 
      titulo: "Desayunos",
      descripcion: "EComienza tu día con nuestros deliciosos desayunos, preparados con ingredientes frescos.",
      link: "/products?categoria=desayunos" 
    },
    {
      id: "platos",
      icono: <SoupIcon className="w-10 h-10" />, 
      titulo: "Platos Principales",
      descripcion: "Disfruta de nuestros platos principales, elaborados con una combinación única de calidad superior.",
      link: "/products?categoria=platos"
    },
    {
      id: "bebidas",
      icono: <CupSoda className="w-10 h-10" />, 
      titulo: "Bebidas",
      descripcion: "Refréscate con nuestra selección de bebidas frías y calientes, perfectas para acompañar tu comida.",
      link: "/products?categoria=bebidas"
    },
    {
      id: "postres",
      icono: <CakeSlice className="w-10 h-10" />, 
      titulo: "Postres",
      descripcion: "Endulza tu día con nuestros postres caseros, preparados con amor para el cierre de una comida perfecta.",
      link: "/products?categoria=postres"
    }
  ];

  return (
     <>
       {/* 1. SECCIÓN HERO (Con tu CSS exacto) */}
       <header className="hero-section">
          <div className="container px-4">
             <div className="flex flex-col items-center">
                <h1 className="titulo-hero mb-4">
                   Pide<span className="fuenteY">&</span>Come
                </h1>
                <p className="text-white opacity-90 text-xl max-w-2xl mx-auto font-light">
                   Disfruta de la mejor experiencia gastronómica desde la comodidad de tu mesa o tu casa.
                </p>
                <div className="mt-8">
                  <Link href="/products" className="btn-primary rounded-pill px-8 py-3 text-lg no-underline inline-block">
                    Ver Menú Completo
                  </Link>
                </div>
             </div>
          </div>
       </header>

       {/* 2. SECCIÓN DE CATEGORÍAS (Diseño Tarjetas) */}
       <section className="max-w-7xl mx-auto px-4 py-16">
           <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Explora nuestro menú</h2>
              <div className="w-16 h-1 bg-[#ff6d22] mx-auto rounded-full"></div>
           </div>

           {/* Grilla Responsive (1 col móvil, 2 tablet, 4 pc) */}
           <div className="categories-grid">
              {categorias.map((cat, index) => (
                 <Link href={cat.link} key={index} className="text-decoration-none group">
                    <div className="cat-card">
                       {/* Círculo Icono */}
                       <div className="cat-icon-wrapper group-hover:bg-[#ff6d22] group-hover:text-white transition-colors duration-300">
                          {cat.icono}
                       </div>
                       
                       <h3 className="text-xl font-bold text-gray-800 mb-2">{cat.titulo}</h3>
                       <p className="text-gray-500 text-sm mb-4">{cat.descripcion}</p>
                       
                       <div className="mt-auto flex items-center text-[#ff6d22] font-bold text-sm">
                          Ver opciones <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-foorm" />
                       </div>
                    </div>
                 </Link>
              ))}
           </div>
       </section>
     </>
  )
}