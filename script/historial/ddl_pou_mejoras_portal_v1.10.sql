-- POU v1.10 - Mejoras visuales del portal público
-- Ejecutar una sola vez después de los scripts anteriores.
-- Todas las instrucciones son compatibles con instalaciones ya existentes.

-- 1. Los nuevos portales aprovechan mejor las pantallas grandes.
ALTER TABLE pou.configuracion_visual
ALTER COLUMN ancho_contenido SET DEFAULT 1800;

-- 2. Cada recurso de participación puede tener su propio icono y color.
ALTER TABLE pou.participacion_botones
ADD COLUMN IF NOT EXISTS icono VARCHAR(50) NOT NULL DEFAULT 'file-earmark-arrow-down';

ALTER TABLE pou.participacion_botones
ADD COLUMN IF NOT EXISTS color VARCHAR(20) NOT NULL DEFAULT '#540000';

-- 3. Conservamos el aspecto naranja de los botones antiguos que lo usaban.
UPDATE pou.participacion_botones
SET color = '#540000'
WHERE es_naranja = TRUE
  AND color = '#540000';
