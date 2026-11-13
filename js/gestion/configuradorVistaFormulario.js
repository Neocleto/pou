/****************************************************************************
 * VISTA PREVIA DE FORMULARIOS POU
 *
 * Genera una representacion realista del formulario mientras el usuario lo
 * diseña. No envia respuestas ni guarda datos: solo muestra el resultado.
 ****************************************************************************/

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-preview-mode]').forEach(function (boton) {
        boton.addEventListener('click', function () {
            cambiarModoVistaPrevia(boton.dataset.previewMode);
        });
    });
});

/**
 * Actualiza la previsualización con cada cambio de un campo o de sus opciones.
 */
document.addEventListener('input', function (evento) {
    if (evento.target.dataset.formField || evento.target.dataset.formOptions) {
        window.requestAnimationFrame(renderizarVistaPreviaFormulario);
    }
});

document.addEventListener('change', function (evento) {
    if (evento.target.dataset.formField || evento.target.dataset.formOptions) {
        window.requestAnimationFrame(renderizarVistaPreviaFormulario);
    }
});

/**
 * Alterna entre la página pública y el formulario que se está diseñando.
 */
function cambiarModoVistaPrevia(modo) {
    const iframe = document.getElementById('iframeVistaPreviaPortal');
    const formulario = document.getElementById('vistaPreviaFormulario');
    const esFormulario = modo === 'formulario';

    document.querySelectorAll('[data-preview-mode]').forEach(function (boton) {
        boton.classList.toggle('is-active', boton.dataset.previewMode === modo);
    });

    iframe?.classList.toggle('d-none', esFormulario);
    formulario?.classList.toggle('d-none', !esFormulario);

    if (esFormulario) {
        renderizarVistaPreviaFormulario();
    }
    const lienzo = document.getElementById('lienzoVistaPreviaPortal');

    lienzo?.classList.toggle('d-none', esFormulario);

    if (!esFormulario) {
        window.requestAnimationFrame(ajustarLienzoVistaPrevia);
    }

}

/**
 * Dibuja el formulario actual con el mismo orden de apartados y preguntas.
 */
function renderizarVistaPreviaFormulario() {
    const contenedor = document.getElementById('vistaPreviaFormulario');

    if (!contenedor) {
        return;
    }

    const formulario = estadoPortal.formularioActual;

    if (!formulario) {
        contenedor.innerHTML = `
            <div class="portal-form-preview-empty">
                <i class="bi bi-ui-checks-grid"></i>
                <strong>Selecciona o crea un formulario</strong>
                <p>La vista previa aparecerá aquí mientras lo diseñas.</p>
            </div>`;
        return;
    }

    const color = formulario.color || '#540000';
    const ofreceOnline = formulario.modalidad !== 'pdf';
    const ofrecePdf = formulario.modalidad === 'pdf' || formulario.modalidad === 'ambos';
    const secciones = ofreceOnline
        ? (formulario.secciones || []).map(crearSeccionVistaFormulario).join('')
        : '';

    contenedor.innerHTML = `
        <div class="portal-form-preview-page" style="--form-preview-color:${escaparHtml(color)}">
            <header class="portal-form-preview-header">
                <div class="portal-form-preview-brand">
                    <img src="images/logo_diputacion_azul.png" alt="Diputación Provincial de Málaga">
                    <span>POU · ${escaparHtml(estadoPortal.municipio.nombre || '')}</span>
                </div>
            </header>

            <main class="portal-form-preview-content">
                <section class="portal-form-preview-intro">
                    ${formulario.icono ? `<span class="portal-form-preview-icon">
                        <i class="bi bi-${escaparHtml(formulario.icono)}"></i>
                    </span>` : ''}
                    <div>
                        <span class="portal-form-preview-label">Participación ciudadana</span>
                        <h1>${escaparHtml(formulario.titulo || 'Título del formulario')}</h1>
                        <p>${escaparHtml(formulario.descripcion || 'La descripción del formulario aparecerá en este espacio.')}</p>
                    </div>
                </section>

                ${ofrecePdf ? crearAvisoPdfFormulario(formulario) : ''}

                ${ofreceOnline ? `
                    <form class="portal-form-preview-form" onsubmit="return false">
                        ${secciones || crearMensajeSinPreguntas()}
                        <div class="portal-form-preview-actions">
                            <button type="button" disabled>
                                ${escaparHtml(formulario.texto_boton_online || 'Enviar respuesta')}
                                <i class="bi bi-send"></i>
                            </button>
                        </div>
                    </form>` : `
                    <div class="portal-form-preview-only-pdf">
                        <i class="bi bi-file-earmark-pdf"></i>
                        <h2>Formulario disponible en PDF</h2>
                        <p>La ciudadanía verá un acceso directo al documento imprimible.</p>
                        <button type="button" disabled>${escaparHtml(formulario.texto_boton_pdf || 'Descargar PDF')}</button>
                    </div>`}
            </main>
        </div>`;
}

