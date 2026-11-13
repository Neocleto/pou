<?php
// Listado compartido por la página de documentos y la modal del municipio.
// Recibe $categoriasFase, $totalDocumentosFase, $columnasCategorias y $esActiva.
// No consulta ni modifica datos. documentos.js conecta el mismo buscador.
?>
                                <div class="documents-toolbar">
                                    <label class="documents-search">
                                        <i class="bi bi-search" aria-hidden="true"></i>
                                        <span class="visually-hidden">Buscar documentos en esta fase</span>
                                        <input
                                            type="search"
                                            class="form-control"
                                            placeholder="Buscar por título de documento..."
                                            autocomplete="off"
                                            data-documents-search>
                                    </label>

                                    <span class="documents-toolbar__result" aria-live="polite">
                                        <strong data-documents-visible><?= (int)$totalDocumentosFase ?></strong>
                                        <span data-documents-visible-label><?= $totalDocumentosFase === 1 ? 'archivo visible' : 'archivos visibles' ?></span>
                                    </span>
                                </div>

                                <div class="documents-filter-empty" data-documents-filter-empty hidden>
                                    <i class="bi bi-search"></i>
                                    <strong>No hay documentos que coincidan</strong>
                                    <span>Prueba con otra palabra del título.</span>
                                </div>

                                <div class="documents-category-grid documents-category-grid--<?= (int)$columnasCategorias ?>">
                                    <?php foreach ($categoriasFase as $categoria => $documentos): ?>
                                        <section class="documents-category" data-documents-category>
                                            <header class="documents-category__heading">
                                                <span><i class="bi bi-folder2"></i></span>
                                                <div>
                                                    <h3><?= htmlspecialchars($categoria) ?></h3>
                                                    <small><?= count($documentos) ?> <?= count($documentos) === 1 ? 'archivo' : 'archivos' ?></small>
                                                </div>
                                            </header>

                                            <div class="documents-list">
                                                <?php foreach ($documentos as $documento): ?>
                                                    <?php if ($esActiva): ?>
                                                        <a
                                                            class="document-item"
                                                            data-document-item
                                                            href="<?= htmlspecialchars($documento['archivo_url']) ?>"
                                                            target="_blank"
                                                            rel="noopener noreferrer">
                                                            <span class="document-item__copy">
                                                                <strong><?= htmlspecialchars($documento['titulo']) ?></strong>
                                                            </span>
                                                            <span class="document-item__action" aria-hidden="true"><i class="bi bi-download"></i></span>
                                                        </a>
                                                    <?php else: ?>
                                                        <div class="document-item is-locked" data-document-item aria-label="Documento bloqueado">
                                                            <span class="document-item__icon"><i class="bi bi-file-earmark-pdf"></i></span>
                                                            <span class="document-item__copy">
                                                                <strong><?= htmlspecialchars($documento['titulo']) ?></strong>
                                                                <small>No disponible para descarga</small>
                                                            </span>
                                                            <span class="document-item__action"><i class="bi bi-lock"></i></span>
                                                        </div>
                                                    <?php endif; ?>
                                                <?php endforeach; ?>
                                            </div>
                                        </section>
                                    <?php endforeach; ?>
                                </div>
