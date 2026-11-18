/***********************************************
 * PARTICIPACIÓN WIZARD (Paso 5)
 * Archivo: participacionWizard.js
 ***********************************************/

let botonesParticipacionCargados = [];
let participacionUIBound = false;     // evita enganchar listeners múltiples
let offcanvasCloseBound = false;      // evita enganchar listeners múltiples (delegación)

const MAX_BOTONES_GESTION = 5;   // máximo 5 botones

// =======================
// LOCK / UNLOCK WIZARD UI
// =======================
function lockWizardUI(lock) {
  const modal = document.getElementById("modalWizard");
  if (!modal) return;
  modal.classList.toggle("locked", !!lock);
}

// =======================
// OFFCANVAS INSTANCE
// =======================
function getPanelInstance() {
  const el = document.getElementById("offcanvasBotonParticipacion");
  if (!el) return null;

  if (typeof bootstrap === "undefined" || !bootstrap.Offcanvas) {
    console.warn("[Participación] bootstrap.Offcanvas no disponible.");
    return null;
  }

  return bootstrap.Offcanvas.getOrCreateInstance(el, {
    backdrop: false,
    scroll: true,
  });
}

// Limpieza centralizada
function limpiarYDesbloquearPanelParticipacion() {
  lockWizardUI(false);

  document.getElementById("formPanelBotonParticipacion")?.reset();

  const idInp = document.getElementById("boton_id");
  const urlInp = document.getElementById("archivo_url_actual");
  if (idInp) idInp.value = "";
  if (urlInp) urlInp.value = "";

  // Restablecemos el diseño por defecto del botón.
  const icono = document.getElementById("icono_boton_modal");
  const color = document.getElementById("color_boton_modal");
  const visible = document.getElementById("visible_boton_modal");
  if (icono) icono.value = "file-earmark-arrow-down";
  if (color) color.value = "#540000";
  if (visible) visible.checked = true;

  document.getElementById("archivoActualPreview")?.classList.add("d-none");
  const n = document.getElementById("archivoActualNombre");
  if (n) n.textContent = "";

  actualizarVistaIconoParticipacion();

  const contador = document.getElementById("contadorTextoBoton");
  if (contador) contador.textContent = "0/50";
}

/**
 *  Cierra el offcanvas:
 * - Mantiene bloqueado DURANTE la animación de cierre
 * - Desbloquea SOLO al terminar (hidden.bs.offcanvas)
 * - Fallback por si hidden no dispara (caso raro primera vez)
 */
function cerrarPanelParticipacionSeguro() {
  const el = document.getElementById("offcanvasBotonParticipacion");
  const inst = getPanelInstance();
  if (!el || !inst) return;

  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    limpiarYDesbloquearPanelParticipacion(); // unlock + reset
  };

  // Si hidden llega, perfecto (sin retardo visible)
  el.addEventListener("hidden.bs.offcanvas", finish, { once: true });

  // Fallback: si por algún motivo hidden no llega, liberamos tras la duración de transición
  const td = getComputedStyle(el).transitionDuration || "0s";
  const durMs = (() => {
    // Puede venir "0.3s" o "300ms" o "0s, 0s" → cogemos el mayor
    const parts = td.split(",").map(s => s.trim());
    const vals = parts.map(p => {
      if (p.endsWith("ms")) return parseFloat(p);
      if (p.endsWith("s"))  return parseFloat(p) * 1000;
      return 0;
    });
    return Math.max(...vals, 0);
  })();

  setTimeout(finish, Math.max(durMs + 80, 350));

  inst.hide();
}

// ============================================================
// FUNCIÓN PRINCIPAL (la llama wizard.js cuando inyecta el paso 5)
// ============================================================
function inicializarPasoParticipacion() {
  const codMun = getCodMunActual();

  const hidden = document.getElementById("cod_mun_participacion");
  if (hidden) hidden.value = codMun;

  const panel = document.getElementById("offcanvasBotonParticipacion");
  if (panel) document.querySelector("#modalWizard .modal-content").appendChild(panel);

  // Enganchar listeners UNA sola vez por carga de página
  if (!participacionUIBound) {
    bindParticipacionUI();
    participacionUIBound = true;
  }

  // Cargar botones de participación del municipio actual
  if (codMun) cargarBotonesParticipacion(codMun);
}

