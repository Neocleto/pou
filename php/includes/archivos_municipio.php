<?php
// Borra únicamente archivos de documentos o imágenes del municipio indicado.
// Se llama después de guardar el cambio en BBDD, usando la ruta leída del registro.
function eliminarArchivoMunicipalPOU($rutaRelativa, $codMun)
{
    $rutaRelativa = str_replace('\\', '/', trim((string)$rutaRelativa));
    if ($rutaRelativa === '' || !preg_match('/^\d{5}$/', (string)$codMun)) return;

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
