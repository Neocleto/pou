/*******************************************
 * TABLA DE MUNICIPIOS - GESTIÓN
 * Archivo: tablaMunicipios.js
 * Descripción: Controla la visualización y eventos de la tabla de municipios principal.
 *******************************************/

// ============================
// VARIABLES GLOBALES
// ============================
let tablaMunicipios; // Variable global para manejar DataTable
let eventosTablaConfigurados = false;

// ✅ Config común DataTable (5 / 10 / 15 / 20)
const dtConfigMunicipios = {
    pageLength: 5,
    lengthMenu: [5, 10, 15, 20],
    autoWidth: false, 
    language: {
        lengthMenu: "Mostrar _MENU_ registros",
        zeroRecords: "No se encontraron registros",
        info: "Mostrando _START_ de _TOTAL_ registros",
        infoEmpty: "Mostrando 0 registros",
        infoFiltered: "(filtrado de _MAX_ registros en total)",
        search: "Buscar:",
        paginate: {
            previous: "Anterior",
            next: "Siguiente"
        }
    }
};

// ============================
// INICIALIZACIÓN CUANDO CARGA LA PÁGINA
// ============================
document.addEventListener("DOMContentLoaded", () => {
    inicializarTablaMunicipios();
    ocultarSpinnerGeneral();
    configurarEventosTabla();
    inicializarTooltips();
    enlazarBotonEmptyState();
});

// ============================
// HELPERS UI
// ============================

/**
 * Inicializa tooltips de Bootstrap de forma segura (evita duplicados).
 */
function inicializarTooltips() {
    const elementos = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    elementos.forEach(el => {
        const inst = bootstrap.Tooltip.getInstance(el);
        if (inst) inst.dispose();
        new bootstrap.Tooltip(el, {
            trigger: 'hover focus',
            container: 'body',
            boundary: 'viewport'
        });
    });
}

/**
 * Cierra y elimina cualquier tooltip antes de redibujar la tabla o abrir una
 * ventana. Así no queda flotando si desaparece su botón de origen.
 */
function cerrarTooltips() {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
        const instancia = bootstrap.Tooltip.getInstance(el);
        if (instancia) instancia.hide();
    });

    document.querySelectorAll('body > .tooltip').forEach(tooltip => tooltip.remove());
}

/**
 * Si existe el botón del empty state, lo enlaza al botón principal.
 */
function enlazarBotonEmptyState() {
    const btnEmpty = document.getElementById('btnCrearMunicipioEmpty');
    const btnHeader = document.getElementById('btnCrearMunicipio');
    if (btnEmpty && btnHeader) {
        btnEmpty.addEventListener('click', () => btnHeader.click());
    }
}

// ============================
// FUNCIONES PRINCIPALES
// ============================

/**
 * Inicializa la tabla de municipios usando DataTables.
 */
function inicializarTablaMunicipios() {
    if ($.fn.DataTable.isDataTable('#tablaMunicipios')) {
        return;
    }
    tablaMunicipios = $('#tablaMunicipios').DataTable(dtConfigMunicipios);
    $('#tablaMunicipios').on('draw.dt', function () {
        cerrarTooltips();
        inicializarTooltips();
    });
    crearFiltroEstadoMunicipios();
}

/**
 * Añade un filtro de estado junto al buscador de DataTables.
 * Se crea desde JavaScript para mantener intacta la tabla del proyecto.
 */
function crearFiltroEstadoMunicipios() {
    const filtroDataTable = document.querySelector('#tablaMunicipios_filter');

    if (!filtroDataTable || document.getElementById('filtroEstadoMunicipio')) {
        return;
    }

    const contenedor = document.createElement('div');
    contenedor.className = 'panel-table-search-tools';

    const selector = document.createElement('select');
    selector.id = 'filtroEstadoMunicipio';
    selector.className = 'form-select panel-table-status-filter';
    selector.setAttribute('aria-label', 'Filtrar municipios por estado');

    selector.innerHTML = `
        <option value="">Todos los estados</option>
        <option value="Publicado">Publicados</option>
        <option value="Borrador">Borradores</option>
        <option value="Inactivo">Inactivos</option>
    `;

    // Conservamos el buscador generado por DataTables y añadimos el filtro.
    const etiquetaBuscador = filtroDataTable.querySelector('label');

    if (etiquetaBuscador) {
        contenedor.appendChild(etiquetaBuscador);
    }

    contenedor.appendChild(selector);
    filtroDataTable.appendChild(contenedor);

    selector.addEventListener('change', function () {
        const estado = selector.value;

        tablaMunicipios
            .column(4)
            .search(estado ? `^${estado}$` : '', true, false)
            .draw();
    });
}

