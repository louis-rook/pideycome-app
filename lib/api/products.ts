"use server";

// ============================================================================
// IMPORTACIONES
// ============================================================================
import { createClient } from '@/utils/supabase/server';

// ============================================================================
// INTERFACES Y TIPOS ESTRICTOS (Cero 'any')
// ============================================================================
export interface ProductoConPrecio {
  ProductoID: number;
  CategoriaID: number;
  Nombre: string;
  Descripcion: string | null;
  Imagen: string | null;
  Ingredientes: string | null;
  Precio: number;
}

// Interfaz para tipar la respuesta en bruto de Supabase antes de procesarla
interface PrecioDB {
  Precio: number;
  FechaActivacion: string;
}

interface ProductoDB {
  ProductoID: number;
  CategoriaID: number;
  Nombre: string;
  Descripcion: string | null;
  Imagen: string | null;
  Ingredientes: string | null;
  activo?: boolean; // Dependiendo de cómo esté en BD (minúscula)
  Activo?: boolean; // o mayúscula
  precios: PrecioDB[] | null;
}

// ============================================================================
// FUNCIÓN: getProductos
// ============================================================================
/**
 * Obtiene el catálogo de productos activos con su precio más reciente.
 * * ARQUITECTURA: Solo lectura (GET), ubicado correctamente en lib/api.
 * * RENDIMIENTO: Trae todos los productos y sus precios en un solo Join (Nested Select).
 * * TIPADO: Se eliminaron los casteos 'any' para garantizar seguridad en tiempo de compilación.
 */
export async function getProductos(): Promise<ProductoConPrecio[]> {
  const supabase = await createClient();

  // 1. Consultamos TODOS los productos y sus precios
  // Nota: Se evita el .eq('activo', true) aquí a petición de la regla de negocio
  // para manejar la inconsistencia de nombres (activo vs Activo) en JavaScript.
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
    console.error("❌ Error cargando productos:", error.message);
    return [];
  }

  if (!data) return [];

  // Tipamos la respuesta explícitamente usando la interfaz definida
  const rawData = data as unknown as ProductoDB[];

  // 2. Procesamos y FILTRAMOS en el servidor
  const productosProcesados = rawData
    .map((prod) => {
      // A. Lógica de Precios (Buscando el precio activo más reciente)
      // Se ordena de forma descendente por fecha
      const preciosOrdenados = prod.precios?.sort((a, b) => 
        new Date(b.FechaActivacion).getTime() - new Date(a.FechaActivacion).getTime()
      );
      
      const precioActual = preciosOrdenados && preciosOrdenados.length > 0 
        ? preciosOrdenados[0].Precio 
        : 0;

      // B. Lógica Robusta de Estado
      // Si el campo es null o undefined, asumimos TRUE para no esconder datos históricos por error.
      // Solo se oculta si es explícitamente false.
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
        _esVisible: esVisible // Flag temporal para el filtro
      };
    })
    // 3. Filtramos solo los visibles y eliminamos el flag temporal para no mandarlo al Frontend
    .filter((p) => p._esVisible === true)
    .map(({ _esVisible, ...restoDelProducto }) => restoDelProducto);

  return productosProcesados;
}