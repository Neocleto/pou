/**
 * PASO 7: PREGUNTAS FRECUENTES POR MUNICIPIO
 *
 * La biblioteca común nunca se modifica desde este paso.
 * Una pregunta puede ser:
 * - Base: usa directamente el texto de la biblioteca.
 * - Adaptada: conserva la pregunta base, pero muestra un texto municipal.
 * - Exclusiva: solo existe en el municipio actual.
 */

let preguntasAsignadasLocal = [];
let preguntasAsignadasInicial = [];
let paginaFaqActual = 1;
const preguntasPorPagina = 4;
let sortableFaqs = null;
let ordenInicialFaqs = [];
let modoOrdenFaqs = false;
let modoVerTodasFaqs = false;
let yaMostradoAvisoGuardarPreguntas = false;

/** Inicializa todos los controles del paso. */
function inicializarFaqsWizard(codMun) {
    paginaFaqActual = 1;
    modoOrdenFaqs = false;
    modoVerTodasFaqs = false;
    yaMostradoAvisoGuardarPreguntas = false;

    configurarBotonesFaqs();
    cargarPreguntasDisponibles();

    if (codMun) return cargarPreguntasAsignadas(codMun);

    preguntasAsignadasLocal = [];
    preguntasAsignadasInicial = [];
    renderizarTablaFaqs([]);
}

/** Conecta los botones usando onclick para evitar eventos repetidos. */
function configurarBotonesFaqs() {
    const botonFormulario = document.getElementById('btnMostrarFormularioFaq');
    const formulario = document.getElementById('formularioFaqNuevo');
    const selector = document.getElementById('selectorPregunta');

    if (botonFormulario && formulario) {
        botonFormulario.onclick = function () {
            formulario.classList.toggle('d-none');
            botonFormulario.innerHTML = formulario.classList.contains('d-none')
                ? '<i class="bi bi-plus-circle"></i> Crear para este municipio'
                : '<i class="bi bi-x-circle"></i> Cancelar';
        };
    }

    const botonAgregar = document.getElementById('btnAgregarFaq');
    if (botonAgregar) {
        botonAgregar.onclick = agregarPreguntaMunicipal;
    }

    if (selector) {
        selector.onchange = function () {
            agregarPreguntaBiblioteca(selector);
        };
    }

    document.getElementById('btnOrdenarFaqs').onclick = entrarModoOrdenarFaqs;
    document.getElementById('btnSalirOrdenFaqs').onclick = function () {
        salirModoOrdenarFaqs({ restaurar: true });
    };
    document.getElementById('btnGuardarOrdenFaqs').onclick = function () {
        salirModoOrdenarFaqs({ restaurar: false });
        mostrarAvisoGuardar();
    };
    document.getElementById('btnVerTodasFaqs').onclick = alternarTodasFaqs;
}

/** Añade una pregunta nueva exclusiva del municipio. */
function agregarPreguntaMunicipal() {
    const pregunta = document.getElementById('preguntaNueva').value.trim();
    const respuesta = document.getElementById('respuestaNueva').value.trim();

    if (!pregunta || !respuesta) {
        Swal.fire('Campos obligatorios', 'Completa la pregunta y la respuesta.', 'warning');
        return;
    }

    preguntasAsignadasLocal.push({
        id: `nueva_${Date.now()}`,
        asignacion_id: null,
        pregunta_id: null,
        pregunta,
        respuesta,
        pregunta_base: '',
        respuesta_base: '',
        nueva: true,
        personalizada: true,
        es_exclusiva: true
    });

    document.getElementById('preguntaNueva').value = '';
    document.getElementById('respuestaNueva').value = '';
    document.getElementById('formularioFaqNuevo').classList.add('d-none');
    document.getElementById('btnMostrarFormularioFaq').innerHTML = '<i class="bi bi-plus-circle"></i> Crear para este municipio';

    refrescarFaqsTrasCambio();
}

/** Añade una pregunta seleccionada de la biblioteca. */
function agregarPreguntaBiblioteca(selector) {
    const opcion = selector.options[selector.selectedIndex];
    const preguntaId = Number(selector.value || 0);

    if (!preguntaId) {
        return;
    }

    const yaExiste = preguntasAsignadasLocal.some(function (faq) {
        return Number(faq.pregunta_id || 0) === preguntaId;
    });

    if (yaExiste) {
        selector.value = '';
        Swal.fire('Pregunta ya asignada', 'Esta pregunta ya está en el municipio.', 'info');
        return;
    }

    preguntasAsignadasLocal.push({
        id: `base_${preguntaId}`,
        asignacion_id: null,
        pregunta_id: preguntaId,
        pregunta: opcion.textContent,
        respuesta: opcion.dataset.respuesta || '',
        pregunta_base: opcion.textContent,
        respuesta_base: opcion.dataset.respuesta || '',
        personalizada: false,
        es_exclusiva: false
    });

    selector.value = '';
    refrescarFaqsTrasCambio();
}

