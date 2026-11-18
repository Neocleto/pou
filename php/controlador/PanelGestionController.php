<?php
// ================================================
// CONTROLADOR: PanelGestionController.php
// Descripción: Encapsula la lógica del panel de gestión de municipios.
// Gestiona la creación y actualización de municipios y sus componentes.
// ================================================

require_once(__DIR__ . '/../modelo/MunicipioModel.php');
require_once(__DIR__ . '/../modelo/InformacionModel.php');
require_once(__DIR__ . '/../modelo/FasesModel.php');
require_once(__DIR__ . '/../modelo/ParticipacionModel.php');
require_once(__DIR__ . '/../modelo/ParticipacionBotonesModel.php');
require_once(__DIR__ . '/../modelo/FaqModel.php');
require_once(__DIR__ . '/../modelo/DocumentosModel.php');
require_once(__DIR__ . '/../modelo/NoticiasModel.php');
require_once(__DIR__ . '/../modelo/ConfiguracionVisualModel.php');

class PanelGestionController {
    private $conn;
    private $municipioModel;
    private $informacionModel;
    private $fasesModel;
    private $participacionModel;
    private $participacionBotonesModel;
    private $faqModel;
    private $documentosModel;
    private $noticiasModel;

    public function __construct($conn) {
        $this->conn = $conn;
        $this->municipioModel = new MunicipioModel($conn);
        $this->informacionModel = new InformacionModel($conn);
        $this->fasesModel = new FasesModel($conn);
        $this->participacionModel = new ParticipacionModel($conn);
        $this->participacionBotonesModel = new ParticipacionBotonesModel($conn);
        $this->faqModel = new FaqModel($conn);
        $this->documentosModel = new DocumentosModel($conn);
        $this->noticiasModel = new NoticiasModel($conn);
    }

    // ============================
    // OBTENER DATOS PASOS DE BBDD
    // ============================
    /**
     * Devuelve los municipios del usuario con el progreso del asistente.
     */
    public function obtenerMunicipiosUsuario($usuarioId, $correoUsuario = '')
    {
        $municipios = $this->municipioModel->obtenerMunicipiosPorUsuario(
            $usuarioId,
            $correoUsuario
        );

        foreach ($municipios as &$municipio) {
            $municipio['progreso_asistente'] = $this->calcularProgresoAsistente($municipio);
        }
        unset($municipio);

        return $municipios;
    }

    /**
     * Calcula qué pasos del asistente contienen información.
     * No modifica la base de datos; únicamente consulta los datos existentes.
     */
    private function calcularProgresoAsistente(array $municipio)
    {
        $codMun = $municipio['cod_mun'] ?? '';

        $informacion = $this->informacionModel->obtenerInformacionPorMunicipio($codMun);
        $fase = $this->fasesModel->obtenerFaseActualPorMunicipio($codMun);
        $botones = $this->participacionBotonesModel->listarBotonesPorMunicipio($codMun);
        $documentos = $this->documentosModel->getDocumentosPorMunicipio($codMun);
        $noticias = $this->noticiasModel->obtenerNoticiasPorMunicipio($codMun);
        $faqs = $this->faqModel->obtenerFaqsPorMunicipio($codMun);

        $pasos = [
            $this->tieneDatosGenerales($municipio),
            !empty(trim($informacion['titulo'] ?? '')) && !empty(trim($informacion['descripcion'] ?? '')),
            !empty($fase['num_fase'] ?? $fase['num_fase_padre'] ?? null),
            !empty($documentos),
            !empty($botones),
            !empty($noticias),
            !empty($faqs)
        ];

        return [
            'pasos' => $pasos,
            'completados' => count(array_filter($pasos)),
            'total' => count($pasos)
        ];
    }

    /**
     * Comprueba los campos principales del primer paso.
     */
    private function tieneDatosGenerales(array $municipio)
    {
        return !empty(trim($municipio['nombre'] ?? ''))
            && !empty(trim($municipio['correo_contacto'] ?? ''))
            && !empty(trim($municipio['correo_contacto_gestor'] ?? ''))
            && !empty(trim($municipio['politica_privacidad_url'] ?? ''));
    }