/**
 * Oculta el spinner de carga general una vez que todo ha terminado de cargar.
 */
function ocultarSpinnerGeneral() {
    const loader = document.getElementById('loaderOverlayPanel');

    // Mostramos el contenido solo cuando DataTables ya está preparado.
    document.body.classList.remove('panel-loading');
    document.body.classList.add('panel-ready');

    if (loader) {
        loader.classList.add('hidden');
    }
}

/**
 * Configura los eventos de la tabla (editar, eliminar, publicar, previsualizar).
 * ✅ Event delegation (1 sola vez).
 */
function configurarEventosTabla() {
    if (eventosTablaConfigurados) return;
    eventosTablaConfigurados = true;

    const tabla = document.querySelector("#tablaMunicipios");

    if (tabla) {
        tabla.addEventListener("click", (e) => {
            cerrarTooltips();

            const btnEditar = e.target.closest(".btn-editar");
            const btnEliminar = e.target.closest(".btn-eliminar");
            const btnPublicar = e.target.closest(".btn-publicar");
            const btnPrevisualizar = e.target.closest(".btn-previsualizar");

            if (btnEditar) {
                const codMun = btnEditar.dataset.id;
                editarMunicipio(codMun); // Función de wizard.js
            }

            if (btnEliminar) {
                const codMun = btnEliminar.dataset.id;
                confirmarEliminarMunicipio(codMun);
            }

            if (btnPublicar) {
                const codMun = btnPublicar.dataset.id;
                const activo = btnPublicar.dataset.activo;
                confirmarPublicarMunicipio(codMun, activo);
            }

            if (btnPrevisualizar) {
                const codMun = btnPrevisualizar.dataset.codmun;
                if (codMun) {
                    const url = `php/municipio/municipio.php?cod_mun=${encodeURIComponent(codMun)}&preview=1`;
                    window.open(url, "_blank");
                }
                return;
            }
        });
    }
}

/**
 * Muestra una alerta para confirmar la eliminación de un municipio.
 * @param {string} codMun - Código INE del municipio
 */
function confirmarEliminarMunicipio(codMun) {
    Swal.fire({
        title: '¿Eliminar municipio?',
        text: "Esta acción no se puede deshacer",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#540000',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            eliminarMunicipio(codMun);
        }
    });
}

/**
 * Desactiva el municipio (activo = false) y actualiza la tabla.
 * @param {string} codMun - Código del municipio a desactivar.
 */
function eliminarMunicipio(codMun) {
    const formData = new FormData();
    formData.append("modo", "desactivar");
    formData.append("cod_mun", codMun);

    fetch("php/gestion/acciones/acciones_panel.php", {
        method: "POST",
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Municipio desactivado',
                    html: `
                    <p>El municipio ha sido desactivado correctamente.</p>
                    <p class="mb-0 text-start">
                        <i class="bi bi-info-circle-fill text-primary me-1"></i>
                        Ya no será visible públicamente hasta que se reactive.
                    </p>
                `,
                    confirmButtonText: 'Entendido',
                    customClass: {
                        popup: 'text-sm',
                        confirmButton: 'btn btn-primary'
                    },
                    buttonsStyling: false
                });
                recargarTablaMunicipios();
            } else {
                Swal.fire("Error", data.message || "No se pudo desactivar el municipio.", "error");
            }
        })
        .catch(err => {
            console.error(err);
            Swal.fire("Error", "No se pudo conectar con el servidor.", "error");
        });
}

