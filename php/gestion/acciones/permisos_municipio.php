<?php
// Comprobación compartida de permisos para las acciones del panel.
require_once __DIR__ . '/../../modelo/MunicipioModel.php';

function comprobarPermisoMunicipio($municipioModel, $codMun, $usuarioId, $correoUsuario = '')
{
    if (!preg_match('/^\d{5}$/', (string)$codMun)) {
        throw new Exception('El código de municipio no es válido.');
    }

    if (!$municipioModel->usuarioPuedeGestionarMunicipio($codMun, $usuarioId, $correoUsuario)) {
        http_response_code(403);
        throw new Exception('No tienes permiso para gestionar este municipio.');
    }
}
