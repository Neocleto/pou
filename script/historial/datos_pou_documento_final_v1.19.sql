-- ============================================================================
-- CATÁLOGO DE DOCUMENTOS: completar «Documento final» si una instalación antigua
-- solo contiene Avance, Aprobación inicial y Aprobación definitiva.
-- No modifica tablas, archivos ni documentos publicados. Ejecutar manualmente.
-- Si ya existe Documento/Propuesta final, no hace ningún cambio.
-- Los números internos y la segunda aprobación inicial (2.1) se conservan.
-- ============================================================================
BEGIN;
DO $$
DECLARE
    nuevo_numero integer;
    codigo_definitiva text;
    codigo_final text;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pou.fases_documentos
        WHERE lower(titulo) LIKE '%final%'
          AND lower(titulo) NOT LIKE '%definitiva%'
    ) THEN
        SELECT codigo INTO codigo_definitiva
        FROM pou.fases_documentos
        WHERE lower(titulo) LIKE '%definitiva%'
        ORDER BY num_fase LIMIT 1;

        -- Se coloca antes de Aprobación definitiva al ordenar con version_compare.
        IF codigo_definitiva = '3' THEN
            codigo_final := '2.9';
        ELSIF codigo_definitiva = '4' THEN
            codigo_final := '3.9';
        ELSE
            RAISE EXCEPTION 'Revisar el catálogo: no se identifica una aprobación definitiva con código 3 o 4.';
        END IF;
        IF EXISTS (SELECT 1 FROM pou.fases_documentos WHERE codigo = codigo_final) THEN
            RAISE EXCEPTION 'El código previsto para Documento final ya existe: %', codigo_final;
        END IF;
        SELECT COALESCE(MAX(num_fase), 0) + 1 INTO nuevo_numero
        FROM pou.fases_documentos;
        INSERT INTO pou.fases_documentos (num_fase, codigo, etiqueta, titulo, es_fase_21)
        VALUES (nuevo_numero, codigo_final, 'Documento final', 'DOCUMENTO FINAL', FALSE);
    END IF;
END $$;
COMMIT;
-- Comprobación: SELECT num_fase, codigo, titulo FROM pou.fases_documentos;
