# Verificación de POU

Fecha: 12/11/2026.

## Pruebas ejecutadas

- Sintaxis de los 81 archivos PHP: correcta. Intérprete disponible: PHP 8.4.27. No se ha ejecutado PHP 8.3 en este entorno.
- Sintaxis de los 27 JavaScript propios: correcta con `node --check`.
- Análisis sintáctico PostgreSQL de los 15 scripts SQL: correcto. Esto no verifica la existencia de tablas ni la ejecución de los bloques PL/pgSQL.
- Revisión de las consultas propias: esquema `pou` y tablas sin prefijo. Se conservan las dependencias compartidas `dbo` y `div_adm`.
- Carga en Chromium de acceso, portal municipal, documentos, panel y configurador con las vistas y los JavaScript reales, utilizando datos de prueba y respuestas locales de prueba para las consultas: sin errores PHP, errores de JavaScript ni recursos HTTP fallidos.
- Acceso, portal y documentos a 390 px: sin desbordamiento horizontal.
- Apertura y cierre del login, despliegue de preguntas, ampliación del diagrama de fases y apertura del asistente: correctos.
- Apertura de los once apartados del configurador y actualización de texto y color dentro de su iframe: correctas.
- Revisión visual de acceso, login, portal, documentos, panel, configurador y móvil.
- Búsqueda del nombre de origen en nombres de archivo y contenido textual, más revisión OCR de los gráficos distribuidos.
- Extracción del ZIP final y comparación de inventario y SHA-256 de todos sus archivos.

## Límites de la comprobación

El archivo de configuración y la base de datos de la instalación no se facilitaron. Las pruebas de navegador utilizaron datos de ejemplo, sin conectarse a datos de producción.

Queda por comprobar en LOCAL o PRE: conexión real, credenciales y convenios, permisos efectivos, CRUD y persistencia de todos los módulos, secuencias y triggers de las tablas copiadas, acceso a documentos existentes, recepción de correos y textos o enlaces personalizados guardados en la base de datos.

Los scripts opcionales se entregan para ejecución manual. No se ha ejecutado ninguna modificación sobre la base de datos del usuario.

## Corrección de iconos y paginación

- La página activa de DataTables usa exactamente `#540000`; se ha renovado la URL de caché de su hoja de estilos.
- Se han recuperado las formas originales de los iconos. El rótulo pequeño del icono de documentos identifica POU.
- Los iconos de los siete tipos propios copiados se normalizan al leer accesos, secciones, recursos, formularios y contenido JSON, así como al guardar. Los iconos de Bootstrap y la opción Sin icono se conservan.
- Prueba de regresión con registros que conservaban los identificadores de origen: correctos el portal, las secciones del editor, ambos recursos de encuesta y el listado de formularios.
- Cambio de icono desde el selector del configurador: correcto. Sin errores de JavaScript ni recursos fallidos.
- Comprobada la lectura y normalización de los tres modelos con una conexión de prueba; no se ha escrito en la base de datos real.
