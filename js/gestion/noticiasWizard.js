/* =========================================================
   Paso 6 - Noticias (PREMIUM)
   - DataTables + buscador externo
   - Offcanvas dentro del wizard (alto completo)
   - Guardar sin Swal + sin spinner redundante (estado en botón)
   - Toggle estado optimista (revert si falla) + toast mini
   - Fix columnas DataTables al mostrarse el paso (contenido oculto)
========================================================= */

let dtNoticias = null;
let offcanvasNoticia = null;

/* ========= INIT ========= */

function initNoticiasWizard() {
  const elOff = document.getElementById("offcanvasNoticia");
  if (elOff) {
    document.querySelector("#modalWizard .modal-content").appendChild(elOff);
    offcanvasNoticia = bootstrap.Offcanvas.getOrCreateInstance(elOff);
  }

  // Por defecto: el formulario NO cuenta para el wizard
  setFormNoticiaHabilitado(false);

  // Cuando se abre: habilitamos y ya validas solo al guardar
  elOff?.addEventListener("show.bs.offcanvas", () => {
    setFormNoticiaHabilitado(true);
    bloquearWizardNoticias(true); // opcional (igual que Participación)
  });

  // Cuando se cierra: deshabilitamos (para que el wizard NO lo valide)
  elOff?.addEventListener("hidden.bs.offcanvas", () => {
    setFormNoticiaHabilitado(false);
    bloquearWizardNoticias(false);
  });

  document.getElementById("btnNuevaNoticia")?.addEventListener("click", abrirNoticiaModoCrear);
  document.getElementById("formNoticia")?.addEventListener("submit", guardarNoticia);
  document.getElementById("btnCancelarNoticia")?.addEventListener("click", () => offcanvasNoticia?.hide());


  document.getElementById("titulo_noticia")?.addEventListener("input", actualizarContadorTitulo);
  actualizarContadorTitulo();

  document.getElementById("buscadorNoticias")?.addEventListener("input", (e) => {
    if (dtNoticias) dtNoticias.search(e.target.value).draw();
  });

  cargarNoticias();
}

function setFormNoticiaHabilitado(habilitar) {
  const form = document.getElementById("formNoticia");
  if (!form) return;

  // Ojo: dejamos los hidden como están (no molestan)
  const campos = form.querySelectorAll("input:not([type='hidden']), textarea, select, button");
  campos.forEach(el => {
    el.disabled = !habilitar;
  });
}

// Si quieres bloquear el wizard del fondo igual que Participación:
function bloquearWizardNoticias(bloquear) {
  const modal = document.getElementById("modalWizard");
  if (!modal) return;
  modal.classList.toggle("locked", bloquear);
}


/* Llama a esto cuando se muestre el paso 6 (en tu updateWizard) */
function fixNoticiasDataTableLayout() {
  if (dtNoticias) {
    setTimeout(() => {
      dtNoticias.columns.adjust().draw(false);
    }, 60);
  }
}

/* ========= UI helpers ========= */

function setNoticiasLoading(isLoading) {
  document.getElementById("spinnerNoticias")?.classList.toggle("d-none", !isLoading);
}

function mostrarEstadoVacioNoticias(mostrar) {
  document.getElementById("estadoVacioNoticias")?.classList.toggle("d-none", !mostrar);
  document.getElementById("tablaNoticiasWrapper")?.classList.toggle("d-none", mostrar);
}

function actualizarContadorTitulo() {
  const input = document.getElementById("titulo_noticia");
  const contador = document.getElementById("contadorTitulo");
  if (!input || !contador) return;

  const max = parseInt(input.getAttribute("maxlength") || "60", 10);
  const restantes = max - (input.value?.length || 0);
  contador.textContent = `${restantes} restantes`;
}

