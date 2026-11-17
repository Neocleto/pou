<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($municipio['nombre'] ?? '') ?> - <?= htmlspecialchars($configuracionVisual['contenido_portal']['cabecera']['titulo'] ?? 'POU') ?></title>

    <base href="/pou/">

    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap@5.3.0.min.css">
    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap-icons.css">
    <link rel="stylesheet" href="css/portal.css?v=pou-v9-20261113-<?= (int)@filemtime(dirname(__DIR__, 2) . '/css/portal.css') ?>">
    <link rel="stylesheet" href="css/documentos.css?v=pou-v7-20261113-<?= (int)@filemtime(dirname(__DIR__, 2) . '/css/documentos.css') ?>">
    <link rel="stylesheet" href="css/tema-pou.css">
</head>
<?php
// ============================================================================
require_once __DIR__ . '/../includes/valores_portal.php';
require_once __DIR__ . '/../includes/imagenes_municipio.php';
require_once __DIR__ . '/../includes/cabecera_portal.php';

// 1. FUNCIONES PEQUENAS DE APOYO
// ============================================================================

require_once __DIR__ . '/../includes/contenido_portal.php';

$configuracion = array_merge(obtenerConfiguracionInicialPortal(), $configuracionVisual ?? []);
$contenidoPorDefecto = obtenerContenidoInicialPortal();

$contenidoGuardado = $configuracion['contenido_portal'] ?? [];

if (is_string($contenidoGuardado)) {
    $contenidoGuardado = json_decode($contenidoGuardado, true) ?: [];
}

$contenido = combinarContenidoPortal($contenidoPorDefecto, is_array($contenidoGuardado) ? $contenidoGuardado : []);
$contenido['cabecera'] = actualizarTextosCabeceraPortal($contenido['cabecera']);
$codMun = (string)($municipio['cod_mun'] ?? '');
$nombreMunicipio = normalizarTextoPortal($municipio['nombre'] ?? '', true);
$modoEditorPortal = !empty($modoPreview) && !empty($_GET['editor']);

// Compatibilidad con el título guardado por versiones anteriores.
// La nueva cabecera ya muestra el municipio una sola vez.
$tituloCabeceraGuardado = trim((string)($contenido['cabecera']['titulo'] ?? ''));
if (
    $tituloCabeceraGuardado === 'POU de {municipio}'
    || strcasecmp($tituloCabeceraGuardado, 'POU de ' . $nombreMunicipio) === 0
) {
    $contenido['cabecera']['titulo'] = 'Plan de Ordenación Urbana';
}

// Las versiones anteriores guardaban POU dentro de la etiqueta.
// Lo retiramos para no repetir la misma idea en la cabecera.
$etiquetaCabeceraGuardada = trim((string)($contenido['cabecera']['etiqueta'] ?? ''));
$etiquetasAntiguas = [
    'POU · Portal municipal de planeamiento',
    'POU - Portal municipal de planeamiento',
    'POU | Portal municipal de planeamiento'
];

foreach ($etiquetasAntiguas as $etiquetaAntigua) {
    if (strcasecmp($etiquetaCabeceraGuardada, $etiquetaAntigua) === 0) {
        $contenido['cabecera']['etiqueta'] = 'Portal municipal de planeamiento';
        break;
    }
}

// ============================================================================
// 3. IMAGENES DEL MUNICIPIO
// ============================================================================
$bannerMunicipio = obtenerBannerMunicipio($codMun, $municipio['imagen_cabecera'] ?? '');
$sinFotografiaCabecera = $bannerMunicipio === '';
$imagenCabeceraVisible = $sinFotografiaCabecera ? 'images/diseno/sin_datos_pou.png' : $bannerMunicipio;

$escudoMunicipio = obtenerEscudoMunicipio($codMun, $municipio['escudo'] ?? '');

// ============================================================================
// 4. CONTENIDO Y SECCIONES
// ============================================================================
$noticiasActivas = array_values(array_filter(
    $noticias ?? [],
    static fn($noticia) => booleanoPortal($noticia['activa'] ?? false)
));

$hayNoticias = !empty($noticiasActivas);
$buzonActivo = booleanoPortal($municipio['buzon_participacion_activo'] ?? false);
$accesos = $accesosPublicos ?? obtenerAccesosCabeceraPortal();

$seccionesPorDefecto = array_column(obtenerSeccionesInicialesPortal(), null, 'id');

$seccionesConfiguradas = $configuracion['secciones_portal'] ?? [];

if (is_string($seccionesConfiguradas)) {
    $seccionesConfiguradas = json_decode($seccionesConfiguradas, true) ?: [];
}

$seccionesConfiguradas = normalizarIconosDatosPortal($seccionesConfiguradas);
$formulariosPublicos = normalizarIconosDatosPortal($formulariosPublicos);

$seccionesPortal = [];
$seccionesPersonalizadas = [];
$idsUtilizados = [];

foreach ((array)$seccionesConfiguradas as $seccionConfigurada) {
    if (!is_array($seccionConfigurada)) {
        continue;
    }

    $idSeccion = preg_replace('/[^a-zA-Z0-9_-]/', '', trim((string)($seccionConfigurada['id'] ?? '')));

    if ($idSeccion === '' || isset($idsUtilizados[$idSeccion])) {
        continue;
    }

    if (isset($seccionesPorDefecto[$idSeccion])) {
        $seccionesPortal[] = array_merge(
            $seccionesPorDefecto[$idSeccion],
            $seccionConfigurada,
            ['tipo' => 'sistema']
        );
        $idsUtilizados[$idSeccion] = true;
        continue;
    }

    if (($seccionConfigurada['tipo'] ?? '') !== 'personalizado') {
        continue;
    }

    $seccionPersonalizada = [
        'id' => $idSeccion,
        'tipo' => 'personalizado',
        'titulo' => trim((string)($seccionConfigurada['titulo'] ?? 'Nuevo bloque')),
        'icono' => trim((string)($seccionConfigurada['icono'] ?? 'layout-text-window')),
        'color' => trim((string)($seccionConfigurada['color'] ?? $configuracion['color_secundario'])),
        'visible' => !isset($seccionConfigurada['visible']) || booleanoPortal($seccionConfigurada['visible']),
        'diseno' => in_array(($seccionConfigurada['diseno'] ?? 'texto'), ['texto', 'destacado', 'llamada', 'columnas'], true)
            ? $seccionConfigurada['diseno']
            : 'texto',
        'kicker' => trim((string)($seccionConfigurada['kicker'] ?? '')),
        'contenido' => (string)($seccionConfigurada['contenido'] ?? ''),
        'destacado_titulo' => trim((string)($seccionConfigurada['destacado_titulo'] ?? '')),
        'destacado_texto' => (string)($seccionConfigurada['destacado_texto'] ?? ''),
        'columna_izquierda' => (string)($seccionConfigurada['columna_izquierda'] ?? ''),
        'columna_derecha' => (string)($seccionConfigurada['columna_derecha'] ?? ''),
        'boton_texto' => trim((string)($seccionConfigurada['boton_texto'] ?? '')),
        'boton_url' => trim((string)($seccionConfigurada['boton_url'] ?? ''))
    ];

    $seccionesPortal[] = $seccionPersonalizada;
    $seccionesPersonalizadas[$idSeccion] = $seccionPersonalizada;
    $idsUtilizados[$idSeccion] = true;
}