    public function obtenerMunicipioActivosPorCodigo($cod_mun) {
        return $this->municipioModel->obtenerMunicipioActivosPorCodigo($cod_mun);
    }

    public function obtenerMunicipioPorCodigo($cod_mun) {
        return $this->municipioModel->obtenerMunicipioPorCodigo($cod_mun);
    }

    public function desactivarMunicipio($cod_mun) {
        return $this->municipioModel->desactivarMunicipio($cod_mun);
    }

    public function obtenerInformacionPorMunicipio($cod_mun) {
        return $this->informacionModel->obtenerInformacionPorMunicipio($cod_mun);
    }

    public function obtenerFaseActualPorMunicipio($cod_mun) {
        return $this->fasesModel->obtenerFaseActualPorMunicipio($cod_mun);
    }

    public function obtenerParticipacionPorMunicipio($cod_mun) {
        return $this->participacionModel->obtenerParticipacionPorMunicipio($cod_mun);
    }

    public function publicarMunicipio($cod_mun) {
        return $this->municipioModel->publicarMunicipio($cod_mun);
    }

    public function validarMunicipioCompleto(string $codMun): array{
        // Instanciar modelos
        $municipioModel     = new MunicipioModel($this->conn);
        $infoModel          = new InformacionModel($this->conn);
        $fasesModel         = new FasesModel($this->conn);
        $botonesModel       = new ParticipacionBotonesModel($this->conn);
        $faqModel           = new FaqModel($this->conn);

        $pasosIncompletos = [];

        // ======================================================
        // PASO 1 - DATOS GENERALES (formMunicipio)
        // ======================================================
        $mun = $municipioModel->obtenerMunicipioPorCodigo($codMun);

        if (
            !$mun ||
            empty(trim($mun['nombre'] ?? '')) ||
            empty(trim($mun['correo_contacto'] ?? '')) ||
            empty(trim($mun['correo_contacto_gestor'] ?? '')) ||
            empty(trim($mun['politica_privacidad_url'] ?? ''))
        ) {
            $pasosIncompletos[] = "Paso 1 - Datos generales del municipio";
        }

        // La fotografía panorámica se exige antes de publicar, no al crear.
        // Una imagen ilustrativa de reserva no cuenta como fotografía municipal.
        if ($mun && trim((string)($mun['imagen_cabecera'] ?? '')) === '') {
            $pasosIncompletos[] = "Paso 1 - Debes subir una fotografía panorámica desde el configurador de la cabecera";
        }

        // ======================================================
        // PASO 2 - INFORMACIÓN (formInformacion)
        // ======================================================
        $info = $infoModel->obtenerInformacionPorMunicipio($codMun);

        if (
            !$info ||
            empty(trim($info['titulo'] ?? '')) ||
            empty(trim($info['descripcion'] ?? ''))
        ) {
            $pasosIncompletos[] = "Paso 2 - Información general";
        }

        // ======================================================
        // PASO 3 - FASE ACTUAL (formFaseActual)
        // ======================================================
        $fase = $fasesModel->obtenerFaseActualPorMunicipio($codMun);

        // Dejamos ambas posibilidades para evitar errores si cambias SQL.
        $numFase = $fase['num_fase'] ?? ($fase['num_fase_padre'] ?? null);

        if (
            !$fase ||
            empty($numFase) ||
            empty($fase['subfase_id']) ||
            empty(trim($fase['fecha_inicio'] ?? '')) ||
            empty(trim($fase['estado_tramitacion'] ?? ''))
        ) {
            $pasosIncompletos[] = "Paso 3 - Fase actual del POU";
        }

        // ======================================================
        // PASO 5 - PARTICIPACIÓN (formParticipacion + botones)
        // ======================================================
        $botones = $botonesModel->listarBotonesPorMunicipio($codMun);

        if (empty($botones) || count($botones) === 0) {
            $pasosIncompletos[] = "Paso 5 - Debe existir al menos un botón de participación";
        }

        // ======================================================
        // PASO 7 - FAQs (obligatorias)
        // ======================================================
        $faqs = $faqModel->obtenerFaqsPorMunicipio($codMun);

        if (!$faqs || count($faqs) === 0) {
            $pasosIncompletos[] = "Paso 7 - Debe añadir al menos una pregunta frecuente (FAQ)";
        } else {
            // Por seguridad, comprobamos que tengan texto
            $faqConHuecos = false;
            foreach ($faqs as $faq) {
                if (
                    empty(trim($faq['pregunta'] ?? '')) ||
                    empty(trim($faq['respuesta'] ?? ''))
                ) {
                    $faqConHuecos = true;
                    break;
                }
            }
            if ($faqConHuecos) {
                $pasosIncompletos[] = "Paso 7 - Hay FAQs sin pregunta o sin respuesta";
            }
        }

        return [
            'completo'         => empty($pasosIncompletos),
            'pasosIncompletos' => $pasosIncompletos
        ];
    }

