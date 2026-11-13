/*******************************************
 *  GESTIÓN DE DOCUMENTOS DEL WIZARD / PANEL
 *  Archivo: documentosWizard.js
 *
 *  - Se usa en:
 *      · Paso 4 del wizard (dentro del modal)
 *      · Pantalla completa panel_documentos.php
 *******************************************/

// Estado global para saber si estamos editando
let documentoEditandoId = null;

// Usaremos estas globales para controlar edición
window.documentoEnEdicion = null;
window.archivoOriginalEnEdicion = null;
window.tituloOriginalEnEdicion = null;

// 👉 referencia global a la DataTable de documentos
let tablaDocumentos = null;
const MAX_DOCUMENTO_MB = 8;
const MAX_DOCUMENTO_BYTES = MAX_DOCUMENTO_MB * 1024 * 1024;

/**
 * Spinner + botón (dentro del botón)
 * - No uses btn.textContent porque rompe el <span> del spinner.
 */
function setLoadingDocumento(loading, texto) {
    const btn = document.getElementById('btnSubirDocumento');
    const spn = document.getElementById('spinnerSubirDocumento');
    const txt = btn?.querySelector('.btn-text');

    // Si estamos en el wizard antiguo donde el spinner era un div,
    // no hacemos nada (evita errores).
    if (!btn || !spn || !txt) return;

    if (loading) {
        btn.setAttribute('disabled', true);
        spn.classList.remove('d-none');
        txt.textContent = texto || 'Procesando...';
    } else {
        btn.removeAttribute('disabled');
        spn.classList.add('d-none');
    }
}

/**
 * Restablecer texto del botón según modo
 */
function setTextoBotonNormal() {
    const btn = document.getElementById('btnSubirDocumento');
    const txt = btn?.querySelector('.btn-text');
    if (!txt) return;
    txt.textContent = window.documentoEnEdicion ? 'Actualizar documento' : 'Subir documento';
}

/**
 * Mostrar estado de carga del resumen de documentos
 *
 * Se utiliza mientras se están solicitando los documentos al servidor.
 * Muestra UN ÚNICO spinner con el texto "Cargando documentos..." tanto en:
 *  - El resumen principal (chips de fases + últimos documentos)
 *  - El panel lateral de resumen por fases (si existe)
 *
 * Durante la carga:
 *  - Se vacían los chips de fases
 *  - Se evita mostrar múltiples spinners para no recargar la interfaz
 *
 * Una vez cargados los documentos, esta vista se reemplaza automáticamente
 * por el contenido real en `actualizarResumenDocumentos()`.
 */
function mostrarLoadingResumenDocumentos() {
    // 1) Resumen de documentos (card donde salen chips + últimos)
    const chips = document.getElementById('chipsFasesDocs');
    const lista = document.getElementById('listaUltimosDocs');

    if (chips) chips.innerHTML = ''; // vacía chips durante carga
    if (lista) {
        lista.innerHTML = `
          <div class="d-flex align-items-center gap-2 text-muted small">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Cargando documentos...
          </div>
        `;
    }

    // 2) Panel lateral (panel_documentos.php) -> si existe
    const resumenPanel = document.getElementById('resumenDocumentosPanel');
    if (resumenPanel) {
        resumenPanel.innerHTML = `
          <li class="d-flex align-items-center gap-2 text-muted">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Cargando documentos...
          </li>
        `;
    }
}


/**
 * Cargar documentos de un municipio y:
 *  - Pintar la tabla
 *  - Actualizar el resumen (badge, chips, últimos docs y panel lateral)
 *  - Avisar a panel_documentos.php para ocultar su spinner
 */
function cargarDocumentos(cod_mun) {
    if (!cod_mun) {
        console.warn('cargarDocumentos llamado sin cod_mun');
        document.dispatchEvent(new Event('documentosCargados'));
        return;
    }

    // mostrar spinner en resumen / últimos / chips
    mostrarLoadingResumenDocumentos();

    fetch(`php/gestion/acciones/acciones_documentos.php?action=listarDocumentos&cod_mun=${encodeURIComponent(cod_mun)}`)
        .then(res => res.json())
        .then(data => {
            const documentos = data && data.success ? (data.data || []) : [];

            if (typeof renderizarTablaDocumentos === 'function') {
                renderizarTablaDocumentos(documentos);
            }

            actualizarResumenDocumentos(documentos);
        })
        .catch(err => {
            console.error('Error al cargar documentos:', err);
        })
        .finally(() => {
            document.dispatchEvent(new Event('documentosCargados'));
        });
}

