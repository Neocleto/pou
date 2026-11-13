# POU · Plan de Ordenación Urbana

Proyecto completo para instalar en `htdocs/pou/` y abrir en `http://localhost/pou/`.
Fecha de entrega: 12/11/2026.

## Instalación

1. Extrae la carpeta `pou` del ZIP dentro de `htdocs`, conservando su nombre en minúsculas.
2. Añade en `pou/config.ini` la configuración de conexión de tu instalación. El ZIP de partida no incluía este archivo. Puedes copiar tu configuración existente o completar `config.ejemplo.ini` y guardarlo como `config.ini`.
3. La conexión fija `search_path` a `pou`. Las consultas propias utilizan `pou.nombre_tabla`, sin prefijo en las tablas. El esquema y sus 19 tablas deben existir antes de utilizar la aplicación.
4. Se conservan las dependencias compartidas de usuarios y convenios en `dbo` y el catálogo municipal `div_adm.municipios_new`. No hay que duplicarlas dentro de `pou`.
5. Ejecuta, si quieres comprobar tablas, permisos y dependencias de la copia, `script/comprobar_esquema_pou.sql`. Es de solo lectura. Revisa especialmente que las secuencias y las funciones de los triggers pertenezcan al nuevo proyecto.
6. Abre el acceso, inicia sesión con un usuario autorizado y comprueba un municipio en el asistente, el configurador y la página pública.

Se conservan el servidor SMTP de la instalación y el remitente institucional. El nombre del remitente, los asuntos y el contenido del correo identifican POU. Las carpetas de archivos e imágenes municipales deben tener permisos de escritura para el servidor web.

## Datos copiados de otro portal

Renombrar una aplicación no reescribe los textos, los JSON, los enlaces o las rutas que ya estén guardados en PostgreSQL. Para una copia con contenido anterior se incluye `script/adaptar_datos_copiados.sql`:

- Completa al principio la sigla de origen y su denominación completa en singular; completa también el plural si existe.
- El script adapta las siglas en mayúsculas, minúsculas y capitalizadas, las denominaciones completas y el color corporativo de origen conocido. Esto incluye los nombres de iconos y las rutas guardadas en campos de texto y JSON.
- Solo actualiza tablas del esquema `pou`. No crea ni elimina tablas ni registros y no escribe en otros esquemas.
- Haz una copia de seguridad antes. La transacción queda abierta: revisa el resultado y ejecuta `COMMIT` para confirmar o `ROLLBACK` para deshacer.
- Los textos jurídicos o municipales personalizados y los documentos externos requieren revisión por sus responsables; una sustitución de nombres no valida su contenido ni modifica documentos remotos.

Si las tablas ya contienen los textos y las rutas definitivas de POU, este paso no es necesario. Los nombres guardados de iconos propios se adaptan al identificador POU al leerlos y al guardarlos; no hace falta ejecutar SQL para recuperar esos dibujos. La adaptación general de textos y enlaces sigue siendo opcional y manual.

## Identidad y estructura

- Nombre: **POU · Plan de Ordenación Urbana**.
- Color corporativo: **`#540000`**, tomado de la muestra facilitada.
- Acceso, gestión, asistente de siete pasos, configurador, documentos, formularios, noticias, preguntas y buzón conservan su estructura y funcionamiento.
- Textos, variables, constantes, funciones, clases CSS, iconos, cabeceras de petición, almacenamiento local, nombres de archivos y rutas utilizan POU.
- Las marcas institucionales oficiales y las fotografías municipales se conservan. Los recursos de marca propios, iconos, diagramas de fases e imágenes de ayuda se han adaptado. Los iconos de participación, documentos, noticias y encuestas conservan las formas originales, con tinta burdeos. Las fuentes vectoriales de los nuevos gráficos se encuentran en `images/marca/`.
- El configurador mantiene la personalización de colores; el diseño inicial de POU usa burdeos en todos sus bloques.

## Localización de cambios

| Responsabilidad | Ubicación |
| --- | --- |
| Conexión y esquema | `php/db/conexion.php` |
| Catálogo de textos, colores e iconos | `php/includes/valores_portal.php` |
| Tema de componentes compartidos | `css/tema-pou.css` |
| Apariencia por pantalla | `css/` |
| Consultas propias | `php/modelo/`, endpoints de `php/` |
| Acceso y navegación | `index.php`, `js/index.js`, vistas de `php/` |
| Asistente y configurador | `js/gestion/`, `php/gestion/` |
| Correos | `php/municipio/CorreoParticipacion.php`, `enviar_buzon.php` |
| Identidad gráfica y ayudas | `images/`, `images/ayuda/`, `images/iconos/` |

El inventario de archivos modificados y añadidos está en `ARCHIVOS_MODIFICADOS.txt`.

## Scripts históricos

`script/historial/` conserva los scripts de evolución con nombres, esquemas y textos POU. **No los ejecutes en bloque sobre las tablas copiadas**: representan distintas versiones históricas, algunos modifican estructuras y no forman un instalador acumulativo. La aplicación no ejecuta DDL ni migraciones automáticamente.

## Requisitos y verificación

PHP con PDO PostgreSQL, fileinfo y DOM, PostgreSQL y un servidor web con soporte PHP. Se mantiene el límite de 8 MB para documentos, 5 MB para adjuntos del buzón y 4 MB para escudos.

Lee `VERIFICACION.md` para conocer exactamente las pruebas realizadas y las comprobaciones pendientes en el entorno real.