    // =====================
    // CREAR NUEVO MUNICIPIO
    // =====================
    public function crearMunicipioCompleto($datos, $modoPlantilla = null) {
        $this->conn->beginTransaction();

        try {
            // Paso 1: preparar las rutas de imagen.
            // Si el usuario ya ha subido una imagen, conservamos esa ruta.
            $cod_mun = $datos['paso1']['cod_mun'] ?? null;

            if (empty($datos['paso1']['imagen_cabecera'])) {
                $datos['paso1']['imagen_cabecera'] = "images/municipios/{$cod_mun}/{$cod_mun}_banner.jpg";
            }

            if (empty($datos['paso1']['url_escudo'])) {
                $datos['paso1']['url_escudo'] = "images/municipios/{$cod_mun}/{$cod_mun}_escudo.jpg";
            }

            // Primero vemos si ya existe
            if ($this->municipioModel->existeMunicipio($cod_mun)) {
                throw new Exception("Ya existe un municipio con este código.");
            }

            // Crear el municipio
            $this->municipioModel->crearMunicipio($datos['paso1']);

            // Paso 2: Información
            if (!empty($datos['paso2'])) {
                $datos['paso2']['cod_mun'] = $cod_mun; // Asegurar cod_mun
                $this->informacionModel->crearInformacion($datos['paso2']);
            }

            // Paso 3: Fases
            if (!empty($datos['paso3'])) {
                // Asegurar cod_mun también aquí
                $datos['paso3']['cod_mun'] = $cod_mun;

                $num_fase = isset($datos['paso3']['num_fase']) ? intval($datos['paso3']['num_fase']) : null; // fase padre
                $subfase_id = isset($datos['paso3']['subfase_id']) ? intval($datos['paso3']['subfase_id']) : null; // fase hija
                $fecha_inicio = $datos['paso3']['fecha_inicio'] ?? null;
                $estado_tramitacion = $datos['paso3']['estado_tramitacion'] ?? null;

                if ($cod_mun && $num_fase && $subfase_id && $fecha_inicio) {

                    // Validar coherencia subfase->padre antes de guardar
                    $ok = $this->fasesModel->validarSubfasePerteneceAFase($subfase_id, $num_fase);
                    if (!$ok) {
                        throw new Exception("La subfase seleccionada no pertenece a la fase principal.");
                    }

                    $this->fasesModel->crearOActualizarFaseActual(
                        $cod_mun,
                        $num_fase,
                        $subfase_id,
                        $fecha_inicio,
                        $estado_tramitacion
                    );
                } else {
                    error_log("Paso 3 incompleto: faltan datos requeridos para fase actual (num_fase/subfase_id/fecha_inicio).");
                }
            }

            // Paso 4: Documentación se gestiona al subir el documento no se controla con el Guardar General.

            // Paso 5: Participación
            if (!empty($datos['paso5'])) {
                $datos['paso5']['cod_mun'] = $cod_mun;
                $this->participacionModel->guardarParticipacion($datos['paso5']);
            }

            // Paso 5.1: Participación Botones al tener subida de documentos se gestiona desde acciones_participacion y participacionWizard.js

            // Paso 6: Se gestiona desde accione_noticias y noticiasWizard.js (No se guardan con el boton GUARDAR generico sino con el suyo propio)

            // Paso 7: preguntas frecuentes del municipio.
            if (!empty($datos['paso7']) && isset($datos['paso7']['faqs'])) {
                $this->faqModel->guardarPreguntasDelWizard(
                    $cod_mun,
                    is_array($datos['paso7']['faqs']) ? $datos['paso7']['faqs'] : []
                );
            }

            // Los datos y la plantilla se confirman juntos. Un fallo revierte todo.
            if ($modoPlantilla !== null) {
                $configuracionModel = new ConfiguracionVisualModel($this->conn);
                $configuracionModel->aplicarPlantillaInicial($cod_mun, $modoPlantilla, $datos['paso5'] ?? []);
            }

            $this->conn->commit();
            return true;

        } catch (Throwable $e) {
            $this->conn->rollBack();
            error_log("Error al crear municipio completo: " . $e->getMessage());
            return $e->getMessage(); // Devuelve el mensaje de error para el frontend
        }
    }

