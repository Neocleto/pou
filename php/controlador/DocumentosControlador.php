<?php
// controlador/DocumentosController.php

require_once(__DIR__ . '/../modelo/MunicipioModel.php');
require_once(__DIR__ . '/../modelo/DocumentosModel.php');
require_once(__DIR__ . '/../modelo/FasesDocumentosModel.php');
require_once(__DIR__ . '/../modelo/ConfiguracionVisualModel.php');

require_once __DIR__ . '/../documentos/catalogo_documentos.php';

class DocumentosController {
    /** @var PDO */
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function mostrarDocumentos(string $cod_mun, bool $esPreview = false, $usuarioId = null, $rol = null, $correoUsuario = ''): array {
        $municipioModel        = new MunicipioModel($this->conn);
        $documentoModel        = new DocumentosModel($this->conn);
        $fasesDocumentosModel  = new FasesDocumentosModel($this->conn);
        $configuracionModel    = new ConfiguracionVisualModel($this->conn);

        // ==========================
        // 0) Municipio y documentos
        // ==========================
        $municipio = $esPreview
            ? $municipioModel->obtenerMunicipioPorCodigo($cod_mun)
            : $municipioModel->obtenerMunicipioActivosPorCodigo($cod_mun);

        if (!$municipio) {
            throw new Exception('Este municipio no está disponible.');
        }

        $documentosRaw = $documentoModel->getDocumentosPorMunicipio($cod_mun);

        // ======================
        // CONTROL DE PREVIEW
        // ======================
        $modoPreview = false;

        if ($esPreview) {
            if (empty($usuarioId)) {
                echo "<div style='text-align:center; padding: 3rem; font-family: sans-serif;'>
                        <h2>No tienes permisos para ver esta previsualización.</h2>
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
                    </div>";
                exit;
            }

            $modoPreview = true;
        }

        // La modal municipal y esta página comparten catálogo y fase activa.
        $catalogo = prepararCatalogoDocumentos(
            $documentosRaw,
            $fasesDocumentosModel->obtenerTodas()
        );
        $faseActual = $catalogo['faseActual'];
        $faseActualNum = $catalogo['faseActualNum'];
        $fasesMenu = $catalogo['fasesMenu'];
        $documentosPorFase = $catalogo['documentosPorFase'];

        // ==========================
        // 5) Devolver a la vista
        // ==========================
        return [
            'municipio'         => $municipio,
            'faseActual'        => $faseActual,        // ahora calculada por docs
            'faseActualNum'     => $faseActualNum,
            'fasesMenu'         => $fasesMenu,
            'documentosPorFase' => $documentosPorFase,
            'estadosFases'      => $catalogo['estadosFases'],
            'configuracionVisual' => $configuracionModel->obtenerPorMunicipio($cod_mun),
            'modoPreview'       => $modoPreview
        ];
    }
}
