import React from 'react';
import Link from 'next/link';
// Usamos iconos de Lucide en lugar de Bootstrap Icons para mantener coherencia, 
// o puedes seguir usando clases "bi bi-" si cargaste la librería en layout.
import { Coffee, UtensilsCrossed, CupSoda, CakeSlice } from 'lucide-react';

interface CategoryCardProps {
  icono: string;
  titulo: string;
  descripcion: string;
  link: string;
}

// Mapeo simple para traducir tus strings de iconos a componentes Lucide
const IconMap: any = {
  "bi-cup-hot": <Coffee className="w-10 h-10 text-primary mb-3" />,
  "bi-egg-fried": <UtensilsCrossed className="w-10 h-10 text-primary mb-3" />,
  "bi-cup-straw": <CupSoda className="w-10 h-10 text-primary mb-3" />,
  "bi-cake2": <CakeSlice className="w-10 h-10 text-primary mb-3" />
};

export default function CategoryCard({ icono, titulo, descripcion, link }: CategoryCardProps) {
  return (
    <div className="col-12 col-md-6 col-lg-3">
      <Link href={link} className="text-decoration-none">
        <div className="card h-100 border-0 shadow-sm hover:shadow-md transition-all text-center p-4 hover:-translate-y-1">
          <div className="card-body d-flex flex-column align-items-center">
            {/* Renderizamos el icono */}
            <div className="rounded-circle bg-orange-50 p-3 mb-3">
               {IconMap[icono] || <UtensilsCrossed className="w-8 h-8 text-primary" />}
            </div>
            <h5 className="card-title fw-bold text-dark mb-2">{titulo}</h5>
            <p className="card-text text-muted small">{descripcion}</p>
            <span className="mt-auto text-primary fw-bold text-sm">Ver opciones &rarr;</span>
          </div>
        </div>
      </Link>
    </div>
  );
}