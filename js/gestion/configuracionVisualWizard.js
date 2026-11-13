/****************************************************************************
 * ACCESOS AL CONFIGURADOR VISUAL DEL PORTAL
 *
 * El wizard conserva la edición de los datos del POU. El diseño visual y los
 * formularios se editan en una pantalla independiente con vista previa real.
 *
 * Este archivo solo abre esa pantalla. No guarda colores, formularios ni
 * imágenes y, por tanto, no duplica la lógica del configurador principal.
 ****************************************************************************/

/**
 * Obtiene el código INE del municipio abierto en el wizard.
 *
 * El valor suele estar en window.datosWizard. Cuando se crea un municipio
 * nuevo, también puede encontrarse en el campo del primer paso.
 *
 * @returns {string} Código INE o una cadena vacía si todavía no se ha guardado.
 */
function obtenerCodigoMunicipioConfiguracionVisual() {
    const codigoGuardado = window.datosWizard?.[1]?.cod_mun || '';
    const codigoFormulario = document.getElementById('cod_mun')?.value || '';

    return String(codigoGuardado || codigoFormulario).trim();
}

/**
 * Abre el configurador visual en otra pestaña.
 *
 * @param {string} panelInicial Bloque que debe quedar seleccionado al entrar.
 */
function abrirConfiguradorPortal(panelInicial) {
    const codigoMunicipio = obtenerCodigoMunicipioConfiguracionVisual();

    // El configurador necesita un municipio ya guardado para asociar los datos.
    if (!codigoMunicipio) {
        Swal.fire(
            'Guarda primero el municipio',
            'Después podrás abrir el configurador visual completo.',
            'info'
        );
        return;
    }

    const parametros = new URLSearchParams({
        cod_mun: codigoMunicipio,
        panel: panelInicial || 'general'
    });
    const urlConfigurador =
        'php/gestion/configurador_portal.php?' + parametros.toString();

    const abrirVentana = function (ventanaPreparada = null) {
        if (ventanaPreparada && !ventanaPreparada.closed) {
            ventanaPreparada.location.href = urlConfigurador;
            return;
        }

        window.open(
            urlConfigurador,
            '_blank',
            'noopener'
        );
    };

    // El configurador lee los datos guardados en PostgreSQL. Si el Wizard
    // tiene cambios pendientes, primero los guardamos para que todas las vías
    // de acceso abran exactamente el mismo estado.
    if (
        typeof hayCambiosPendientesEnWizard !== 'function'
        || !hayCambiosPendientesEnWizard()
    ) {
        abrirVentana();
        return;
    }

    Swal.fire({
        icon: 'question',
        title: 'Guardar antes de continuar',
        text: 'El configurador debe abrir los mismos datos que estás viendo en el asistente.',
        showCancelButton: true,
        confirmButtonText: 'Guardar y abrir',
        cancelButtonText: 'Seguir en el asistente'
    }).then(function (resultado) {
        if (!resultado.isConfirmed) {
            return;
        }

        if (typeof validarTodoAntesDeGuardar === 'function' && !validarTodoAntesDeGuardar()) {
            return;
        }

        // Abrimos una pestaña vacía en el propio clic confirmado. Así el
        // navegador no bloquea la apertura mientras esperamos al guardado.
        const ventanaConfigurador = window.open('about:blank', '_blank');

        if (!ventanaConfigurador) {
            Swal.fire(
                'No se pudo abrir el configurador',
                'Permite las ventanas emergentes para esta página y vuelve a intentarlo.',
                'info'
            );
            return;
        }

        ventanaConfigurador.opener = null;

        guardarMunicipioAntesDeSubir(function () {
            abrirVentana(ventanaConfigurador);
        }, {
            silencioso: true,
            alError: function () {
                ventanaConfigurador.close();
            }
        });
    });
}

/**
 * Conecta un botón del wizard con un panel concreto del configurador.
 *
 * El contenido del wizard se carga mediante AJAX. Por eso esta función puede
 * ejecutarse varias veces; el atributo data-inicializado evita eventos dobles.
 *
 * @param {string} idBoton Identificador HTML del botón.
 * @param {string} panelInicial Panel que debe abrirse.
 */
function conectarBotonConfigurador(idBoton, panelInicial) {
    const boton = document.getElementById(idBoton);

    if (!boton || boton.dataset.inicializado === '1') {
        return;
    }

    boton.dataset.inicializado = '1';

    boton.addEventListener('click', function () {
        abrirConfiguradorPortal(panelInicial);
    });
}

/**
 * Inicializa todos los accesos al configurador que existan en el paso cargado.
 */
function inicializarBotonConfiguradorPortal() {
    conectarBotonConfigurador('btnAbrirConfiguradorPortal', 'general');
    conectarBotonConfigurador('btnAbrirConfiguradorFormularios', 'formularios');
    conectarBotonConfigurador('btnAbrirConfiguradorParticipacion', 'seccion:participacion');
}
