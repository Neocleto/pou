<?php
// Modal del portal. Usa los datos ya cargados: abrir/cerrar no hace peticiones.
// Se muestra solamente la fase documental activa y se reutiliza su listado.
$numeroDocumental = $documentosPublicos['faseActualNum'];
$categoriasFase = $documentosPublicos['documentosPorFase'][$numeroDocumental] ?? [];
$totalDocumentosFase = 0;
foreach ($categoriasFase as $documentosCategoria) {
    $totalDocumentosFase += count($documentosCategoria);
}
$columnasCategorias = 2;
$esActiva = true;
$tituloDocumental = $documentosPublicos['fasesMenu'][$numeroDocumental]['titulo'] ?? 'Documentación pública';
?>
<div class="modal fade portal-documents-modal" id="modalDocumentosPortal" tabindex="-1"
     aria-labelledby="tituloDocumentosPortal" aria-hidden="true"
     style="--pou-documents:<?= htmlspecialchars($coloresSecciones['documentos']) ?>">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <div>
                    <span class="portal-modal-kicker">Documentación pública · <?= htmlspecialchars($nombreMunicipio) ?></span>
                    <h2 class="modal-title" id="tituloDocumentosPortal"><?= htmlspecialchars(normalizarTextoPortal($tituloDocumental)) ?></h2>
                    <p>Fase activa · <?= $totalDocumentosFase ?> <?= $totalDocumentosFase === 1 ? 'documento publicado' : 'documentos publicados' ?>.</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar documentación"></button>
            </div>
            <div class="modal-body tab-pane" data-document-modal-panel>
                <?php if ($totalDocumentosFase > 0): ?>
                    <?php include __DIR__ . '/listado_documentos.php'; ?>
                <?php else: ?>
                    <p class="mb-0">Todavía no hay documentos publicados.</p>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>
