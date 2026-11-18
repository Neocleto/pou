<?php
// ============================================================================
// TEXTOS DE PARTICIPACIÓN DEL MUNICIPIO
// Wizard, configurador y página pública comparten la configuración visual.
// Los botones de participación tienen su propio modelo.
// ============================================================================
require_once __DIR__ . '/ConfiguracionVisualModel.php';

class ParticipacionModel
{
    private $configuracionModel;

    public function __construct($db)
    {
        $this->configuracionModel = new ConfiguracionVisualModel($db);
    }

    public function obtenerParticipacionPorMunicipio($cod_mun)
    {
        $configuracion = $this->configuracionModel->obtenerPorMunicipio($cod_mun);
        $titulo = '';
        foreach ($configuracion['secciones_portal'] as $seccion) {
            if ($seccion['id'] === 'participacion') {
                $titulo = $seccion['titulo'];
                break;
            }
        }
        return [
            'cod_mun' => $cod_mun,
            'titulo1' => $titulo,
            'descripcion1' => $configuracion['contenido_portal']['participacion']['introduccion']
        ];
    }

    public function guardarParticipacion($datos)
    {
        $codMun = $datos['cod_mun'] ?? '';
        $titulo = $datos['titulo1'] ?? '';
        $texto = $datos['descripcion1'] ?? '';
        if (!is_string($codMun) || !preg_match('/^\d{5}$/D', $codMun)
            || !is_string($titulo) || trim(strip_tags($titulo)) === ''
            || mb_strlen($titulo) > 120 || !is_string($texto) || mb_strlen($texto) > 6000) {
            throw new Exception('Revisa el título y el texto de participación (máximo 120 y 6000 caracteres).');
        }

        // Cambiamos únicamente los dos textos; conservamos el diseño y las demás secciones.
        // El modelo de configuración aplica la misma limpieza HTML que el configurador.
        $configuracion = $this->configuracionModel->obtenerPorMunicipio($codMun);
        foreach ($configuracion['secciones_portal'] as &$seccion) {
            if ($seccion['id'] === 'participacion') {
                $seccion['titulo'] = $titulo;
                break;
            }
        }
        unset($seccion);
        $configuracion['contenido_portal']['participacion']['introduccion'] = $texto;
        return $this->configuracionModel->guardar($configuracion);
    }
}
