export interface PerfilUsuario {
    UsuarioID: number;
    Username: string;
    FotoPerfil: string | null;
    Nombres: string;
    Apellidos: string;
    Email: string;
    Telefono: string;
    Direccion: string;
    Documento: string;
    TipoDoc: string;
    Cargo: string;
    TerceroID: number;
    AuthID: string; // Para validaciones de seguridad
}