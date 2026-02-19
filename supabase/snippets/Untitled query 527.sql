BEGIN;

-- ============================================================================
-- 1. INSERTAR CATEGORÍAS
-- ============================================================================
-- Usamos OVERRIDING SYSTEM VALUE para forzar los IDs que nos diste en el JSON

INSERT INTO public.categoria ("CategoriaID", "Nombre", "Descripcion")
OVERRIDING SYSTEM VALUE VALUES
  (1, 'Desayunos', 'Comienza tu día con nuestros deliciosos desayunos, preparados con ingredientes frescos.'),
  (2, 'Platos Principales', 'Disfruta de nuestros platos principales, elaborados con una combinación única de calidad superior.'),
  (3, 'Bebidas', 'Refréscate con nuestra selección de bebidas frías y calientes, perfectas para acompañar tu comida.'),
  (4, 'Postres', 'Endulza tu día con nuestros postres caseros, preparados con amor para el cierre de una comida perfecta.')
ON CONFLICT ("CategoriaID") DO UPDATE 
SET "Nombre" = EXCLUDED."Nombre", "Descripcion" = EXCLUDED."Descripcion";

-- IMPORTANTE: Ajustar la secuencia para que el próximo ID automático sea el 5
SELECT setval(pg_get_serial_sequence('public.categoria', 'CategoriaID'), (SELECT MAX("CategoriaID") FROM public.categoria));


-- ============================================================================
-- 2. INSERTAR PRODUCTOS
-- ============================================================================

INSERT INTO public.producto ("ProductoID", "CategoriaID", "Nombre", "Descripcion", "Imagen", "Ingredientes", "activo")
OVERRIDING SYSTEM VALUE VALUES
  (1, 1, 'Huevos Napolitanos', 'Huevos pochados sobre una base de tostada rústica, bañados en salsa napolitana casera y queso parmesano.', '/img/hnapo.jpg', 'Huevo, pan, salsa de tomate, queso parmesano, albahaca.', true),
  (2, 1, 'Pancakes con Frutos Rojos', 'Torre de pancakes esponjosos acompañados de una mezcla de frutos rojos frescos y miel de maple.', '/img/panceke.jpeg', 'Harina, huevos, leche, fresas, arándanos, miel de maple.', true),
  (3, 2, 'Pizza de Pepperoni', 'Pizza clásica con una generosa capa de pepperoni, queso mozzarella fresco y nuestra salsa secreta.', '/img/pizza.jpg', 'Masa, salsa de tomate, queso mozzarella, pepperoni.', true),
  (4, 2, 'Ensalada César', 'Lechuga romana fresca, crutones al ajo, queso parmesano y pechuga de pollo a la parrilla con aderezo César.', '/img/ensalada.jpg', 'Lechuga, pollo, crutones, queso parmesano, aderezo César.', true),
  (5, 3, 'Mojito Clásico', 'Refrescante cóctel cubano con ron, hierbabuena fresca, lima, azúcar y un toque de soda.', '/img/mojito.jpg', 'Ron blanco, hierbabuena, lima, azúcar, soda.', true),
  (8, 4, 'Cheesecake de Chocolate', 'Suave y cremoso pastel de queso sobre una base de galleta, cubierto con una deliciosa salsa de fresas.', '/img/torta.jpeg', 'Queso crema, galleta, mantequilla, fresas, azúcar.', true),
  (7, 4, 'Tiramisú Italiano', 'Postre italiano clásico con capas de bizcocho empapado en café, crema de mascarpone y un toque de cacao.', '/img/tiramisú.jpg', 'Queso mascarpone, café, huevos, azúcar, cacao.', true),
  (6, 3, 'Jugo de Sandía', 'Jugo ultra refrescante hecho con sandía fresca, perfecto para calmar la sed en un día caluroso.', '/img/jugo.jpg', 'Sandía, un toque de limón, hielo.', true)
ON CONFLICT ("ProductoID") DO UPDATE 
SET "Nombre" = EXCLUDED."Nombre", "Descripcion" = EXCLUDED."Descripcion", "Imagen" = EXCLUDED."Imagen", "Ingredientes" = EXCLUDED."Ingredientes";