/** Carga el selector de la biblioteca común. */
function cargarPreguntasDisponibles() {
    fetch('php/gestion/acciones/acciones_faqs.php?action=listarPreguntasDisponibles')
        .then(function (respuesta) { return respuesta.json(); })
        .then(function (datos) {
            const selector = document.getElementById('selectorPregunta');
            selector.innerHTML = '<option value="">-- Seleccionar una pregunta --</option>';

            (datos.data || []).forEach(function (faq) {
                const opcion = document.createElement('option');
                opcion.value = faq.id;
                opcion.textContent = faq.pregunta;
                opcion.dataset.respuesta = faq.respuesta || '';
                selector.appendChild(opcion);
            });
        });
}

/** Carga la lista guardada del municipio. */
function cargarPreguntasAsignadas(codMun) {
    return fetch(`php/gestion/acciones/acciones_faqs.php?action=listarPreguntasMunicipio&cod_mun=${encodeURIComponent(codMun)}`)
        .then(function (respuesta) { return respuesta.json(); })
        .then(function (datos) {
            preguntasAsignadasLocal = (datos.data || []).map(normalizarFaqMunicipio);
            preguntasAsignadasInicial = preguntasAsignadasLocal.map(function (faq) { return { ...faq }; });
            guardarDatosPaso(7);
            estadoInicialWizard[7] = JSON.parse(JSON.stringify(datosWizard[7] || {}));
            renderizarTablaFaqs(preguntasAsignadasLocal);
            actualizarEstadoBotonGuardar();
        })
        .catch(function () {
            preguntasAsignadasLocal = [];
            preguntasAsignadasInicial = [];
            renderizarTablaFaqs([]);
        });
}

/** Convierte la respuesta del servidor en un objeto sencillo. */
function normalizarFaqMunicipio(faq) {
    return {
        id: `asignacion_${faq.asignacion_id}`,
        asignacion_id: Number(faq.asignacion_id),
        pregunta_id: faq.pregunta_id ? Number(faq.pregunta_id) : null,
        pregunta: faq.pregunta || '',
        respuesta: faq.respuesta || '',
        pregunta_base: faq.pregunta_base || '',
        respuesta_base: faq.respuesta_base || '',
        personalizada: convertirBooleanoFaq(faq.personalizada),
        es_exclusiva: convertirBooleanoFaq(faq.es_exclusiva)
    };
}

/** Pinta la tabla, sus acciones y la paginación. */
function renderizarTablaFaqs(lista, opciones = {}) {
    const sinPaginacion = Boolean(opciones.sinPaginacion);
    const conDrag = Boolean(opciones.conDrag);
    const tabla = document.getElementById('tablaFaqs');
    const cuerpo = tabla.querySelector('tbody');
    const contenedor = tabla.closest('.table-responsive');
    const mensaje = document.getElementById('mensajeSinPreguntas');
    const paginacion = document.getElementById('faqPaginacionContainer');

    if (sortableFaqs) {
        sortableFaqs.destroy();
        sortableFaqs = null;
    }

    cuerpo.innerHTML = '';
    paginacion.innerHTML = '';

    if (!lista.length) {
        contenedor.style.display = 'none';
        mensaje.style.display = 'block';
        return;
    }

    contenedor.style.display = '';
    mensaje.style.display = 'none';

    let elementos = lista;
    if (!sinPaginacion) {
        elementos = obtenerPaginaFaqs(lista, paginacion);
    }

    elementos.forEach(function (faq) {
        const fila = document.createElement('tr');
        fila.className = 'faq-row';
        fila.dataset.id = faq.id;

        const tipo = faq.es_exclusiva
            ? '<span class="badge text-bg-success">Municipal</span>'
            : faq.personalizada
                ? '<span class="badge text-bg-warning">Adaptada</span>'
                : '<span class="badge text-bg-primary">Biblioteca</span>';

        fila.innerHTML = `
            <td class="text-center align-middle">
                ${conDrag ? '<button type="button" class="btn btn-sm btn-light drag-handle" title="Mover"><i class="bi bi-grip-vertical"></i></button>' : ''}
            </td>
            <td class="align-middle">
                <strong>${escaparFaq(faq.pregunta)}</strong>
                <div class="faq-respuesta mt-2 d-none" data-respuesta-faq>${escaparFaq(faq.respuesta).replaceAll('\n', '<br>')}</div>
            </td>
            <td class="align-middle">${tipo}</td>
            <td class="text-center align-middle">
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-secondary" data-faq-action="view" title="Ver respuesta"><i class="bi bi-eye"></i></button>
                    <button type="button" class="btn btn-outline-primary" data-faq-action="edit" title="Editar solo para este municipio"><i class="bi bi-pencil"></i></button>
                    ${faq.personalizada && !faq.es_exclusiva ? '<button type="button" class="btn btn-outline-warning" data-faq-action="restore" title="Restaurar texto de la biblioteca"><i class="bi bi-arrow-counterclockwise"></i></button>' : ''}
                    <button type="button" class="btn btn-outline-danger" data-faq-action="delete" title="Retirar del municipio"><i class="bi bi-trash"></i></button>
                </div>
            </td>`;

        cuerpo.appendChild(fila);
        conectarAccionesFilaFaq(fila, faq);
    });

    if (conDrag && typeof Sortable !== 'undefined') {
        sortableFaqs = Sortable.create(cuerpo, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: function () {
                const ids = Array.from(cuerpo.querySelectorAll('.faq-row')).map(function (fila) {
                    return fila.dataset.id;
                });
                const mapa = new Map(preguntasAsignadasLocal.map(function (faq) { return [String(faq.id), faq]; }));
                preguntasAsignadasLocal = ids.map(function (id) { return mapa.get(String(id)); }).filter(Boolean);
                renderizarTablaFaqs(preguntasAsignadasLocal, { sinPaginacion: true, conDrag: true });
            }
        });
    }
}