// ============================
// FUNCIÓN: renderizarTablaDocumentos
// ============================
function renderizarTablaDocumentos(documentos) {
    const wrapper = document.getElementById('tablaDocumentosWrapper');
    if (!wrapper) return;

    if (!documentos || documentos.length === 0) {
        if (tablaDocumentos) {
            tablaDocumentos.destroy();
            tablaDocumentos = null;
        }
        wrapper.innerHTML = `
            <div class="alert alert-info text-center mb-0">
                No hay documentos subidos todavía.
            </div>
        `;
        return;
    }

    let tablaHtml = `
        <table id="tablaDocumentos" class="table table-hover table-sm table-bordered w-100">
            <thead class="table-light">
                <tr>
                    <th style="width: 40%;">Título</th>
                    <th class="text-center" style="width: 10%;">Fase</th>
                    <th class="text-center" style="width: 25%;">Categoría</th>
                    <th class="text-center" style="width: 10%;">Fecha</th>
                    <th class="text-center" style="width: 15%;">Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    documentos.forEach(doc => {
        const fecha     = doc.fecha_creacion ? new Date(doc.fecha_creacion).toLocaleDateString() : '-';
        const categoria = doc.categoria || '-';

        const faseNum   = doc.codigo_fase ?? doc.num_fase ?? '';
        const faseDesc  = doc.descripcion_fase ?? doc.descripcion ?? '';

        tablaHtml += `
            <tr>
                <td title="${escapeAttr(doc.titulo)}">${doc.titulo}</td>
                <td class="text-center fase-cell"
                    data-fase-codigo="${escapeAttr(faseNum)}"
                    data-fase-id="${escapeAttr(doc.num_fase)}"
                    title="${escapeAttr(faseDesc)}">
                    ${faseNum}
                </td>
                <td class="text-center categoria-cell" title="${escapeAttr(categoria)}">
                    ${categoria}
                </td>
                <td class="text-center">${fecha}</td>
                <td class="text-center">
                    <div class="d-flex justify-content-center gap-1 flex-nowrap">
                        <a href="${escapeAttr(doc.archivo_url)}"
                           target="_blank"
                           class="btn btn-outline-primary btn-sm btn-icon"
                           title="Ver documento"
                           aria-label="Ver documento">
                            <i class="bi bi-eye"></i>
                        </a>

                        <button 
                            class="btn btn-outline-secondary btn-sm btn-icon btn-editar-documento"
                            type="button"
                            title="Editar documento"
                            aria-label="Editar documento"
                            data-id="${doc.id}"
                            data-url="${escapeAttr(doc.archivo_url)}">
                            <i class="bi bi-pencil"></i>
                        </button>

                        <button
                            class="btn btn-outline-danger btn-sm btn-icon btn-eliminar-documento"
                            type="button"
                            title="Eliminar documento"
                            aria-label="Eliminar documento"
                            data-id="${doc.id}"
                            data-url="${escapeAttr(doc.archivo_url)}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tablaHtml += `</tbody></table>`;

    wrapper.innerHTML = `
        <div id="controlesTablaDocumentos" class="row g-3 align-items-end mb-3">
            <div class="col-md-4 col-lg-3">
                <label class="form-label d-block">Ordenar por</label>
                <div class="btn-group w-100" role="group">
                    <button type="button"
                            id="btnOrdenPorFecha"
                            class="btn btn-outline-primary btn-sm active">
                        Fecha
                    </button>
                    <button type="button"
                            id="btnOrdenPorFase"
                            class="btn btn-outline-primary btn-sm">
                        Fase
                    </button>
                </div>
            </div>

            <div class="col-md-4 col-lg-3">
                <label for="filtroFaseDocumento" class="form-label">Filtrar por fase</label>
                <select id="filtroFaseDocumento"
                        class="form-select form-select-sm">
                    <option value="">Todas las fases</option>
                </select>
            </div>

            <div class="col-md-4 col-lg-3">
                <label for="filtroCategoriaDocumento" class="form-label">Filtrar por categoría</label>
                <select id="filtroCategoriaDocumento"
                        class="form-select form-select-sm">
                    <option value="">Todas las categorías</option>
                </select>
            </div>
        </div>

        <div class="documentos-table-region mt-2">
            ${tablaHtml}
        </div>
    `;

    if (tablaDocumentos) {
        tablaDocumentos.destroy();
        tablaDocumentos = null;
    }

    tablaDocumentos = new DataTable('#tablaDocumentos', {
        pageLength: 10,
        lengthChange: true,
        searching: true,
        info: true,
        autoWidth: false,
        responsive: false,
        scrollY: '260px',
        scrollCollapse: false,
        order: [[3, 'desc']],
        columnDefs: [{ orderable: false, targets: 4 }],
        language: {
            lengthMenu: 'Mostrar _MENU_ documentos',
            zeroRecords: 'No se encontraron documentos',
            info: 'Mostrando _START_ a _END_ de _TOTAL_ documentos',
            infoEmpty: 'Mostrando 0 documentos',
            infoFiltered: '(filtrado de _MAX_ documentos totales)',
            search: 'Buscar:',
            paginate: { previous: 'Anterior', next: 'Siguiente' }
        }
    });

    configurarControlesTablaDocumentos();
    prepararAjusteAltoTablaDocumentosPanel();
    setTimeout(ajustarAltoTablaDocumentosPanel, 0);
    try { tablaDocumentos.on('draw', () => setTimeout(ajustarAltoTablaDocumentosPanel, 0)); } catch (_) { }
}


