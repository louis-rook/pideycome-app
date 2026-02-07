import React from 'react';
import Link from 'next/link';
import { getCategories } from '@/lib/api/categories';
import CategoryCard from '@/components/CategoryCard';

export default async function HomePage() {
  const categoriasDB = await getCategories();

  return (
     <>
       {/* HERO */}
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

       {/* CATEGORÍAS */}
       <section className="max-w-7xl mx-auto px-4 py-16">
           <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Explora nuestro menú</h2>
              <div className="w-16 h-1 bg-[#ff6d22] mx-auto rounded-full"></div>
           </div>

           {/* Mantenemos tu clase de grilla original */}
           <div className="categories-grid mt-12">
              {categoriasDB.map((cat: any) => (
                 <CategoryCard 
                    key={cat.CategoriaID}
                    id={cat.CategoriaID}
                    nombre={cat.Nombre}
                    descripcion={cat.Descripcion}
                 />
              ))}
           </div>
       </section>
     </>
  )
}