function formatearFechaES(yyyyMMdd) {
  if (!yyyyMMdd) return "";
  const s = String(yyyyMMdd).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

function parseFechaES_toSortable(yyyyMMdd) {
  // devuelve YYYYMMDD para ordenar bien aunque mostremos dd/mm/yyyy
  if (!yyyyMMdd) return "";
  const s = String(yyyyMMdd).slice(0, 10);
  return s.replaceAll("-", "");
}

/* Toast mini premium */
function toastMini(msg) {
  let el = document.getElementById("toastMiniNoticias");
  if (!el) {
    el = document.createElement("div");
    el.id = "toastMiniNoticias";
    el.className = "toast-mini";
    el.innerHTML = `<i class="bi bi-check2-circle"></i><span class="toast-text"></span>`;
    document.body.appendChild(el);
  }
  el.querySelector(".toast-text").textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 1600);
}

/* ========= DATA: cargar ========= */

async function cargarNoticias() {
  const codMun = obtenerCodMunActual();
  if (!codMun) {
    mostrarEstadoVacioNoticias(true);
    destruirDataTableNoticias();
    return;
  }

  setNoticiasLoading(true);

  try {
    const fd = new FormData();
    fd.append("action", "listarNoticias");
    fd.append("cod_mun", codMun);

    const res = await fetch("php/gestion/acciones/acciones_noticias.php", { method: "POST", body: fd });
    const data = await res.json();

    if (!data?.success) throw new Error(data?.message || "No se pudieron cargar las noticias.");

    const noticias = data.data || [];
    if (noticias.length === 0) {
      mostrarEstadoVacioNoticias(true);
      destruirDataTableNoticias();
      return;
    }

    mostrarEstadoVacioNoticias(false);
    renderTablaNoticias(noticias);

    // Asegura layout correcto en primera carga también
    fixNoticiasDataTableLayout();

  } catch (err) {
    console.error(err);
    mostrarEstadoVacioNoticias(true);
    destruirDataTableNoticias();
    Swal.fire({ icon: "error", title: "Noticias", text: err.message || "Error cargando noticias." });
  } finally {
    setNoticiasLoading(false);
  }
}

function destruirDataTableNoticias() {
  if (dtNoticias) {
    dtNoticias.destroy();
    dtNoticias = null;
  }
  const wrapper = document.getElementById("tablaNoticiasWrapper");
  if (wrapper) wrapper.innerHTML = "";
}

/* ========= Render DataTable ========= */

function renderTablaNoticias(noticias) {
  destruirDataTableNoticias();

  const wrapper = document.getElementById("tablaNoticiasWrapper");
  if (!wrapper) return;

  wrapper.innerHTML = `
    <table id="tablaNoticias" class="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>Título</th>
          <th>Fecha</th>
          <th>Estado</th>
          <th class="text-end">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${noticias.map(n => {
          const fechaES = formatearFechaES(n.fecha_publicacion);
          const sortKey = parseFechaES_toSortable(n.fecha_publicacion);
          const activo = ["1", "t", "true"].includes(String(n.activa).toLowerCase());
          const json = encodeURIComponent(JSON.stringify(n));

          return `
            <tr>
              <td class="fw-semibold">${escapeHtml(n.titulo || "")}</td>

              <!-- mostramos dd/mm/yyyy pero ordenamos por YYYYMMDD -->
              <td data-order="${escapeHtml(sortKey)}">${escapeHtml(fechaES)}</td>

              <td>
                <label class="switch-activa m-0">
                  <input type="checkbox" class="chkActiva" data-id="${n.id}" ${activo ? "checked" : ""}>
                  <span class="slider"></span>
                  <span class="switch-label">${activo ? "Activa" : "Inactiva"}</span>
                </label>
              </td>

              <td class="text-end">
                <button type="button"
                        class="btn btn-outline-primary btn-icon btnEditarNoticia"
                        title="Editar"
                        data-json="${json}">
                  <i class="bi bi-pencil"></i>
                </button>

                <button type="button"
                        class="btn btn-outline-danger btn-icon btnEliminarNoticia ms-1"
                        title="Eliminar"
                        data-id="${n.id}">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;

  dtNoticias = new DataTable("#tablaNoticias", {
    paging: true,
    pageLength: 6,
    lengthChange: false,
    searching: true,
    info: true,
    order: [[1, "desc"]],
    language: {
      search: "",
      info: "Mostrando _START_ a _END_ de _TOTAL_ noticias",
      infoEmpty: "No hay noticias",
      paginate: { first: "Primero", last: "Último", next: "Siguiente", previous: "Anterior" }
    },
    dom: "tip"
  });

  // Editar
  wrapper.querySelectorAll(".btnEditarNoticia").forEach(btn => {
    btn.addEventListener("click", () => {
      const noticia = JSON.parse(decodeURIComponent(btn.dataset.json || "{}"));
      abrirNoticiaModoEditar(noticia);
    });
  });

  // Eliminar
  wrapper.querySelectorAll(".btnEliminarNoticia").forEach(btn => {
    btn.addEventListener("click", () => eliminarNoticia(btn.dataset.id));
  });

  // Toggle estado optimista
  wrapper.querySelectorAll(".chkActiva").forEach(chk => {
    chk.addEventListener("change", () => cambiarEstadoNoticiaOptimista(chk));
  });

  // Ajuste columnas por si se inicializa en contenedor aún “recolocándose”
  fixNoticiasDataTableLayout();
}

