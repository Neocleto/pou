<?php
// Acceso de gestión: convenio vigente y proyecto correcto.
require_once __DIR__ . '/../../login/permisos_proyecto.php';
exigirAccesoProyecto(false, false);
require_once __DIR__ . '/../../includes/participacion_portal.php';
$coloresParticipacion = obtenerColoresParticipacion();
$tituloInicialParticipacion = '';
foreach (obtenerSeccionesInicialesPortal() as $seccionInicialParticipacion) {
    if ($seccionInicialParticipacion['id'] === 'participacion') {
        $tituloInicialParticipacion = $seccionInicialParticipacion['titulo'];
        break;
    }
}
$iconosParticipacion = obtenerIconosPortal();
usort($iconosParticipacion, function ($a, $b) { return strcasecmp($a[1], $b[1]); });
?>
<div class="wizard-section">

  <!-- HEADER PASO -->
  <div class="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
    <div class="d-flex align-items-center gap-2">
      <i class="bi bi-people-fill text-primary fs-4"></i>
      <div>
        <h5 class="mb-0 text-primary fw-bold">Paso 5: Participación</h5>
      </div>
    </div>
  </div>

  <!-- TEXTOS PÚBLICOS: SE GUARDAN CON EL BOTÓN GENERAL DEL ASISTENTE -->
  <form id="formParticipacion" class="mb-4">
    <input type="hidden" name="cod_mun" id="cod_mun_participacion">
    <div class="mb-3">
      <label for="titulo1" class="form-label fw-bold">Título de la sección</label>
      <input type="text" class="form-control" id="titulo1" name="titulo1" maxlength="120" required
             value="<?= htmlspecialchars($tituloInicialParticipacion, ENT_QUOTES, 'UTF-8') ?>">
    </div>
    <div class="mb-3">
      <label for="descripcion1" class="form-label fw-bold">Texto de participación</label>
      <textarea class="form-control" id="descripcion1" name="descripcion1" rows="6" data-rich-editor="1"></textarea>
      <div class="form-text">Máximo 6000 caracteres. Pulsa Guardar para aplicar los cambios al portal y al configurador.</div>
    </div>
  </form>

  <!-- BOTONES -->
  <div class="p-3 bg-light rounded-4 border">
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
      <div class="d-flex align-items-center gap-2">
        <i class="bi bi-hand-index-thumb text-primary fs-5"></i>
        <div>
          <div class="fw-bold text-primary">Botones de Participación</div>
          <div class="text-muted small">La plantilla añade cinco botones si el municipio todavía no tiene ninguno. Sube los documentos pendientes antes de publicar.</div>
        </div>
      </div>

      <button type="button" class="btn btn-primary" id="btnNuevoBotonParticipacion">
        <i class="bi bi-plus-circle me-1"></i> Nuevo botón
      </button>
    </div>

    <div id="mensajeMaximoBotones" class="alert alert-warning d-none mb-3" role="alert">
      Has alcanzado el máximo de <strong>5 botones</strong>. Elimina uno para poder crear otro.
    </div>

    <div id="estadoVacioBotones" class="text-center text-muted py-4 d-none">
      <i class="bi bi-inboxes fs-1 d-block mb-2"></i>
      <div class="fw-semibold">Aún no hay botones</div>
      <div class="small">Pulsa <strong>“Nuevo botón”</strong> para crear el primero.</div>
    </div>

    <div id="listaBotonesParticipacionWrapper" class="d-none"></div>

    <div id="spinnerListaBotones" class="text-center py-3 d-none">
      <div class="spinner-border text-primary" role="status"></div>
      <div class="text-muted small mt-2">Cargando botones…</div>
    </div>
  </div>

  <!-- OFFCANVAS INSPECTOR -->
  <div class="offcanvas offcanvas-end offcanvas-participacion"
       tabindex="-1"
       id="offcanvasBotonParticipacion"
       data-bs-scroll="true"
       data-bs-backdrop="false">

    <div class="offcanvas-header border-bottom py-2">
      <div class="d-flex align-items-center gap-2">
        <div class="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center"
             style="width:36px;height:36px;">
          <i class="bi bi-ui-checks-grid"></i>
        </div>
        <div>
          <h6 class="mb-0 fw-semibold" id="tituloModalBoton">Editar botón</h6>
          <div class="text-muted small" id="subtituloModalBoton">Actualiza texto y/o reemplaza el archivo</div>
        </div>
      </div>

      <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Cerrar"></button>
    </div>

    <div class="offcanvas-body py-3">
      <form id="formPanelBotonParticipacion">
        <input type="hidden" id="boton_id" value="">
        <input type="hidden" id="archivo_url_actual" value="">

        <div class="mb-3">
          <div class="d-flex align-items-center justify-content-between">
            <label class="form-label fw-bold mb-1">Texto del botón</label>
            <span class="small text-muted" id="contadorTextoBoton">0/50</span>
          </div>
          <input type="text" class="form-control" id="texto_boton_modal" maxlength="50"
                 placeholder="Ej: GUÍA DE PARTICIPACIÓN" required>
          <div class="form-text small mt-1">Texto corto y claro.</div>
        </div>

        <!-- DISEÑO DEL BOTÓN -->
        <div class="row g-3 mb-3">
          <div class="col-8">
            <label for="icono_boton_modal" class="form-label fw-bold mb-1">Icono</label>
            <div class="input-group">
              <span class="input-group-text icono-boton-preview" id="vistaIconoBoton" aria-label="Icono seleccionado">
                <i id="icono_boton_preview" class="bi bi-file-earmark-arrow-down" aria-hidden="true"></i>
              </span>
              <select class="form-select" id="icono_boton_modal">
                <option value="">Sin icono</option>
                <?php foreach ($iconosParticipacion as $iconoParticipacion): ?>
                <option value="<?= htmlspecialchars($iconoParticipacion[0], ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($iconoParticipacion[1], ENT_QUOTES, 'UTF-8') ?></option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="form-text small mt-1">Elige un icono reconocible para la ciudadanía.</div>
          </div>

          <div class="col-4 portal-color-picker">
            <label for="texto_color_boton_modal" class="form-label fw-bold mb-1">Color</label>
            <div class="portal-color-field">
              <button type="button" class="portal-color-trigger" data-color-open aria-expanded="false" aria-label="Elegir color"
                      style="--chosen-color:<?= $coloresParticipacion['corporativo'] ?>">
                <span></span><i class="bi bi-chevron-down" aria-hidden="true"></i>
              </button>
              <input type="color" class="visually-hidden" tabindex="-1" id="color_boton_modal"
                     aria-label="Color personalizado" value="<?= $coloresParticipacion['corporativo'] ?>">
              <input type="text" class="form-control" id="texto_color_boton_modal" maxlength="7"
                     pattern="#[0-9a-fA-F]{6}" required spellcheck="false" aria-label="Valor hexadecimal"
                     value="<?= $coloresParticipacion['corporativo'] ?>">
            </div>
            <div class="portal-color-palette" hidden></div>
          </div>
        </div>

        <div class="mb-3">
          <div class="form-check form-switch recurso-visible">
            <input class="form-check-input" type="checkbox" id="visible_boton_modal" checked>
            <label class="form-check-label" for="visible_boton_modal">
              Mostrar recurso en la página pública
            </label>
          </div>
          <div class="form-text small mt-1">
            Puedes ocultarlo temporalmente sin eliminar el archivo ni su configuración.
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label fw-bold mb-1">Archivo</label>
          <input type="file" class="form-control" id="archivo_boton_modal"
                 accept=".pdf,.doc,.docx,.zip,.rar,.jpg,.jpeg,.png">
          <div class="form-text small mt-1" id="ayudaArchivoModal">
            Si no seleccionas archivo, se mantiene el actual.
          </div>

          <div class="mt-2 d-none" id="archivoActualPreview">
            <span class="badge bg-secondary-subtle text-dark border">
              Archivo actual: <span id="archivoActualNombre" class="fw-semibold"></span>
            </span>
          </div>
        </div>

        <div id="spinnerGuardandoBoton" class="text-center py-2 d-none">
          <div class="spinner-border text-primary spinner-border-sm" role="status"></div>
          <div class="text-muted small mt-2">Guardando…</div>
        </div>

        <div class="d-flex gap-2 mt-3 pt-2 border-top align-items-center">
          <button type="button" class="btn btn-outline-secondary w-50" data-bs-dismiss="offcanvas">
            Cancelar
          </button>

          <button type="submit" class="btn btn-success w-50" id="btnGuardarBotonPanel">
            <i class="bi bi-arrow-repeat me-1"></i> Actualizar
          </button>
        </div>
      </form>
    </div>

  </div>

</div>

<!-- ACCESO AL DISEÑADOR DE FORMULARIOS -->
<section class="portal-design-launcher mt-4" id="panelFormulariosDinamicos">
    <div class="portal-design-launcher__icon portal-design-launcher__icon--participacion">
        <i class="bi bi-ui-checks-grid"></i>
    </div>

    <div class="portal-design-launcher__copy">
        <span>Participación online</span>
        <h6>Diseña formularios y encuestas desde el configurador visual</h6>
        <p>
            Crea apartados, preguntas, formularios online y documentos PDF
            en la misma pantalla donde se previsualiza el portal público.
        </p>
    </div>

    <button type="button" class="btn btn-primary" id="btnAbrirConfiguradorFormularios">
        <i class="bi bi-window-sidebar me-1"></i>
        Diseñar formularios
    </button>
</section>
