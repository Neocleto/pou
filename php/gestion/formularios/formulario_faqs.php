<?php
// Acceso de gestión: convenio vigente y proyecto correcto.
require_once __DIR__ . '/../../login/permisos_proyecto.php';
exigirAccesoProyecto(false, false);
?>
<!-- Paso 7: Preguntas frecuentes -->
<div class="wizard-section">
  <div class="wizard-section-title mb-4 d-flex align-items-center">
    <i class="bi bi-question-circle text-primary me-2 fs-4"></i>
    <h5 class="mb-0 text-primary fw-bold">Paso 7: Preguntas frecuentes</h5>
  </div>

  <div class="alert alert-light border d-flex gap-2 align-items-start">
    <i class="bi bi-info-circle text-primary mt-1"></i>
    <div>
      Puedes reutilizar una pregunta de la biblioteca común y adaptarla para este municipio sin modificar el texto original.
      Las preguntas nuevas se guardan únicamente para el municipio actual.
    </div>
  </div>

  <!-- Biblioteca común y creación de una pregunta municipal. -->
  <div class="mb-3 d-flex gap-2 align-items-end flex-wrap">
    <div class="flex-grow-1" style="min-width:280px;">
      <label for="selectorPregunta" class="form-label">Añadir desde la biblioteca común</label>
      <select id="selectorPregunta" class="form-select" style="width:100%"></select>
    </div>
    <button type="button" id="btnMostrarFormularioFaq" class="btn btn-outline-success">
      <i class="bi bi-plus-circle"></i> Crear para este municipio
    </button>
  </div>

  <div id="formularioFaqNuevo" class="border rounded p-3 d-none mb-3 bg-light">
    <div class="mb-3">
      <label for="preguntaNueva" class="form-label">Pregunta</label>
      <input type="text" class="form-control" id="preguntaNueva" placeholder="Introduce la pregunta">
    </div>
    <div class="mb-3">
      <label for="respuestaNueva" class="form-label">Respuesta</label>
      <textarea class="form-control" id="respuestaNueva" rows="4" placeholder="Introduce la respuesta"></textarea>
    </div>
    <button type="button" class="btn btn-success" id="btnAgregarFaq">
      <i class="bi bi-plus-circle me-1"></i>Añadir pregunta municipal
    </button>
  </div>

  <div class="d-flex gap-2 mb-3 flex-wrap">
    <button type="button" id="btnOrdenarFaqs" class="btn btn-outline-primary">
      <i class="bi bi-arrows-move"></i> Ordenar preguntas
    </button>
    <button type="button" id="btnVerTodasFaqs" class="btn btn-outline-primary">
      <i class="bi bi-eye"></i> Ver todas
    </button>
    <button type="button" id="btnSalirOrdenFaqs" class="btn btn-secondary d-none">
      Cancelar orden
    </button>
    <button type="button" id="btnGuardarOrdenFaqs" class="btn btn-success d-none">
      Aplicar orden
    </button>
  </div>

  <div class="table-responsive">
    <table id="tablaFaqs" class="table table-striped table-bordered align-middle">
      <thead>
        <tr>
          <th style="width:48px;"></th>
          <th>Pregunta</th>
          <th style="width:130px;">Tipo</th>
          <th class="text-center" style="width:150px;">Acciones</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>

  <div id="faqPaginacionContainer" class="text-center mt-3"></div>

  <div id="mensajeSinPreguntas" class="alert alert-info text-center my-3" style="display:none;">
    <i class="bi bi-info-circle me-2"></i>
    No hay preguntas frecuentes asignadas a este municipio.
  </div>
</div>