foreach ($seccionesPorDefecto as $idSeccion => $seccion) {
    if (!isset($idsUtilizados[$idSeccion])) {
        $seccion['tipo'] = 'sistema';
        $seccionesPortal[] = $seccion;
    }
}

$ordenSecciones = [];
$visibilidadSecciones = [];
$titulosSecciones = [];
$iconosSecciones = [];
$coloresSecciones = [];

foreach ($seccionesPortal as $indice => $seccion) {
    $idSeccion = $seccion['id'];
    $ordenSecciones[$idSeccion] = $indice + 1;
    $visibilidadSecciones[$idSeccion] = !isset($seccion['visible']) || booleanoPortal($seccion['visible']);
    $titulosSecciones[$idSeccion] = normalizarTextoPortal($seccion['titulo'] ?? 'Nuevo bloque', true);
    $iconosSecciones[$idSeccion] = $seccion['icono'] ?? 'layout-text-window';
    $coloresSecciones[$idSeccion] = $seccion['color'] ?? $configuracion['color_secundario'];
}

// El Wizard y el configurador comparten una única decisión para el Buzón.
// Si una configuración antigua contiene otro valor, prevalece el dato
// municipal que ambos formularios editan.
$visibilidadSecciones['buzon'] = $buzonActivo;

$destinosDisponibles = [
    '#informacion' => $visibilidadSecciones['informacion'],
    '#fases' => $visibilidadSecciones['fases'],
    '#participacion' => $visibilidadSecciones['participacion'],
    '#documentos' => $visibilidadSecciones['documentos'],
    '#actualidad' => $visibilidadSecciones['actualidad'],
    '#buzon' => $visibilidadSecciones['buzon'] && $buzonActivo
];

foreach ($seccionesPersonalizadas as $idSeccion => $seccionPersonalizada) {
    $destinosDisponibles['#' . $idSeccion] = $visibilidadSecciones[$idSeccion] ?? false;
}

// 5. Separamos los formularios ya vinculados a un boton para no duplicarlos.
$idsFormulariosVinculados = [];
$slugsFormulariosPublicos = [];

foreach ($formulariosPublicos as $formularioPublico) {
    $slugFormulario = trim((string)($formularioPublico['slug'] ?? ''));

    if ($slugFormulario !== '') {
        $slugsFormulariosPublicos[$slugFormulario] = true;
    }
}

foreach ($botonesParticipacion as $botonParticipacion) {
    $formularioId = (int)($botonParticipacion['formulario_id'] ?? 0);

    if ($formularioId > 0) {
        $idsFormulariosVinculados[$formularioId] = true;
    }
}

$formulariosSinBoton = array_values(array_filter(
    $formulariosPublicos,
    static function ($formulario) use ($idsFormulariosVinculados) {
        return !isset($idsFormulariosVinculados[(int)($formulario['id'] ?? 0)]);
    }
));

// 6. Preparamos solamente los recursos que tienen una acción disponible.
//    Así el contador y la cuadrícula siempre coinciden con lo que se muestra.
$recursosParticipacionVisibles = [];

foreach ($botonesParticipacion as $boton) {
    $botonVisible = !isset($boton['visible']) || booleanoPortal($boton['visible']);

    // En la página pública no dibujamos recursos ocultos. En el editor sí los
    // dejamos preparados para que el interruptor pueda mostrarlos al instante.
    if (!$botonVisible && !$modoEditorPortal) {
        continue;
    }

    $tipoContenido = $boton['tipo_contenido'] ?? 'pdf';
    $muestraFormulario = in_array($tipoContenido, ['formulario', 'ambos'], true)
        && booleanoPortal($boton['formulario_activo'] ?? false)
        && !empty($boton['formulario_slug']);
    $muestraPdf = in_array($tipoContenido, ['pdf', 'ambos'], true);
    $urlPdf = trim((string)($boton['archivo_url'] ?? ''));

    if ($urlPdf === '') {
        $urlPdf = trim((string)($boton['formulario_pdf_url'] ?? ''));
    }

    if ($urlPdf === '') {
        $muestraPdf = false;
    }

    if (!$muestraFormulario && !$muestraPdf) {
        continue;
    }

    $boton['_muestra_formulario'] = $muestraFormulario;
    $boton['_muestra_pdf'] = $muestraPdf;
    $boton['_url_pdf'] = $urlPdf;
    $boton['_visible'] = $botonVisible;
    $recursosParticipacionVisibles[] = $boton;
}

$totalRecursosParticipacion = count(array_filter(
    $recursosParticipacionVisibles,
    static fn($boton) => !empty($boton['_visible'])
));
$claseCantidadRecursos = $totalRecursosParticipacion <= 6
    ? 'resources-count-' . $totalRecursosParticipacion
    : 'resources-count-many';
