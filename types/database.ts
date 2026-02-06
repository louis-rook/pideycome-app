export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// --- BASE DE DATOS (Espejo de tus tablas) ---

export interface Producto {
  ProductoID: number;
  CategoriaID: number;
  Nombre: string;
  Descripcion: string | null;
  Imagen: string | null;
  Ingredientes: string | null;
}

export interface Categoria {
  CategoriaID: number;
  Nombre: string;
  Descripcion: string | null;
}

// --- EXTENSIONES PARA EL FRONTEND ---

// Producto con el precio ya calculado (desde la tabla precios)
export interface ProductoConPrecio extends Producto {
  Precio: number;
}

// Item del Carrito (Producto + Cantidad + Notas)
export interface CartItem extends ProductoConPrecio {
  cantidad: number;
  observaciones: string;
  uuid: string; // Identificador único para el frontend
}

// Datos del Cliente (Para formularios)
export interface DatosCliente {
  telefono: string;
  nombres: string;
  apellidos: string;
  direccion: string;
  email: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
}