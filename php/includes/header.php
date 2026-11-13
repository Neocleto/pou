<?php
// Iniciar sesión si aún no está activa
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Comprobar si la sesión ha expirado
if (isset($_SESSION["expira_en"]) && time() > $_SESSION["expira_en"]) {
    session_unset();                 // Limpiar variables de sesión
    session_destroy();              // Destruir la sesión
    header("Location: ../login/logout.php"); // Redirigir a logout
    exit;
}

// Valores por defecto si no vienen definidos desde la página
$isHomePage = $isHomePage ?? false;
$ocultarHeaderTop  = $ocultarHeaderTop  ?? false;
?>

<!-- ===========================================
     1. FRANJA SUPERIOR BLANCA (solo en index)
     =========================================== -->
<?php if ($isHomePage): ?>
    <div class="franja-blanca"></div>
<?php endif; ?>


<!-- ========================================================
     2. CABECERA BURDEOS CON BOTÓN DE USUARIO O DE LOGIN
     ======================================================== -->
<?php if (!$ocultarHeaderTop): ?>
<div class="header-top px-4 d-flex justify-content-end align-items-center position-relative">

    <?php if ($isHomePage): ?>
        <?php if (isset($_SESSION["usuario_id"])): ?>
            <!-- ==============
                 MENÚ DE USUARIO
                 ============== -->
            <div class="dropdown">

                <!-- Botón con nombre e icono -->
                <button class="btn btn-user-dropdown transition-scale d-flex align-items-center gap-2"
                    type="button"
                    id="menuUsuario"
                    data-bs-toggle="dropdown"
                    aria-expanded="false">

                    <!-- Icono persona -->
                    <i class="bi bi-person-circle fs-5 text-white"></i>

                    <!-- Nombre del usuario -->
                    <span class="fw-bold text-white text-uppercase">
                        <?= htmlspecialchars($_SESSION["usuario_nombre"] ?? '') ?>
                    </span>
                </button>

                <!-- ============
                     DESPLEGABLE
                     ============ -->
                <ul class="dropdown-menu dropdown-menu-end shadow-sm rounded-3 mt-1 p-2"
                    aria-labelledby="menuUsuario"
                    style="min-width: 240px;">

                    <!-- Email del usuario (solo visual, no clicable) -->
                    <li class="dropdown-item correo-item d-flex align-items-center gap-2 border-bottom">
                        <i class="bi bi-envelope"></i>
                        <span class="fw-semibold text-primary-emphasis">
                            <?= htmlspecialchars($_SESSION["usuario_correo"] ?? '') ?>
                        </span>
                    </li>

                    <!-- Acceso al panel de gestión -->
                    <li>
                        <a class="dropdown-item d-flex align-items-center gap-2 py-2"
                            href="php/gestion/panel_gestion.php">
                            <i class="bi bi-speedometer2"></i> Panel de gestión
                        </a>
                    </li>

                    <!-- Separador -->
                    <li>
                        <hr class="dropdown-divider my-1">
                    </li>

                    <!-- Mi POU-->
                    <li>
                        <a class="dropdown-item d-flex align-items-center gap-2 py-2"
                            href="index.php">
                            <i class="bi bi-building-fill-check"></i> POU
                        </a>
                    </li>

                    <!-- Separador -->
                    <li>
                        <hr class="dropdown-divider my-1">
                    </li>

                    <!-- Botón de logout -->
                    <li>
                        <a class="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                            href="php/login/logout.php">
                            <i class="bi bi-box-arrow-right text-danger"></i> Desconectar
                        </a>
                    </li>
                </ul>
            </div>

        <?php else: ?>
            <!-- =============
                 BOTÓN DE LOGIN
                 ============= -->
            <a href="#" onclick="abrirModalLogin()" class="login-icon" title="Acceso usuarios">
                <img src="images/candado_blanco.png" alt="Login" class="img-fluid">
            </a>
        <?php endif; ?>
    <?php endif; ?>

</div>
<?php endif; ?>


<!-- ==========================
     3. CABECERA PRINCIPAL LOGO
     ========================== -->
<header class="header-main">
    <div class="container-fluid px-3 px-md-5">
        <div class="text-center text-md-start">
            <a href="https://idemap.es/" target="_blank" rel="noopener noreferrer" class="header-link" title="Ir a IDEMAP">
                <img src="images/header.png" alt="Cabecera IDEMAP + Diputación" class="img-fluid header-full-img">
            </a>
        </div>
    </div>
</header>
