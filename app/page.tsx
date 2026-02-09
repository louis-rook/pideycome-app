import React from 'react';
import Link from 'next/link';
// Importación de la capa de datos: se comunica con Supabase para traer las categorías
import { getCategories } from '@/lib/api/categories';
// Componente visual para renderizar cada tarjeta de categoría individualmente
import CategoryCard from '@/components/CategoryCard';

/**
 * COMPONENTE: HomePage
 * Tipo: Server Component (Async)
 * Función: Renderiza la Landing Page con el Hero y el listado de categorías disponibles.
 */
export default async function HomePage() {
  
  // 1. OBTENCIÓN DE DATOS (SERVER SIDE)
  // Consultamos las categorías en la base de datos de forma asíncrona.
  // Esto permite que el contenido sea dinámico: si agregas una categoría en la BD, aparece aquí.
  const categoriasDB = await getCategories();

  return (
     <>
       {/* ============================================================================
           SECCIÓN: HERO (Encabezado principal)
           Propósito: Captar la atención del usuario y ofrecer acceso directo al menú.
           Clases CSS: 'hero-section' maneja la imagen de fondo y el degradado.
           ============================================================================ */}
       <header className="hero-section">
          <div className="container px-4">
             <div className="flex flex-col items-center">
                {/* Título de marca con tipografía estilizada */}
                <h1 className="titulo-hero mb-4">
                   Pide<span className="fuenteY">&</span>Come
                </h1>
                
                {/* Slogan o descripción corta */}
                <p className="text-white opacity-90 text-xl max-w-2xl mx-auto font-light">
                   Disfruta de la mejor experiencia gastronómica desde la comodidad de tu mesa o tu casa.
                </p>

                {/* Botón de llamado a la acción (Call to Action) */}
                <div className="mt-8">
                  <Link href="/products" className="btn-primary rounded-pill px-8 py-3 text-lg no-underline inline-block">
                    Ver Menú Completo
                  </Link>
                </div>
             </div>
          </div>
       </header>

       {/* ============================================================================
           SECCIÓN: CATEGORÍAS
           Propósito: Mostrar de forma organizada los tipos de productos (Desayunos, Platos, etc.)
           Clase CSS: 'categories-grid' define la disposición adaptable (responsive).
           ============================================================================ */}
       <section className="max-w-7xl mx-auto px-4 py-16">
           <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Explora nuestro menú</h2>
              {/* Línea decorativa con el color naranja de la marca (#ff6d22) */}
              <div className="w-16 h-1 bg-[#ff6d22] mx-auto rounded-full"></div>
           </div>

           {/* MAPEADO DE DATOS:
              Iteramos sobre el array 'categoriasDB' obtenido de la base de datos.
              Por cada objeto 'cat', renderizamos un 'CategoryCard' inyectando sus propiedades.
           */}
           <div className="categories-grid mt-12">
              {categoriasDB.map((cat: any) => (
                 <CategoryCard 
                    key={cat.CategoriaID} // Identificador único requerido por React para optimizar el renderizado
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