<div class="wizard-section">
    <div class="wizard-section-title mb-4 d-flex align-items-center">
        <i class="bi bi-info-circle-fill text-primary me-2 fs-4"></i>
        <h5 class="mb-0 text-primary fw-bold">Paso 2: Información</h5>
    </div>

    <form id="formInformacion">
        <!-- Campo oculto para el código del municipio -->
        <input type="hidden" name="cod_mun" id="cod_mun_informacion">

        <!-- Campo de título -->
        <div class="mb-3">
            <label for="titulo" class="form-label">Título del bloque de Información</label>
            <input type="text" class="form-control" id="titulo" name="titulo" required>
            <div class="form-text">Este título se muestra como encabezado del bloque de Información en la web municipal.</div>
        </div>

        <!-- Campo de descripción -->
        <div class="mb-3">
            <label for="descripcion" class="form-label">Descripción</label>
            <textarea class="form-control" id="descripcion" data-rich-editor="1" name="descripcion" rows="4" required></textarea>
        </div>
    </form>
</div>
