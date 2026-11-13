<?php
// ============================================================================
// PIE COMÚN DEL PORTAL PÚBLICO
//
// Variables esperadas: $escudoMunicipio y $nombreMunicipio.
// ============================================================================
?>

<?php
$piePortal = $contenido['pie'] ?? $configuracion['contenido_portal']['pie'] ?? [];
// El fondo gris institucional se define en pie-institucional.css.
?>
<footer class="portal-footer">
    <div class="portal-shell portal-footer__inner">
        <div class="portal-footer__municipality">
            <span class="portal-footer__crest">
                <img src="<?= htmlspecialchars($escudoMunicipio ?? '') ?>" alt="Escudo de <?= htmlspecialchars($nombreMunicipio ?? '') ?>">
            </span>
            <span>
                <strong data-content="pie.texto_principal"><?= htmlspecialchars(str_replace('{municipio}', $nombreMunicipio ?? '', $piePortal['texto_principal'] ?? 'Ayuntamiento de {municipio}')) ?></strong>
                <small data-content="pie.texto_secundario"><?= htmlspecialchars($piePortal['texto_secundario'] ?? 'Plan de Ordenación Urbana') ?></small>
            </span>
        </div>
        <nav aria-label="Enlaces institucionales">
            <a href="https://idemap.es/mapaweb.php#ancla_desplaz">Mapa web</a>
            <a href="https://idemap.es/normativa.php#ancla_desplaz">Normativa</a>
            <a href="https://idemap.es/contacto.php#ancla_desplaz">Contacto</a>
            <a href="https://idemap.es/enlaces.php#ancla_desplaz">Enlaces</a>
        </nav>
        <img class="portal-footer__diputacion" src="images/logo_diputacion_blanco.png" alt="Diputación Provincial de Málaga">
    </div>
</footer>
