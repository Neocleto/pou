/*******************************************************
 * FORMULARIO PÚBLICO
 * Valida y envía las respuestas sin recargar la página.
 *******************************************************/

/**
 * Inicializa la página cuando todos los elementos existen.
 */
function inicializarFormularioPublico() {
    const formulario = document.getElementById('formularioDinamicoPublico');

    if (!formulario) {
        return;
    }

    formulario.addEventListener('submit', enviarFormularioPublico);

    // La página ya está lista: retiramos la capa de carga sin parpadeos.
    requestAnimationFrame(function () {
        document.body.classList.remove('form-public-loading');
        document.getElementById('formPublicLoader')?.classList.add('is-hidden');
    });
}

/**
 * Comprueba grupos de casillas obligatorios.
 */
function validarGruposObligatorios() {
    let esValido = true;

    document.querySelectorAll('[data-required-group="true"]').forEach(function (grupo) {
        const casillasMarcadas = grupo.querySelectorAll('input[type="checkbox"]:checked');
        const campo = grupo.closest('.form-public-field');
        const mensaje = campo.querySelector('.form-public-field__error');

        if (!casillasMarcadas.length) {
            mensaje.textContent = 'Selecciona al menos una opción.';
            campo.classList.add('has-error');
            esValido = false;
        } else {
            mensaje.textContent = '';
            campo.classList.remove('has-error');
        }
    });

    return esValido;
}

/**
 * Limpia mensajes anteriores antes de una nueva validación.
 */
function limpiarErroresFormulario() {
    document.querySelectorAll('.form-public-field').forEach(function (campo) {
        campo.classList.remove('has-error');

        const mensaje = campo.querySelector('.form-public-field__error');
        if (mensaje) {
            mensaje.textContent = '';
        }
    });
}

/**
 * Envía las respuestas al endpoint PHP.
 */
async function enviarFormularioPublico(evento) {
    evento.preventDefault();

    const formulario = evento.currentTarget;
    const botonEnviar = document.getElementById('btnEnviarFormularioPublico');

    limpiarErroresFormulario();

    const formularioValido = formulario.checkValidity();
    const gruposValidos = validarGruposObligatorios();

    if (!formularioValido || !gruposValidos) {
        formulario.reportValidity();
        return;
    }

    const textoBoton = botonEnviar
        .querySelector('.form-public-submit-text');
    const textoOriginal = textoBoton.textContent.trim();

    botonEnviar.disabled = true;
    botonEnviar.classList.add('is-loading');
    textoBoton.textContent = 'Enviando...';

    try {
        const respuesta = await fetch(formulario.action, {
            method: 'POST',
            body: new FormData(formulario)
        });

        const datos = await respuesta.json();

        if (!datos.ok) {
            throw new Error(datos.mensaje || 'No se pudo guardar la respuesta.');
        }

        await Swal.fire({
            icon: 'success',
            title: 'Respuesta enviada',
            text: datos.mensaje,
            confirmButtonText: 'Volver al POU'
        });

        window.location.href = window.formularioPublicoConfig.volverUrl;
    } catch (error) {
        Swal.fire('No se pudo enviar', error.message, 'error');

        botonEnviar.disabled = false;
        botonEnviar.classList.remove('is-loading');
        textoBoton.textContent = textoOriginal;
    }
}

document.addEventListener('DOMContentLoaded', inicializarFormularioPublico);