//
// Esta función engancha TODOS los eventos de la UI del Paso 5 (Participación).
//
// Resumen:
// - Todo lo de “clics, submit, input, cierre del offcanvas” se centraliza aquí.
//
function bindParticipacionUI() {
  // al terminar de cerrarse, limpiamos el panel y desbloqueamos el wizard.
  if (!offcanvasCloseBound) {
    document.addEventListener("hidden.bs.offcanvas", (e) => {
      if (e.target?.id !== "offcanvasBotonParticipacion") return;
      limpiarYDesbloquearPanelParticipacion();
    });

    offcanvasCloseBound = true;
  }

  // Abrir NUEVO
  document.addEventListener("click", (e) => {
    if (e.target.closest("#btnNuevoBotonParticipacion")) {
      abrirPanelBotonParticipacionNuevo();
    }
  });

  // Acciones (ver/editar/eliminar)
  document.addEventListener("click", (e) => {
    const btnVer  = e.target.closest(".btnVerBoton");
    const btnEdit = e.target.closest(".btnEditarBoton");
    const btnDel  = e.target.closest(".btnEliminarBoton");

    if (btnVer) {
      const url = btnVer.dataset.url;
      if (url) window.open(url, "_blank");
      return;
    }

    if (btnEdit) {
      const id = btnEdit.dataset.id;
      abrirPanelBotonParticipacionEditar(id);
      return;
    }

    if (btnDel) {
      const id = btnDel.dataset.id;
      const url = btnDel.dataset.url;
      const codMunNow = getCodMunActual();
      if (!id || !url || !codMunNow) return;
      if (typeof Swal === "undefined") return;

      Swal.fire({
        title: "¿Eliminar botón?",
        text: "Esta acción no se puede deshacer.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        customClass: {
          confirmButton: "btn btn-danger me-2",
          cancelButton: "btn btn-secondary",
        },
        buttonsStyling: false,
      }).then((r) => {
        if (!r.isConfirmed) return;
        eliminarBoton(id, url, codMunNow);
      });

      return;
    }
  });

  // Submit panel
  document.addEventListener("submit", (e) => {
    if (e.target && e.target.id === "formPanelBotonParticipacion") {
      e.preventDefault();
      guardarOActualizarDesdePanel();
    }
  });

  // Contador caracteres
  document.addEventListener("input", (e) => {
    if (e.target && e.target.id === "texto_boton_modal") {
      const v = e.target.value || "";
      const c = document.getElementById("contadorTextoBoton");
      if (c) c.textContent = `${v.length}/50`;
    }
  });

  // La vista previa cambia al elegir otro icono o color.
  document.addEventListener("change", (e) => {
    if (e.target.id === "icono_boton_modal" || e.target.id === "color_boton_modal") {
      actualizarVistaIconoParticipacion();
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "color_boton_modal") actualizarVistaIconoParticipacion();
  });

  // Botón cancelar del panel
  document.addEventListener("click", (e) => {
    if (e.target.closest("#btnCancelarBotonPanel")) {
      e.preventDefault();
      cerrarPanelParticipacionSeguro();
    }
  });
}

// ============================================================
// Helpers
// ============================================================
function getCodMunActual() {
  // Preferimos datosWizard si existe
  const c1 = (window.datosWizard?.[1]?.cod_mun || "").trim();
  if (c1) return c1;

  const domCod = (document.getElementById("cod_mun")?.value || "").trim();
  if (domCod) return domCod;

  const h = (document.getElementById("cod_mun_participacion")?.value || "").trim();
  return h;
}

function showSpinnerGuardando(show) {
  document.getElementById("spinnerGuardandoBoton")?.classList.toggle("d-none", !show);
  const b = document.getElementById("btnGuardarBotonPanel");
  if (b) b.disabled = !!show;
}