// ============================
// Ajuste de alto de tabla en panel_documentos.php
// ============================
function prepararAjusteAltoTablaDocumentosPanel() {
    if (!document.body.classList.contains('page-panel-documentos')) return;
    if (window.__ajusteTablaDocumentosPanelPreparado) return;

    window.__ajusteTablaDocumentosPanelPreparado = true;
    window.addEventListener('resize', () => {
        window.clearTimeout(window.__ajusteTablaDocumentosPanelTimer);
        window.__ajusteTablaDocumentosPanelTimer = window.setTimeout(ajustarAltoTablaDocumentosPanel, 80);
    });
}

function ajustarAltoTablaDocumentosPanel() {
    if (!document.body.classList.contains('page-panel-documentos')) return;
    if (!tablaDocumentos) return;

    const wrapper = document.getElementById('tablaDocumentosWrapper');
    const scrollBody = wrapper?.querySelector('.dataTables_scrollBody');
    const dtWrapper = wrapper?.querySelector('.dataTables_wrapper');
    if (!wrapper || !scrollBody || !dtWrapper) return;

    const footer = document.querySelector('.footer-dpm');
    const footerTop = footer ? footer.getBoundingClientRect().top : window.innerHeight;
    const bottomRow = dtWrapper.querySelector('.row:last-child');
    const bottomControlsHeight = bottomRow ? bottomRow.getBoundingClientRect().height : 46;
    const scrollTop = scrollBody.getBoundingClientRect().top;

    const available = Math.max(140, Math.floor(footerTop - scrollTop - bottomControlsHeight - 14));
    scrollBody.style.height = `${available}px`;
    scrollBody.style.maxHeight = `${available}px`;

    try {
        tablaDocumentos.columns.adjust();
    } catch (_) { }
}

// ============================
// Configurar filtros y orden de la tabla
// ============================
function configurarControlesTablaDocumentos() {
    if (!tablaDocumentos) return;

    const wrapper = document.getElementById('tablaDocumentosWrapper');
    if (!wrapper) return;

    const filtroInput = wrapper.querySelector('#tablaDocumentos_filter input') ||
                        document.querySelector('#tablaDocumentos_filter input');

    if (filtroInput) {
        filtroInput.placeholder = 'Buscar por título';
        filtroInput.classList.add('form-control-sm');
    }

    const dataTablesWrapper = wrapper.querySelector('.dataTables_wrapper');
    if (dataTablesWrapper) {
        dataTablesWrapper.classList.add('mt-2');
    }

    const colFase      = tablaDocumentos.column(1);
    const colCategoria = tablaDocumentos.column(2);

    const selectFase      = document.getElementById('filtroFaseDocumento');
    const selectCategoria = document.getElementById('filtroCategoriaDocumento');
    if (!selectFase || !selectCategoria) return;

    selectFase.length = 1;
    const fases = Array.from(new Set(colFase.data().toArray()))
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
        .sort((a, b) => String(a).localeCompare(String(b), 'es'));

    fases.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = 'Fase ' + f;
        selectFase.appendChild(opt);
    });

    selectCategoria.length = 1;
    const categorias = Array.from(new Set(colCategoria.data().toArray()))
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
        .sort((a, b) => String(a).localeCompare(String(b), 'es'));

    categorias.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        selectCategoria.appendChild(opt);
    });

    selectFase.addEventListener('change', function () {
        const val = (this.value || '').trim();

        if (!val) {
            colFase.search('', false, false).draw(); // reset
            return;
        }

        // Coincidencia exacta: ^valor$
        const escaped = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        colFase.search(`^${escaped}$`, true, false).draw();
    });

    selectCategoria.addEventListener('change', function () {
        colCategoria.search(this.value || '').draw();
    });

    const btnOrdenFecha = document.getElementById('btnOrdenPorFecha');
    const btnOrdenFase  = document.getElementById('btnOrdenPorFase');

    if (btnOrdenFecha) {
        btnOrdenFecha.addEventListener('click', () => {
            tablaDocumentos.order([[3, 'desc']]).draw();
            btnOrdenFecha.classList.add('active');
            btnOrdenFase && btnOrdenFase.classList.remove('active');
        });
    }

    if (btnOrdenFase) {
        btnOrdenFase.addEventListener('click', () => {
            tablaDocumentos.order([[1, 'asc']]).draw();
            btnOrdenFase.classList.add('active');
            btnOrdenFecha && btnOrdenFecha.classList.remove('active');
        });
    }
}

/**
 * Resumen
 */