?>
<body
    class="portal-page portal-loading"
    style="
        --pou-primary: <?= htmlspecialchars($configuracion['color_primario']) ?>;
        --pou-secondary: <?= htmlspecialchars($configuracion['color_secundario']) ?>;
        --pou-participation: <?= htmlspecialchars($configuracion['color_participacion']) ?>;
        --pou-documents: <?= htmlspecialchars($configuracion['color_documentos']) ?>;
        --pou-news: <?= htmlspecialchars($configuracion['color_noticias']) ?>;
        --pou-mailbox: <?= htmlspecialchars($configuracion['color_buzon']) ?>;
        --pou-width: <?= (int)$configuracion['ancho_contenido'] ?>px;
        --pou-scale: <?= (float)$configuracion['escala_texto'] ?>;
    ">

    <div id="pageSpinner" class="portal-page-loader">
        <div class="portal-page-loader__content">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 mb-0">Cargando portal...</p>
        </div>
    </div>

    <?php include __DIR__ . '/../includes/portal_header.php'; ?>

    <main>
        <!-- Fotografía y presentación del municipio. -->
        <section class="portal-hero">
            <div class="portal-hero__scene">
                <div
                    class="portal-hero__image<?= $sinFotografiaCabecera ? ' portal-hero__image--sin-foto' : '' ?>"
                    role="img"
                    aria-label="<?= $sinFotografiaCabecera ? 'Ilustración de planeamiento municipal' : 'Fotografía de ' . htmlspecialchars($nombreMunicipio) ?>"
                    style="background-image:url('<?= htmlspecialchars($imagenCabeceraVisible, ENT_QUOTES, 'UTF-8') ?>')">
                </div>

            </div>

            <div class="portal-shell portal-hero-layout__grid">
                <div class="portal-hero-layout__copy">
                    <div class="portal-hero-layout__content-row">
                        <div class="portal-hero-layout__municipality">
                            <span class="portal-hero-layout__crest">
                                <img src="<?= htmlspecialchars($escudoMunicipio) ?>" alt="Escudo de <?= htmlspecialchars($nombreMunicipio) ?>">
                            </span>
                            <span class="portal-hero-layout__municipality-copy">
                                <small>Municipio de</small>
                                <strong><?= htmlspecialchars($nombreMunicipio) ?></strong>
                            </span>
                        </div>

                        <div class="portal-hero-layout__text">
                            <span class="portal-hero__eyebrow" data-content="cabecera.etiqueta">
                                <?= htmlspecialchars(normalizarTextoPortal($contenido['cabecera']['etiqueta'])) ?>
                            </span>

                            <h1 class="portal-hero__title" data-content="cabecera.titulo">
                                <?= tituloCabeceraPortal(textoMunicipioPortal(normalizarTextoPortal($contenido['cabecera']['titulo'], true), $nombreMunicipio)) ?>
                            </h1>

                            <div class="portal-hero__description portal-rich-text" data-content="cabecera.descripcion">
                                <?= htmlEnriquecidoPortal(normalizarTextoPortal($contenido['cabecera']['descripcion'])) ?>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
            <div class="portal-hero__waves" aria-hidden="true"></div>
        </section>

        <!-- Accesos directos configurables. -->
        <?php if ((!empty($configuracion['mostrar_accesos']) && !empty($accesos)) || $modoEditorPortal): ?>
            <nav
                class="portal-quick-access"
                aria-label="Accesos rápidos"
                style="<?= empty($configuracion['mostrar_accesos']) ? 'display:none;' : '' ?>">
                <div class="portal-shell">
                    <div class="portal-access-list">
                        <?php foreach ($accesos as $acceso): ?>
                            <?php
                            // PostgreSQL puede devolver los booleanos como "t" y "f".
                            // Usamos la misma conversión del resto del portal para que
                            // un acceso oculto no se interprete como visible.
                            if (isset($acceso['visible']) && !booleanoPortal($acceso['visible'])) {
                                continue;
                            }

                            $tipoDestino = $acceso['tipo_destino'] ?? 'seccion';
                            $destino = $acceso['destino'] ?? '#informacion';
                            $abrirNuevaPestana = false;

                            // Compatibilidad con accesos antiguos guardados sin "#".
                            // El configurador y el portal trabajan siempre con el mismo
                            // identificador a partir de este punto.
                            if ($tipoDestino === 'seccion') {
                                $destino = '#' . ltrim((string)$destino, '#');
                            }

                            if (
                                $tipoDestino === 'seccion'
                                && isset($destinosDisponibles[$destino])
                                && !$destinosDisponibles[$destino]
                            ) {
                                continue;
                            }

                            if ($tipoDestino === 'formulario') {
                                if (!isset($slugsFormulariosPublicos[$acceso['destino'] ?? ''])) {
                                    continue;
                                }

                                $destino = 'php/municipio/formulario.php?cod_mun='
                                    . urlencode($codMun)
                                    . '&slug='
                                    . urlencode($acceso['destino'] ?? '');
                            }

                            if ($tipoDestino === 'url') {
                                $abrirNuevaPestana = true;
                            }
                            $iconoAcceso = obtenerIconoAccesoPortal($acceso);
                            ?>
                            <a
                                class="portal-access-item"
                                style="--access-color:<?= htmlspecialchars($acceso['color'] ?? $configuracion['color_primario']) ?>"
                                title="<?= htmlspecialchars($acceso['descripcion'] ?? $acceso['titulo'] ?? '') ?>"
                                href="<?= htmlspecialchars($destino) ?>"
                                <?= $abrirNuevaPestana ? 'target="_blank" rel="noopener noreferrer"' : '' ?>>
                                <?php if ($iconoAcceso !== ''): ?>
                                    <span class="portal-access-item__icon portal-access-item__icon--<?= htmlspecialchars($iconoAcceso) ?>">
                                        <i class="bi bi-<?= htmlspecialchars($iconoAcceso) ?>" aria-hidden="true"></i>
                                    </span>
                                <?php endif; ?>
                                <span class="portal-access-item__copy">
                                    <strong><?= htmlspecialchars(normalizarTextoPortal($acceso['titulo'] ?? '', true)) ?></strong>
                                </span>
                            </a>
                        <?php endforeach; ?>
                    </div>
                </div>
            </nav>
        <?php endif; ?>

        <div class="portal-shell portal-content">
            <!-- Información general. -->
            <?php if ($visibilidadSecciones['informacion'] || $modoEditorPortal): ?>
                <section
                    id="informacion"
                    data-portal-section="informacion"
                    class="portal-section portal-info"
                    style="--section-color:<?= htmlspecialchars($coloresSecciones['informacion']) ?>;order:<?= (int)$ordenSecciones['informacion'] ?>;<?= !$visibilidadSecciones['informacion'] ? 'display:none;' : '' ?>">
                    <div class="portal-section__heading">
                        <span class="section-icon" data-section-icon <?= $iconosSecciones['informacion'] === '' ? 'hidden' : '' ?>>
                            <?php if ($iconosSecciones['informacion'] !== ''): ?><i class="bi bi-<?= htmlspecialchars($iconosSecciones['informacion']) ?>"></i><?php endif; ?>
                        </span>
                        <div>
                            <p class="section-kicker" data-content="informacion.kicker"><?= htmlspecialchars(normalizarTextoPortal($contenido['informacion']['kicker'])) ?></p>
                            <h2 data-section-title data-db-content="informacion.titulo"><?= htmlspecialchars(normalizarTextoPortal(trim((string)($informacion['titulo'] ?? '')) ?: $titulosSecciones['informacion'])) ?></h2>
                        </div>
                    </div>

                    <div class="portal-info__body">
                        <div class="portal-info__text portal-rich-text" data-db-content="informacion.descripcion">
                            <?= htmlEnriquecidoPortal($informacion['descripcion'] ?? '') ?>
                        </div>
                    </div>
                </section>
            <?php endif; ?>

            <!-- Fases de tramitación. -->
            <?php if ($visibilidadSecciones['fases'] || $modoEditorPortal): ?>
                <?php
                $faseNumero = $faseActual['num_fase_padre'] ?? $faseActual['num_fase'] ?? '';
                $faseDescripcion = $faseActual['titulo_subfase'] ?? '';
                $tieneDiagramaFases = !empty($faseActual['imagen_url']);
                $imagenFases = $tieneDiagramaFases
                    ? $faseActual['imagen_url']
                    : 'images/diseno/sin_datos_pou.png';
                ?>
                <section
                    id="fases"
                    data-portal-section="fases"
                    class="portal-section portal-phases"
                    style="--section-color:<?= htmlspecialchars($coloresSecciones['fases']) ?>;order:<?= (int)$ordenSecciones['fases'] ?>;<?= !$visibilidadSecciones['fases'] ? 'display:none;' : '' ?>">
                    <div class="portal-section__heading portal-section__heading--with-action">
                        <span class="section-icon" data-section-icon <?= $iconosSecciones['fases'] === '' ? 'hidden' : '' ?>>
                            <?php if ($iconosSecciones['fases'] !== ''): ?><i class="bi bi-<?= htmlspecialchars($iconosSecciones['fases']) ?>"></i><?php endif; ?>
                        </span>
                        <div class="portal-section__heading-copy">
                            <p class="section-kicker" data-content="fases.kicker"><?= htmlspecialchars(normalizarTextoPortal($contenido['fases']['kicker'])) ?></p>
                            <div class="portal-section__title-line">
                                <h2 data-section-title><?= htmlspecialchars($titulosSecciones['fases']) ?></h2>
                                <button type="button" class="portal-phase-more" data-bs-toggle="modal" data-bs-target="#modalMasInfoFases">Más información <i class="bi bi-arrow-right" aria-hidden="true"></i></button>
                            </div>
                        </div>
                    </div>

                    <div class="portal-phases__body">
                        <div class="portal-current-phase">
                            <span data-content="fases.etiqueta_fase"><?= htmlspecialchars($contenido['fases']['etiqueta_fase']) ?></span>
                            <strong data-db-content="fase_actual.titulo">
                                <?= htmlspecialchars($faseNumero ?: 'Sin fase asignada') ?>
                                <?= $faseDescripcion ? '. ' . htmlspecialchars(normalizarTextoPortal($faseDescripcion, true)) : '' ?>
                            </strong>
                        </div>

                        <div class="portal-phases__visual<?= $tieneDiagramaFases ? '' : ' portal-phases__visual--sin-datos' ?>">
                            <img
                                src="<?= htmlspecialchars($imagenFases, ENT_QUOTES, 'UTF-8') ?>"
                                class="portal-phase-image"
                                alt="<?= $tieneDiagramaFases ? 'Fases de tramitación del plan' : 'Documentación de planeamiento aún no disponible' ?>">
                            <button type="button" class="portal-phase-zoom" data-bs-toggle="modal" data-bs-target="#modalImagenFases" aria-label="Ampliar imagen de las fases" title="Ampliar imagen" <?= $tieneDiagramaFases ? '' : 'hidden' ?>>
                                <i class="bi bi-zoom-in"></i>
                            </button>
                        </div>

                        <!-- El editor conserva el bloque aunque el estado esté vacío. -->
                        <div class="portal-phase-note" <?= empty($faseActual['estado_tramitacion']) ? 'hidden' : '' ?>>
                            <i class="bi bi-info-circle"></i>
                            <div>
                                <strong data-content="fases.etiqueta_estado"><?= htmlspecialchars(normalizarTextoPortal($contenido['fases']['etiqueta_estado'], true)) ?></strong>
                                <div class="portal-rich-text" data-db-content="fase_actual.estado_tramitacion"><?= htmlEnriquecidoPortal($faseActual['estado_tramitacion'] ?? '') ?></div>
                            </div>
                        </div>
                    </div>
                </section>
            <?php endif; ?>

            <!-- Participación ciudadana. -->
            <?php if ($visibilidadSecciones['participacion'] || $modoEditorPortal): ?>
                <section
                    id="participacion"
                    data-portal-section="participacion"
                    class="portal-section portal-participation"
                    style="--section-color:<?= htmlspecialchars($coloresSecciones['participacion']) ?>;order:<?= (int)$ordenSecciones['participacion'] ?>;<?= !$visibilidadSecciones['participacion'] ? 'display:none;' : '' ?>">
                    <!-- Encabezado compartido con Documentos, dentro de la columna de texto. -->
                    <div class="participation-layout<?= empty($recursosParticipacionVisibles) ? ' sin-recursos' : '' ?>">
                        <div class="portal-participation__copy">
                            <div class="portal-section__heading">
                                <span class="section-icon" data-section-icon <?= $iconosSecciones['participacion'] === '' ? 'hidden' : '' ?>>
                                    <?php if ($iconosSecciones['participacion'] !== ''): ?><i class="bi bi-<?= htmlspecialchars($iconosSecciones['participacion']) ?>"></i><?php endif; ?>
                                </span>
                                <div>
                                    <p class="section-kicker" data-content="participacion.kicker"><?= htmlspecialchars(normalizarTextoPortal($contenido['participacion']['kicker'])) ?></p>
                                    <h2 data-section-title><?= htmlspecialchars($titulosSecciones['participacion']) ?></h2>
                                </div>
                            </div>

                            <div class="portal-rich-text participation-intro">
                                <div data-content="participacion.introduccion"><?= htmlEnriquecidoPortal($contenido['participacion']['introduccion']) ?></div>

                            </div>

                        </div>

                        <?php if (!empty($recursosParticipacionVisibles)): ?>
                            <div class="participation-resources <?= htmlspecialchars($claseCantidadRecursos) ?>" data-resource-count="<?= $totalRecursosParticipacion ?>">
                                <?php foreach ($recursosParticipacionVisibles as $boton): ?>
                                    <?php
                                    // 1. Recuperamos el aspecto del recurso.
                                    $iconoBoton = obtenerIconoBotonParticipacionPortal($boton);
                                    $colorBoton = trim((string)($boton['color'] ?? ''));

                                    // Un color guardado se respeta también al volver a abrir el portal.
                                    // Solo se hereda el del bloque cuando el recurso no tiene color.
                                    if ($colorBoton === '') {
                                        $colorBoton = $coloresSecciones['participacion'];
                                    }

                                    // 2. Las acciones ya se han validado antes de renderizar.
                                    $muestraFormulario = !empty($boton['_muestra_formulario']);
                                    $muestraPdf = !empty($boton['_muestra_pdf']);
                                    $urlPdf = (string)($boton['_url_pdf'] ?? '');
                                    ?>
                                    <article
                                        class="participation-resource-card"
                                        data-participation-button-id="<?= (int)($boton['id'] ?? 0) ?>"
                                        data-resource-visible="<?= !empty($boton['_visible']) ? '1' : '0' ?>"
                                        style="--resource-color:<?= htmlspecialchars($colorBoton) ?>;<?= empty($boton['_visible']) ? 'display:none;' : '' ?>">
                                        <?php if ($iconoBoton !== ''): ?>
                                            <span class="participation-resource-card__icon" aria-hidden="true">
                                                <i class="bi bi-<?= htmlspecialchars($iconoBoton) ?>"></i>
                                            </span>
                                        <?php endif; ?>

                                        <div class="participation-resource-card__content">
                                            <strong data-participation-button-text><?= htmlspecialchars(normalizarTextoPortal($boton['texto_boton'] ?? '', true)) ?></strong>

                                            <div class="participation-resource-card__actions">
                                                <?php if ($muestraFormulario): ?>
                                                    <a href="php/municipio/formulario.php?cod_mun=<?= urlencode($codMun) ?>&slug=<?= urlencode($boton['formulario_slug']) ?>">
                                                        <i class="bi bi-pencil-square"></i>
                                                        <?= htmlspecialchars(normalizarTextoPortal($boton['formulario_texto_online'] ?? 'Responder online')) ?>
                                                    </a>
                                                <?php endif; ?>

                                                <?php if ($muestraPdf): ?>
                                                    <a href="<?= htmlspecialchars($urlPdf) ?>" target="_blank" rel="noopener noreferrer">
                                                        <i class="bi bi-download"></i>
                                                        <?= htmlspecialchars(normalizarTextoPortal($boton['formulario_texto_pdf'] ?? 'Descargar PDF')) ?>
                                                    </a>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    </article>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </div>

                    <?php if (!empty($formulariosSinBoton)): ?>
                        <div class="portal-surveys">
                            <div class="portal-surveys__intro">
                                <h3 data-content="participacion.formularios_titulo"><?= htmlspecialchars(normalizarTextoPortal($contenido['participacion']['formularios_titulo'], true)) ?></h3>
                                <p data-content="participacion.formularios_descripcion"><?= htmlspecialchars(normalizarTextoPortal($contenido['participacion']['formularios_descripcion'])) ?></p>
                            </div>

                            <div class="portal-survey-grid">
                                <?php foreach ($formulariosSinBoton as $formulario): ?>
                                    <article class="portal-survey-card" style="--survey-color:<?= htmlspecialchars($formulario['color'] ?? $configuracion['color_participacion']) ?>">
                                        <?php if (trim((string)($formulario['icono'] ?? '')) !== ''): ?>
                                            <span class="portal-survey-card__icon">
                                                <i class="bi bi-<?= htmlspecialchars($formulario['icono']) ?>"></i>
                                            </span>
                                        <?php endif; ?>
                                        <div>
                                            <h4><?= htmlspecialchars(normalizarTextoPortal($formulario['titulo'] ?? '', true)) ?></h4>
                                            <p><?= htmlspecialchars(normalizarTextoPortal($formulario['descripcion'] ?? '')) ?></p>
                                            <div class="portal-survey-card__actions">
                                                <?php if (in_array($formulario['modalidad'], ['online', 'ambos'], true)): ?>
                                                    <a href="php/municipio/formulario.php?cod_mun=<?= urlencode($codMun) ?>&slug=<?= urlencode($formulario['slug']) ?>">
                                                        <?= htmlspecialchars(normalizarTextoPortal($formulario['texto_boton_online'] ?? 'Responder online')) ?>
                                                    </a>
                                                <?php endif; ?>
                                                <?php if (in_array($formulario['modalidad'], ['pdf', 'ambos'], true) && !empty($formulario['pdf_url'])): ?>
                                                    <a href="<?= htmlspecialchars($formulario['pdf_url']) ?>" target="_blank" rel="noopener noreferrer">
                                                        <?= htmlspecialchars(normalizarTextoPortal($formulario['texto_boton_pdf'] ?? 'Descargar PDF')) ?>
                                                    </a>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    </article>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    <?php endif; ?>

                </section>
            <?php endif; ?>

            <!-- Documentos. -->
            <?php if ($visibilidadSecciones['documentos'] || $modoEditorPortal): ?>
                <section
                    id="documentos"
                    data-portal-section="documentos"
                    class="portal-section portal-documents"
                    style="--section-color:<?= htmlspecialchars($coloresSecciones['documentos']) ?>;order:<?= (int)$ordenSecciones['documentos'] ?>;<?= !$visibilidadSecciones['documentos'] ? 'display:none;' : '' ?>">
                    <div class="portal-documents__copy">
                        <div class="portal-section__heading">
                            <span class="section-icon" data-section-icon <?= $iconosSecciones['documentos'] === '' ? 'hidden' : '' ?>>
                                <?php if ($iconosSecciones['documentos'] !== ''): ?><i class="bi bi-<?= htmlspecialchars($iconosSecciones['documentos']) ?>"></i><?php endif; ?>
                            </span>
                            <div>
                                <p class="section-kicker" data-content="documentos.kicker"><?= htmlspecialchars(normalizarTextoPortal($contenido['documentos']['kicker'])) ?></p>
                                <h2 data-section-title><?= htmlspecialchars($titulosSecciones['documentos']) ?></h2>
                            </div>
                        </div>
                        <div class="portal-rich-text" data-content="documentos.descripcion"><?= htmlEnriquecidoPortal($contenido['documentos']['descripcion']) ?></div>
                    </div>
                    <div class="portal-document-stages" aria-label="Fases de documentación">
                        <?php foreach ($documentosPublicos['botones'] as $paso => $boton): ?>
                            <?php
                            $activo = $paso === $documentosPublicos['botonActivo'];
                            $completado = ($boton['estado'] ?? '') === 'completada';
                            ?>
                            <button type="button" class="portal-document-stage<?= $activo ? ' is-active' : ($completado ? ' is-completed' : '') ?>"
                                <?= $activo ? 'data-bs-toggle="modal" data-bs-target="#modalDocumentosPortal"' : 'disabled' ?>
                                aria-describedby="estadoDocumentosPortal" <?= $activo ? 'aria-haspopup="dialog"' : '' ?>>
                                <span class="portal-document-stage__number"><?= (int)$paso ?></span>
                                <span><strong data-document-stage-title="<?= (int)$paso ?>"><?= htmlspecialchars($boton['titulo']) ?></strong>
                                <small><?= $activo ? 'Consultar documentos' : ($completado ? 'Completada · No disponible' : 'No disponible') ?></small></span>
                                <i class="bi bi-<?= $activo ? 'arrow-up-right' : 'lock' ?>" aria-hidden="true"></i>
                            </button>
                        <?php endforeach; ?>
                    </div>
                    <p id="estadoDocumentosPortal" class="portal-document-stages__help">
                        <?= $documentosPublicos['botonActivo'] ? 'Puedes consultar la documentación de la fase activa sin salir del portal.' : 'La documentación estará disponible cuando se publique.' ?>
                    </p>
                </section>
            <?php endif; ?>

            <!-- Noticias y preguntas frecuentes. -->
            <?php if ($visibilidadSecciones['actualidad'] || $modoEditorPortal): ?>
                <section id="actualidad" data-portal-section="actualidad" class="portal-section portal-actuality" style="--section-color:<?= htmlspecialchars($coloresSecciones['actualidad']) ?>;order:<?= (int)$ordenSecciones['actualidad'] ?>;<?= !$visibilidadSecciones['actualidad'] ? 'display:none;' : '' ?>">
                    <div class="portal-section__heading portal-actuality__heading">
                        <span class="section-icon" data-section-icon <?= $iconosSecciones['actualidad'] === '' ? 'hidden' : '' ?>>
                            <?php if ($iconosSecciones['actualidad'] !== ''): ?><i class="bi bi-<?= htmlspecialchars($iconosSecciones['actualidad']) ?>"></i><?php endif; ?>
                        </span>
                        <div>
                            <p class="section-kicker" data-content="actualidad.kicker"><?= htmlspecialchars(normalizarTextoPortal($contenido['actualidad']['kicker'])) ?></p>
                            <h2 data-section-title><?= htmlspecialchars($titulosSecciones['actualidad']) ?></h2>
                        </div>
                    </div>

                    <div class="portal-two-columns">
                        <section id="noticias" class="portal-news-section">
                                <div class="portal-column-heading">
                                    <i data-content-icon="actualidad.noticias_icono" class="bi bi-<?= htmlspecialchars($contenido['actualidad']['noticias_icono'] ?? '') ?>" <?= empty($contenido['actualidad']['noticias_icono']) ? 'hidden' : '' ?>></i>
                                    <h3 data-content="actualidad.noticias_titulo"><?= htmlspecialchars(normalizarTextoPortal($contenido['actualidad']['noticias_titulo'], true)) ?></h3>
                                </div>
                                <?php if ($hayNoticias): ?>
                                  <div class="portal-news-list">
                                    <?php foreach (array_slice($noticiasActivas, 0, 3) as $noticia): ?>
                                        <article class="portal-news-card">
                                            <?php $rutaImagenNoticia = obtenerRutaImagenNoticiaPortal($noticia, $codMun); ?>
                                            <?php if ($rutaImagenNoticia !== ''): ?>
                                                <img src="<?= htmlspecialchars($rutaImagenNoticia, ENT_QUOTES, 'UTF-8') ?>" alt="" loading="eager" data-news-image>
                                            <?php endif; ?>
                                            <div>
                                                <time><?= !empty($noticia['fecha_publicacion']) ? htmlspecialchars(date('d/m/Y', strtotime($noticia['fecha_publicacion']))) : '' ?></time>
                                                <h3><?= htmlspecialchars(normalizarTextoPortal($noticia['titulo'] ?? '', true)) ?></h3>
                                                <p><?= htmlspecialchars(normalizarTextoPortal(recortarTextoPortal($noticia['resumen'] ?? '', 170))) ?></p>
                                                <?php if (!empty($noticia['enlace_detalle'])): ?>
                                                    <a href="<?= htmlspecialchars($noticia['enlace_detalle']) ?>" target="_blank" rel="noopener noreferrer" data-content="actualidad.leer_mas"><?= htmlspecialchars(normalizarTextoPortal($contenido['actualidad']['leer_mas'])) ?></a>
                                                <?php endif; ?>
                                            </div>
                                        </article>
                                    <?php endforeach; ?>
                                  </div>
                                <?php else: ?>
                                  <div class="portal-column-empty">No hay noticias publicadas en este momento.</div>
                                <?php endif; ?>
                        </section>

                        <section id="faqs" class="portal-faq-section">
                                <div class="portal-column-heading">
                                    <i data-content-icon="actualidad.faqs_icono" class="bi bi-<?= htmlspecialchars($contenido['actualidad']['faqs_icono'] ?? '') ?>" <?= empty($contenido['actualidad']['faqs_icono']) ? 'hidden' : '' ?>></i>
                                    <h3 data-content="actualidad.faqs_titulo"><?= htmlspecialchars(normalizarTextoPortal($contenido['actualidad']['faqs_titulo'], true)) ?></h3>
                                </div>
                                <?php if (!empty($faqs)): ?>
                                  <div class="accordion" id="faqAccordion">
                                    <?php foreach ($faqs as $indice => $faq): ?>
                                        <div class="accordion-item" <?= $indice >= 4 ? 'data-faq-extra hidden' : '' ?>>
                                            <h3 class="accordion-header">
                                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq<?= $indice ?>" aria-expanded="false" aria-controls="faq<?= $indice ?>">
                                                    <?= htmlspecialchars(normalizarTextoPortal($faq['pregunta'] ?? '')) ?>
                                                </button>
                                            </h3>
                                            <div id="faq<?= $indice ?>" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                                                <div class="accordion-body"><?= nl2br(htmlspecialchars(normalizarTextoPortal($faq['respuesta'] ?? ''))) ?></div>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                  </div>
                                  <?php if (count($faqs) > 4): ?>
                                    <button type="button" class="portal-faq-more" id="btnMostrarFaq" aria-expanded="false" aria-controls="faqAccordion"
                                            data-more-label="Ver las <?= count($faqs) - 4 ?> preguntas restantes">Ver las <?= count($faqs) - 4 ?> preguntas restantes <i class="bi bi-chevron-down" aria-hidden="true"></i></button>
                                  <?php endif; ?>
                                <?php else: ?>
                                  <div class="portal-column-empty">No hay preguntas frecuentes publicadas.</div>
                                <?php endif; ?>
                        </section>
                    </div>
                </section>
            <?php endif; ?>

            <!-- Buzon ciudadano. -->
            <?php if (($buzonActivo && $visibilidadSecciones['buzon']) || $modoEditorPortal): ?>
                <section id="buzon" data-portal-section="buzon" class="portal-section portal-mailbox" style="--section-color:<?= htmlspecialchars($coloresSecciones['buzon']) ?>;order:<?= (int)$ordenSecciones['buzon'] ?>;<?= (!$buzonActivo || !$visibilidadSecciones['buzon']) ? 'display:none;' : '' ?>">
                    <div class="portal-mailbox__intro">
                        <div class="portal-section__heading">
                            <span class="section-icon" data-section-icon <?= $iconosSecciones['buzon'] === '' ? 'hidden' : '' ?>>
                                <?php if ($iconosSecciones['buzon'] !== ''): ?><i class="bi bi-<?= htmlspecialchars($iconosSecciones['buzon']) ?>"></i><?php endif; ?>
                            </span>
                            <div>
                                <p class="section-kicker" data-content="buzon.kicker"><?= htmlspecialchars(normalizarTextoPortal($contenido['buzon']['kicker'])) ?></p>
                                <h2 data-section-title><?= htmlspecialchars($titulosSecciones['buzon']) ?></h2>
                            </div>
                        </div>
                        <div class="portal-rich-text" data-content="buzon.introduccion"><?= htmlEnriquecidoPortal($contenido['buzon']['introduccion']) ?></div>
                        <div class="portal-privacy-note">
                            <i class="bi bi-shield-check"></i>
                            <div>
                                <strong data-content="buzon.privacidad_titulo"><?= htmlspecialchars(normalizarTextoPortal($contenido['buzon']['privacidad_titulo'], true)) ?></strong>
                                <div class="portal-rich-text" data-content="buzon.privacidad_texto"><?= htmlEnriquecidoPortal($contenido['buzon']['privacidad_texto']) ?></div>
                                <?php if (!empty($municipio['politica_privacidad_url'])): ?>
                                    <a href="<?= htmlspecialchars($municipio['politica_privacidad_url']) ?>" target="_blank" rel="noopener noreferrer" data-content="buzon.privacidad_enlace"><?= htmlspecialchars(normalizarTextoPortal($contenido['buzon']['privacidad_enlace'])) ?></a>
                                <?php endif; ?>
                            </div>
                        </div>
                        <?php if (booleanoPortal($contenido['buzon']['mostrar_ilustracion'] ?? false) || $modoEditorPortal): ?>
                            <span class="portal-mailbox__illustration" data-mailbox-illustration aria-hidden="true"
                                  <?= !booleanoPortal($contenido['buzon']['mostrar_ilustracion'] ?? false) ? 'hidden' : '' ?>></span>
                        <?php endif; ?>
                    </div>

                    <form id="formBuzon" class="portal-mailbox__form" action="php/municipio/enviar_buzon.php" method="POST" enctype="multipart/form-data">
                        <input type="hidden" name="cod_mun" value="<?= htmlspecialchars($codMun) ?>">

                        <div class="portal-mailbox__fields">
                            <label>
                                <span><span data-content="buzon.asunto_etiqueta"><?= htmlspecialchars(normalizarTextoPortal($contenido['buzon']['asunto_etiqueta'])) ?></span> (*)</span>
                                <input type="text" name="asunto" required>
                            </label>
                            <label>
                                <span><span data-content="buzon.mensaje_etiqueta"><?= htmlspecialchars(normalizarTextoPortal($contenido['buzon']['mensaje_etiqueta'])) ?></span> (*)</span>
                                <textarea name="mensaje" rows="5" required></textarea>
                            </label>
                        </div>
                        <div class="portal-attachment-field">
                            <span id="etiquetaArchivoBuzon" data-content="buzon.archivo_etiqueta"><?= htmlspecialchars(normalizarTextoPortal($contenido['buzon']['archivo_etiqueta'])) ?></span>
                            <div class="portal-attachment" id="zonaArchivoBuzon" aria-labelledby="etiquetaArchivoBuzon" aria-describedby="ayudaArchivoBuzon errorArchivoBuzon">
                                <i class="bi bi-cloud-arrow-up" aria-hidden="true"></i>
                                <div class="portal-attachment__copy">
                                    <strong>Arrastra aquí tu documento</strong>
                                    <small id="ayudaArchivoBuzon">PDF, JPG o PNG · Un archivo de hasta 5 MB</small>
                                    <span id="estadoArchivoBuzon" role="status" aria-live="polite">Ningún archivo adjunto</span>
                                </div>
                                <button type="button" class="portal-attachment__select" id="btnSeleccionarArchivoBuzon">Seleccionar archivo</button>
                                <button type="button" class="portal-attachment__remove" id="btnQuitarArchivoBuzon" hidden>Quitar <i class="bi bi-x-lg" aria-hidden="true"></i></button>
                                <input class="visually-hidden" id="archivoBuzon" type="file" name="archivo" accept=".jpg,.jpeg,.png,.pdf" aria-labelledby="etiquetaArchivoBuzon" tabindex="-1">
                            </div>
                            <p class="portal-attachment-error" id="errorArchivoBuzon" role="alert" hidden></p>
                        </div>
                        <div class="portal-mailbox__footer">
                            <label class="portal-consent">
                                <input type="checkbox" name="acepto" required>
                                <span data-content="buzon.consentimiento"><?= htmlspecialchars(normalizarTextoPortal($contenido['buzon']['consentimiento'])) ?></span>
                            </label>
                            <div class="portal-form-actions">
                                <button class="portal-button" style="--button-color:var(--section-color)" type="submit">
                                    <span data-content="buzon.boton_texto"><?= htmlspecialchars(normalizarTextoPortal($contenido['buzon']['boton_texto'])) ?></span>
                                    <i class="bi bi-send"></i>
                                </button>
                                <div id="spinnerEnvio" class="spinner-border spinner-border-sm d-none" role="status"></div>
                            </div>
                        </div>
                        <div id="resultadoEnvio"></div>
                    </form>

                </section>
            <?php endif; ?>

            <!-- Bloques adicionales creados desde el configurador. -->
            <?php foreach ($seccionesPersonalizadas as $idSeccion => $seccionPersonalizada): ?>
                <?php if (!empty($visibilidadSecciones[$idSeccion]) || $modoEditorPortal): ?>
                    <section
                        id="<?= htmlspecialchars($idSeccion) ?>"
                        data-portal-section="<?= htmlspecialchars($idSeccion) ?>"
                        data-custom-section="1"
                        data-custom-layout="<?= htmlspecialchars($seccionPersonalizada['diseno']) ?>"
                        class="portal-section portal-custom-section portal-custom-section--<?= htmlspecialchars($seccionPersonalizada['diseno']) ?>"
                        style="--section-color:<?= htmlspecialchars($coloresSecciones[$idSeccion]) ?>;order:<?= (int)$ordenSecciones[$idSeccion] ?>;<?= empty($visibilidadSecciones[$idSeccion]) ? 'display:none;' : '' ?>">
                        <div class="portal-section__heading">
                            <span class="section-icon" data-section-icon <?= $iconosSecciones[$idSeccion] === '' ? 'hidden' : '' ?>>
                                <?php if ($iconosSecciones[$idSeccion] !== ''): ?><i class="bi bi-<?= htmlspecialchars($iconosSecciones[$idSeccion]) ?>"></i><?php endif; ?>
                            </span>
                            <div>
                                <p class="section-kicker" data-custom-kicker><?= htmlspecialchars(normalizarTextoPortal($seccionPersonalizada['kicker'] ?? '')) ?></p>
                                <h2 data-section-title><?= htmlspecialchars($titulosSecciones[$idSeccion]) ?></h2>
                            </div>
                        </div>

                        <div class="portal-custom-section__layout">
                            <div class="portal-custom-section__content portal-rich-text" data-custom-content>
                                <?= htmlEnriquecidoPortal($seccionPersonalizada['contenido'] ?? '') ?>
                            </div>

                            <?php if ($seccionPersonalizada['diseno'] === 'destacado'): ?>
                                <aside class="portal-custom-section__highlight" data-custom-highlight>
                                    <?php if ($seccionPersonalizada['destacado_titulo'] !== ''): ?>
                                        <strong><?= htmlspecialchars($seccionPersonalizada['destacado_titulo']) ?></strong>
                                    <?php endif; ?>
                                    <div class="portal-rich-text"><?= htmlEnriquecidoPortal($seccionPersonalizada['destacado_texto']) ?></div>
                                </aside>
                            <?php endif; ?>

                            <?php if ($seccionPersonalizada['diseno'] === 'columnas'): ?>
                                <div class="portal-custom-section__columns" data-custom-columns>
                                    <div class="portal-rich-text"><?= htmlEnriquecidoPortal($seccionPersonalizada['columna_izquierda']) ?></div>
                                    <div class="portal-rich-text"><?= htmlEnriquecidoPortal($seccionPersonalizada['columna_derecha']) ?></div>
                                </div>
                            <?php endif; ?>
                        </div>

                        <?php if (!empty($seccionPersonalizada['boton_texto']) && !empty($seccionPersonalizada['boton_url'])): ?>
                            <a class="portal-button portal-custom-section__button" href="<?= htmlspecialchars($seccionPersonalizada['boton_url']) ?>" style="--button-color:var(--section-color)" data-custom-button>
                                <span><?= htmlspecialchars(normalizarTextoPortal($seccionPersonalizada['boton_texto'])) ?></span>
                                <i class="bi bi-arrow-right"></i>
                            </a>
                        <?php endif; ?>
                    </section>
                <?php endif; ?>
            <?php endforeach; ?>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/portal_footer.php'; ?>

    <button type="button" id="btnScrollTop" class="portal-scroll-top" aria-label="Volver arriba"><i class="bi bi-arrow-up"></i></button>

    <?php include __DIR__ . '/modal_fases.php'; ?>
    <?php include __DIR__ . '/../documentos/modal_documentos.php'; ?>

    <?php if (!empty($faseActual['imagen_url']) || $modoEditorPortal): ?>
        <div class="modal fade portal-image-modal" id="modalImagenFases" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <div>
                            <span class="portal-modal-kicker">Tramitación del plan</span>
                            <h5 class="modal-title">Vista ampliada de las fases</h5>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                    </div>
                    <div class="modal-body">
                        <img <?= !empty($faseActual['imagen_url']) ? 'src="' . htmlspecialchars($faseActual['imagen_url'], ENT_QUOTES, 'UTF-8') . '"' : '' ?> alt="Fases de tramitación del plan">
                    </div>
                </div>
            </div>
        </div>
    <?php endif; ?>

    <script src="lib/bootstrap.bundle.min.js"></script>
    <script src="js/documentos/documentos.js?v=pou-v7-20261113-<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/documentos/documentos.js') ?>"></script>
    <script src="js/municipios/municipio.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/municipios/municipio.js') ?>"></script>
</body>
</html>