// ============================================================
// Abrir panel (nuevo / editar) + LOCK
// ============================================================
function abrirPanelBotonParticipacionNuevo() {

  // Si estamos creando y todavía NO se ha guardado nunca -> obligamos a guardar antes
  if (!modoEdicion && !municipioGuardado) {

    // (Opcional) valida lo que tú quieras antes de guardar
    // Si quieres exigir que el wizard esté válido antes de guardar:
    if (typeof validarTodoAntesDeGuardar === "function" && !validarTodoAntesDeGuardar()) {
      return;
    }

    Swal.fire({
      title: "Guardar antes de crear el botón",
      text: "Para añadir un botón de participación primero se guardará el municipio.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Guardar y continuar",
      cancelButtonText: "Cancelar",
      customClass: {
        confirmButton: "btn btn-success me-2",
        cancelButton: "btn btn-secondary",
      },
      buttonsStyling: false,
    }).then((r) => {
      if (!r.isConfirmed) return;

      // Guardamos "silencioso" y cuando termine abrimos el panel
      guardarMunicipioAntesDeSubir(() => {
        // IMPORTANTE: tras guardar, ya existe cod_mun y municipioGuardado=true
        const panel = getPanelInstance();
        if (!panel) return;

        lockWizardUI(true);
        setPanelMode({ modo: "nuevo" });
        panel.show();
      }, { silencioso: true });
    });

    return;
  }

  // Caso normal (edición o ya guardado al menos una vez)
  const panel = getPanelInstance();
  if (!panel) return;

  lockWizardUI(true);
  setPanelMode({ modo: "nuevo" });
  panel.show();
}

function abrirPanelBotonParticipacionEditar(id) {
  const panel = getPanelInstance();
  if (!panel) return;

  const boton = botonesParticipacionCargados.find((b) => String(b.id) === String(id));
  if (!boton) {
    Swal?.fire?.("Error", "No se encontró el botón a editar.", "error");
    return;
  }

  lockWizardUI(true);
  setPanelMode({ modo: "editar", boton });
  panel.show();
}

// ============================================================
// Set modo panel
// ============================================================
function setPanelMode({ modo, boton }) {
  const titulo = document.getElementById("tituloModalBoton");
  const subtitulo = document.getElementById("subtituloModalBoton");
  const btn = document.getElementById("btnGuardarBotonPanel");
  const ayuda = document.getElementById("ayudaArchivoModal");

  const idInp = document.getElementById("boton_id");
  const texto = document.getElementById("texto_boton_modal");
  const archivo = document.getElementById("archivo_boton_modal");
  const archivoUrlActual = document.getElementById("archivo_url_actual");

  const icono = document.getElementById("icono_boton_modal");
  const color = document.getElementById("color_boton_modal");
  const visible = document.getElementById("visible_boton_modal");

  const preview = document.getElementById("archivoActualPreview");
  const previewNombre = document.getElementById("archivoActualNombre");

  if (idInp) idInp.value = "";
  if (texto) texto.value = "";
  if (archivo) archivo.value = "";
  if (archivoUrlActual) archivoUrlActual.value = "";

  if (icono) icono.value = "file-earmark-arrow-down";
  if (color) color.value = "#540000";
  if (visible) visible.checked = true;

  preview?.classList.add("d-none");
  if (previewNombre) previewNombre.textContent = "";

  const contador = document.getElementById("contadorTextoBoton");
  if (contador) contador.textContent = `${(texto?.value || "").length}/50`;

  if (modo === "nuevo") {
    if (titulo) titulo.textContent = "Nuevo botón";
    if (subtitulo) subtitulo.textContent = "Crea un botón visible en la sección pública";
    if (btn) btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Guardar';
    if (ayuda) ayuda.textContent = "Selecciona un archivo (obligatorio en creación).";
    archivo?.setAttribute("required", "required");
  } else {
    if (titulo) titulo.textContent = "Editar botón";
    if (subtitulo) subtitulo.textContent = "Actualiza texto y/o reemplaza el archivo";
    if (btn) btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Actualizar';
    if (ayuda) ayuda.textContent = "Si no seleccionas archivo, se mantiene el actual.";
    archivo?.removeAttribute("required");

    if (boton) {
      if (idInp) idInp.value = boton.id;
      if (texto) texto.value = boton.texto_boton || "";
      if (archivoUrlActual) archivoUrlActual.value = boton.archivo_url || "";
      if (icono) {
        const seleccionado = boton.icono ?? "file-earmark-arrow-down";
        // Conservamos también un icono existente que no figure en el catálogo.
        if (![...icono.options].some(opcion => opcion.value === seleccionado)) {
          icono.add(new Option(seleccionado, seleccionado));
        }
        icono.value = seleccionado;
      }
      if (color) {
        color.value = boton.color || "#540000";
      }
      if (visible) {
        visible.checked = convertirBooleanoParticipacion(boton.visible, true);
      }

      if (contador) contador.textContent = `${(texto.value || "").length}/50`;

      if (previewNombre) previewNombre.textContent = "Archivo actual";
      preview?.classList.remove("d-none");
    }
  }
  actualizarVistaIconoParticipacion();
}

