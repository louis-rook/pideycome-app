// lib/constants/roles.ts

export const ROLES = {
  ADMIN: 1,
  COCINERO: 2,
  MESERO: 3,
  CAJERO: 4,
  LIDER: 5,
} as const;

export const PERMISOS = {
  // Quién ve el dinero y gráficas financieras
  VER_DASHBOARD_FINANCIERO: [ROLES.ADMIN, ROLES.LIDER],
  
  // Quién ve el resumen operativo (Pedidos, Entregas)
  // Nota: Agregué a ADMIN y LIDER aquí también por si quieren ver la operación
  VER_DASHBOARD_OPERATIVO: [ROLES.MESERO, ROLES.CAJERO, ROLES.COCINERO, ROLES.ADMIN, ROLES.LIDER],

  // Quién puede realizar el Arqueo (Cuadre de caja)
  REALIZAR_ARQUEO: [ROLES.ADMIN, ROLES.LIDER],

  // Acceso a módulos específicos
  MODULO_MENU: [ROLES.ADMIN, ROLES.LIDER],
  MODULO_PERSONAL: [ROLES.ADMIN],
};