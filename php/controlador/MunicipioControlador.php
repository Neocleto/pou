<?php
require_once(__DIR__ . '/../modelo/MunicipioModel.php');
require_once(__DIR__ . '/../modelo/InformacionModel.php');
require_once(__DIR__ . '/../modelo/FasesModel.php');
require_once(__DIR__ . '/../modelo/ParticipacionModel.php');
require_once(__DIR__ . '/../modelo/ParticipacionBotonesModel.php');
require_once(__DIR__ . '/../modelo/NoticiasModel.php');
require_once(__DIR__ . '/../modelo/FaqModel.php');
require_once(__DIR__ . '/../modelo/ConfiguracionVisualModel.php');
require_once(__DIR__ . '/../modelo/FormularioDinamicoModel.php');

require_once __DIR__ . '/../modelo/DocumentosModel.php';
require_once __DIR__ . '/../modelo/FasesDocumentosModel.php';
require_once __DIR__ . '/../documentos/catalogo_documentos.php';

// MunicipioController.php

class MunicipioController {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Muestra un municipio en modo público o preview.
     *
     * @param string      $cod_mun
     * @param bool        $esPreview    true si se accede como previsualización
     * @param int|null    $usuarioId    id del usuario logueado (si lo hay)
     * @param string|null $rol          rol del usuario (ej: 'admin')
     */
    public function mostrarMunicipio(
        $cod_mun,
        $esPreview = false,
        $usuarioId = null,
        $rol = null,
        $correoUsuario = ''
    ) {
        $municipioModel      = new MunicipioModel($this->conn);
        $informacionModel    = new InformacionModel($this->conn);
        $faseActualModel     = new FasesModel($this->conn);
        $participacionModel  = new ParticipacionModel($this->conn);
        $botonesModel        = new ParticipacionBotonesModel($this->conn);
        $noticiasModel       = new NoticiasModel($this->conn);
        $faqModel            = new FaqModel($this->conn);
        $configModel         = new ConfiguracionVisualModel($this->conn);
        $formularioModel     = new FormularioDinamicoModel($this->conn);

        // ======================
        // 1) OBTENER MUNICIPIO
        // ======================
        if ($esPreview) {
            // En preview NO filtramos por activo/baja
            $municipio = $municipioModel->obtenerMunicipioPorCodigo($cod_mun);
        } else {
            // Modo público normal: sólo activos
            $municipio = $municipioModel->obtenerMunicipioActivosPorCodigo($cod_mun);
        }

        if (!$municipio) {
            echo "<div style='text-align:center; padding: 3rem; font-family: sans-serif;'>
                    <h2>Este municipio no está disponible.</h2>
                    <p>Puedes volver a la <a href='index.php'>página principal</a>.</p>
                  </div>";
            exit;
        }

        // ======================
        // 2) CONTROL DE ACCESO EN PREVIEW
        // ======================
        $modoPreview = false;

        if ($esPreview) {
            // Solo previsualiza si está logueado
            if (empty($usuarioId)) {
                echo "<div style='text-align:center; padding: 3rem; font-family: sans-serif;'>
                        <h2>No tienes permisos para ver esta previsualización.</h2>
                        <p>Inicia sesión de nuevo y accede desde el <a href='php/gestion/panel_gestion.php'>panel de gestión</a>.</p>
                      </div>";
                exit;
            }

            $puedeGestionar = $municipioModel->usuarioPuedeGestionarMunicipio(
                $cod_mun,
                $usuarioId,
                $correoUsuario
            );
            $esAdmin = ($rol === 'admin');

            if (!$puedeGestionar && !$esAdmin) {
                echo "<div style='text-align:center; padding: 3rem; font-family: sans-serif;'>
                        <h2>No tienes permisos para previsualizar este POU.</h2>
                        <p>Si crees que es un error, contacta con el equipo de Desarrollo GIS.</p>
                      </div>";
                exit;
            }

            $modoPreview = true;
        }

        // ======================
        // 3) CARGA DEL RESTO DE DATOS
        // ======================
        return [
            'documentosPublicos'   => prepararCatalogoDocumentos(
                (new DocumentosModel($this->conn))->getDocumentosPorMunicipio($cod_mun),
                (new FasesDocumentosModel($this->conn))->obtenerTodas()
            ),
            'municipio'            => $municipio,
            'informacion'          => $informacionModel->obtenerInformacionPorMunicipio($cod_mun),
            'faseActual'           => $faseActualModel->obtenerFaseActualPorMunicipio($cod_mun),
            'participacion'        => $participacionModel->obtenerParticipacionPorMunicipio($cod_mun),
            'botonesParticipacion' => $botonesModel->listarBotonesPorMunicipio($cod_mun),
            'noticias'             => $noticiasModel->obtenerNoticiasPorMunicipio($cod_mun),
            'faqs'                 => $faqModel->obtenerFaqsPorMunicipio($cod_mun),
            'configuracionVisual'   => $this->obtenerConfiguracionSegura($configModel, $cod_mun),
            'accesosPublicos'       => $this->obtenerAccesosSeguros(
                $configModel,
                $cod_mun,
                $esPreview
            ),
            'formulariosPublicos'   => $this->obtenerFormulariosSeguros($formularioModel, $cod_mun),
            'modoPreview'          => $modoPreview,
        ];
    }

    /**
     * Obtiene la configuración visual sin bloquear el portal cuando
     * las nuevas tablas todavía no se han instalado en el entorno.
     */
    private function obtenerConfiguracionSegura($model, $codMun)
    {
        try {
            return $model->obtenerPorMunicipio($codMun);
        } catch (Exception $error) {
            return obtenerConfiguracionInicialPortal($codMun);
        }
    }

    /**
     * Obtiene los accesos configurados o una lista vacía.
     */
    private function obtenerAccesosSeguros($model, $codMun, $esPreview = false)
    {
        try {
            // La página pública recibe solamente los accesos visibles.
            // El editor necesita la lista completa para poder volver a mostrar
            // un acceso oculto sin perder su configuración.
            return $model->obtenerAccesos($codMun, !$esPreview);
        } catch (Exception $error) {
            return obtenerAccesosInicialesPortal();
        }
    }

    /**
     * Obtiene los formularios publicados o una lista vacía.
     */
    private function obtenerFormulariosSeguros($model, $codMun)
    {
        try {
            return $model->listarPorMunicipio($codMun, true);
        } catch (Exception $error) {
            return [];
        }
    }
}