/* ========= Offcanvas: crear/editar ========= */

function abrirNoticiaModoCrear() {
  document.getElementById("modalWizard")?.classList.add("locked"); 
  setFormNoticia({ modo: "crear", noticia: null });
  offcanvasNoticia?.show();
}

function abrirNoticiaModoEditar(noticia) {
  document.getElementById("modalWizard")?.classList.add("locked");
  setFormNoticia({ modo: "editar", noticia });
  offcanvasNoticia?.show();
}

function setFormNoticia({ modo, noticia }) {
  const form = document.getElementById("formNoticia");
  if (!form) return;

  document.getElementById("tituloOffcanvasNoticia").textContent =
    (modo === "editar") ? "Editar noticia" : "Nueva noticia";

  // Primero reiniciamos; hacerlo después borraría el ID y crearía otra noticia.
  form.reset();
  document.getElementById("cod_mun_noticia").value = obtenerCodMunActual() || "";
  document.getElementById("id_noticia").value = (noticia?.id || "");
  actualizarEditorEnriquecido("resumen", "");

  // Imagen preview
  const prev = document.getElementById("imagenActualPreview");
  const name = document.getElementById("imagenActualNombre");
  if (prev) prev.classList.add("d-none");

  // Imagen required solo en crear
  const inpImg = document.getElementById("archivo_imagen");
  if (inpImg) {
    if (modo === "crear") inpImg.setAttribute("required", "required");
    else inpImg.removeAttribute("required");
    inpImg.value = ""; // evita que “arrastre” archivo anterior
  }

  if (modo === "editar" && noticia) {
    document.getElementById("titulo_noticia").value = noticia.titulo || "";
    document.getElementById("fecha_publicacion").value = String(noticia.fecha_publicacion || "").slice(0, 10);
    actualizarEditorEnriquecido("resumen", noticia.resumen || "");
    document.getElementById("enlace_detalle").value = noticia.enlace_detalle || "";
    document.getElementById("activa").checked =
      (["1", "t", "true"].includes(String(noticia.activa).toLowerCase()));

    if (noticia.imagen_url && prev && name) {
      prev.classList.remove("d-none");
      name.textContent = noticia.imagen_url.split("/").pop();
    }
  }

  actualizarContadorTitulo();
  resetBotonGuardarNoticia();
}

/* ========= Guardar premium (sin Swal, sin spinner redundante) ========= */

