<?php
// ============================================================================
// CABECERA COMÚN DEL PORTAL PÚBLICO
//
// La página municipal y la página de documentos usan exactamente la misma
// cabecera. La vista que incluye este archivo puede definir $modoPreview.
// ============================================================================
$modoPreview = !empty($modoPreview);
?>

<?php if ($modoPreview && empty($_GET['editor'])): ?>
    <div class="preview-bar" role="status" aria-label="Portal en modo vista previa">
        <i class="bi bi-eye"></i>
        <span>Vista previa privada</span>
    </div>
<?php endif; ?>

<header class="portal-header">
    <div class="portal-shell portal-header__inner">
        <a href="https://idemap.es/" target="_blank" rel="noopener noreferrer" class="portal-header__brand">
            <img src="images/logo_idemap.png" alt="IDEMAP Geoportal" class="portal-header__idemap">
        </a>
        <img src="images/logo_diputacion_azul.png" alt="Diputación Provincial de Málaga" class="portal-header__dip">
    </div>
</header>
