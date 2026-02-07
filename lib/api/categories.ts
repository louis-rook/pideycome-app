"use server";
import { createClient } from "@/utils/supabase/server";

export async function getCategories() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('categoria')
    .select('CategoriaID, Nombre, Descripcion')
    .order('Nombre'); // Orden alfabético o como prefieras

  if (error) {
    console.error("Error al obtener categorías:", error);
    return [];
  }
  
  return data;
}