<?php
// ============================================================================
// PÁGINA PÚBLICA DE DOCUMENTOS
//
// Conserva la lógica de fases y categorías, pero comparte la identidad visual
// y los márgenes del portal municipal.
// ============================================================================
require_once __DIR__ . '/../includes/valores_portal.php';
require_once __DIR__ . '/../includes/imagenes_municipio.php';
$configuracion = array_merge(obtenerConfiguracionInicialPortal(), $configuracionVisual ?? []);

$codMun = (string)($municipio['cod_mun'] ?? '');
$nombreMunicipio = trim((string)($municipio['nombre'] ?? ''));
$escudoMunicipio = obtenerEscudoMunicipio($codMun, $municipio['escudo'] ?? '');

$totalDocumentos = 0;

foreach ($documentosPorFase as $categorias) {
    foreach ($categorias as $documentos) {
        $totalDocumentos += count($documentos);
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentos del POU de <?= htmlspecialchars($nombreMunicipio) ?></title>

    <base href="/pou/">

    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap@5.3.0.min.css">
    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap-icons.css">
    <link rel="stylesheet" href="css/portal.css?v=pou-v9-20261113-<?= (int)@filemtime(dirname(__DIR__, 2) . '/css/portal.css') ?>">
    <link rel="stylesheet" href="css/documentos.css?v=pou-v7-20261113-<?= (int)@filemtime(dirname(__DIR__, 2) . '/css/documentos.css') ?>">
    <link rel="stylesheet" href="css/tema-pou.css">
</head>
<body
    class="portal-page portal-documents-page portal-loading"
    style="
        --pou-primary: <?= htmlspecialchars($configuracion['color_primario']) ?>;
        --pou-secondary: <?= htmlspecialchars($configuracion['color_secundario']) ?>;
        --pou-documents: <?= htmlspecialchars($configuracion['color_documentos']) ?>;
        --pou-width: <?= (int)$configuracion['ancho_contenido'] ?>px;
        --pou-scale: <?= (float)$configuracion['escala_texto'] ?>;
    ">
    <div id="spinner-carga-documentos" class="portal-page-loader">
        <div class="portal-page-loader__content">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 mb-0">Cargando documentos...</p>
        </div>
    </div>

    <?php include __DIR__ . '/../includes/portal_header.php'; ?>

    <main>
        <section class="documents-hero">
            <div class="portal-shell documents-hero__inner">
                <div class="documents-municipality">
                    <span class="documents-municipality__crest">
                        <img src="<?= htmlspecialchars($escudoMunicipio) ?>" alt="Escudo de <?= htmlspecialchars($nombreMunicipio) ?>">
                    </span>
                    <span class="documents-municipality__copy">
                        <small>Municipio</small>
                        <strong><?= htmlspecialchars($nombreMunicipio) ?></strong>
                    </span>
                </div>

                <div class="documents-hero__copy">
                    <p class="documents-hero__kicker">Documentación pública</p>
                    <h1>Documentos del POU</h1>
                    <p class="documents-hero__description">
                        Consulta la documentación publicada en cada fase de la tramitación.
                        Las descargas disponibles corresponden a la fase actualmente abierta.
                    </p>
                </div>

                <div class="documents-hero__actions">
                    <a
                        class="documents-back-link"
                        href="php/municipio/municipio.php?cod_mun=<?= urlencode($codMun) ?><?= !empty($modoPreview) ? '&preview=1' : '' ?>">
                        <i class="bi bi-arrow-left"></i>
                        Volver al portal municipal
                    </a>

                    <div class="documents-hero__summary" aria-label="Resumen de documentos">
                        <span class="documents-hero__summary-icon"><i class="bi bi-folder2-open" aria-hidden="true"></i></span>
                        <span>
                            <strong><?= (int)$totalDocumentos ?></strong>
                            <small><?= $totalDocumentos === 1 ? 'documento publicado' : 'documentos publicados' ?></small>
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <section class="portal-shell documents-content" aria-label="Documentos por fase">
            <aside class="documents-phases">
                <div class="documents-phases__heading">
                    <i class="bi bi-diagram-3"></i>
                    <div>
                        <strong>Tramitación</strong>
                        <small>Solo la fase activa está disponible</small>
                    </div>
                </div>

                <div class="nav documents-phases__nav" id="fases-tab" role="tablist" aria-orientation="vertical">
                    <?php foreach ($fasesMenu as $fase): ?>
                        <?php
                        $codigo = $fase['codigo'];
                        // Un punto en 2.1 no debe interpretarse como selector de clase.
                        $idFase = 'fase-' . preg_replace('/[^a-zA-Z0-9_-]/', '-', (string)$codigo);
                        $numFase = (int)$fase['num_fase'];
                        $esActiva = $numFase === (int)$faseActualNum;
                        $completada = ($fase['estado'] ?? '') === 'completada';
                        $totalDocumentosFaseMenu = 0;

                        foreach (($documentosPorFase[$numFase] ?? []) as $documentosCategoria) {
                            $totalDocumentosFaseMenu += count($documentosCategoria);
                        }
                        ?>
                        <button
                            class="nav-link<?= $esActiva ? ' active' : ($completada ? ' is-completed' : '') ?>"
                            id="<?= htmlspecialchars($idFase) ?>-tab"
                            <?php if ($esActiva): ?>
                                data-bs-toggle="pill" data-bs-target="#<?= htmlspecialchars($idFase) ?>"
                                aria-controls="<?= htmlspecialchars($idFase) ?>"
                            <?php else: ?>
                                disabled aria-disabled="true"
                            <?php endif; ?>
                            type="button"
                            role="tab"
                            aria-selected="<?= $esActiva ? 'true' : 'false' ?>">
                            <span class="documents-phases__copy">
                                <strong>Fase <?= htmlspecialchars($codigo) ?></strong>
                                <small>
                                    <?= $esActiva ? 'Fase activa · ' . (int)$totalDocumentosFaseMenu . ($totalDocumentosFaseMenu === 1 ? ' archivo' : ' archivos') : ($completada ? 'Completada · No disponible' : 'No disponible') ?>
                                </small>
                            </span>
                            <?= $esActiva ? '<i class="bi bi-check-circle-fill" aria-label="Fase actual"></i>' : '<i class="bi bi-lock" aria-hidden="true"></i>' ?>
                        </button>
                    <?php endforeach; ?>
                </div>
            </aside>

            <div class="documents-panel">
                <div class="tab-content" id="faseTabsContent">
                    <?php foreach ($fasesMenu as $fase): ?>
                        <?php
                        $codigo = $fase['codigo'];
                        // Un punto en 2.1 no debe interpretarse como selector de clase.
                        $idFase = 'fase-' . preg_replace('/[^a-zA-Z0-9_-]/', '-', (string)$codigo);
                        $numFase = (int)$fase['num_fase'];
                        $esActiva = $numFase === (int)$faseActualNum;
                        if (!$esActiva) continue;
                        $categoriasFase = $documentosPorFase[$numFase] ?? [];
                        $hayDocumentos = !empty($categoriasFase);
                        $totalDocumentosFase = 0;

                        foreach ($categoriasFase as $documentosCategoria) {
                            $totalDocumentosFase += count($documentosCategoria);
                        }

                        $totalCategoriasFase = count($categoriasFase);
                        $columnasCategorias = max(1, min(3, $totalCategoriasFase));
                        ?>
                        <article
                            class="tab-pane fade <?= $esActiva ? 'show active' : '' ?>"
                            id="<?= htmlspecialchars($idFase) ?>"
                            role="tabpanel"
                            aria-labelledby="<?= htmlspecialchars($idFase) ?>-tab"
                            tabindex="0">

                            <header class="documents-panel__heading">
                                <div>
                                    <h2><?= htmlspecialchars($fase['titulo']) ?></h2>
                                    <p>
                                        <?= (int)$totalCategoriasFase ?>
                                        <?= $totalCategoriasFase === 1 ? 'categoría' : 'categorías' ?>
                                        ·
                                        <?= (int)$totalDocumentosFase ?>
                                        <?= $totalDocumentosFase === 1 ? 'archivo' : 'archivos' ?>
                                    </p>
                                </div>

                                <?php if ($hayDocumentos): ?>
                                    <span class="documents-status is-current">
                                        <i class="bi bi-unlock"></i>Descargas disponibles
                                    </span>
                                <?php endif; ?>
                            </header>

                            <?php if (!$hayDocumentos): ?>
                                <div class="documents-empty">
                                    <span><i class="bi bi-folder"></i></span>
                                    <h3>Aún no hay documentos en esta fase</h3>
                                    <p>La documentación aparecerá aquí cuando sea publicada.</p>
                                </div>
                            <?php else: ?>
                                <?php include __DIR__ . '/listado_documentos.php'; ?>
                            <?php endif; ?>
                        </article>
                    <?php endforeach; ?>
                    <?php if (!$faseActualNum): ?>
                        <div class="documents-empty">
                            <span><i class="bi bi-folder"></i></span>
                            <h3>Todavía no hay documentos publicados</h3>
                            <p>La documentación estará disponible cuando se publique la fase activa.</p>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </section>
    </main>

    <?php include __DIR__ . '/../includes/portal_footer.php'; ?>

    <button type="button" id="btnScrollTop" class="portal-scroll-top" aria-label="Volver arriba"><i class="bi bi-arrow-up"></i></button>

    <script src="lib/bootstrap.bundle.min.js"></script>
    <script src="js/documentos/documentos.js?v=pou-v7-20261113-<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/documentos/documentos.js') ?>"></script>
</body>
</html>
