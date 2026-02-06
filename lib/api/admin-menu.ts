"use server";

import { createClient } from '@/utils/supabase/server';

export interface ProductoConPrecio {
  ProductoID: number;
  CategoriaID: number;
  Nombre: string;
  Descripcion: string | null;
  Imagen: string | null;
  Ingredientes: string | null;
  Precio: number;
}

// RENOMBRADO A getProductosAdmin para que coincida con el import de page.tsx
export async function getProductosAdmin(): Promise<ProductoConPrecio[]> {
  const supabase = await createClient();

  // 1. Consultamos TODOS los productos
  const { data, error } = await supabase
    .from('producto')
    .select(`
      *,
      precios (
        Precio,
        FechaActivacion
      )
    `);

  if (error) {
    console.error("Error cargando productos:", error);
    return [];
  }

  if (!data) return [];

  const productosProcesados = data
    .map((prod: any) => {
      const preciosOrdenados = prod.precios?.sort((a: any, b: any) => 
        new Date(b.FechaActivacion).getTime() - new Date(a.FechaActivacion).getTime()
      );
      const precioActual = preciosOrdenados && preciosOrdenados.length > 0 
        ? preciosOrdenados[0].Precio 
        : 0;

      const estadoBD = prod.activo !== undefined ? prod.activo : prod.Activo;
      const esVisible = estadoBD !== false;

      return {
        ProductoID: prod.ProductoID,
        CategoriaID: prod.CategoriaID,
        Nombre: prod.Nombre, 
        Descripcion: prod.Descripcion,
        Imagen: prod.Imagen,
        Ingredientes: prod.Ingredientes,
        Precio: precioActual,
        Activo: esVisible, // Normalizamos el campo para usarlo en el frontend
        NombreCategoria: obtenerNombreCategoria(prod.CategoriaID), // Helper visual
        _esVisible: esVisible 
      };
    })
    .filter((p) => p._esVisible === true || p._esVisible === false); // Devolvemos todos para que el admin vea inactivos tambien

  return productosProcesados;
}

// Helper simple para nombres (opcional, o lo traes de base de datos)
function obtenerNombreCategoria(id: number) {
    switch(id) {
        case 1: return "Desayunos";
        case 2: return "Platos Principales";
        case 3: return "Bebidas";
        case 4: return "Postres";
        default: return "General";
    }
}