-- Ajustar la secuencia de productos
SELECT setval(pg_get_serial_sequence('public.producto', 'ProductoID'), (SELECT MAX("ProductoID") FROM public.producto));


-- ============================================================================
-- 3. INSERTAR HISTORIAL DE PRECIOS
-- ============================================================================
-- Asumimos que el UsuarioID 1 existe (es el admin del sistema que creamos antes).
-- Si hiciste el paso anterior correctamente, el usuario admin debería tener el ID 1.

INSERT INTO public.precios ("ProductoID", "FechaActivacion", "Precio", "FechaModificacion", "UsuarioCreacion", "UsuarioModificacion")
VALUES
  (1, '2025-12-07', 17000.00, '2025-12-07 16:51:05.079576-05', 1, null),
  (2, '2025-12-07', 23000.00, '2025-12-07 16:51:05.079576-05', 1, null),
  (3, '2025-12-07', 28000.00, '2025-12-07 16:51:05.079576-05', 1, null),
  (4, '2025-12-07', 25000.00, '2025-12-07 16:51:05.079576-05', 1, null),
  (5, '2025-12-07', 19000.00, '2025-12-07 16:51:05.079576-05', 1, null),
  (7, '2025-12-07', 18500.00, '2025-12-07 16:51:05.079576-05', 1, null),
  (8, '2025-12-07', 17000.00, '2025-12-07 16:51:05.079576-05', 1, null),
  (8, '2026-01-26', 17000.00, '2026-01-25 22:36:20.05495-05', 1, null),
  (6, '2026-01-29', 5000.00, '2026-01-29 21:20:32.620332-05', 1, null),
  (6, '2026-02-04', 6000.00, '2026-02-04 00:10:17.993992-05', 1, null)
ON CONFLICT ("ProductoID", "FechaActivacion", "Precio") DO NOTHING;

COMMIT;


-----/------------
BEGIN;

-- ============================================================================
-- INSERTAR CARGOS (Respetando IDs exactos)
-- ============================================================================
-- Usamos OVERRIDING SYSTEM VALUE para que PostgreSQL acepte los IDs 1, 2, 3...
-- en lugar de intentar autogenerarlos.

BEGIN;

-- ============================================================================
-- INSERTAR CARGOS (Respetando Mayúsculas y IDs)
-- ============================================================================

INSERT INTO public.cargo ("CargoID", "NombreCargo")
OVERRIDING SYSTEM VALUE VALUES
  (1, 'Administrador Sistema'),
  (2, 'Cocinero'),
  (3, 'Mesero'),
  (4, 'Cajero'),
  (5, 'Lider')
ON CONFLICT ("CargoID") DO UPDATE 
SET "NombreCargo" = EXCLUDED."NombreCargo";

-- ============================================================================
-- AJUSTAR SECUENCIA (Importante)
-- ============================================================================
-- Esto le dice a la base de datos: "El último ID usado fue el 5, el próximo
-- que crees automáticamente debe ser el 6".

SELECT setval(pg_get_serial_sequence('public.cargo', 'CargoID'), (SELECT MAX("CargoID") FROM public.cargo));

COMMIT;


-----------//--------------

BEGIN;

-- ============================================================================
-- INSERTAR ESTADOS DEL PEDIDO
-- ============================================================================
-- Usamos OVERRIDING SYSTEM VALUE para forzar los IDs (1, 2, 3...)
-- en lugar de dejar que la base de datos los autogenere.

INSERT INTO public.estado ("EstadoID", "NombreEstado")
OVERRIDING SYSTEM VALUE VALUES
  (1, 'Por Confirmar'),
  (2, 'Pagado'),
  (3, 'En Preparación'),
  (4, 'Listo para Entregar'),
  (5, 'Entregado'),
  (6, 'Cancelado'),
  (7, 'Pedido Recibido')
ON CONFLICT ("EstadoID") DO UPDATE 
SET "NombreEstado" = EXCLUDED."NombreEstado";

-- ============================================================================
-- AJUSTAR SECUENCIA
-- ============================================================================
-- Esto asegura que si creas un nuevo estado en el futuro, 
-- el sistema sepa que debe empezar desde el 8.

SELECT setval(pg_get_serial_sequence('public.estado', 'EstadoID'), (SELECT MAX("EstadoID") FROM public.estado));

COMMIT;

select * from producto