/**
 * Crea el aviso que acompaña a un formulario con versión imprimible.
 */
function crearAvisoPdfFormulario(formulario) {
    return `
        <div class="portal-form-preview-pdf">
            <span><i class="bi bi-file-earmark-pdf"></i></span>
            <div>
                <strong>También disponible para imprimir</strong>
                <small>${formulario.pdf_url ? escaparHtml(formulario.pdf_url) : 'El PDF todavía no se ha subido.'}</small>
            </div>
            <button type="button" disabled>${escaparHtml(formulario.texto_boton_pdf || 'Descargar PDF')}</button>
        </div>`;
}

/**
 * Crea un apartado del formulario.
 */
function crearSeccionVistaFormulario(seccion, indiceSeccion) {
    const preguntas = (seccion.preguntas || []).map(function (pregunta, indicePregunta) {
        return crearPreguntaVistaFormulario(pregunta, indiceSeccion, indicePregunta);
    }).join('');

    return `
        <fieldset class="portal-form-preview-section">
            <legend>
                <span>${indiceSeccion + 1}</span>
                <div>
                    <strong>${escaparHtml(seccion.titulo || `Apartado ${indiceSeccion + 1}`)}</strong>
                    ${seccion.descripcion ? `<small>${escaparHtml(seccion.descripcion)}</small>` : ''}
                </div>
            </legend>
            <div class="portal-form-preview-grid">
                ${preguntas || '<p class="portal-form-preview-section-empty">Añade preguntas para completar este apartado.</p>'}
            </div>
        </fieldset>`;
}

/**
 * Crea una pregunta y un control desactivado adecuado a su tipo.
 */
function crearPreguntaVistaFormulario(pregunta, indiceSeccion, indicePregunta) {
    const ancho = pregunta.ancho === 'medio' ? 'is-half' : 'is-full';
    const obligatorio = pregunta.obligatorio ? '<em>*</em>' : '';

    return `
        <label class="portal-form-preview-question ${ancho}">
            <span>${escaparHtml(pregunta.enunciado || `Pregunta ${indicePregunta + 1}`)} ${obligatorio}</span>
            ${pregunta.ayuda ? `<small>${escaparHtml(pregunta.ayuda)}</small>` : ''}
            ${crearControlVistaFormulario(pregunta, indiceSeccion, indicePregunta)}
        </label>`;
}

/**
 * Devuelve el control visual correspondiente al tipo de pregunta.
 */
function crearControlVistaFormulario(pregunta, indiceSeccion, indicePregunta) {
    const nombre = `preview_${indiceSeccion}_${indicePregunta}`;

    if (pregunta.tipo === 'texto_largo') {
        return '<textarea rows="4" disabled placeholder="Escribe tu respuesta"></textarea>';
    }

    if (pregunta.tipo === 'numero') {
        return '<input type="number" disabled placeholder="0">';
    }

    if (pregunta.tipo === 'fecha') {
        return '<input type="date" disabled>';
    }

    if (pregunta.tipo === 'si_no') {
        return `
            <span class="portal-form-preview-options">
                <span><input type="radio" name="${nombre}" disabled> Sí</span>
                <span><input type="radio" name="${nombre}" disabled> No</span>
            </span>`;
    }

    if (pregunta.tipo === 'desplegable') {
        return `
            <select disabled>
                <option>Selecciona una opción</option>
                ${(pregunta.opciones || []).map(function (opcion) {
                    return `<option>${escaparHtml(opcion)}</option>`;
                }).join('')}
            </select>`;
    }

    if (pregunta.tipo === 'opcion_unica' || pregunta.tipo === 'opcion_multiple') {
        const tipo = pregunta.tipo === 'opcion_multiple' ? 'checkbox' : 'radio';
        const opciones = pregunta.opciones || [];

        return `
            <span class="portal-form-preview-options is-stacked">
                ${opciones.map(function (opcion) {
                    return `<span><input type="${tipo}" name="${nombre}" disabled> ${escaparHtml(opcion)}</span>`;
                }).join('') || '<span>Añade al menos dos opciones.</span>'}
            </span>`;
    }

    return '<input type="text" disabled placeholder="Escribe tu respuesta">';
}

function crearMensajeSinPreguntas() {
    return `
        <div class="portal-form-preview-empty is-inline">
            <i class="bi bi-plus-circle"></i>
            <strong>El formulario todavía no tiene preguntas</strong>
            <p>Añade un apartado y sus preguntas desde el panel de edición.</p>
        </div>`;
}