/** Devuelve los elementos de la página actual y dibuja los botones. */
function obtenerPaginaFaqs(lista, contenedor) {
    const totalPaginas = Math.max(1, Math.ceil(lista.length / preguntasPorPagina));
    paginaFaqActual = Math.min(Math.max(1, paginaFaqActual), totalPaginas);

    if (totalPaginas > 1) {
        contenedor.innerHTML = `
            <div class="d-flex justify-content-center align-items-center gap-2">
                <button type="button" class="btn btn-sm btn-outline-primary" id="faqPrev" ${paginaFaqActual === 1 ? 'disabled' : ''}>Anterior</button>
                <span>Página ${paginaFaqActual} de ${totalPaginas}</span>
                <button type="button" class="btn btn-sm btn-outline-primary" id="faqNext" ${paginaFaqActual === totalPaginas ? 'disabled' : ''}>Siguiente</button>
            </div>`;

        document.getElementById('faqPrev').onclick = function () {
            paginaFaqActual--;
            renderizarTablaFaqs(preguntasAsignadasLocal);
        };
        document.getElementById('faqNext').onclick = function () {
            paginaFaqActual++;
            renderizarTablaFaqs(preguntasAsignadasLocal);
        };
    }

    const inicio = (paginaFaqActual - 1) * preguntasPorPagina;
    return lista.slice(inicio, inicio + preguntasPorPagina);
}

/** Conecta las acciones de una fila. */
function conectarAccionesFilaFaq(fila, faq) {
    fila.querySelector('[data-faq-action="view"]').onclick = function () {
        fila.querySelector('[data-respuesta-faq]').classList.toggle('d-none');
    };

    fila.querySelector('[data-faq-action="edit"]').onclick = function () {
        editarFaqMunicipio(faq);
    };

    const restaurar = fila.querySelector('[data-faq-action="restore"]');
    if (restaurar) {
        restaurar.onclick = function () {
            faq.pregunta = faq.pregunta_base;
            faq.respuesta = faq.respuesta_base;
            faq.personalizada = false;
            refrescarFaqsTrasCambio();
        };
    }

    fila.querySelector('[data-faq-action="delete"]').onclick = function () {
        preguntasAsignadasLocal = preguntasAsignadasLocal.filter(function (item) {
            return item.id !== faq.id;
        });
        refrescarFaqsTrasCambio();
    };
}

/** Abre un editor y modifica solo la copia municipal. */
function editarFaqMunicipio(faq) {
    Swal.fire({
        // Bootstrap conserva el foco dentro del asistente. El editor también debe estar dentro.
        target: document.getElementById('modalWizard'),
        focusConfirm: false,
        didOpen: function (ventana) {
            ventana.querySelector('#faqEditPregunta').focus();
        },
        title: faq.es_exclusiva ? 'Editar pregunta municipal' : 'Adaptar para este municipio',
        html: `
            <label for="faqEditPregunta" class="form-label w-100 text-start">Pregunta</label>
            <input id="faqEditPregunta" class="form-control mb-3" value="${escaparAtributoFaq(faq.pregunta)}">
            <label for="faqEditRespuesta" class="form-label w-100 text-start">Respuesta</label>
            <textarea id="faqEditRespuesta" class="form-control" rows="7">${escaparFaq(faq.respuesta)}</textarea>`,
        showCancelButton: true,
        confirmButtonText: 'Aplicar cambios',
        cancelButtonText: 'Cancelar',
        width: 720,
        preConfirm: function () {
            const pregunta = document.getElementById('faqEditPregunta').value.trim();
            const respuesta = document.getElementById('faqEditRespuesta').value.trim();
            if (!pregunta || !respuesta) {
                Swal.showValidationMessage('Completa la pregunta y la respuesta.');
                return false;
            }
            return { pregunta, respuesta };
        }
    }).then(function (resultado) {
        if (!resultado.isConfirmed) return;
        faq.pregunta = resultado.value.pregunta;
        faq.respuesta = resultado.value.respuesta;
        faq.personalizada = true;
        refrescarFaqsTrasCambio();
    });
}

