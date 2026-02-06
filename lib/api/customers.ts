"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { DatosCliente } from "@/types/database";

export async function buscarClientePorTelefono(telefono: string): Promise<DatosCliente | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('tercero')
    .select(`
      Nombres,
      Apellidos,
      Direccion,
      Email,
      NumeroDocumento,
      TipoDocumento
    `)
    .eq('Telefono', telefono)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    telefono,
    nombres: data.Nombres,
    apellidos: data.Apellidos,
    direccion: data.Direccion,
    email: data.Email,
    numeroDocumento: data.NumeroDocumento,
    tipoDocumento: data.TipoDocumento
  };
}