    // =====================
    // EDITAR MUNICIPIO (solo pasos modificados)
    // =====================
    public function editarMunicipio($pasosModificados, $datos, $cod_mun, $modoPlantilla = null) {
        $this->conn->beginTransaction();

        try {
            // El código validado llega desde la acción, sin leer variables del request.
            if (!$cod_mun) {
                throw new Exception("No se pudo determinar el código del municipio para editar.");
            }

            // Paso 1: actualizar municipio si fue modificado
            if (in_array(1, $pasosModificados)) {
                $this->municipioModel->actualizarMunicipio($cod_mun, $datos['paso1']);
            }

            // Paso 2: actualizar información general si fue modificada
            if (in_array(2, $pasosModificados)) {
                $this->informacionModel->actualizarInformacion($cod_mun, $datos['paso2']);
            }

            // Paso 3: actualizar fase actual si fue modificada
            if (in_array(3, $pasosModificados)) {
                $num_fase_actual = isset($datos['paso3']['num_fase']) ? intval($datos['paso3']['num_fase']) : null; // padre
                $subfase_id = isset($datos['paso3']['subfase_id']) ? intval($datos['paso3']['subfase_id']) : null; // hija
                $fecha_inicio = $datos['paso3']['fecha_inicio'] ?? null;
                $estado_tramitacion = $datos['paso3']['estado_tramitacion'] ?? null;

                if (!$num_fase_actual || !$subfase_id || !$fecha_inicio) {
                    throw new Exception("Paso 3 incompleto: faltan num_fase, subfase_id o fecha_inicio.");
                }

                $ok = $this->fasesModel->validarSubfasePerteneceAFase($subfase_id, $num_fase_actual);
                if (!$ok) {
                    throw new Exception("La subfase seleccionada no pertenece a la fase principal.");
                }

                $this->fasesModel->crearOActualizarFaseActual(
                    $cod_mun,
                    $num_fase_actual,
                    $subfase_id,
                    $fecha_inicio,
                    $estado_tramitacion
                );
            }

            // Paso 5: actualizar participación si fue modificada
            if (in_array(5, $pasosModificados)) {
                $datos['paso5']['cod_mun'] = $cod_mun;
                $this->participacionModel->guardarParticipacion($datos['paso5']);
            }

            // Paso 4 (Documentos), Paso 5.1 (Botones), Paso 6 (Noticias) no se gestionan con el GUARDAR generico

            // Paso 7: actualizamos asignaciones y textos propios del municipio.
            if (in_array(7, $pasosModificados) && isset($datos['paso7']['faqs'])) {
                $this->faqModel->guardarPreguntasDelWizard(
                    $cod_mun,
                    is_array($datos['paso7']['faqs']) ? $datos['paso7']['faqs'] : []
                );
            }

            // Los datos y la plantilla se confirman juntos. Un fallo revierte todo.
            if ($modoPlantilla !== null) {
                $configuracionModel = new ConfiguracionVisualModel($this->conn);
                $configuracionModel->aplicarPlantillaInicial($cod_mun, $modoPlantilla, $datos['paso5'] ?? []);
            }

            $this->conn->commit();
            return true;

        } catch (Throwable $e) {
            $this->conn->rollBack();
            error_log("Error al editar municipio: " . $e->getMessage());
            return false;
        }
    }

    // =====================
    // ELIMINAR MUNICIPIO (baja lógica)
    // =====================
    public function eliminarMunicipio($cod_mun) {
        return $this->municipioModel->eliminarMunicipio($cod_mun);
    }
}
