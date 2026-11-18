<?php
// Acceso de gestión: convenio vigente y proyecto correcto.
require_once __DIR__ . '/../../login/permisos_proyecto.php';
exigirAccesoProyecto(false, false);
?>
<!-- Paso 6: Noticias -->
<div class="wizard-section">

  <!-- HEADER PASO -->
  <div class="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
    <div class="d-flex align-items-center gap-2">
      <i class="bi bi-newspaper text-primary fs-4"></i>
      <div>
        <h5 class="mb-0 text-primary fw-bold">Paso 6: Noticias</h5>
      </div>
    </div>
  </div>

  <!-- BLOQUE LISTA -->
  <div class="mt-3 p-3 bg-light rounded-4 border">

    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
      <!-- Buscador externo (conecta a DataTables) -->
      <div class="d-flex align-items-center gap-2 flex-grow-1" style="min-width:260px;">
        <i class="bi bi-search text-primary"></i>
        <input type="text" class="form-control" id="buscadorNoticias" placeholder="Buscar noticia…">
      </div>

      <button type="button" class="btn btn-primary" id="btnNuevaNoticia">
        <i class="bi bi-plus-circle me-1"></i> Nueva noticia
      </button>
    </div>

    <div id="estadoVacioNoticias" class="text-center text-muted py-4 d-none">
      <i class="bi bi-inboxes fs-1 d-block mb-2"></i>
      <div class="fw-semibold">Aún no hay noticias</div>
      <div class="small">Pulsa <strong>“Nueva noticia”</strong> para crear la primera.</div>
    </div>

    <div id="spinnerNoticias" class="text-center py-3 d-none">
      <div class="spinner-border text-primary" role="status"></div>
      <div class="text-muted small mt-2">Cargando noticias…</div>
    </div>

    <div id="tablaNoticiasWrapper" class="d-none"></div>
  </div>

  <!-- OFFCANVAS INSPECTOR (igual filosofía que Participación) -->
  <div class="offcanvas offcanvas-end offcanvas-noticias"
       tabindex="-1"
       id="offcanvasNoticia"
       data-bs-scroll="true"
       data-bs-backdrop="false">

    <div class="offcanvas-header border-bottom py-2">
      <div class="d-flex align-items-center gap-2">
        <div class="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center"
             style="width:36px;height:36px;">
          <i class="bi bi-pencil-square"></i>
        </div>
        <div>
          <h6 class="mb-0 fw-semibold" id="tituloOffcanvasNoticia">Nueva noticia</h6>
          <div class="text-muted small" id="subtituloOffcanvasNoticia">Crea o edita una noticia del municipio</div>
        </div>
      </div>

      <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Cerrar"></button>
    </div>

    <div class="offcanvas-body py-3">
      <form id="formNoticia" enctype="multipart/form-data" novalidate>
        <input type="hidden" name="cod_mun" id="cod_mun_noticia" value="">
        <input type="hidden" name="id" id="id_noticia" value="">

        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center">
            <label for="titulo_noticia" class="form-label fw-bold mb-1">Título</label>
            <small class="text-muted" id="contadorTitulo">60 restantes</small>
          </div>
          <input type="text" class="form-control" id="titulo_noticia" name="titulo" maxlength="60" required>
          <div class="form-text small mt-1">Recomendación: corto y claro.</div>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-12 col-md-6">
            <label for="fecha_publicacion" class="form-label fw-bold mb-1">Fecha publicación</label>
            <input type="date" class="form-control" id="fecha_publicacion" name="fecha_publicacion" required>
          </div>

          <div class="col-12 col-md-6 d-flex align-items-center">
            <div class="form-check mt-md-4 mt-2">
              <input class="form-check-input" type="checkbox" id="activa" name="activa" checked>
              <label class="form-check-label fw-semibold" for="activa">Activar noticia</label>
            </div>
          </div>
        </div>

        <div class="mb-3">
          <label for="resumen" class="form-label fw-bold mb-1">Resumen</label>
          <textarea class="form-control" id="resumen" data-rich-editor="1" name="resumen" rows="4" required></textarea>
        </div>

        <div class="mb-3">
          <label for="enlace_detalle" class="form-label fw-bold mb-1">Enlace a más información</label>
          <input type="url" class="form-control" id="enlace_detalle" name="enlace_detalle" required>
        </div>

        <div class="mb-3">
          <label for="archivo_imagen" class="form-label fw-bold mb-1">Imagen (JPG, PNG)</label>
          <input type="file" class="form-control" id="archivo_imagen" name="archivo_imagen" accept="image/jpeg,image/png">
          <div class="form-text small mt-1" id="notaImagen">
            Si no seleccionas archivo, se mantiene la actual (al editar).
          </div>

          <div class="mt-2 d-none" id="imagenActualPreview">
            <span class="badge bg-secondary-subtle text-dark border">
              Imagen actual: <span id="imagenActualNombre" class="fw-semibold"></span>
            </span>
          </div>
        </div>

        <div class="d-flex gap-2 mt-3 noticia-footer align-items-center">
          <button type="button" class="btn btn-outline-secondary w-50" id="btnCancelarNoticia">
            Cancelar
          </button>

          <button type="submit" class="btn btn-success w-50" id="btnGuardarNoticia">
            <i class="bi bi-check2-circle me-1"></i> Guardar
          </button>
        </div>

      </form>
    </div>

  </div>
</div>