/** Muestra el mismo icono y color que tendrá el botón público. */
function actualizarVistaIconoParticipacion() {
  const selector = document.getElementById("icono_boton_modal");
  const vista = document.getElementById("vistaIconoBoton");
  const icono = document.getElementById("icono_boton_preview");
  if (!selector || !vista || !icono) return;
  const nombre = selector.value;
  icono.className = /^[a-z0-9-]+$/.test(nombre) ? "bi bi-" + nombre : "bi bi-slash-circle";
  vista.title = selector.selectedOptions[0]?.textContent || "Sin icono";
  vista.style.color = document.getElementById("color_boton_modal").value;
}

/**
 * Convierte los valores booleanos de PostgreSQL y formularios.
 */
function convertirBooleanoParticipacion(valor, porDefecto = true) {
  if (valor === undefined || valor === null || valor === "") return porDefecto;
  if (typeof valor === "boolean") return valor;
  return ["1", "t", "true", "yes", "si", "sí"].includes(String(valor).toLowerCase());
}

// ============================================================
// Cargar / Render botones
// ============================================================
function cargarBotonesParticipacion(cod_mun) {
  const sp = document.getElementById("spinnerListaBotones");
  const wrapper = document.getElementById("listaBotonesParticipacionWrapper");
  const vacio = document.getElementById("estadoVacioBotones");

  sp?.classList.remove("d-none");
  wrapper?.classList.add("d-none");
  vacio?.classList.add("d-none");

  // DEVOLVEMOS LA PROMESA
  return fetch(`php/gestion/acciones/acciones_participacion.php?action=listarBotonesParticipacion&cod_mun=${encodeURIComponent(cod_mun)}`)
    .then((res) => res.json())
    .then((data) => renderizarBotonesParticipacion(data.success ? (data.data || []) : []))
    .catch(() => renderizarBotonesParticipacion([]))
    .finally(() => sp?.classList.add("d-none"));
}

