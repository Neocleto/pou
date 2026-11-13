-- ============================================================================
-- POU V1.18 - VISIBILIDAD TEMPORAL DE RECURSOS DE PARTICIPACION
--
-- Permite ocultar un recurso sin eliminar su archivo ni su configuracion.
-- El script es seguro para ejecutarlo una sola vez sobre una instalacion actual.
-- ============================================================================

ALTER TABLE pou.participacion_botones
    ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT TRUE;

-- Los registros anteriores deben seguir apareciendo en la pagina publica.
UPDATE pou.participacion_botones
SET visible = TRUE
WHERE visible IS NULL;

COMMENT ON COLUMN pou.participacion_botones.visible IS
    'Indica si el recurso se muestra temporalmente en la pagina publica.';
