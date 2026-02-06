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
  // No necesitamos exportar 'Activo' al cliente, pero lo usamos internamente para filtrar
}

export async function getProductos(): Promise<ProductoConPrecio[]> {
  const supabase = await createClient();

  // 1. Consultamos TODOS los productos (sin el .eq 'activo' que estaba fallando)
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

  // 2. Procesamos y FILTRAMOS aquí mismo
  const productosProcesados = data
    .map((prod: any) => {
      // A. Lógica de Precios
      const preciosOrdenados = prod.precios?.sort((a: any, b: any) => 
        new Date(b.FechaActivacion).getTime() - new Date(a.FechaActivacion).getTime()
      );
      const precioActual = preciosOrdenados && preciosOrdenados.length > 0 
        ? preciosOrdenados[0].Precio 
        : 0;

      // B. Lógica Robusta de Estado (Detecta Activo, activo o null)
      // Si es null o undefined, asumimos que es TRUE (para no esconder productos viejos)
      // Solo lo ocultamos si es explícitamente FALSE.
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
        _esVisible: esVisible // Campo temporal para filtrar abajo
      };
    })
    // 3. Filtramos solo los que deben ser visibles
    .filter((p) => p._esVisible === true);

  return productosProcesados;
}