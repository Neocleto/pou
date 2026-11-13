<?php
// ============================================================================
// FORMULARIO PÚBLICO DE PARTICIPACIÓN
// Muestra un formulario creado desde el paso Participación del wizard.
// ============================================================================

require_once(__DIR__ . '/../db/conexion.php');
require_once(__DIR__ . '/../modelo/FormularioDinamicoModel.php');
require_once(__DIR__ . '/../modelo/MunicipioModel.php');

$codMun = trim($_GET['cod_mun'] ?? '');
$slug = trim($_GET['slug'] ?? '');

$formularioModel = new FormularioDinamicoModel($conn);
$municipioModel = new MunicipioModel($conn);

$formulario = $formularioModel->obtenerPorSlug($codMun, $slug);
$municipio = $municipioModel->obtenerMunicipioActivosPorCodigo($codMun);

// Solo se muestran formularios publicados y con modalidad online.
if (
    !$formulario
    || !$municipio
    || !in_array($formulario['modalidad'], ['online', 'ambos'], true)
) {
    http_response_code(404);
    exit('El formulario no está disponible.');
}

/**
 * Escapa texto para atributos HTML.
 */
function escaparAtributo($valor)
{
    return htmlspecialchars((string)$valor, ENT_QUOTES, 'UTF-8');
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= escaparAtributo($formulario['titulo']) ?> - POU</title>

    <base href="/pou/">

    <link rel="icon" href="images/favicon.ico" type="image/x-icon">
    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap@5.3.0.min.css">
    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap-icons.css">
    <link rel="stylesheet" href="css/formulario-publico.css">
    <link rel="stylesheet" href="css/tema-pou.css">
</head>
<body
    class="form-public-page form-public-loading"
    style="--form-color:<?= escaparAtributo($formulario['color']) ?>;">

    <!-- Capa inicial para evitar parpadeos durante la carga. -->
    <div class="form-public-loader" id="formPublicLoader" aria-hidden="true">
        <span class="spinner-border" role="status"></span>
    </div>

    <!-- Cabecera institucional. -->
    <header class="form-public-header">
        <div class="form-public-shell form-public-header__inner">
            <img src="images/logo_idemap.png" alt="IDEMAP GEOportal" class="form-public-logo-idemap">

            <a
                href="php/municipio/municipio.php?cod_mun=<?= urlencode($codMun) ?>"
                class="form-public-back">
                <i class="bi bi-arrow-left"></i>
                Volver al POU
            </a>

            <img
                src="images/logo_diputacion_azul.png"
                alt="Diputación Provincial de Málaga"
                class="form-public-logo-diputacion">
        </div>
    </header>

    <main class="form-public-shell form-public-main">
        <!-- Presentación del formulario. -->
        <section class="form-public-intro">
            <?php if (!empty($formulario['icono'])): ?>
                <span class="form-public-icon">
                    <i class="bi bi-<?= escaparAtributo($formulario['icono']) ?>"></i>
                </span>
            <?php endif; ?>

            <div class="form-public-intro__content">
                <p>Participación ciudadana · <?= escaparAtributo($municipio['nombre']) ?></p>
                <h1><?= escaparAtributo($formulario['titulo']) ?></h1>

                <?php if (!empty($formulario['descripcion'])): ?>
                    <div class="form-public-intro__description">
                        <?= nl2br(escaparAtributo($formulario['descripcion'])) ?>
                    </div>
                <?php endif; ?>
            </div>

            <?php if ($formulario['modalidad'] === 'ambos' && !empty($formulario['pdf_url'])): ?>
                <a
                    href="<?= escaparAtributo($formulario['pdf_url']) ?>"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="form-public-pdf">
                    <i class="bi bi-file-earmark-pdf"></i>
                    <?= escaparAtributo($formulario['texto_boton_pdf'] ?: 'Descargar PDF') ?>
                </a>
            <?php endif; ?>
        </section>

        <!-- Formulario generado dinámicamente. -->
        <form
            id="formularioDinamicoPublico"
            action="php/municipio/guardar_respuesta_formulario.php"
            method="post"
            class="form-public-form"
            novalidate>

            <input type="hidden" name="formulario_id" value="<?= (int)$formulario['id'] ?>">
            <input type="hidden" name="cod_mun" value="<?= escaparAtributo($codMun) ?>">

            <?php foreach ($formulario['secciones'] as $indiceSeccion => $seccion): ?>
                <section class="form-public-section">
                    <div class="form-public-section__heading">
                        <span><?= $indiceSeccion + 1 ?></span>

                        <div>
                            <h2><?= escaparAtributo($seccion['titulo']) ?></h2>

                            <?php if (!empty($seccion['descripcion'])): ?>
                                <p><?= escaparAtributo($seccion['descripcion']) ?></p>
                            <?php endif; ?>
                        </div>
                    </div>

                    <div class="form-public-fields">
                        <?php foreach ($seccion['preguntas'] as $pregunta): ?>
                            <?php
                            $nombreCampo = 'p_' . $pregunta['id'];
                            $claseAncho = $pregunta['ancho'] === 'medio'
                                ? 'form-public-field--half'
                                : '';
                            ?>

                            <div class="form-public-field <?= $claseAncho ?>">
                                <label class="form-public-field__label">
                                    <?= escaparAtributo($pregunta['enunciado']) ?>

                                    <?php if (!empty($pregunta['obligatorio'])): ?>
                                        <span aria-label="Campo obligatorio">*</span>
                                    <?php endif; ?>
                                </label>

                                <?php if (!empty($pregunta['ayuda'])): ?>
                                    <small><?= escaparAtributo($pregunta['ayuda']) ?></small>
                                <?php endif; ?>

                                <?php if ($pregunta['tipo'] === 'texto'): ?>
                                    <input
                                        type="text"
                                        name="<?= escaparAtributo($nombreCampo) ?>"
                                        <?= !empty($pregunta['obligatorio']) ? 'required' : '' ?>>

                                <?php elseif ($pregunta['tipo'] === 'texto_largo'): ?>
                                    <textarea
                                        name="<?= escaparAtributo($nombreCampo) ?>"
                                        rows="5"
                                        <?= !empty($pregunta['obligatorio']) ? 'required' : '' ?>></textarea>

                                <?php elseif ($pregunta['tipo'] === 'numero'): ?>
                                    <input
                                        type="number"
                                        name="<?= escaparAtributo($nombreCampo) ?>"
                                        <?= !empty($pregunta['obligatorio']) ? 'required' : '' ?>>

                                <?php elseif ($pregunta['tipo'] === 'fecha'): ?>
                                    <input
                                        type="date"
                                        name="<?= escaparAtributo($nombreCampo) ?>"
                                        <?= !empty($pregunta['obligatorio']) ? 'required' : '' ?>>

                                <?php elseif ($pregunta['tipo'] === 'si_no'): ?>
                                    <div class="form-public-options">
                                        <label>
                                            <input
                                                type="radio"
                                                name="<?= escaparAtributo($nombreCampo) ?>"
                                                value="Sí"
                                                <?= !empty($pregunta['obligatorio']) ? 'required' : '' ?>>
                                            Sí
                                        </label>

                                        <label>
                                            <input
                                                type="radio"
                                                name="<?= escaparAtributo($nombreCampo) ?>"
                                                value="No">
                                            No
                                        </label>
                                    </div>

                                <?php elseif ($pregunta['tipo'] === 'desplegable'): ?>
                                    <select
                                        name="<?= escaparAtributo($nombreCampo) ?>"
                                        <?= !empty($pregunta['obligatorio']) ? 'required' : '' ?>>
                                        <option value="">Selecciona una opción</option>

                                        <?php foreach ($pregunta['opciones'] as $opcion): ?>
                                            <option value="<?= escaparAtributo($opcion) ?>">
                                                <?= escaparAtributo($opcion) ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>

                                <?php elseif ($pregunta['tipo'] === 'opcion_multiple'): ?>
                                    <div
                                        class="form-public-options form-public-options--grid"
                                        <?= !empty($pregunta['obligatorio']) ? 'data-required-group="true"' : '' ?>>

                                        <?php foreach ($pregunta['opciones'] as $opcion): ?>
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    name="<?= escaparAtributo($nombreCampo) ?>[]"
                                                    value="<?= escaparAtributo($opcion) ?>">
                                                <?= escaparAtributo($opcion) ?>
                                            </label>
                                        <?php endforeach; ?>
                                    </div>

                                <?php else: ?>
                                    <div class="form-public-options form-public-options--grid">
                                        <?php foreach ($pregunta['opciones'] as $indiceOpcion => $opcion): ?>
                                            <label>
                                                <input
                                                    type="radio"
                                                    name="<?= escaparAtributo($nombreCampo) ?>"
                                                    value="<?= escaparAtributo($opcion) ?>"
                                                    <?= !empty($pregunta['obligatorio']) && $indiceOpcion === 0 ? 'required' : '' ?>>
                                                <?= escaparAtributo($opcion) ?>
                                            </label>
                                        <?php endforeach; ?>
                                    </div>
                                <?php endif; ?>

                                <div class="form-public-field__error" aria-live="polite"></div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </section>
            <?php endforeach; ?>

            <div class="form-public-actions">
                <p>Los campos marcados con <strong>*</strong> son obligatorios.</p>

                <button type="submit" id="btnEnviarFormularioPublico">
                    <span class="form-public-submit-text">
                        <?= escaparAtributo($formulario['texto_boton_online'] ?: 'Enviar respuestas') ?>
                    </span>
                    <i class="bi bi-send"></i>
                </button>
            </div>
        </form>
    </main>

    <footer class="form-public-footer">
        <div class="form-public-shell form-public-footer__inner">
            <span>© <?= date('Y') ?> Diputación de Málaga. Información Territorial.</span>
            <img src="images/logo_diputacion_blanco.png" alt="Diputación Provincial de Málaga">
        </div>
    </footer>

    <script>
        window.formularioPublicoConfig = {
            volverUrl: 'php/municipio/municipio.php?cod_mun=<?= urlencode($codMun) ?>'
        };
    </script>
    <script src="lib/sweetalert2@11.js"></script>
    <script src="js/municipios/formularioPublico.js"></script>
</body>
</html>
