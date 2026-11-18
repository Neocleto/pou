<?php
// Acceso de gestión: convenio vigente y proyecto correcto.
require_once __DIR__ . '/../../login/permisos_proyecto.php';
exigirAccesoProyecto(false, false);
?>
<!-- Paso 3: Fases del POU -->
<div class="wizard-section">
  <div class="wizard-section-title mb-4 d-flex align-items-center">
    <i class="bi bi-bar-chart-steps text-primary me-2 fs-4"></i>
    <h5 class="mb-0 text-primary fw-bold">Paso 3: Fases del POU</h5>
  </div>

  <form id="formFaseActual" novalidate>
    <!-- cod_mun lo rellena wizard.js en edición y también en creación al guardar -->
    <input type="hidden" id="cod_mun_fase" name="cod_mun" value="">

    <div class="wizard-section-title mb-3 d-flex align-items-center">
      <i class="bi bi-geo-alt-fill text-primary me-2 fs-4"></i>
      <h5 class="mb-0 text-primary fw-bold">Fase Actual</h5>
    </div>

    <div class="row">
      <!-- Fase padre -->
      <div class="mb-3 col-md-5">
        <label for="fase_padre" class="form-label">Fase (principal)</label>
        <select class="form-select" id="fase_padre" name="num_fase" required>
          <option value="" disabled selected>Cargando fases…</option>
        </select>
        <div class="form-text">
          Selecciona la fase principal para cargar sus subfases.
        </div>
      </div>

      <!-- Subfase -->
      <div class="mb-3 col-md-5">
        <label for="subfase_id" class="form-label">Subfase (tramitación)</label>
        <select class="form-select" id="subfase_id" name="subfase_id" required disabled>
          <option value="" disabled selected>Selecciona una subfase</option>
        </select>
        <div class="form-text">
          Las subfases dependen de la fase principal.
        </div>
      </div>

      <!-- Fecha -->
      <div class="mb-3 col-md-2">
        <label for="fecha_inicio" class="form-label">Fecha de inicio</label>
        <input type="date" class="form-control" id="fecha_inicio" name="fecha_inicio" required>
      </div>

      <!-- Estado -->
      <div class="mb-3 col-12">
        <label for="estado_tramitacion" class="form-label">Estado de la tramitación</label>
        <textarea
          class="form-control"
          id="estado_tramitacion" data-rich-editor="1"
          name="estado_tramitacion"
          rows="3"
          required
          data-user-edited="0"
          placeholder="Ej.: Actualmente en proceso de aprobación por Medio Ambiente..."
        ></textarea>
        <div class="form-text">
          Al seleccionar una subfase se propondrá automáticamente un texto (editable).
        </div>
      </div>
    </div>
  </form>
</div>
