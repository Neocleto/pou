/*******************************************************
 * FORMULARIO PÚBLICO
 * Envía las respuestas y presenta el justificante del PHP.
 * El configurador utiliza la misma validación sin enviar datos.
 *******************************************************/

function validarCamposEncuesta(formulario) {
    let grupoSinRespuesta = null;
    for (const grupo of formulario.querySelectorAll('[data-required-group="true"]')) {
        const campo = grupo.closest('.form-public-field, .portal-form-preview-question');
        const mensaje = campo.querySelector('[data-error-grupo]');
        const incompleto = !grupo.querySelector('input:checked');
        campo.classList.toggle('has-error', incompleto);
        mensaje.textContent = incompleto ? 'Selecciona al menos una opción.' : '';
        if (incompleto && !grupoSinRespuesta) {
            grupoSinRespuesta = grupo;
        }
    }

    if (!formulario.reportValidity()) {
        return false;
    }
    if (grupoSinRespuesta) {
        grupoSinRespuesta.querySelector('input')?.focus();
        return false;
    }
    return true;
}

document.addEventListener('DOMContentLoaded', function () {
    const formulario = document.getElementById('formularioDinamicoPublico');
    if (!formulario) {
        return;
    }

    formulario.addEventListener('submit', enviarFormularioPublico);
    document.body.classList.remove('form-public-loading');
    document.getElementById('formPublicLoader')?.classList.add('is-hidden');
});

async function enviarFormularioPublico(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const resultadoPrueba = document.getElementById('resultadoPruebaEncuesta');
    if (resultadoPrueba) resultadoPrueba.hidden = true;

    if (!validarCamposEncuesta(formulario)) {
        return;
    }

    // Un envío de prueba termina aquí y no hace ninguna petición.
    if (formulario.dataset.preview === '1') {
        resultadoPrueba.textContent = 'Prueba completada. No se ha guardado ni enviado ninguna respuesta.';
        resultadoPrueba.hidden = false;
        return;
    }

    const boton = document.getElementById('btnEnviarFormularioPublico');
    if (boton.disabled) {
        return;
    }
    const texto = boton.querySelector('.form-public-submit-text');
    const textoInicial = texto.textContent;
    boton.disabled = true;
    boton.classList.add('is-loading');
    texto.textContent = 'Enviando...';

    try {
        const respuesta = await fetch(formulario.action, {
            method: 'POST',
            body: new FormData(formulario)
        });
        let datos;
        try {
            datos = await respuesta.json();
        } catch (error) {
            throw new Error('El servidor no ha devuelto la confirmación.');
        }
        if (!respuesta.ok || !datos.ok) {
            throw new Error(datos.mensaje || 'No se pudo registrar la respuesta.');
        }

        // El navegador crea la descarga con el PDF recibido en esta petición.
        // Su URL solo es válida en esta pestaña y no contiene datos personales.
        const bytes = Uint8Array.from(atob(datos.pdf_base64), letra => letra.charCodeAt(0));
        const urlPdf = URL.createObjectURL(new Blob([bytes], {type: 'application/pdf'}));
        window.addEventListener('pagehide', function (evento) {
            if (!evento.persisted) URL.revokeObjectURL(urlPdf);
        });

        const confirmacion = document.getElementById('confirmacionEncuesta');
        const descarga = document.getElementById('descargarJustificanteEncuesta');
        const aviso = document.getElementById('avisoCorreoEncuesta');
        document.getElementById('mensajeConfirmacionEncuesta').textContent = datos.mensaje;
        document.getElementById('referenciaEncuesta').textContent = datos.referencia;
        descarga.href = urlPdf;
        descarga.download = 'participacion-' + datos.referencia + '.pdf';
        aviso.textContent = datos.advertencia_correo || '';
        aviso.hidden = !datos.advertencia_correo;

        // Al quedar registrada la respuesta, se muestra la descarga en lugar del formulario.
        formulario.hidden = true;
        confirmacion.hidden = false;
        confirmacion.focus();
    } catch (error) {
        Swal.fire('No se pudo confirmar el envío', error.message, 'error');
        boton.disabled = false;
        boton.classList.remove('is-loading');
        texto.textContent = textoInicial;
    }
}
