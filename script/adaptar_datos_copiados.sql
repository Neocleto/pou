-- POU - Adaptación opcional de una copia que conserve textos de otro portal.
-- Ejecutar manualmente y con copia de seguridad. Solo modifica el esquema pou.
-- No crea tablas, no borra registros y no escribe en otros esquemas.
-- Completar las tres variables antes de ejecutar. No contiene datos de conexión.
-- Revisar al terminar y confirmar con COMMIT, o deshacer con ROLLBACK.
BEGIN;

DO $adaptacion$
DECLARE
    sigla_anterior text := ''; -- Sigla de la aplicación de la que se copiaron los datos.
    nombre_anterior text := ''; -- Denominación completa en singular tal como está guardada.
    nombre_plural_anterior text := ''; -- Denominación completa en plural, si existe.
    columna record;
    valor_sql text;
    tipo_sql text;
    anterior text;
    nuevo text;
    cambios bigint;
    numero integer;
    anteriores text[];
    nuevos text[];
BEGIN
    IF btrim(sigla_anterior) = '' OR btrim(nombre_anterior) = '' THEN
        RAISE EXCEPTION 'Completa sigla_anterior y nombre_anterior antes de ejecutar este script.';
    END IF;
    IF upper(sigla_anterior) = 'POU' THEN
        RAISE EXCEPTION 'La sigla de origen debe ser distinta de POU.';
    END IF;

    -- Primero las denominaciones completas; después siglas, rutas e iconos.
    anteriores := ARRAY[nombre_plural_anterior, upper(nombre_plural_anterior), lower(nombre_plural_anterior),
                        nombre_anterior, upper(nombre_anterior), lower(nombre_anterior),
                        upper(sigla_anterior), lower(sigla_anterior), initcap(lower(sigla_anterior)),
                        '#21165e', '#21165E'];
    nuevos := ARRAY['Planes de Ordenación Urbana', 'PLANES DE ORDENACIÓN URBANA', 'planes de ordenación urbana',
                    'Plan de Ordenación Urbana', 'PLAN DE ORDENACIÓN URBANA', 'plan de ordenación urbana',
                    'POU', 'pou', 'Pou', '#540000', '#540000'];

    -- Se recorren solo columnas de texto/JSON de tablas propias de POU.
    -- Los identificadores de tabla/columna se escapan con format(%I).
    FOR columna IN
        SELECT c.table_name, c.column_name, c.data_type
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = 'pou'
          AND t.table_type = 'BASE TABLE'
          AND c.data_type IN ('text', 'character varying', 'character', 'json', 'jsonb')
          AND c.is_generated = 'NEVER'
        ORDER BY c.table_name, c.ordinal_position
    LOOP
        valor_sql := format('%I::text', columna.column_name);
        FOR numero IN 1..array_length(anteriores, 1) LOOP
            anterior := anteriores[numero];
            nuevo := nuevos[numero];
            IF anterior <> '' THEN
                valor_sql := format('replace(%s, %L, %L)', valor_sql, anterior, nuevo);
            END IF;
        END LOOP;
        tipo_sql := CASE columna.data_type WHEN 'jsonb' THEN '::jsonb' WHEN 'json' THEN '::json' ELSE '' END;
        EXECUTE format('UPDATE pou.%I SET %I = (%s)%s WHERE %I IS NOT NULL AND %I::text IS DISTINCT FROM (%s)',
                       columna.table_name, columna.column_name, valor_sql, tipo_sql,
                       columna.column_name, columna.column_name, valor_sql);
        GET DIAGNOSTICS cambios = ROW_COUNT;
        IF cambios > 0 THEN
            RAISE NOTICE '%.%: % registros adaptados', columna.table_name, columna.column_name, cambios;
        END IF;
    END LOOP;
END;
$adaptacion$;

-- La transacción queda abierta para revisar. Ejecutar UNA de estas dos órdenes:
-- COMMIT;
-- ROLLBACK;
