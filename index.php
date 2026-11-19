<?php
// Iniciamos la sesion antes de enviar HTML para evitar errores de cabeceras en PHP 8.3.
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>POU - Plan de Ordenación Urbana</title>

    <link rel="icon" href="images/favicon.ico" type="image/x-icon">
    <link href="lib/bootstrap/css/bootstrap@5.3.0.min.css" rel="stylesheet">
    <link href="lib/bootstrap/css/bootstrap-icons.css" rel="stylesheet">
    <link rel="stylesheet" href="css/login.css">
    <link rel="stylesheet" href="css/acceso-moderno.css?v=pou-v13-20261113-<?= (int)@filemtime(__DIR__ . '/css/acceso-moderno.css') ?>">
    <link rel="stylesheet" href="css/tema-pou.css">
</head>
<body class="pou-access-page">
    <?php include __DIR__ . '/php/includes/access_header.php'; ?>

    <main>
        <!-- Presentación de la plataforma. -->
        <section class="access-hero-modern">
            <div class="access-hero-modern__visual" aria-hidden="true">
                <img src="images/diseno/portada_pou_exacta.png" alt="" fetchpriority="high">
            </div>
            <div class="access-shell access-hero-modern__inner">
                <div class="access-hero-modern__copy">
                    <span class="access-hero-modern__eyebrow">Planes de Ordenación Urbana</span>
                    <h1>POU</h1>
                    <h2>Información urbanística clara, pública y accesible para cada municipio.</h2>
                    <p>
                        Consulta los portales POU publicados o entra en el área de gestión
                        para preparar, revisar y publicar la información de los municipios asignados.
                    </p>

                    <div class="access-hero-modern__buttons">
                        <button
                            type="button"
                            id="btnExplorarMunicipios"
                            class="btn-access btn-access--primary"
                            title="Ir al listado de municipios publicados">
                            <i class="bi bi-compass"></i>
                            Explorar municipios <i class="bi bi-arrow-right" aria-hidden="true"></i>
                        </button>

                        <?php if ($usuarioAutenticado): ?>
                            <a href="php/gestion/panel_gestion.php" class="btn-access btn-access--secondary">
                                <i class="bi bi-grid"></i>
                                Ir al panel de gestión
                            </a>
                        <?php else: ?>
                            <button type="button" class="btn-access btn-access--secondary" onclick="abrirModalLogin()">
                                <i class="bi bi-lock"></i>
                                Acceso de gestión
                            </button>
                        <?php endif; ?>
                    </div>
                </div>


            </div>
        </section>

        <!-- Municipios publicados. -->
        <section class="access-municipalities" id="municipios">
            <div class="access-shell">
                <div class="access-section-heading">
                    <div>
                        <span>Portales publicados</span>
                        <h2>Consulta el POU de tu municipio</h2>
                    </div>
                    <p>Busca por nombre o utiliza el filtro alfabético.</p>
                </div>

                <div class="access-toolbar-modern">
                    <div class="access-search-wrap">
                        <i class="bi bi-search"></i>
                        <input
                            type="search"
                            id="buscadorMunicipios"
                            class="access-search"
                            placeholder="Buscar municipio..."
                            autocomplete="off">
                    </div>

                    <div class="access-filter-wrap">
                        <i class="bi bi-funnel"></i>
                        <select id="filtroMunicipios" class="access-filter" aria-label="Filtrar municipios">
                            <option value="todos">Todos los municipios publicados</option>
                            <option value="a_m">Municipios de la A a la M</option>
                            <option value="n_z">Municipios de la N a la Z</option>
                            <option value="z_a">Ordenar de la Z a la A</option>
                        </select>
                    </div>
                </div>

                <!-- El contenido se carga mediante AJAX. -->
                <div id="cargandoMunicipios" class="access-loading">
                    <div class="access-loading__content">
                        <div class="spinner-border text-primary" role="status"></div>
                        <p class="mt-2 mb-0">Cargando municipios...</p>
                    </div>
                </div>

                <div id="contenedorMunicipios" class="access-municipality-grid d-none"></div>

                <div id="imagenSinMunicipios" class="access-empty d-none">
                    <i class="bi bi-buildings"></i>
                    <h3>No hay municipios publicados</h3>
                    <p>Cuando exista algún POU disponible aparecerá en este listado.</p>
                </div>

                <nav id="paginacionMunicipios" class="access-pagination-modern" aria-label="Paginación"></nav>
            </div>
        </section>
    </main>

    <?php include __DIR__ . '/php/includes/access_footer.php'; ?>

    <?php include("php/login/formularios/modalLogin.php"); ?>

    <script src="lib/jquery-3.7.1.min.js"></script>
    <script src="lib/bootstrap.bundle.min.js"></script>
    <script src="lib/sweetalert2@11.js"></script>
    <script src="js/index.js?v=<?= (int)@filemtime(__DIR__ . '/js/index.js') ?>"></script>
    <script src="js/login/login.js"></script>
</body>
</html>
