<?php
// ============================================================================
// CABECERA COMÚN DEL ACCESO Y DEL PANEL DE GESTIÓN
// ============================================================================
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$usuarioAutenticado = !empty($_SESSION['usuario_id']);
$nombreUsuario = trim($_SESSION['usuario_nombre'] ?? '');
$correoUsuario = trim($_SESSION['usuario_correo'] ?? '');
?>

<header class="access-topbar">
    <div class="access-shell access-topbar__inner">
        <a href="https://idemap.es/" target="_blank" rel="noopener noreferrer">
            <img src="images/logo_idemap.png" alt="IDEMAP GEOportal" class="access-logo--idemap">
        </a>

        <div class="access-topbar__right">
            <img src="images/logo_diputacion_azul.png" alt="Diputación Provincial de Málaga" class="access-logo--dip">

            <?php if ($usuarioAutenticado): ?>
                <div class="dropdown access-session-menu">
                    <button
                        class="access-user-menu"
                        type="button"
                        id="menuUsuarioAcceso"
                        data-bs-toggle="dropdown"
                        aria-expanded="false">
                        <span class="access-user-avatar"><i class="bi bi-person"></i></span>
                        <span class="access-user-name"><?= htmlspecialchars($nombreUsuario ?: 'Usuario POU') ?></span>
                        <i class="bi bi-chevron-down small"></i>
                    </button>

                    <ul class="dropdown-menu dropdown-menu-end access-user-dropdown" aria-labelledby="menuUsuarioAcceso">
                        <?php if ($correoUsuario !== ''): ?>
                            <li><span class="dropdown-item-text small text-muted"><?= htmlspecialchars($correoUsuario) ?></span></li>
                            <li><hr class="dropdown-divider"></li>
                        <?php endif; ?>
                        <li>
                            <a class="dropdown-item" href="php/gestion/panel_gestion.php">
                                <i class="bi bi-grid me-2"></i>Panel de gestión
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="index.php">
                                <i class="bi bi-house-door me-2"></i>Página de acceso
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item text-danger" href="php/login/logout.php">
                                <i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión
                            </a>
                        </li>
                    </ul>
                </div>
            <?php endif; ?>
        </div>
    </div>
</header>
