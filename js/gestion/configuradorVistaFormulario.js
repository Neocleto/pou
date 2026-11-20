/****************************************************************************
 * VISTA PREVIA DE FORMULARIOS POU
 *
 * Permite rellenar y validar el borrador con los datos del editor.
 * La prueba se ejecuta localmente y no llama al PHP de envío.
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
                <div class="encuesta-marca__municipio">
                    <img class="encuesta-marca__escudo" src="${escaparHtml(obtenerRutaProyecto(estadoPortal.municipio.escudo || estadoPortal.municipio.escudo_automatico))}" alt="">
                    <strong>POU - ${escaparHtml(estadoPortal.municipio.nombre || '')}</strong>
                </div>
                <img class="encuesta-marca__diputacion" src="images/logo_diputacion_azul.png" alt="Diputación Provincial de Málaga">
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
                    <form class="portal-form-preview-form" novalidate>
                        <p class="portal-form-preview-test">Modo de prueba. Puedes rellenar y probar el envío sin registrar respuestas.</p>
                        ${secciones || crearMensajeSinPreguntas()}
                        <div class="portal-form-preview-actions">
                            <button type="submit" ${formulario.secciones?.some(seccion => seccion.preguntas?.length) ? '' : 'disabled'}>
                                Probar envío
                                <i class="bi bi-send"></i>
                            </button>
                        </div>
                        <p class="portal-form-preview-result" role="status"></p>
                    </form>` : `
                    <div class="portal-form-preview-only-pdf">
                        <i class="bi bi-file-earmark-pdf"></i>
                        <h2>Formulario disponible en PDF</h2>
                        <p>La ciudadanía verá un acceso directo al documento imprimible.</p>
                        <button type="button" disabled>${escaparHtml(formulario.texto_boton_pdf || 'Descargar PDF')}</button>
                    </div>`}
            </main>
        </div>`;

    const prueba = contenedor.querySelector('.portal-form-preview-form');
    prueba?.addEventListener('submit', function (evento) {
        evento.preventDefault();
        const resultado = prueba.querySelector('.portal-form-preview-result');
        resultado.textContent = '';
        if (validarCamposEncuesta(prueba)) {
            resultado.textContent = 'Prueba completada. La respuesta de prueba no se ha guardado ni enviado.';
        }
    });
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
 * Crea la etiqueta y el control que se pueden probar en el borrador.
 */
function crearPreguntaVistaFormulario(pregunta, indiceSeccion, indicePregunta) {
    const ancho = pregunta.ancho === 'medio' ? 'is-half' : 'is-full';
    const nombre = `preview_${indiceSeccion}_${indicePregunta}`;
    const obligatorio = pregunta.obligatorio ? '<em>*</em>' : '';

    return `
        <div class="portal-form-preview-question ${ancho}">
            <span id="${nombre}_etiqueta">${escaparHtml(pregunta.enunciado || `Pregunta ${indicePregunta + 1}`)} ${obligatorio}</span>
            ${pregunta.ayuda ? `<small>${escaparHtml(pregunta.ayuda)}</small>` : ''}
            ${crearControlVistaFormulario(pregunta, nombre)}
            <small class="form-public-field__error" data-error-grupo aria-live="polite"></small>
        </div>`;
}

/**
 * Devuelve el control visual correspondiente al tipo de pregunta.
 */
function crearControlVistaFormulario(pregunta, nombre) {
    const requerido = pregunta.obligatorio ? 'required' : '';
    const atributo = `name="${nombre}" aria-labelledby="${nombre}_etiqueta" ${requerido}`;

    if (pregunta.tipo === 'texto_largo') {
        return `<textarea rows="4" ${atributo} placeholder="Escribe tu respuesta"></textarea>`;
    }

    if (pregunta.tipo === 'numero') {
        return `<input type="number" step="any" ${atributo}>`;
    }

    if (pregunta.tipo === 'fecha') {
        return `<input type="date" ${atributo}>`;
    }

    const opciones = pregunta.tipo === 'si_no' ? ['Sí', 'No'] : (pregunta.opciones || []);
    if (pregunta.tipo === 'desplegable') {
        return `
            <select ${atributo}>
                <option value="">Selecciona una opción</option>
                ${opciones.map(opcion => `<option>${escaparHtml(opcion)}</option>`).join('')}
            </select>`;
    }

    if (['si_no', 'opcion_unica', 'opcion_multiple'].includes(pregunta.tipo)) {
        const multiple = pregunta.tipo === 'opcion_multiple';
        const tipo = multiple ? 'checkbox' : 'radio';
        return `
            <div class="portal-form-preview-options is-stacked" role="group" aria-labelledby="${nombre}_etiqueta"
                ${multiple && requerido ? 'data-required-group="true"' : ''}>
                ${opciones.map((opcion, indice) => `<label>
                    <input type="${tipo}" name="${nombre}" value="${escaparHtml(opcion)}"
                        ${!multiple && indice === 0 ? requerido : ''}> ${escaparHtml(opcion)}
                </label>`).join('') || '<span>Añade al menos dos opciones.</span>'}
            </div>`;
    }

    return `<input type="text" ${atributo} placeholder="Escribe tu respuesta">`;
}

function crearMensajeSinPreguntas() {
    return `
        <div class="portal-form-preview-empty is-inline">
            <i class="bi bi-plus-circle"></i>
            <strong>El formulario todavía no tiene preguntas</strong>
            <p>Añade un apartado y sus preguntas desde el panel de edición.</p>
        </div>`;
}
