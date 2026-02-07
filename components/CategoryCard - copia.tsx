"use client";

import React from 'react';
import Link from 'next/link';
import { Coffee, UtensilsCrossed, CupSoda, CakeSlice, Soup } from 'lucide-react';

interface CategoryCardProps {
  titulo: string;
  descripcion: string;
  link: string;
}

// Mapeo basado en el nombre que venga de la base de datos
const IconMap: any = {
  "bebidas": <CupSoda className="w-10 h-10 text-primary mb-3" />,
  "desayunos": <Coffee className="w-10 h-10 text-primary mb-3" />,
  "postres": <CakeSlice className="w-10 h-10 text-primary mb-3" />,
  "platos": <Soup className="w-10 h-10 text-primary mb-3" />,
  "almuerzos": <UtensilsCrossed className="w-10 h-10 text-primary mb-3" />
};

export default function CategoryCard({ titulo, descripcion, link }: CategoryCardProps) {
  const key = titulo.toLowerCase();

  return (
    <div className="col-12 col-md-6 col-lg-3">
      <Link href={link} className="text-decoration-none">
        <div className="card h-100 border-0 shadow-sm hover:shadow-md transition-all text-center p-4 hover:-translate-y-1">
          <div className="card-body d-flex flex-column align-items-center">
            <div className="rounded-circle bg-orange-50 p-3 mb-3">
               {IconMap[key] || <UtensilsCrossed className="w-8 h-8 text-primary" />}
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