function renderizarBotonesParticipacion(botones) {
  botonesParticipacionCargados = Array.isArray(botones) ? botones : [];

  const wrapper = document.getElementById("listaBotonesParticipacionWrapper");
  const vacio = document.getElementById("estadoVacioBotones");
  const mensajeMaximo = document.getElementById("mensajeMaximoBotones");
  const btnNuevo = document.getElementById("btnNuevoBotonParticipacion");

  const max = botonesParticipacionCargados.length >= MAX_BOTONES_GESTION;
  if (max) {
    mensajeMaximo?.classList.remove("d-none");
    btnNuevo?.setAttribute("disabled", true);
  } else {
    mensajeMaximo?.classList.add("d-none");
    btnNuevo?.removeAttribute("disabled");
  }

  if (botonesParticipacionCargados.length === 0) {
    if (wrapper) wrapper.innerHTML = "";
    wrapper?.classList.add("d-none");
    vacio?.classList.remove("d-none");
    return;
  }

  vacio?.classList.add("d-none");
  wrapper?.classList.remove("d-none");

  wrapper.innerHTML = `
    <div class="bg-white border rounded-4 overflow-hidden">
      <div class="list-group list-group-flush">
        ${botonesParticipacionCargados.map((b) => {
          const texto = escapeHtml(b.texto_boton || "");
          const url = b.archivo_url || "";
          const icono = escapeHtml(
            b.icono === null || b.icono === undefined
              ? "file-earmark-arrow-down"
              : b.icono
          );
          const color = escapeHtml(b.color || "#540000");
          const visible = convertirBooleanoParticipacion(b.visible, true);

          return `
            <div class="list-group-item py-1 ${visible ? "" : "bg-light"}">
              <div class="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                <div class="d-flex align-items-center gap-3">
                  <div class="rounded-3 align-items-center justify-content-center ${icono ? "d-flex" : "d-none"}"
                       style="width:42px;height:42px;color:${color};background:${color}16;border:1px solid ${color}33;">
                    <i class="bi bi-${icono} fs-5"></i>
                  </div>
                  <div>
                    <div class="fw-semibold">${texto}</div>
                    <span class="small ${visible ? "text-success" : "text-muted"}">
                      <i class="bi bi-${visible ? "eye" : "eye-slash"} me-1"></i>${visible ? "Visible en la página pública" : "Oculto temporalmente"}
                    </span>
                  </div>
                </div>

                <div class="btn-group" role="group" aria-label="Acciones">
                  <button type="button" class="btn btn-outline-primary btn-sm btnVerBoton" data-url="${escapeHtml(url)}" title="Ver">
                    <i class="bi bi-eye"></i>
                  </button>
                  <button type="button" class="btn btn-outline-secondary btn-sm btnEditarBoton" data-id="${b.id}" title="Editar">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button type="button" class="btn btn-outline-danger btn-sm btnEliminarBoton" data-id="${b.id}" data-url="${escapeHtml(url)}" title="Eliminar">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  // Si el wizard está activo, al cambiar la lista de botones re-evaluamos el estado
  try {
    if (typeof actualizarEstadoBotonGuardar === "function") actualizarEstadoBotonGuardar();
  } catch(_) {}

}

// ============================================================
// Guardar / actualizar desde panel
// ============================================================
async function guardarOActualizarDesdePanel() {
  const codMun = getCodMunActual();
  const id = document.getElementById("boton_id")?.value?.trim();
  const texto = document.getElementById("texto_boton_modal")?.value?.trim();
  const archivo = document.getElementById("archivo_boton_modal")?.files?.[0] || null;
  const archivoActual = document.getElementById("archivo_url_actual")?.value || "";
  const icono = document.getElementById("icono_boton_modal")?.value ?? "file-earmark-arrow-down";
  const color = document.getElementById("color_boton_modal")?.value || "#540000";
  const visible = document.getElementById("visible_boton_modal")?.checked !== false;

  if (!codMun) {
    Swal?.fire?.("Faltan datos", "No se ha detectado el municipio (cod_mun).", "warning");
    return;
  }
  if (!texto) {
    Swal?.fire?.("Faltan datos", "Debes indicar el texto del botón.", "warning");
    return;
  }

  const esEdicion = !!id;

  const duplicado = botonesParticipacionCargados.some((b) => {
    const mismoTexto = (b.texto_boton || "").trim().toLowerCase() === texto.toLowerCase();
    const distintoId = String(b.id) !== String(id);
    return mismoTexto && (esEdicion ? distintoId : true);
  });

  if (duplicado) {
    Swal?.fire?.("Duplicado", "Ya existe un botón con ese texto. Elige otro.", "warning");
    return;
  }

  if (!esEdicion && !archivo) {
    Swal?.fire?.("Faltan datos", "Debes seleccionar un archivo para crear el botón.", "warning");
    return;
  }

  try {
    showSpinnerGuardando(true);

    let archivoUrlFinal = archivoActual;
    if (archivo) archivoUrlFinal = await subirArchivoBoton(archivo, codMun);

    if (!esEdicion) {
      await crearBotonEnBBDD(codMun, texto, archivoUrlFinal, icono, color, visible);
      Swal?.fire?.({
        icon: "success",
        title: "Creado",
        text: "Botón creado correctamente.",
        confirmButtonText: "OK",
        customClass: { confirmButton: "btn btn-success" },
        buttonsStyling: false
      });
    } else {
      const botonActual = botonesParticipacionCargados.find(function (boton) {
        return String(boton.id) === String(id);
      }) || {};

      await actualizarBotonEnBBDD(
        id,
        codMun,
        texto,
        archivoUrlFinal,
        icono,
        color,
        visible,
        botonActual.tipo_contenido || 'pdf',
        botonActual.formulario_id || ''
      );
      Swal?.fire?.({
        icon: "success",
        title: "Actualizado",
        text: "Botón actualizado correctamente.",
        confirmButtonText: "OK",
        customClass: { confirmButton: "btn btn-success" },
        buttonsStyling: false
      });
    }

    cargarBotonesParticipacion(codMun);

    //desbloqueamos Wizard al finalizar la animación (hidden)
    cerrarPanelParticipacionSeguro();

  } catch (err) {
    console.error(err);
    Swal?.fire?.("Error", err.message || "No se pudo guardar el botón.", "error");
  } finally {
    showSpinnerGuardando(false);
  }
}

