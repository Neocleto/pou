// public/js/wizard/fasesWizard.js
// ============================================================
// Paso 3 (Fases del POU) - Wizard de Gestión
//
// Backend esperado:
// - acciones_panel.php?action=listarFases
//     -> { success:true, data:[{num_fase,label|titulo}] }
// - acciones_panel.php?action=listarSubfases&num_fase=
//     -> { success:true, data:[{id,codigo_subfase,titulo,descripcion}] }
// ============================================================

const URL_ACCIONES_PANEL = 'php/gestion/acciones/acciones_panel.php';

async function fetchJSON(url) {
  const res = await fetch(url, { method: 'GET' });
  return await res.json();
}

async function cargarFasesPadre(selectedNumFase = null) {
  const selPadre = document.getElementById('fase_padre');
  if (!selPadre) return;

  selPadre.innerHTML = '<option value="" disabled selected>Cargando fases…</option>';
  selPadre.disabled = true;

  const url = `${URL_ACCIONES_PANEL}?action=listarFases`;

  let json;
  try {
    json = await fetchJSON(url);
  } catch (err) {
    console.error('Error al cargar fases padre:', err);
    selPadre.innerHTML = '<option value="" disabled selected>No se pudieron cargar fases</option>';
    selPadre.disabled = false;
    return;
  }

  if (!json.success || !Array.isArray(json.data)) {
    selPadre.innerHTML = '<option value="" disabled selected>No se pudieron cargar fases</option>';
    selPadre.disabled = false;
    return;
  }

  selPadre.innerHTML = '<option value="" disabled selected>Selecciona una fase</option>';

  json.data.forEach(f => {
    const opt = document.createElement('option');
    opt.value = String(f.num_fase ?? '');
    opt.textContent = (f.label || (`FASE ${f.num_fase}. ${f.titulo || ''}`)).trim();
    selPadre.appendChild(opt);
  });

  selPadre.disabled = false;

  if (selectedNumFase !== null && selectedNumFase !== undefined && String(selectedNumFase) !== '') {
    selPadre.value = String(selectedNumFase);
  }
}

async function cargarSubfases(numFase, selectedSubfaseId = null) {
  const selSub = document.getElementById('subfase_id');
  if (!selSub) return;

  selSub.innerHTML = '<option value="" disabled selected>Cargando…</option>';
  selSub.disabled = true;

  const url = `${URL_ACCIONES_PANEL}?action=listarSubfases&num_fase=${encodeURIComponent(numFase)}`;

  let json;
  try {
    json = await fetchJSON(url);
  } catch (err) {
    console.error('Error al cargar subfases:', err);
    selSub.innerHTML = '<option value="" disabled selected>No se pudieron cargar</option>';
    selSub.disabled = true;
    return;
  }

  if (!json.success || !Array.isArray(json.data)) {
    selSub.innerHTML = '<option value="" disabled selected>No se pudieron cargar</option>';
    selSub.disabled = true;
    return;
  }

  selSub.innerHTML = '<option value="" disabled selected>Selecciona una subfase</option>';

  json.data.forEach(s => {
    const opt = document.createElement('option');
    opt.value = String(s.id ?? '');
    opt.textContent = `${s.codigo_subfase} — ${s.titulo}`;
    opt.dataset.descripcion = s.descripcion || '';
    selSub.appendChild(opt);
  });

  selSub.disabled = false;

  if (selectedSubfaseId !== null && selectedSubfaseId !== undefined && String(selectedSubfaseId) !== '') {
    selSub.value = String(selectedSubfaseId);
    // Autocomplete SOLO si procede (no forzar)
    volcarDescripcionSubfaseEnTramitacion({ forzar: false });
  }
}

/**
 * Autocompleta el textarea con la descripción de la subfase:
 * - Si el usuario ha editado manualmente y hay texto -> NO pisa (salvo forzar)
 * - Si está vacío -> sí autocompleta aunque el usuario lo hubiera tocado
 */
function volcarDescripcionSubfaseEnTramitacion({ forzar = false } = {}) {
  const selSub = document.getElementById('subfase_id');
  const estado = document.getElementById('estado_tramitacion');
  if (!selSub || !estado) return;

  const opt = selSub.options[selSub.selectedIndex];
  const desc = opt?.dataset?.descripcion || '';

  const tieneTexto = estado.value.trim() !== '';
  const userEdited = estado.dataset.userEdited === '1';

  // Si tiene texto y el usuario lo editó -> no pisar (salvo forzar)
  if (!forzar && userEdited && tieneTexto) return;

  // Si está vacío -> sí rellenar (aunque userEdited=1)
  actualizarEditorEnriquecido('estado_tramitacion', desc);
}

function resetDependientesFase() {
  const selSub = document.getElementById('subfase_id');
  const estado = document.getElementById('estado_tramitacion');

  if (selSub) {
    selSub.innerHTML = '<option value="" disabled selected>Selecciona una subfase</option>';
    selSub.disabled = true;
  }

  if (estado) {
    actualizarEditorEnriquecido('estado_tramitacion', '');
    delete estado.dataset.userEdited;
  }
}

function bindEventosFasesWizard() {
  if (window.__fasesWizardBound) return;
  window.__fasesWizardBound = true;

  // Marcar textarea como editado por usuario
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'estado_tramitacion') {
      e.target.dataset.userEdited = '1';
    }
  });

  document.addEventListener('change', async (e) => {
    // Cambio de fase padre
    if (e.target && e.target.id === 'fase_padre') {
      const num = e.target.value;
      resetDependientesFase();
      if (num) {
        await cargarSubfases(num);
      }
    }

    // Cambio de subfase
    if (e.target && e.target.id === 'subfase_id') {
        volcarDescripcionSubfaseEnTramitacion({ forzar: true });
        // opcional pero recomendable: como viene "de plantilla", no cuenta como editado manual
        const estado = document.getElementById('estado_tramitacion');
        if (estado) {
            delete estado.dataset.userEdited;
        }
    }

  });
}

async function inicializarFasesWizardModoCreacion() {
  bindEventosFasesWizard();
  await cargarFasesPadre();
  resetDependientesFase();
}

async function inicializarFasesWizardModoEdicion(faseActual) {
  bindEventosFasesWizard();

  const numPadre  = faseActual?.num_fase_padre ?? faseActual?.num_fase ?? '';
  const subfaseId = faseActual?.subfase_id ?? null;

  await cargarFasesPadre(numPadre);

  if (numPadre) {
    // Importante: al cargar subfases en edición NO queremos marcar userEdited
    const estado = document.getElementById('estado_tramitacion');
    if (estado) delete estado.dataset.userEdited;

    await cargarSubfases(numPadre, subfaseId);
  } else {
    resetDependientesFase();
  }

  const fecha  = document.getElementById('fecha_inicio');
  const estado = document.getElementById('estado_tramitacion');
  const codMun = document.getElementById('cod_mun_fase');

  if (codMun && faseActual?.cod_mun) codMun.value = faseActual.cod_mun;
  if (fecha) fecha.value = faseActual?.fecha_inicio ?? '';

  // Respetar lo guardado en BBDD siempre
  if (estado) {
    actualizarEditorEnriquecido('estado_tramitacion', faseActual?.estado_tramitacion ?? '');
    delete estado.dataset.userEdited; // queda como "no tocado" tras cargar
  }
}

window.FasesWizard = {
  bindEventosFasesWizard,
  cargarFasesPadre,
  cargarSubfases,
  inicializarFasesWizardModoCreacion,
  inicializarFasesWizardModoEdicion
};
