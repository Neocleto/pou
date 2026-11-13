<?php
// ============================================================================
// TABLA DE MUNICIPIOS DEL PANEL
// La variable $municipios llega preparada desde PanelGestionController.
// ============================================================================
?>

<!-- Estado vacío. -->
<div
    id="mensajeSinMunicipios"
    class="empty-state card border-0 shadow-sm fade-transition <?= !empty($municipios) ? 'd-none' : '' ?>">
    <div class="card-body text-center py-5">
        <div class="empty-icon mb-3">
            <i class="bi bi-building"></i>
        </div>
        <h5 class="mb-2">Aún no has creado ningún municipio</h5>
        <p class="text-muted mb-3">Pulsa en “Crear nuevo municipio” para comenzar.</p>
        <button class="btn btn-success" id="btnCrearMunicipioEmpty" type="button">
            <i class="bi bi-plus-circle me-2"></i>Crear nuevo municipio
        </button>
    </div>
</div>

<!-- Indicador utilizado al recargar la tabla mediante AJAX. -->
<div id="spinnerTablaMunicipios" class="panel-table-loading d-none" aria-live="polite">
    <div class="spinner-border text-primary" role="status"></div>
    <span>Actualizando municipios...</span>
</div>

<div
    id="contenedorTablaMunicipios"
    class="<?= empty($municipios) ? 'd-none' : '' ?> fade-transition">

    <section class="table-card card border-0 mb-0">
        <div class="card-body">
            <div class="table-toolbar">
                <div class="toolbar-left">
                    <div class="table-title">
                        <i class="bi bi-list-check"></i>
                        <span>Municipios</span>
                        <span class="badge text-bg-light ms-2"><?= count($municipios) ?></span>
                    </div>
                    <div class="table-subtitle text-muted small">
                        Gestiona la configuración y publicación de cada POU.
                    </div>
                </div>
            </div>

            <div class="table-responsive-wrapper">
                <table
                    id="tablaMunicipios"
                    class="table dataTable table-hover table-borderless align-middle w-100">
                    <thead>
                        <tr>
                            <th>Código INE</th>
                            <th>Municipio</th>
                            <th>Correo arquitecto</th>
                            <th>Correo gestor</th>
                            <th>Estado</th>
                            <th>Progreso del asistente</th>
                            <th>Última modificación</th>
                            <th class="text-center">Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        <?php foreach ($municipios as $municipio): ?>
                            <?php
                            $codMun = $municipio['cod_mun'] ?? '';
                            $nombre = $municipio['nombre'] ?? '';
                            $correoArquitecto = $municipio['correo_contacto'] ?? '';
                            $correoGestor = $municipio['correo_contacto_gestor'] ?? '';
                            $esActivo = !empty($municipio['activo']);
                            $fechaModificacion = $municipio['fecha_modificacion'] ?? null;
                            $progreso = $municipio['progreso_asistente'] ?? [
                                'pasos' => array_fill(0, 7, false),
                                'completados' => 0,
                                'total' => 7
                            ];

                            $estadoTexto = $esActivo
                                ? 'Publicado'
                                : ($progreso['completados'] > 0 ? 'Borrador' : 'Inactivo');

                            $estadoClase = $esActivo
                                ? 'status-publicado'
                                : ($progreso['completados'] > 0 ? 'status-borrador' : 'status-inactivo');
                            ?>

                            <tr>
                                <td class="codigo-celda"><?= htmlspecialchars($codMun) ?></td>
                                <td class="municipio-celda"><?= htmlspecialchars($nombre) ?></td>
                                <td class="email-celda" title="<?= htmlspecialchars($correoArquitecto) ?>">
                                    <?= htmlspecialchars($correoArquitecto ?: '—') ?>
                                </td>
                                <td class="email-celda" title="<?= htmlspecialchars($correoGestor) ?>">
                                    <?= htmlspecialchars($correoGestor ?: '—') ?>
                                </td>
                                <td>
                                    <span class="panel-status <?= $estadoClase ?>">
                                        <i class="bi <?= $esActivo ? 'bi-check-circle' : 'bi-circle' ?>"></i>
                                        <?= htmlspecialchars($estadoTexto) ?>
                                    </span>
                                </td>
                                <td>
                                    <div class="assistant-progress" aria-label="<?= (int)$progreso['completados'] ?> de <?= (int)$progreso['total'] ?> pasos completados">
                                        <div class="assistant-progress__steps">
                                            <?php foreach ($progreso['pasos'] as $indice => $completado): ?>
                                                <span
                                                    class="assistant-progress__step <?= $completado ? 'is-complete' : '' ?>"
                                                    title="Paso <?= $indice + 1 ?> <?= $completado ? 'completado' : 'pendiente' ?>">
                                                    <i class="bi <?= $completado ? 'bi-check' : 'bi-dot' ?>"></i>
                                                </span>
                                            <?php endforeach; ?>
                                        </div>
                                        <small>
                                            <?= (int)$progreso['completados'] ?>/<?= (int)$progreso['total'] ?> pasos
                                        </small>
                                    </div>
                                </td>
                                <td class="fecha-celda">
                                    <?php if ($fechaModificacion): ?>
                                        <span class="date-pill">
                                            <i class="bi bi-calendar3"></i>
                                            <?= date('d/m/Y H:i', strtotime($fechaModificacion)) ?>
                                        </span>
                                    <?php else: ?>
                                        <span class="text-muted">—</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <div class="acciones-wrap">
                                        <button
                                            type="button"
                                            class="btn btn-warning btn-sm btn-editar btn-accion"
                                            data-id="<?= htmlspecialchars($codMun) ?>"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            title="Editar POU"
                                            aria-label="Editar POU">
                                            <i class="bi bi-pencil-square" aria-hidden="true"></i>
                                        </button>

                                        <a
                                            class="btn btn-primary btn-sm btn-configurar-portal btn-accion"
                                            href="php/gestion/configurador_portal.php?cod_mun=<?= urlencode($codMun) ?>"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            title="Configurar portal"
                                            aria-label="Configurar portal">
                                            <i class="bi bi-sliders" aria-hidden="true"></i>
                                        </a>

                                        <button
                                            type="button"
                                            class="btn btn-outline-primary btn-sm btn-previsualizar btn-accion"
                                            data-codmun="<?= htmlspecialchars($codMun) ?>"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            title="Previsualizar portal"
                                            aria-label="Previsualizar portal">
                                            <i class="bi bi-eye" aria-hidden="true"></i>
                                        </button>

                                        <button
                                            type="button"
                                            class="btn btn-success btn-sm btn-publicar btn-accion"
                                            data-id="<?= htmlspecialchars($codMun) ?>"
                                            data-activo="<?= htmlspecialchars((string)$municipio['activo']) ?>"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            title="<?= $esActivo ? 'Actualizar publicación' : 'Publicar portal' ?>"
                                            aria-label="<?= $esActivo ? 'Actualizar publicación' : 'Publicar portal' ?>">
                                            <i class="bi bi-upload" aria-hidden="true"></i>
                                        </button>

                                        <button
                                            type="button"
                                            class="btn btn-outline-danger btn-sm btn-eliminar btn-accion"
                                            data-id="<?= htmlspecialchars($codMun) ?>"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            title="Desactivar municipio"
                                            aria-label="Desactivar municipio">
                                            <i class="bi bi-trash" aria-hidden="true"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </section>
</div>
