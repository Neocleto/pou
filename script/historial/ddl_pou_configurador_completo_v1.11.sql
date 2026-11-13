-- ============================================================================
-- POU v1.11 - CONFIGURADOR COMPLETO DEL PORTAL
--
-- Este campo guarda los textos y etiquetas configurables de la pagina publica.
-- Se usa JSON para mantener el codigo sencillo y evitar una columna por frase.
-- ============================================================================

ALTER TABLE pou.configuracion_visual
    ADD COLUMN IF NOT EXISTS contenido_portal JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE pou.configuracion_visual
SET contenido_portal = '{}'::jsonb
WHERE contenido_portal IS NULL;

COMMENT ON COLUMN pou.configuracion_visual.contenido_portal IS
'Textos, etiquetas y enlaces configurables del portal publico POU.';
