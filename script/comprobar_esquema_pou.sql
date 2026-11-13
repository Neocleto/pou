-- POU - Comprobación de instalación: solo lectura.
-- Ejecutar con el mismo usuario que utiliza la aplicación.
-- No crea ni modifica tablas, datos, funciones, permisos o esquemas.

-- 1. Las 19 tablas propias utilizadas por la aplicación.
WITH tablas_necesarias(nombre) AS (
    VALUES
        ('accesos_publicos'), ('categorias_documentos'), ('configuracion_visual'),
        ('documentos'), ('faq_municipio'), ('faqs'), ('fase_actual'), ('fases'),
        ('fases_documentos'), ('formulario_preguntas'), ('formulario_respuestas'),
        ('formulario_secciones'), ('formularios'), ('informacion_general'),
        ('municipios'), ('noticias'), ('participacion'), ('participacion_botones'),
        ('subfases')
), tablas_resueltas AS (
    SELECT nombre, to_regclass('pou.' || nombre) AS tabla
    FROM tablas_necesarias
)
SELECT nombre, tabla IS NOT NULL AS existe,
       has_table_privilege(current_user, tabla, 'SELECT') AS puede_leer,
       has_table_privilege(current_user, tabla, 'INSERT') AS puede_crear,
       has_table_privilege(current_user, tabla, 'UPDATE') AS puede_editar,
       has_table_privilege(current_user, tabla, 'DELETE') AS puede_eliminar
FROM tablas_resueltas
ORDER BY nombre;

-- 2. Revisar las claves externas a esquemas ajenos al portal y al acceso común.
SELECT tabla.relname AS tabla, restriccion.conname AS restriccion,
       pg_get_constraintdef(restriccion.oid) AS definicion
FROM pg_constraint restriccion
JOIN pg_class tabla ON tabla.oid = restriccion.conrelid
JOIN pg_namespace esquema ON esquema.oid = tabla.relnamespace
JOIN pg_class destino ON destino.oid = restriccion.confrelid
JOIN pg_namespace esquema_destino ON esquema_destino.oid = destino.relnamespace
WHERE restriccion.contype = 'f' AND esquema.nspname = 'pou'
  AND esquema_destino.nspname NOT IN ('pou', 'dbo')
ORDER BY tabla.relname, restriccion.conname;

-- 3. Una secuencia de una tabla copiada debe ser propia de pou.
SELECT tabla.relname AS tabla, columna.attname AS columna,
       esquema_secuencia.nspname AS esquema_secuencia,
       secuencia.relname AS secuencia
FROM pg_attrdef defecto
JOIN pg_class tabla ON tabla.oid = defecto.adrelid
JOIN pg_namespace esquema ON esquema.oid = tabla.relnamespace
JOIN pg_attribute columna ON columna.attrelid = tabla.oid AND columna.attnum = defecto.adnum
JOIN pg_depend dependencia ON dependencia.classid = 'pg_attrdef'::regclass
                         AND dependencia.objid = defecto.oid
                         AND dependencia.refclassid = 'pg_class'::regclass
JOIN pg_class secuencia ON secuencia.oid = dependencia.refobjid AND secuencia.relkind = 'S'
JOIN pg_namespace esquema_secuencia ON esquema_secuencia.oid = secuencia.relnamespace
WHERE esquema.nspname = 'pou' AND esquema_secuencia.nspname <> 'pou'
ORDER BY tabla.relname, columna.attname;

-- 4. Revisar las funciones que ejecutan los triggers de las tablas de POU.
-- Las funciones propias deben pertenecer a pou y consultar sus tablas.
SELECT tabla.relname AS tabla, disparador.tgname AS nombre_trigger,
       esquema_funcion.nspname AS esquema_funcion, funcion.proname AS funcion,
       pg_get_functiondef(funcion.oid) AS definicion_funcion
FROM pg_trigger disparador
JOIN pg_class tabla ON tabla.oid = disparador.tgrelid
JOIN pg_namespace esquema ON esquema.oid = tabla.relnamespace
JOIN pg_proc funcion ON funcion.oid = disparador.tgfoid
JOIN pg_namespace esquema_funcion ON esquema_funcion.oid = funcion.pronamespace
WHERE esquema.nspname = 'pou' AND NOT disparador.tgisinternal
ORDER BY tabla.relname, disparador.tgname;

-- 5. Dependencias compartidas que conserva el acceso y la selección municipal.
SELECT objeto, to_regclass(objeto) IS NOT NULL AS existe
FROM (VALUES ('dbo.web_usuarios'), ('dbo.web_usuarios_convenios'),
             ('div_adm.municipios_new')) AS compartidas(objeto);