/** Activa la ordenación de todas las preguntas. */
function entrarModoOrdenarFaqs() {
    if (!preguntasAsignadasLocal.length) {
        Swal.fire('Sin preguntas', 'Añade alguna pregunta antes de ordenar.', 'info');
        return;
    }

    ordenInicialFaqs = preguntasAsignadasLocal.map(function (faq) { return { ...faq }; });
    modoOrdenFaqs = true;
    modoVerTodasFaqs = false;
    document.getElementById('btnOrdenarFaqs').classList.add('d-none');
    document.getElementById('btnVerTodasFaqs').classList.add('d-none');
    document.getElementById('btnSalirOrdenFaqs').classList.remove('d-none');
    document.getElementById('btnGuardarOrdenFaqs').classList.remove('d-none');
    renderizarTablaFaqs(preguntasAsignadasLocal, { sinPaginacion: true, conDrag: true });
}

/** Sale de la ordenación y conserva o descarta el orden. */
function salirModoOrdenarFaqs({ restaurar = false } = {}) {
    if (restaurar) {
        preguntasAsignadasLocal = ordenInicialFaqs.map(function (faq) { return { ...faq }; });
    }

    modoOrdenFaqs = false;
    document.getElementById('btnOrdenarFaqs').classList.remove('d-none');
    document.getElementById('btnVerTodasFaqs').classList.remove('d-none');
    document.getElementById('btnSalirOrdenFaqs').classList.add('d-none');
    document.getElementById('btnGuardarOrdenFaqs').classList.add('d-none');
    refrescarFaqsTrasCambio();
}

/** Alterna entre tabla paginada y lista completa. */
function alternarTodasFaqs() {
    if (modoOrdenFaqs) return;
    modoVerTodasFaqs = !modoVerTodasFaqs;
    document.getElementById('btnVerTodasFaqs').innerHTML = modoVerTodasFaqs
        ? '<i class="bi bi-list-ul"></i> Ver paginadas'
        : '<i class="bi bi-eye"></i> Ver todas';
    renderizarTablaFaqs(preguntasAsignadasLocal, { sinPaginacion: modoVerTodasFaqs });
}

/** Refresca la pantalla y marca el paso como modificado. */
function refrescarFaqsTrasCambio() {
    renderizarTablaFaqs(preguntasAsignadasLocal, { sinPaginacion: modoVerTodasFaqs });
    guardarDatosPaso(7);
    actualizarEstadoBotonGuardar();
    mostrarAvisoGuardar();
}



/** Prepara un elemento para enviarlo al servidor. */
function serializarFaqWizard(faq) {
    return {
        asignacion_id: Number(faq.asignacion_id || 0) || null,
        pregunta_id: Number(faq.pregunta_id) || null,
        pregunta: faq.pregunta || '',
        respuesta: faq.respuesta || '',
        personalizada: Boolean(faq.personalizada),
        es_exclusiva: Boolean(faq.es_exclusiva || faq.nueva)
    };
}

/** Limpia todo al cerrar o abrir un municipio distinto. */
function resetearEstadoFaqsWizard() {
    preguntasAsignadasLocal = [];
    preguntasAsignadasInicial = [];
    paginaFaqActual = 1;
    modoOrdenFaqs = false;
    modoVerTodasFaqs = false;
    yaMostradoAvisoGuardarPreguntas = false;
}

/** Aviso ligero para recordar el guardado del asistente. */
function mostrarAvisoGuardar() {
    if (yaMostradoAvisoGuardarPreguntas) return;
    yaMostradoAvisoGuardarPreguntas = true;
    Swal.fire('Recuerda guardar', 'Los cambios se aplicarán al guardar el municipio.', 'info');
}

function convertirBooleanoFaq(valor) {
    return valor === true || valor === 1 || valor === '1' || valor === 't' || valor === 'true';
}

function escaparFaq(valor) {
    return String(valor || '').replace(/[&<>"']/g, function (caracter) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[caracter];
    });
}

function escaparAtributoFaq(valor) {
    return escaparFaq(valor).replaceAll('\n', ' ');
}
