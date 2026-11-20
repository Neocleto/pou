<?php
// Borra únicamente archivos de documentos o imágenes del municipio indicado.
// Se llama después de guardar el cambio en BBDD, usando la ruta leída del registro.
function eliminarArchivoMunicipalPOU($rutaRelativa, $codMun, $conn)
{
    $rutaRelativa = str_replace('\\', '/', trim((string)$rutaRelativa));
    // Acepta también las rutas antiguas guardadas con el nombre del proyecto.
    $rutaRelativa = ltrim($rutaRelativa, '/');
    $rutaRelativa = preg_replace('~^pou/~i', '', $rutaRelativa);
    if ($rutaRelativa === '' || !preg_match('/^\d{5}$/', (string)$codMun)) return;

    // Conservar el archivo si otro recurso todavía lo utiliza, incluso oculto.
    // Si no se puede comprobar, se conserva: un fallo de limpieza no debe romper enlaces.
    try {
        $sql = "SELECT EXISTS (
                    SELECT 1 FROM (
                        SELECT archivo_url AS ruta FROM pou.documentos
                        UNION ALL
                        SELECT archivo_url FROM pou.participacion_botones
                        UNION ALL
                        SELECT pdf_url FROM pou.formularios
                        UNION ALL
                        SELECT imagen_url FROM pou.noticias
                        UNION ALL
                        SELECT imagen_cabecera FROM pou.municipios
                        UNION ALL
                        SELECT escudo FROM pou.municipios
                    ) recursos
                    -- Las rutas antiguas pueden empezar por /pou/ o usar barras inversas.
                    WHERE regexp_replace(ltrim(replace(trim(ruta), chr(92), '/'), '/'),
                                         '^pou/', '', 'i') = :ruta
                )";
        $stmt = $conn->prepare($sql);
        $stmt->execute([':ruta' => $rutaRelativa]);
        if ($stmt->fetchColumn()) return;
    } catch (Throwable $error) {
        error_log('POU: no se pudo comprobar si el archivo sigue enlazado.');
        return;
    }

    $prefijos = ["docs/{$codMun}/", "images/municipios/{$codMun}/"];
    $raiz = dirname(__DIR__, 2);
    foreach ($prefijos as $prefijo) {
        if (strpos($rutaRelativa, $prefijo) !== 0) continue;
        $carpeta = realpath($raiz . '/' . $prefijo);
        $archivo = realpath($raiz . '/' . $rutaRelativa);
        if ($carpeta && $archivo && is_file($archivo)
            && strpos($archivo, $carpeta . DIRECTORY_SEPARATOR) === 0) {
            if (!unlink($archivo)) error_log('POU: no se pudo eliminar un archivo municipal.');
        }
        return;
    }
}