function confirmarPublicarMunicipio(codMun, activo) {
    if (activo === "1" || activo === 1 || activo === "true") {
        Swal.fire({
            icon: 'info',
            title: 'Ya está publicado',
            text: 'Este municipio ya es público y visible.',
            confirmButtonText: 'Entendido',
            customClass: {
                confirmButton: 'btn btn-primary'
            },
            buttonsStyling: false
        });
        return;
    }

    validarMunicipioCompleto(codMun)
        .then(result => {
            if (!result.ok) {
                Swal.fire({
                    width: '850px',
                    icon: 'error',
                    title: 'Error al validar',
                    html: `
                        <p style="text-align:justify; margin-bottom: 0;">
                            No se ha podido comprobar el estado del municipio. 
                            Inténtalo de nuevo en unos minutos.
                        </p>
                    `,
                    confirmButtonText: 'Entendido',
                    customClass: { confirmButton: 'btn btn-primary' },
                    buttonsStyling: false
                });
                return;
            }

            if (!result.completo) {
                const listaHtml = (result.pasosIncompletos && result.pasosIncompletos.length)
                    ? `
                        <ul class="mb-0" style="padding-left: 1.2rem; font-size:0.93rem; column-count: 1; column-gap: 1.5rem;">
                            ${result.pasosIncompletos.map(p => `<li>${p}</li>`).join('')}
                        </ul>
                      `
                    : '<span class="text-muted">No se han podido obtener los pasos pendientes.</span>';

                Swal.fire({
                    width: '650px',
                    icon: 'warning',
                    title: 'Municipio incompleto',
                    html: `
                        <div class="text-start">
                            <p style="text-align:justify; margin-bottom: 12px;">
                                Antes de publicar el municipio, debes completar todos los 
                                <strong>pasos obligatorios</strong> del asistente.
                            </p>

                            <div class="alert alert-light border mb-0" style="font-size:0.9rem;">
                                <div class="fw-semibold mb-2">
                                    <i class="bi bi-list-check text-warning me-1"></i>
                                    Pasos que todavía están pendientes:
                                </div>
                                ${listaHtml}
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'Volver al asistente',
                    customClass: { confirmButton: 'btn btn-primary' },
                    buttonsStyling: false
                });

                return;
            }

            Swal.fire({
                title: '¿Publicar municipio?',
                text: "Esto hará que el municipio esté visible públicamente.",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#198754',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sí, publicar',
                cancelButtonText: 'Cancelar'
            }).then((swalResult) => {
                if (swalResult.isConfirmed) {
                    publicarMunicipio(codMun);
                }
            });
        });
}

function validarMunicipioCompleto(codMun) {
    const formData = new FormData();
    formData.append('modo', 'validar_publicacion');
    formData.append('cod_mun', codMun);

    return fetch('php/gestion/acciones/acciones_panel.php', {
        method: 'POST',
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                return {
                    ok: false,
                    completo: false,
                    pasosIncompletos: [],
                    mensaje: data.message || 'No se pudo validar el municipio.'
                };
            }

            return {
                ok: true,
                completo: !!data.completo,
                pasosIncompletos: data.pasosIncompletos || []
            };
        })
        .catch(err => {
            console.error('Error en validarMunicipioCompleto:', err);
            return {
                ok: false,
                completo: false,
                pasosIncompletos: [],
                mensaje: 'Error de comunicación con el servidor.'
            };
        });
}

function publicarMunicipio(codMun) {
    const formData = new FormData();
    formData.append("modo", "publicar");
    formData.append("cod_mun", codMun);

    fetch("php/gestion/acciones/acciones_panel.php", {
        method: "POST",
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success && data.code === 'VALIDACION_INCOMPLETA') {
                const lista = data.pasosIncompletos && data.pasosIncompletos.length
                    ? '<ul class="text-start mb-0">' +
                    data.pasosIncompletos.map(p => `<li>${p}</li>`).join('') +
                    '</ul>'
                    : '';

                Swal.fire({
                    icon: 'warning',
                    title: 'Municipio incompleto',
                    html: `
                    <p class="mb-2">El municipio no se ha podido publicar porque tiene pasos incompletos:</p>
                    ${lista}
                `,
                    confirmButtonText: 'Entendido',
                    customClass: { confirmButton: 'btn btn-primary' },
                    buttonsStyling: false
                });
                return;
            }

            if (!data.success) {
                Swal.fire("Error", data.message || "No se pudo activar el municipio.", "error");
                return;
            }

            Swal.fire({
                icon: 'success',
                title: 'Municipio publicado',
                text: data.message || 'Ahora es visible en la página pública.',
                confirmButtonText: 'Entendido',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            });

            recargarTablaMunicipios();
        })
        .catch(err => {
            console.error(err);
            Swal.fire("Error", "No se pudo conectar con el servidor.", "error");
        });
}

/*******************************************
 * ACTUALIZAR TABLA SIN RECARGAR PÁGINA
 *******************************************/
function recargarTablaMunicipios() {
    // 1. Elementos que se actualizan sin recargar toda la página.
    const mensajeVacio = document.getElementById("mensajeSinMunicipios");
    const contenedorTabla = document.getElementById("contenedorTablaMunicipios");
    const spinnerTabla = document.getElementById("spinnerTablaMunicipios");
    const tabla = document.getElementById("tablaMunicipios");
    const cuerpoTabla = tabla?.querySelector("tbody");

    spinnerTabla?.classList.remove("d-none");
    contenedorTabla?.setAttribute("aria-busy", "true");

    fetch("php/gestion/acciones/acciones_panel.php?action=listarMunicipios")
        .then(function (respuesta) {
            if (!respuesta.ok) {
                throw new Error("No se pudo actualizar el listado.");
            }

            return respuesta.json();
        })
        .then(function (datos) {
            if (!datos.success) {
                throw new Error(datos.message || "No se pudo actualizar el listado.");
            }

            const municipios = datos.data || [];

            // Destruir DataTables antes de modificar las filas.
            if ($.fn.DataTable.isDataTable("#tablaMunicipios")) {
                $("#tablaMunicipios").DataTable().destroy();
            }

            if (cuerpoTabla) {
                cuerpoTabla.innerHTML = municipios
                    .map(function (municipio) {
                        return crearFilaMunicipio(municipio);
                    })
                    .join("");
            }

            const sinMunicipios = municipios.length === 0;
            mensajeVacio?.classList.toggle("d-none", !sinMunicipios);
            contenedorTabla?.classList.toggle("d-none", sinMunicipios);

            if (!sinMunicipios) {
                tablaMunicipios = $("#tablaMunicipios").DataTable(dtConfigMunicipios);
                crearFiltroEstadoMunicipios();
                inicializarTooltips();
            }
        })
        .catch(function (error) {
            console.error("Error al cargar municipios:", error);

            Swal.fire(
                "No se pudo actualizar",
                "Vuelve a intentarlo dentro de unos segundos.",
                "error"
            );
        })
        .finally(function () {
            spinnerTabla?.classList.add("d-none");
            contenedorTabla?.removeAttribute("aria-busy");
            enlazarBotonEmptyState();
            limpiarPaddingFantasmaBody();
        });
}

/**
 * Crea el HTML de una fila del panel.
 *
 * @param {Object} municipio Datos recibidos desde acciones_panel.php.
 * @returns {string} Fila preparada para insertar en la tabla.
 */
function crearFilaMunicipio(municipio) {
    const codMun = String(municipio.cod_mun || "");
    const nombre = String(municipio.nombre || "—");
    const correoArquitecto = String(municipio.correo_contacto || "—");
    const correoGestor = String(municipio.correo_contacto_gestor || "—");
    const esActivo = esValorVerdadero(municipio.activo);
    const progreso = municipio.progreso_asistente || {};
    const pasos = Array.isArray(progreso.pasos)
        ? progreso.pasos
        : [false, false, false, false, false, false, false];
    const completados = Number(progreso.completados || 0);
    const total = Number(progreso.total || 7);

    let estadoTexto = "Inactivo";
    let estadoClase = "status-inactivo";

    if (esActivo) {
        estadoTexto = "Publicado";
        estadoClase = "status-publicado";
    } else if (completados > 0) {
        estadoTexto = "Borrador";
        estadoClase = "status-borrador";
    }

    const pasosHtml = pasos.map(function (completado, indice) {
        const estaCompleto = esValorVerdadero(completado);
        const clase = estaCompleto ? " is-complete" : "";
        const icono = estaCompleto ? "bi-check" : "bi-dot";
        const titulo = estaCompleto ? "completado" : "pendiente";

        return `
            <span class="assistant-progress__step${clase}" title="Paso ${indice + 1} ${titulo}">
                <i class="bi ${icono}"></i>
            </span>
        `;
    }).join("");

    const fechaHtml = municipio.fecha_modificacion
        ? `
            <span class="date-pill">
                <i class="bi bi-calendar3"></i>
                ${escapeHtml(formatearFechaHora(municipio.fecha_modificacion))}
            </span>
          `
        : '<span class="text-muted">—</span>';

    return `
        <tr>
            <td class="codigo-celda">${escapeHtml(codMun)}</td>
            <td class="municipio-celda">${escapeHtml(nombre)}</td>
            <td class="email-celda" title="${escapeAttr(correoArquitecto)}">${escapeHtml(correoArquitecto)}</td>
            <td class="email-celda" title="${escapeAttr(correoGestor)}">${escapeHtml(correoGestor)}</td>
            <td>
                <span class="panel-status ${estadoClase}">
                    <i class="bi ${esActivo ? "bi-check-circle" : "bi-circle"}"></i>
                    ${estadoTexto}
                </span>
            </td>
            <td>
                <div class="assistant-progress" aria-label="${completados} de ${total} pasos completados">
                    <div class="assistant-progress__steps">${pasosHtml}</div>
                    <small>${completados}/${total} pasos</small>
                </div>
            </td>
            <td class="fecha-celda">${fechaHtml}</td>
            <td>
                <div class="acciones-wrap">
                    <button
                        type="button"
                        class="btn btn-warning btn-sm btn-editar btn-accion"
                        data-id="${escapeAttr(codMun)}"
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        title="Editar POU"
                        aria-label="Editar POU">
                        <i class="bi bi-pencil-square" aria-hidden="true"></i>
                    </button>

                    <a
                        class="btn btn-primary btn-sm btn-configurar-portal btn-accion"
                        href="php/gestion/configurador_portal.php?cod_mun=${encodeURIComponent(codMun)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        title="Configurar portal"
                        aria-label="Configurar portal">
                        <i class="bi bi-sliders" aria-hidden="true"></i>
                    </a>

                    <button
                        type="button"
                        class="btn btn-outline-primary btn-sm btn-previsualizar btn-accion"
                        data-codmun="${escapeAttr(codMun)}"
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        title="Previsualizar portal"
                        aria-label="Previsualizar portal">
                        <i class="bi bi-eye" aria-hidden="true"></i>
                    </button>

                    <button
                        type="button"
                        class="btn btn-success btn-sm btn-publicar btn-accion"
                        data-id="${escapeAttr(codMun)}"
                        data-activo="${esActivo ? "1" : "0"}"
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        title="${esActivo ? "Actualizar publicación" : "Publicar portal"}"
                        aria-label="${esActivo ? "Actualizar publicación" : "Publicar portal"}">
                        <i class="bi bi-upload" aria-hidden="true"></i>
                    </button>

                    <button
                        type="button"
                        class="btn btn-outline-danger btn-sm btn-eliminar btn-accion"
                        data-id="${escapeAttr(codMun)}"
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        title="Desactivar municipio"
                        aria-label="Desactivar municipio">
                        <i class="bi bi-trash" aria-hidden="true"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Convierte los distintos formatos booleanos de PostgreSQL y PHP.
 */
function esValorVerdadero(valor) {
    return valor === true
        || valor === 1
        || valor === "1"
        || valor === "true"
        || valor === "t"
        || valor === "T";
}



function formatearFechaHora(fecha) {
    const date = new Date(fecha);

    return date.toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function limpiarPaddingFantasmaBody() {
    document.body.style.paddingRight = '0px';
    if (document.body.getAttribute('style') && document.body.getAttribute('style').includes('padding-right')) {
        document.body.style.paddingRight = '0px';
    }
}

(function fixBodyPaddingRightInit() {
    const limpiar = () => limpiarPaddingFantasmaBody();

    document.addEventListener('shown.bs.modal', limpiar);
    document.addEventListener('hidden.bs.modal', limpiar);

    if (typeof Swal !== "undefined") {
        const originalFire = Swal.fire.bind(Swal);
        Swal.fire = (...args) =>
            originalFire(...args).then((res) => {
                limpiar();
                return res;
            });
    }

    window.addEventListener('load', limpiar);
})();