// ============================================================
// Subida y Backend CRUD
// ============================================================
function subirArchivoBoton(archivo, codMun) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("archivo", archivo);
    fd.append("cod_mun", codMun);
    fd.append("tipo", "participacion");

    fetch("php/gestion/archivos/subirArchivo.php", { method: "POST", body: fd })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.url) resolve(data.url);
        else reject(new Error(data.message || "Error al subir archivo"));
      })
      .catch(reject);
  });
}

function crearBotonEnBBDD(codMun, texto, archivoUrl, icono, color, visible) {
  const datos = new URLSearchParams();
  datos.append("action", "guardarBotonParticipacion");
  datos.append("cod_mun", codMun);
  datos.append("texto_boton", texto);
  datos.append("archivo_url", archivoUrl);
  datos.append("icono", icono);
  datos.append("color", color);
  datos.append("visible", visible ? "1" : "0");

  return fetch("php/gestion/acciones/acciones_participacion.php", { method: "POST", body: datos })
    .then((r) => r.json())
    .then((d) => {
      if (!d.success) throw new Error(d.message || "Error al guardar en BBDD");
      return true;
    });
}

function actualizarBotonEnBBDD(
  id,
  codMun,
  texto,
  archivoUrl,
  icono,
  color,
  visible,
  tipoContenido,
  formularioId
) {
  const datos = new URLSearchParams();
  datos.append("action", "actualizarBotonParticipacion");
  datos.append("id", id);
  datos.append("cod_mun", codMun);
  datos.append("texto_boton", texto);
  datos.append("archivo_url", archivoUrl || "");
  datos.append("icono", icono);
  datos.append("color", color);
  datos.append("visible", visible ? "1" : "0");
  datos.append("tipo_contenido", tipoContenido || "pdf");
  datos.append("formulario_id", formularioId || "");

  return fetch("php/gestion/acciones/acciones_participacion.php", { method: "POST", body: datos })
    .then((r) => r.json())
    .then((d) => {
      if (!d.success) throw new Error(d.message || "Error al actualizar en BBDD");
      return true;
    });
}

function eliminarBoton(id, archivo_url, cod_mun) {
  const datos = new URLSearchParams();
  datos.append("action", "eliminarBotonParticipacion");
  datos.append("id", id);
  datos.append("archivo_url", archivo_url);

  fetch("php/gestion/acciones/acciones_participacion.php", { method: "POST", body: datos })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) throw new Error(data.message || "Error al eliminar botón");

      Swal?.fire?.({
        title: "Eliminado",
        text: "Botón eliminado correctamente.",
        icon: "success",
        confirmButtonText: "OK",
        customClass: { confirmButton: "btn btn-success" },
        buttonsStyling: false
      });

      cargarBotonesParticipacion(cod_mun);
    })
    .catch((err) => {
      console.error(err);
      Swal?.fire?.("Error", err.message || "No se pudo eliminar el botón.", "error");
    });
}

// ============================================================
// Validación del paso 5 (mínimo 1 botón)
// ============================================================
function participacionTieneBotones() {
  return (botonesParticipacionCargados?.length || 0) > 0;
}
