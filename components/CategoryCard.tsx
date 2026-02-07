"use client";

import React from 'react';
import Link from 'next/link';
import { Coffee, UtensilsCrossed, CupSoda, CakeSlice, ArrowRight, EggFried, SoupIcon } from 'lucide-react';

interface CategoryCardProps {
  id: number;
  nombre: string;
  descripcion: string;
}

// 1. DICCIONARIO DE ICONOS (Visual)
const IconMap: Record<string, React.ReactNode> = {
  "desayunos": <EggFried className="w-10 h-10" />,
  "platos": <SoupIcon className="w-10 h-10" />,
  "platos principales": <SoupIcon className="w-10 h-10" />,
  "bebidas": <CupSoda className="w-10 h-10" />,
  "postres": <CakeSlice className="w-10 h-10" />,
  "default": <UtensilsCrossed className="w-10 h-10" />
};

// 2. DICCIONARIO DE LINKS (Lógica de tu filtro)
// Traduce el ID de la BD a la palabra que espera tu página de productos
const getSlug = (id: number, nombre: string) => {
    // Si tus IDs en base de datos son fijos (1,2,3,4):
    if (id === 1) return 'desayunos';
    if (id === 2) return 'platos';
    if (id === 3) return 'bebidas';
    if (id === 4) return 'postres';
    
    // Fallback: si agregas una categoría nueva (ej: ID 5), usa su nombre en minúscula
    return nombre.toLowerCase().replace(/\s+/g, '');
};

export default function CategoryCard({ id, nombre, descripcion }: CategoryCardProps) {
  // Configuración Visual
  const iconKey = nombre.toLowerCase().includes('platos') ? 'platos' : nombre.toLowerCase();
  const Icono = IconMap[iconKey] || IconMap["default"];

  // Configuración de Link (Aquí aplicamos la corrección)
  const slugParaFiltro = getSlug(id, nombre);
  const link = `/products?categoria=${slugParaFiltro}`;

  return (
     <Link href={link} className="text-decoration-none group">
        <div className="cat-card">
           {/* TU DISEÑO EXACTO */}
           <div className="cat-icon-wrapper group-hover:bg-[#ff6d22] group-hover:text-white transition-colors duration-300">
              {Icono}
           </div>
           
           <h3 className="text-xl font-bold text-gray-800 mb-2">{nombre}</h3>
           <p className="text-gray-500 text-sm mb-4">{descripcion || "Disfruta de nuestro menú."}</p>
           
           <div className="mt-auto flex items-center text-[#ff6d22] font-bold text-sm">
              Ver opciones <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
           </div>
        </div>
     </Link>
  );
}