function setBtnGuardarEstado(estado) {
  const btn = document.getElementById("btnGuardarNoticia");
  if (!btn) return;

  // estados: idle | saving | saved
  if (estado === "saving") {
    btn.disabled = true;
    btn.dataset.prevHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Guardando…`;
  } else if (estado === "saved") {
    btn.disabled = true;
    btn.classList.add("btn-success");
    btn.innerHTML = `<i class="bi bi-check2-circle me-1"></i> Guardado`;
  } else {
    btn.disabled = false;
    btn.classList.add("btn-success");
    btn.innerHTML = `<i class="bi bi-check2-circle me-1"></i> Guardar`;
  }
}

function resetBotonGuardarNoticia() {
  const btn = document.getElementById("btnGuardarNoticia");
  if (!btn) return;
  btn.disabled = false;
  btn.classList.add("btn-success");
  btn.innerHTML = `<i class="bi bi-check2-circle me-1"></i> Guardar`;
}

async function guardarNoticia(e) {
  e.preventDefault();
  e.stopPropagation();

  const form = e.currentTarget;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  try {
    setBtnGuardarEstado("saving");

    const fd = new FormData(form);
    const id = (document.getElementById("id_noticia")?.value || "").trim();
    fd.append("action", id ? "actualizarNoticia" : "crearNoticia");

    // activa como 1/0
    fd.set("activa", document.getElementById("activa")?.checked ? "1" : "0");

    const res = await fetch("php/gestion/acciones/acciones_noticias.php", { method: "POST", body: fd });
    const data = await res.json();

    if (!data?.success) throw new Error(data?.message || "No se pudo guardar la noticia.");

    setBtnGuardarEstado("saved");
    toastMini("Noticia guardada");

    // cierre suave + refresco tabla
    setTimeout(async () => {
      offcanvasNoticia?.hide();
      await cargarNoticias();
    }, 450);

  } catch (err) {
    console.error(err);
    resetBotonGuardarNoticia();
    Swal.fire({ icon: "error", title: "Guardar noticia", text: err.message || "Error guardando." });
  }
}

/* ========= Eliminar ========= */

async function eliminarNoticia(id) {
  const confirm = await Swal.fire({
    icon: "warning",
    title: "Eliminar noticia",
    text: "¿Seguro que quieres eliminarla?",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    customClass: { confirmButton: "btn btn-danger me-2", cancelButton: "btn btn-secondary" },
    buttonsStyling: false
  });

  if (!confirm.isConfirmed) return;

  try {
    const fd = new FormData();
    fd.append("action", "eliminarNoticia");
    fd.append("id", id);

    const res = await fetch("php/gestion/acciones/acciones_noticias.php", { method: "POST", body: fd });
    const data = await res.json();

    if (!data?.success) throw new Error(data?.message || "No se pudo eliminar.");

    toastMini("Noticia eliminada");
    cargarNoticias();

  } catch (err) {
    console.error(err);
    Swal.fire({ icon: "error", title: "Eliminar", text: err.message || "Error eliminando." });
  }
}

/* ========= Toggle estado optimista ========= */

async function cambiarEstadoNoticiaOptimista(chk) {
  const id = chk.dataset.id;
  const nuevo = chk.checked;

  // UI optimista: cambia label ya
  const label = chk.closest(".switch-activa")?.querySelector(".switch-label");
  if (label) label.textContent = nuevo ? "Activa" : "Inactiva";

  try {
    const fd = new FormData();
    fd.append("action", "cambiarEstadoNoticia");
    fd.append("id", id);
    fd.append("cod_mun", obtenerCodMunActual());
    fd.append("activa", nuevo ? "1" : "0");

    const res = await fetch("php/gestion/acciones/acciones_noticias.php", { method: "POST", body: fd });
    const data = await res.json();

    if (!data?.success) throw new Error(data?.message || "No se pudo cambiar el estado.");

    toastMini(nuevo ? "Marcada como activa" : "Marcada como inactiva");

  } catch (err) {
    console.error(err);

    // revert UI
    chk.checked = !nuevo;
    if (label) label.textContent = (!nuevo) ? "Activa" : "Inactiva";

    Swal.fire({ icon: "error", title: "Estado", text: err.message || "No se pudo cambiar el estado." });
  }
}

/* ========= Utilidades ========= */

function obtenerCodMunActual() {
  if (typeof datosWizard !== "undefined" && datosWizard?.[1]?.cod_mun) return datosWizard[1].cod_mun;
  return document.getElementById("cod_mun")?.value || "";
}

