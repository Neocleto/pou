<?php
// ============================================================================
// FORMULARIO PÚBLICO DE PARTICIPACIÓN
// Muestra un formulario creado desde el paso Participación del wizard.
// ============================================================================

require_once(__DIR__ . '/../db/conexion.php');
require_once(__DIR__ . '/../modelo/FormularioDinamicoModel.php');
require_once(__DIR__ . '/../modelo/MunicipioModel.php');
require_once(__DIR__ . '/../includes/participacion_portal.php');

$codMun = $_GET['cod_mun'] ?? '';
$slug = $_GET['slug'] ?? '';
if (!is_string($codMun) || !preg_match('/^\d{5}$/D', $codMun) || !is_string($slug)) {
    http_response_code(404);
    exit('El formulario no está disponible.');
}

$formularioModel = new FormularioDinamicoModel($conn);
$municipioModel = new MunicipioModel($conn);

// Una vista de prueba necesita sesión y acceso a este municipio, como el configurador.
$esPreview = ($_GET['preview'] ?? '') === '1';
if ($esPreview) {
    exigirAccesoProyecto(false, false);
    if (!$municipioModel->usuarioPuedeGestionarMunicipio(
        $codMun, $_SESSION['usuario_id'] ?? null, $_SESSION['usuario_correo'] ?? ''
    )) {
        http_response_code(403);
        exit('No tienes acceso a la vista previa de este municipio.');
    }
}

$municipio = $esPreview
    ? $municipioModel->obtenerMunicipioPorCodigo($codMun)
    : $municipioModel->obtenerMunicipioActivosPorCodigo($codMun);
$formulario = $formularioModel->obtenerPorSlug($codMun, $slug, !$esPreview);

// La encuesta pública requiere municipio publicado y formulario activo con modalidad online.
if (
    !$formulario
    || !$municipio
    || !in_array($formulario['modalidad'], ['online', 'ambos'], true)
) {
    http_response_code(404);
    exit('El formulario no está disponible.');
}

$urlPdf = resolverArchivoParticipacion($formulario['pdf_url'] ?? '', $codMun);
$urlVolver = 'php/municipio/municipio.php?cod_mun=' . urlencode($codMun);
if ($esPreview) {
    $urlVolver .= '&preview=1';
}