function actualizarResumenDocumentos(documentos) {
    const total = documentos.length;
    const textoDocs = (n) => n === 1 ? '1 documento' : `${n} documentos`;

    const badge = document.getElementById('badgeTotalDocs');
    if (badge) badge.textContent = textoDocs(total);

    const badgePanel = document.getElementById('badgeTotalDocsPanel');
    if (badgePanel) badgePanel.textContent = textoDocs(total);

    const chips = document.getElementById('chipsFasesDocs');
    if (chips) {
        chips.innerHTML = '';
        if (total === 0) {
            chips.innerHTML = '<span class="text-muted small">Sin documentos por ahora.</span>';
        } else {
            const porFase = {};
            documentos.forEach(doc => {
                const fase = doc.codigo_fase ?? doc.num_fase ?? doc.fase ?? '—';
                porFase[fase] = (porFase[fase] || 0) + 1;
            });

            Object.entries(porFase).forEach(([fase, cuenta]) => {
                const chip = document.createElement('span');
                chip.className = 'badge rounded-pill bg-light text-primary border me-1 mb-1';
                chip.textContent = `Fase ${fase}: ${textoDocs(cuenta)}`;
                chips.appendChild(chip);
            });
        }
    }

    const lista = document.getElementById('listaUltimosDocs');
    if (lista) {
        lista.innerHTML = '';
        if (total === 0) {
            lista.innerHTML = `<p class="text-muted small mb-0">Todavía no hay documentos subidos para este municipio.</p>`;
        } else {
            const ultimos = [...documentos]
                .sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion))
                .slice(0, 3);

            const info = document.createElement('p');
            info.className = 'text-muted small mb-2';
            info.textContent = (ultimos.length === total)
                ? `Se muestran todos los ${textoDocs(total)}.`
                : `Se muestran los ${ultimos.length} últimos documentos de un total de ${textoDocs(total)}.`;
            lista.appendChild(info);

            ultimos.forEach(doc => {
                const fecha = doc.fecha_creacion ? new Date(doc.fecha_creacion).toLocaleDateString() : '-';
                const fase  = doc.codigo_fase ?? doc.num_fase ?? doc.fase ?? '—';

                const item = document.createElement('div');
                item.className = 'list-group-item px-0 py-1 border-0 d-flex justify-content-between align-items-center';
                item.innerHTML = `
                    <div class="me-2">
                        <div class="fw-semibold">${escapeAttr(doc.titulo || '')}</div>
                        <small class="text-muted">${escapeAttr(doc.categoria || '')} · Fase ${escapeAttr(fase)}</small>
                    </div>
                    <small class="text-muted">${fecha}</small>
                `;
                lista.appendChild(item);
            });
        }
    }

    const resumenPanel = document.getElementById('resumenDocumentosPanel');
    if (resumenPanel) {
        resumenPanel.innerHTML = '';
        if (total === 0) {
            resumenPanel.innerHTML = `<li class="text-muted">Todavía no hay documentos para este municipio.</li>`;
        } else {
            const liTotal = document.createElement('li');
            liTotal.innerHTML = `<strong>Total:</strong> ${textoDocs(total)}`;
            resumenPanel.appendChild(liTotal);

            const porFase = {};
            documentos.forEach(doc => {
                const fase = doc.codigo_fase ?? doc.num_fase ?? doc.fase ?? '—';
                porFase[fase] = (porFase[fase] || 0) + 1;
            });

            Object.entries(porFase).forEach(([fase, cuenta]) => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>Fase ${fase}:</strong> ${textoDocs(cuenta)}`;
                resumenPanel.appendChild(li);
            });
        }
    }
}

// ============================
// Cargar fases en <select id="fase_documento">
// ============================
function cargarFasesDocumento() {
    fetch('php/gestion/acciones/acciones_documentos.php?action=listarFasesDocumentos')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('fase_documento');
            if (!select) return;

            select.innerHTML = '<option value="">-- Selecciona la fase --</option>';

            if (data.success && Array.isArray(data.data)) {
                data.data.forEach(fase => {
                    const opt = document.createElement('option');
                    opt.value = fase.num_fase;
                    opt.textContent = fase.label || `${fase.codigo} - ${fase.titulo}`;
                    select.appendChild(opt);
                });
            }
        })
        .catch(err => console.error('Error al cargar fases:', err));
}

// ============================
// Cargar categorías existentes
// ============================
function cargarCategoriasDocumento() {
    fetch('php/gestion/acciones/acciones_documentos.php?action=listarCategorias')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('categoria_documento');
            if (!select) return;

            select.innerHTML = '<option value="">-- Selecciona una categoría --</option>';

            if (data.success && data.data) {
                data.data.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.nombre;
                    select.appendChild(option);
                });
            }
        });
}

// ============================
// Submit formulario (crear/editar)
// ============================
document.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'formSubirDocumento') {
        e.preventDefault();

        const form = e.target;
        const archivoInput   = form.querySelector('#archivo_documento');
        const faseInput      = form.querySelector('#fase_documento');
        const categoriaInput = form.querySelector('#categoria_documento');
        const tituloInput    = form.querySelector('#titulo_documento');

        if (!faseInput || !categoriaInput) {
            Swal.fire("Error", "No se han encontrado los campos de fase o categoría en el formulario.", "error");
            return;
        }

        const faseVal      = (faseInput.value || '').trim();
        const categoriaVal = (categoriaInput.value || '').trim();
        const tituloVal    = (tituloInput?.value || '').trim();

        if (!faseVal || !categoriaVal) {
            Swal.fire("Error", "Selecciona una fase y una categoría.", "warning");
            return;
        }

        if (!window.documentoEnEdicion && (!archivoInput || !archivoInput.files.length)) {
            Swal.fire("Error", "Selecciona un archivo para subir.", "warning");
            return;
        }

        if (!tituloVal) {
            Swal.fire("Error", "Introduce un título para el documento.", "warning");
            return;
        }

        if (typeof municipioGuardado !== 'undefined' && !municipioGuardado) {
            confirmarGuardarYContinuarSubidaDocumento();
            return;
        }

        subirDocumento();
    }
});

// ============================
// FUNCIÓN: subirDocumento
// ============================
function subirDocumento() {
    const archivoInput    = document.getElementById('archivo_documento');
    const faseSelect      = document.getElementById('fase_documento');
    const categoriaSelect = document.getElementById('categoria_documento');
    const tituloInput     = document.getElementById('titulo_documento');
    const codMunInput     = document.getElementById('cod_mun');

    if (!faseSelect || !categoriaSelect || !codMunInput) return;

    const archivo        = archivoInput?.files[0] || null;
    const fase           = faseSelect.value;
    const categoriaId    = categoriaSelect.value;
    const tituloVisible  = (tituloInput?.value || (archivo ? archivo.name : '')).trim();
    const codMun         = (codMunInput?.value || '').trim();

    if (!codMun) {
        Swal.fire("Error", "No se ha podido obtener el código INE del municipio.", "error");
        return;
    }

    if (!fase || !categoriaId) {
        Swal.fire("Error", "Selecciona una fase y una categoría.", "warning");
        return;
    }

    const esNuevoDocumento = !window.documentoEnEdicion;

    if (esNuevoDocumento && !archivo) {
        Swal.fire("Error", "Selecciona un archivo para subir.", "warning");
        return;
    }

    // ===== EDITANDO SIN CAMBIAR ARCHIVO =====
    if (!esNuevoDocumento && !archivo) {
        if (!window.archivoOriginalEnEdicion) {
            Swal.fire("Error", "No se encuentra la URL original del archivo.", "error");
            return;
        }

        mostrarOverlayDocumento('Actualizando documento…');
        setLoadingDocumento(true, 'Actualizando...');

        registrarDocumentoEnBBDD({
            cod_mun: codMun,
            fase_id: fase,
            categoria_id: categoriaId,
            titulo: tituloVisible || window.tituloOriginalEnEdicion || '',
            archivo_url: window.archivoOriginalEnEdicion,
            id: window.documentoEnEdicion
        });
        return;
    }

    if (archivo && archivo.size > MAX_DOCUMENTO_BYTES) {
        Swal.fire(
            "Archivo demasiado grande",
            `El documento pesa ${(archivo.size / 1024 / 1024).toFixed(2)} MB. El tamaño máximo permitido es ${MAX_DOCUMENTO_MB} MB.`,
            "warning"
        );
        return;
    }

    // ===== SUBIDA DE ARCHIVO (nuevo o edición con archivo nuevo) =====
    mostrarOverlayDocumento(esNuevoDocumento ? 'Subiendo documento…' : 'Actualizando documento…');
    setLoadingDocumento(true, esNuevoDocumento ? 'Subiendo...' : 'Actualizando...');

    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('cod_mun', codMun);
    formData.append('tipo', 'documento');
    formData.append('titulo', tituloVisible);

    fetch('php/gestion/archivos/subirArchivo.php', {
        method: 'POST',
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message || "Error al subir archivo");

            registrarDocumentoEnBBDD({
                cod_mun: codMun,
                fase_id: fase,
                categoria_id: categoriaId,
                titulo: tituloVisible || (archivo ? archivo.name : ''),
                archivo_url: data.url,
                id: esNuevoDocumento ? null : window.documentoEnEdicion
            });
        })
        .catch(err => {
            console.error(err);
            ocultarOverlayDocumento();
            setLoadingDocumento(false);
            setTextoBotonNormal();
            Swal.fire("Error", err.message || "No se pudo subir el documento.", "error");
        });
}

// ============================
// FUNCIÓN: registrarDocumentoEnBBDD
// ============================
function registrarDocumentoEnBBDD(payload) {
    const { cod_mun, fase_id, categoria_id, titulo, archivo_url, id = null } = payload;

    const datos = new URLSearchParams();
    datos.append('cod_mun', cod_mun);
    datos.append('fase_id', fase_id);
    datos.append('categoria_id', categoria_id);
    datos.append('titulo', titulo);
    datos.append('archivo_url', archivo_url);
    if (id) datos.append('id', id);

    const action = id ? 'actualizarDocumento' : 'guardarDocumento';

    fetch(`php/gestion/acciones/acciones_documentos.php?action=${action}`, {
        method: 'POST',
        body: datos
    })
        .then(res => res.json())
        .then(data => {
            ocultarOverlayDocumento();
            setLoadingDocumento(false);
            setTextoBotonNormal();

            if (!data.success) {
                Swal.fire("Error", data.message || "No se pudo guardar el documento.", "error");
                return;
            }

            Swal.fire({
                title: id ? "Actualizado" : "Subido",
                text: id ? "Documento actualizado correctamente." : "Documento guardado correctamente.",
                icon: "success",
                confirmButtonText: "OK",
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            });

            window.documentoEnEdicion = null;
            window.archivoOriginalEnEdicion = null;
            window.tituloOriginalEnEdicion = null;

            resetFormularioDocumento();

            // Cerrar modal SOLO si estamos en panel_documentos y estábamos editando
            if (window.modalDocumentoPanel && id) {
                window.modalDocumentoPanel.hide();
            }

            cargarDocumentos(cod_mun);
        })
        .catch(err => {
            console.error(err);
            ocultarOverlayDocumento();
            setLoadingDocumento(false);
            setTextoBotonNormal();
            Swal.fire("Error", err.message || "No se pudo guardar en la base de datos.", "error");
        });
}


// ============================
// Click en EDITAR
// ============================
document.addEventListener('click', function (e) {
    const boton = e.target.closest('.btn-editar-documento');
    if (!boton) return;

    const fila = boton.closest('tr');
    if (!fila) return;

    const tituloCelda    = fila.querySelector('td:nth-child(1)');
    const faseCelda      = fila.querySelector('.fase-cell');
    const categoriaCelda = fila.querySelector('.categoria-cell');

    const tituloTexto    = tituloCelda ? tituloCelda.textContent.trim() : '';
    const categoriaTexto = categoriaCelda ? categoriaCelda.textContent.trim() : '';
    const archivoUrl     = boton.dataset.url || '';
    const faseId         = faseCelda ? (faseCelda.dataset.faseId || '') : '';

    documentoEditandoId = boton.dataset.id;

    const inputTitulo = document.getElementById('titulo_documento');
    if (!inputTitulo) {
        // Redirección antigua (por si acaso)
        let codMun = window.datosWizard?.[1]?.cod_mun?.trim() || document.getElementById('cod_mun')?.value.trim() || '';
        const params = new URLSearchParams();
        if (codMun) params.set('cod_mun', codMun);
        params.set('abrirPaso', '4');
        params.set('doc_id', documentoEditandoId);
        window.location.href = `php/gestion/panel_gestion.php?${params.toString()}`;
        return;
    }

    const hiddenId = document.getElementById('documento_editando_id');
    if (hiddenId) hiddenId.value = documentoEditandoId;

    window.documentoEnEdicion       = documentoEditandoId;
    window.archivoOriginalEnEdicion = archivoUrl;
    window.tituloOriginalEnEdicion  = tituloTexto;

    inputTitulo.value = tituloTexto;

    const selectFase = document.getElementById('fase_documento');
    if (selectFase && faseId) selectFase.value = faseId;

    const selectCat = document.getElementById('categoria_documento');
    if (selectCat) {
        let valorEncontradoCat = '';
        Array.from(selectCat.options).forEach(opt => {
            if (!valorEncontradoCat && opt.textContent.trim() === categoriaTexto) {
                valorEncontradoCat = opt.value;
            }
        });
        selectCat.value = valorEncontradoCat;
    }

    const infoArchivoActual = document.getElementById('infoArchivoActual');
    if (infoArchivoActual && archivoUrl) {
        const nombreArchivo = archivoUrl.split('/').pop();
        infoArchivoActual.innerHTML = `
            Documento actual:
            <a href="${archivoUrl}" target="_blank">${nombreArchivo}</a>
            <span class="d-block">Si no seleccionas otro archivo se mantendrá este.</span>
        `;
    } else if (infoArchivoActual) {
        infoArchivoActual.textContent = '';
    }

    const inputArchivo = document.getElementById('archivo_documento');
    if (inputArchivo) inputArchivo.value = '';

    // Botón a modo "Actualizar" sin romper HTML
    const btn = document.getElementById('btnSubirDocumento');
    if (btn) {
        const txt = btn.querySelector('.btn-text');
        if (txt) txt.textContent = 'Actualizar documento';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-warning', 'text-white', 'btn-documento-primario');
    }

    const btnCancelar = document.getElementById('btnCancelarEdicionDocumento');
    if (btnCancelar) btnCancelar.classList.remove('d-none');

    if (window.modalDocumentoPanel) {
        const titleEl = document.getElementById('modalDocumentoPanelLabel');
        if (titleEl) titleEl.textContent = 'Editar documento';
        window.modalDocumentoPanel.show();
    }
});

// ============================
// Click en CANCELAR EDICIÓN
// ============================
document.addEventListener('click', function (e) {
    const btnCancelar = e.target.closest('#btnCancelarEdicionDocumento');
    if (!btnCancelar) return;

    Swal.fire({
        title: 'Cancelar edición',
        text: 'Se perderán los cambios del documento que estás editando.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'Seguir editando',
        heightAuto: false,       // evita el salto de alto/layout
        scrollbarPadding: false,  // evita el ajuste del scrollbar
        customClass: {
            confirmButton: 'btn btn-danger me-2',
            cancelButton: 'btn btn-success'
        },
        buttonsStyling: false
    }).then(result => {
        if (result.isConfirmed) {
            resetFormularioDocumento();
            if (window.modalDocumentoPanel) window.modalDocumentoPanel.hide();
        }
    });
});

// ============================
// Click en ELIMINAR
// ============================
document.addEventListener('click', function (e) {
    const boton = e.target.closest('.btn-eliminar-documento');
    if (!boton) return;

    const documentoId = boton.getAttribute('data-id');
    const archivoUrl  = boton.getAttribute('data-url');

    let codMun = window.datosWizard?.[1]?.cod_mun || document.getElementById('cod_mun')?.value.trim() || '';

    if (!documentoId || !archivoUrl) {
        Swal.fire('Error', 'Faltan datos para eliminar el documento.', 'error');
        return;
    }

    Swal.fire({
        title: '¿Eliminar documento?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        customClass: {
            confirmButton: 'btn btn-danger me-2',
            cancelButton: 'btn btn-secondary'
        },
        buttonsStyling: false
    }).then((result) => {
        if (result.isConfirmed) {
            eliminarDocumento(documentoId, archivoUrl, codMun);
        }
    });
});

function eliminarDocumento(id, archivo_url, cod_mun) {
    const datos = new URLSearchParams();
    datos.append('id', id);
    datos.append('archivo_url', archivo_url);

    fetch('php/gestion/acciones/acciones_documentos.php?action=eliminarDocumento', {
        method: 'POST',
        body: datos
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    title: 'Eliminado',
                    text: 'Documento eliminado correctamente',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                });

                cargarDocumentos(cod_mun);
                resetFormularioDocumento();
            } else {
                throw new Error(data.message || 'Error al eliminar documento');
            }
        })
        .catch(err => {
            console.error(err);
            Swal.fire('Error', err.message || 'No se pudo eliminar el documento.', 'error');
        });
}

// ============================
// Reset del formulario
// ============================
function resetFormularioDocumento() {
    const form = document.getElementById('formSubirDocumento');

    // Siempre apaga loading (por si acaso)
    setLoadingDocumento(false);
    ocultarOverlayDocumento();

    if (!form) {
        documentoEditandoId = null;
        window.documentoEnEdicion = null;
        window.archivoOriginalEnEdicion = null;
        window.tituloOriginalEnEdicion = null;
        return;
    }

    form.reset();
    documentoEditandoId = null;

    const hidden = document.getElementById('documento_editando_id');
    if (hidden) hidden.value = '';

    const infoArchivoActual = document.getElementById('infoArchivoActual');
    if (infoArchivoActual) infoArchivoActual.textContent = '';

    const btn = document.getElementById('btnSubirDocumento');
    if (btn) {
        const txt = btn.querySelector('.btn-text');
        if (txt) txt.textContent = 'Subir documento';
        btn.classList.remove('btn-warning', 'text-white');
        btn.classList.add('btn-primary', 'btn-documento-primario');
    }

    const btnCancelar = document.getElementById('btnCancelarEdicionDocumento');
    if (btnCancelar) btnCancelar.classList.add('d-none');

    window.documentoEnEdicion = null;
    window.archivoOriginalEnEdicion = null;
    window.tituloOriginalEnEdicion = null;
}

// ============================
// Botón "Gestionar documentos" (wizard)
// ============================
document.addEventListener('click', function (e) {
    const btn = e.target.closest('#btnGestionarDocumentos');
    if (!btn) return;

    const codDesdeInput  = document.getElementById('cod_mun')?.value.trim() || '';
    const codDesdeWizard = window.datosWizard?.[1]?.cod_mun?.trim() || '';
    const codMun = codDesdeInput || codDesdeWizard;

    // 1) Sin código → imposible
    if (!codMun) {
        Swal.fire(
            'Primero guarda el municipio',
            'Debes completar y guardar el Paso 1 antes de gestionar documentos.',
            'warning'
        );
        return;
    }

    // 2) Si el municipio NO está guardado aún
    if (typeof municipioGuardado !== 'undefined' && !municipioGuardado) {
        Swal.fire({
            title: 'Guardar antes de continuar',
            text: 'Para gestionar documentos es necesario guardar el municipio. ¿Quieres guardarlo ahora?',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Guardar y continuar',
            cancelButtonText: 'Cancelar',
            customClass: {
                confirmButton: 'btn btn-success me-2',
                cancelButton: 'btn btn-secondary'
            },
            buttonsStyling: false
        }).then((result) => {
            if (!result.isConfirmed) return;

            guardarMunicipioAntesDeSubir(() => {
                window.location.href =
                    `php/gestion/formularios/panel_documentos.php?cod_mun=${encodeURIComponent(codMun)}`;
            });
        });

        return;
    }

    // 3) Ya guardado → entrar directo
    window.location.href =
        `php/gestion/formularios/panel_documentos.php?cod_mun=${encodeURIComponent(codMun)}`;
});

// ============================
// Panel nueva categoría (lo dejo tal cual lo tenías)
// ============================
document.addEventListener('click', (e) => {
    const btn = e.target.closest('#btnCrearCategoria');
    if (!btn) return;

    const panel = document.getElementById('panelCrearCategoria');
    const input = document.getElementById('nuevaCategoriaNombre');
    if (!panel || !input) return;

    input.value = '';
    panel.classList.remove('d-none');
    panel.classList.add('animate__animated', 'animate__fadeIn');

    if (window.innerWidth < 992) {
        panel.style.position = 'fixed';
        panel.style.top = '50%';
        panel.style.left = '50%';
        panel.style.transform = 'translate(-50%, -50%)';
        panel.style.zIndex = '1055';
    } else {
        panel.style.position = 'absolute';
        panel.style.top = `${btn.offsetTop}px`;
        panel.style.left = `${btn.offsetLeft + btn.offsetWidth + 10}px`;
        panel.style.transform = 'none';
    }
});

document.addEventListener('click', (e) => {
    const btn = e.target.closest('#guardarCategoria');
    if (!btn) return;

    const nombre = document.getElementById('nuevaCategoriaNombre')?.value.trim();
    const select = document.getElementById('categoria_documento');
    if (!select) return;

    if (!nombre) {
        Swal.fire('Error', 'El nombre de la categoría es obligatorio.', 'warning');
        return;
    }

    const yaExiste = Array.from(select.options).some(opt =>
        opt.textContent.trim().toLowerCase() === nombre.toLowerCase()
    );
    if (yaExiste) {
        Swal.fire('Aviso', 'Ya existe una categoría con ese nombre.', 'info');
        return;
    }

    fetch('php/gestion/acciones/acciones_documentos.php?action=crearCategoria', {
        method: 'POST',
        body: new URLSearchParams({ nombre })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                cargarCategoriasDocumento();
                document.getElementById('panelCrearCategoria')?.classList.add('d-none');
            } else {
                Swal.fire('Error', data.message || 'No se pudo crear la categoría.', 'error');
            }
        });
});

document.addEventListener('click', (e) => {
    const cerrar = e.target.closest('#cerrarPanelCategoria') || e.target.closest('#cancelarPanelCategoria');
    if (cerrar) document.getElementById('panelCrearCategoria')?.classList.add('d-none');
});

// ============================
// Flujo guardar y subir (wizard)
// ============================
function confirmarGuardarYContinuarSubidaDocumento() {
    setLoadingDocumento(false);

    Swal.fire({
        title: 'Primero hay que guardar',
        text: 'Para subir documentos debemos guardar el municipio. ¿Quieres guardarlo ahora y continuar con la subida?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Guardar y subir',
        cancelButtonText: 'Cancelar',
        customClass: {
            confirmButton: 'btn btn-success me-2',
            cancelButton: 'btn btn-secondary'
        },
        buttonsStyling: false
    }).then((result) => {
        if (!result.isConfirmed) return;

        guardarMunicipioAntesDeSubir(() => {
            subirDocumento();
        }, { silencioso: true });
    });
}

// ============================
// Mostrar / ocultar formulario (solo wizard)
// ============================
document.addEventListener('click', function (e) {
    const btn = e.target.closest('#btnMostrarFormularioDocumento');
    if (!btn) return;

    const panel = document.getElementById('panelFormularioDocumento');
    if (!panel) return;

    const visible = !panel.classList.contains('d-none');

    if (visible) {
        panel.classList.add('d-none');
        resetFormularioDocumento();
        btn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Nuevo documento';
    } else {
        panel.classList.remove('d-none');
        resetFormularioDocumento();
        btn.innerHTML = '<i class="bi bi-x-circle me-1"></i> Cerrar formulario';
    }
});

// ============================
// Overlay de "trabajando..." (modal documento)
// ============================
function mostrarOverlayDocumento(texto = 'Procesando…') {
    const overlay = document.getElementById('overlayDocumento');
    if (!overlay) return;

    const textoEl = overlay.querySelector('[data-overlay-text]');
    if (textoEl) textoEl.textContent = texto;

    overlay.classList.remove('d-none');
}

function ocultarOverlayDocumento() {
    const overlay = document.getElementById('overlayDocumento');
    if (!overlay) return;

    overlay.classList.add('d-none');
}