// Protege los textos de la encuesta al mostrarlos en HTML.
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
    <link rel="stylesheet" href="css/formulario-publico.css?v=<?= filemtime(__DIR__ . '/../../css/formulario-publico.css') ?>">
    <link rel="stylesheet" href="css/formulario-cabecera.css?v=<?= filemtime(__DIR__ . '/../../css/formulario-cabecera.css') ?>">
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
        <div class="form-public-header__inner">
            <div class="encuesta-marca__municipio">
                <img class="encuesta-marca__escudo" src="<?= escaparAtributo($municipio['escudo']) ?>" alt="">
                <strong>POU - <?= escaparAtributo($municipio['nombre']) ?></strong>
            </div>

            <a
                href="<?= escaparAtributo($urlVolver) ?>"
                class="form-public-back">
                <i class="bi bi-arrow-left"></i>
                Volver al POU
            </a>

            <img class="encuesta-marca__diputacion" src="images/logo_diputacion_azul.png" alt="Diputación Provincial de Málaga">
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

            <?php if ($formulario['modalidad'] === 'ambos' && $urlPdf !== ''): ?>
                <a
                    href="<?= escaparAtributo($urlPdf) ?>"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="form-public-pdf">
                    <i class="bi bi-file-earmark-pdf"></i>
                    <?= escaparAtributo($formulario['texto_boton_pdf'] ?: 'Descargar PDF') ?>
                </a>
            <?php endif; ?>
        </section>

        <?php if ($esPreview): ?>
            <p class="alert alert-info mt-3">Vista previa de gestión. Puedes rellenar y probar el formulario sin registrar respuestas.</p>
        <?php endif; ?>

        <!-- Formulario generado dinámicamente. En vista previa el POST tampoco apunta al registro real. -->
        <form
            id="formularioDinamicoPublico"
            <?php if ($esPreview): ?>
                action="<?= escaparAtributo(urlEncuestaMunicipal($codMun, $slug, true)) ?>" data-preview="1"
            <?php else: ?>
                action="php/municipio/guardar_respuesta_formulario.php"
            <?php endif; ?>
            method="post"
            class="form-public-form"
            novalidate>

            <input type="hidden" name="formulario_id" value="<?= (int)$formulario['id'] ?>">
            <input type="hidden" name="version_formulario" value="<?= escaparAtributo($formulario['actualizado_en'] ?? '') ?>">
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
                            $idEtiqueta = 'etiqueta_' . $nombreCampo;
                            $claseAncho = $pregunta['ancho'] === 'medio'
                                ? 'form-public-field--half'
                                : '';
                            ?>

                            <div class="form-public-field <?= $claseAncho ?>">
                                <div id="<?= escaparAtributo($idEtiqueta) ?>" class="form-public-field__label">
                                    <?= escaparAtributo($pregunta['enunciado']) ?>

                                    <?php if (!empty($pregunta['obligatorio'])): ?>
                                        <span aria-label="Campo obligatorio">*</span>
                                    <?php endif; ?>
                                </div>

                                <?php if (!empty($pregunta['ayuda'])): ?>
                                    <small><?= escaparAtributo($pregunta['ayuda']) ?></small>
                                <?php endif; ?>

                                <?php if ($pregunta['tipo'] === 'texto'): ?>
                                    <input
                                        type="text"
                                        aria-labelledby="<?= escaparAtributo($idEtiqueta) ?>" name="<?= escaparAtributo($nombreCampo) ?>"
                                        <?= !empty($pregunta['obligatorio']) ? 'required' : '' ?>>

                                <?php elseif ($pregunta['tipo'] === 'texto_largo'): ?>
                                    <textarea
                                        aria-labelledby="<?= escaparAtributo($idEtiqueta) ?>" name="<?= escaparAtributo($nombreCampo) ?>"
                                        rows="5"
                                        <?= !empty($pregunta['obligatorio']) ? 'required' : '' ?>></textarea>

                                <?php elseif ($pregunta['tipo'] === 'numero'): ?>
                                    <input
                                        type="number" step="any"
                                        aria-labelledby="<?= escaparAtributo($idEtiqueta) ?>" name="<?= escaparAtributo($nombreCampo) ?>"
                                        <?= !empty($pregunta['obligatorio']) ? 'required' : '' ?>>

                                <?php elseif ($pregunta['tipo'] === 'fecha'): ?>
                                    <input
                                        type="date"
                                        aria-labelledby="<?= escaparAtributo($idEtiqueta) ?>" name="<?= escaparAtributo($nombreCampo) ?>"
                                        <?= !empty($pregunta['obligatorio']) ? 'required' : '' ?>>

                                <?php elseif ($pregunta['tipo'] === 'si_no'): ?>
                                    <div class="form-public-options" role="group" aria-labelledby="<?= escaparAtributo($idEtiqueta) ?>">
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
                                        aria-labelledby="<?= escaparAtributo($idEtiqueta) ?>" name="<?= escaparAtributo($nombreCampo) ?>"
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
                                        class="form-public-options form-public-options--grid" role="group" aria-labelledby="<?= escaparAtributo($idEtiqueta) ?>"
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
                                    <div class="form-public-options form-public-options--grid" role="group" aria-labelledby="<?= escaparAtributo($idEtiqueta) ?>">
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

                                <div class="form-public-field__error" data-error-grupo aria-live="polite"></div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </section>
            <?php endforeach; ?>

            <div class="form-public-actions">
                <p>Los campos marcados con <strong>*</strong> son obligatorios.</p>

                <button type="submit" id="btnEnviarFormularioPublico">
                    <span class="form-public-submit-text">
                        <?= $esPreview ? 'Probar envío' : 'Enviar respuestas' ?>
                    </span>
                    <i class="bi bi-send"></i>
                </button>
            </div>
            <?php if ($esPreview): ?>
                <p class="alert alert-success mt-3" id="resultadoPruebaEncuesta" role="status" hidden></p>
            <?php endif; ?>
        </form>

        <!-- El resultado permanece visible para que la persona pueda guardar el PDF. -->
        <section class="form-public-confirmation" id="confirmacionEncuesta" tabindex="-1"
                 aria-labelledby="tituloConfirmacionEncuesta" hidden>
            <i class="bi bi-check-circle form-public-confirmation__icon" aria-hidden="true"></i>
            <h2 id="tituloConfirmacionEncuesta">Gracias por participar</h2>
            <p id="mensajeConfirmacionEncuesta"></p>
            <p>Referencia <strong id="referenciaEncuesta"></strong></p>
            <p class="alert alert-warning" id="avisoCorreoEncuesta" hidden></p>
            <div class="form-public-confirmation__actions">
                <a class="btn btn-primary" id="descargarJustificanteEncuesta" download>
                    <i class="bi bi-download me-1" aria-hidden="true"></i> Descargar copia en PDF
                </a>
                <a class="form-public-back" href="<?= escaparAtributo($urlVolver) ?>">
                    Volver al portal municipal
                </a>
            </div>
        </section>
    </main>

    <footer class="form-public-footer">
        <div class="form-public-shell form-public-footer__inner">
            <span>© <?= date('Y') ?> Diputación de Málaga. Información Territorial.</span>
            <img src="images/logo_diputacion_blanco.png" alt="Diputación Provincial de Málaga">
        </div>
    </footer>

    <script src="lib/sweetalert2@11.js"></script>
    <script src="js/municipios/formularioPublico.js?v=<?= filemtime(__DIR__ . '/../../js/municipios/formularioPublico.js') ?>"></script>
</body>
</html>
