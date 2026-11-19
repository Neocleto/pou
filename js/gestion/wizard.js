/*******************************************
 *  WIZARD DE GESTIÓN DE MUNICIPIOS
 *  Archivo: wizard.js
 *  Descripción: Controla el flujo del wizard de creación y edición de municipios.
 *  Incluye: navegación entre pasos, validaciones, carga dinámica de formularios,
 *  precarga de datos, detección de cambios y guardado inteligente.
 *******************************************/

// ============================
// VARIABLES GLOBALES DE CONTROL
// ============================
let currentStep = 1;                         // Paso actual del wizard
const totalSteps = 7;                        // Número total de pasos del wizard
let modoEdicion = false;                     // Modo edición o creación
let estadoInicialWizard = {};                // Estado inicial para detectar cambios
let datosWizard = {};                        // Objeto que guarda los datos de cada paso
let promesaPaso1 = null;                     // Promesa para controlar carga del paso 1
let municipioGuardado = false;               // Controla si el municipio ya ha sido guardado o no
let cargandoEdicion = false;
let plantillaPendiente = false; // Se confirma con el siguiente guardado correcto.

// Aperturas "especiales" cuando venimos de otras pantallas (ej. panel_documentos.php)
window.pasoPendienteApertura = null;        // Paso que queremos abrir al cargar (ej. 4 - Documentos)
window.docIdPendienteEdicion = null;        // ID de documento que queremos editar automáticamente

// ============================
// ELEMENTOS DEL DOM UTILIZADOS
// ============================
const steps = document.querySelectorAll(".wizard-step");          // Círculos del encabezado
const content = document.getElementById("wizard-content");        // Contenedor de los formularios
const modalWizardLoader = document.getElementById("modalWizardLoader"); // Spinner de carga
const modalElement = document.getElementById("modalWizard");      // Modal completa
const modalWizard = new bootstrap.Modal(modalElement);            // Instancia Bootstrap Modal

modalElement.addEventListener('hidden.bs.modal', () => {
    plantillaPendiente = false;
    currentStep = 1;
    cargandoEdicion = false;
    estadoInicialWizard = {};
    datosWizard = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {} };

    // Limpiamos estados especiales de apertura / edición de documentos
    window.pasoPendienteApertura = null;
    window.docIdPendienteEdicion = null;

    steps.forEach(step => {
        step.classList.remove("active", "complete");
        step.style.pointerEvents = "auto"; // o "none" si prefieres dejar desactivados al cerrar
    });

    content.innerHTML = "";

    // limpia la URL para evitar que se reabra al recargar
    limpiarUrlAutoApertura();
});

// ============== REGLAS DEL WIZARD (ajustables) ==============
const WIZARD_RULES = {
  1: { required: true,  name: 'Datos Generales',  validator: () => validarPaso(1) },
  2: { required: true,  name: 'Información',      validator: () => validarPaso(2) },
  3: { required: true,  name: 'Fases',            validator: () => validarPaso(3) },
  4: { required: false, name: 'Documentos',       validator: () => true }, // se gestiona aparte
  5: { required: true,  name: 'Participación',    validator: () => validarPaso(5) },
  6: { required: false, name: 'Noticias',         validator: () => !formularioNoticiaAbierto() },
  7: { required: false, name: 'FAQs',             validator: () => true },
};


/*******************************************
 * FUNCIÓN: updateWizard
 * -----------------------------------------
 * Actualiza visualmente el estado del wizard:
 *  - Marca los pasos completados y el actual.
 *  - Muestra el formulario correspondiente al paso actual.
 *  - Habilita o deshabilita botones "Siguiente" y "Anterior".
 *  - Controla si se puede hacer clic en los pasos (solo en edición).
 *  - Actualiza el botón "Guardar" según cambios detectados.
 *******************************************/
function updateWizard() {
    // Recorre todos los pasos del encabezado del wizard
    steps.forEach((step, index) => {
        const num = index + 1; // Los pasos empiezan en 1, no en 0

        // Limpia clases visuales previas de los pasos
        step.classList.remove("active", "complete");

        // Marca los pasos anteriores al actual como completados (color verde)
        if (num < currentStep) step.classList.add("complete");

        // Marca el paso actual como activo (color burdeos)
        if (num === currentStep) step.classList.add("active");

        // Dejamos los pasos siempre clicables; las validaciones se hacen en intentarNavegarA()
        step.style.pointerEvents = "auto";
    
    });

    // Muestra solo el formulario correspondiente al paso actual y oculta los demás
    document.querySelectorAll(".wizard-paso").forEach(div => {
        const esPasoActual = parseInt(div.dataset.step) === currentStep;
        div.classList.toggle("d-none", !esPasoActual);
    });

    // Desactiva el botón "Anterior" si estamos en el primer paso
    document.getElementById("prevBtn").disabled = currentStep === 1;

    // Desactiva el botón "Siguiente" si estamos en el último paso
    document.getElementById("nextBtn").disabled = currentStep === totalSteps;

    // Vuelve a evaluar si el botón "Guardar" debe estar habilitado o no
    actualizarEstadoBotonGuardar();
}

// ============================================================
// COMPROBAR SI HAY CAMBIOS EN ALGÚN PASO DEL WIZARD
// ------------------------------------------------------------
// Esta lógica recorre todos los pasos cargados del wizard
// (los que tienen estado inicial guardado) y verifica si
// alguno fue modificado por el usuario respecto a su estado
// original.
//
// - Si detecta cualquier diferencia → devuelve TRUE (hay cambios)
// - Si todo sigue igual → devuelve FALSE (sin cambios)
//
// Se usa para saber si debe habilitar el botón "Guardar" o
// mostrar la alerta de “¿Cancelar cambios?”
// ============================================================
function actualizarEstadoBotonGuardar() {

    if (!modoEdicion && !municipioGuardado) {
        // En creación, permitir guardar desde el inicio
        document.getElementById("btnGuardar").disabled = false;
        return;
    }

    // Aplicar una plantilla cuenta como cambio aunque los textos coincidan.
    if (plantillaPendiente) {
        document.getElementById("btnGuardar").disabled = false;
        return;
    }

    // Recorremos todos los pasos para ver si hay cambios
    const hayCambios = Array.from({ length: totalSteps }, (_, i) => {
        const pasoNum = i + 1;

        // Saltamos los pasos 4 (Documentos) y 6 (Noticias),
        // porque tienen su propio sistema de guardado independiente.
        if (pasoNum === 4 || pasoNum === 6) return false;

        // Comprobamos si el paso actual ha sido modificado.
        // Si lo está, .some() devuelve TRUE y se detiene aquí.
        return pasoModificado(pasoNum);
    }).some(Boolean);

    document.getElementById("btnGuardar").disabled = !hayCambios;
}

/**
 * Indica si hay cambios pendientes en algún paso del wizard
 * (ignorando Documentos y Noticias, que van por libre).
 */
function hayCambiosPendientesEnWizard() {
    if (plantillaPendiente) return true;
    // En creación y todavía no se ha guardado nunca -> hay cambios “pendientes” por definición
    if (!modoEdicion && !municipioGuardado) {
        return true;
    }

    // Revisamos todos los pasos salvo 4 y 6
    for (let paso = 1; paso <= totalSteps; paso++) {
        if (paso === 4 || paso === 6) continue;
        if (pasoModificado(paso)) return true;
    }
    return false;
}


/*******************************************
 * GUARDA LOS DATOS DE UN FORMULARIO DE UN PASO
 *******************************************/
/**
 * Guarda en memoria (`datosWizard`) todos los datos del formulario del paso indicado.
 *
 * Esta función:
 *  - Extrae los valores del formulario HTML del paso.
 *  - Los guarda en el objeto `datosWizard[step]` para que puedan enviarse después.
 *
 * Cuándo se ejecuta:
 * - Al cambiar cualquier input del wizard (`input` o `change`).
 * - Al hacer clic en "Siguiente", "Anterior" o "Guardar".
 * - Durante la carga inicial de los pasos al editar un municipio (para poblar `datosWizard`).
 *
 * Es **clave** para mantener sincronizado lo que el usuario ha escrito con la estructura que se enviará al backend.
 *
 * @param {number} step - Número del paso (del 1 al 7) del cual se quiere guardar la información.
 */
function guardarDatosPaso(step) {

    // Las preguntas pueden ser propias o estar vinculadas a la biblioteca.
    if (step === 7) {
        datosWizard[step] = { faqs: preguntasAsignadasLocal.map(serializarFaqWizard) };
        return;
    }

    // 1. Form del paso - Buscamos el formulario dentro del contenedor del paso correspondiente
    const form = document.querySelector(`.wizard-paso[data-step='${step}'] form`);
    if (!form) return; // Si no hay formulario, no hacemos nada

    // 2. Creamos un objeto FormData con todos los campos del formulario actual
    const formData = new FormData(form);

    // 3. Inicializamos o sobreescribimos el objeto de datos para ese paso dentro de `datosWizard`
    datosWizard[step] = {};

    // 4. Recorremos todos los campos del formulario (input, select, textarea, etc.)
    //    y los copiamos al objeto `datosWizard[step]` como claves y valores
    for (const [key, value] of formData.entries()) {
        datosWizard[step][key] = value;
    }

    /* NOTA: Los inputs con atributo `disabled` NO se incluyen en FormData,
       por eso, al guardar el paso 1, forzamos a copiar manualmente el valor
       de `cod_mun` (y también `nombre`) desde el DOM a `datosWizard[1]`.
       Así nos aseguramos de que el backend reciba el código del municipio
       aunque el campo esté deshabilitado/solo lectura en la UI.
    */
    if (step === 1) {
        const cod = document.getElementById('cod_mun');
        const nom = document.getElementById('nombre');
        // Asegura que se guardan aunque estén disabled
        if (cod) datosWizard[1].cod_mun = cod.value || datosWizard[1].cod_mun || '';
        if (nom) datosWizard[1].nombre  = nom.value || datosWizard[1].nombre  || '';

        // Normaliza checks a '1' / '0' 
        /* Si no se normaliza, FormData enviará el checkbox como "on" cuando está marcado y no enviará nada cuando está desmarcado */
        const cbArquitecto = document.getElementById('enviar_docs_a_arquitecto');
        const cbBuzon      = document.getElementById('buzon_participacion_activo');
        datosWizard[1].enviar_docs_a_arquitecto   = cbArquitecto?.checked ? '1' : '0';
        datosWizard[1].buzon_participacion_activo = cbBuzon?.checked ? '1' : '0';
    }

}


/*******************************************
 * FUNCIÓN: cargarTodosLosPasos
 * -----------------------------------------
 * Carga dinámicamente todos los formularios del wizard (pasos 1 a 7)
 * desde archivos PHP distintos y los inyecta en su contenedor correspondiente dentro del wizard.
 * 
 * Carga todos los pasos **en paralelo** usando `fetch`, lo que mejora el rendimiento.
 * Solo se **espera explícitamente al Paso 1** (mediante `promesaPaso1`) para que 
 * en modo edición podamos asignar sus valores antes de continuar.
 * 
 * También:
 *   - Muestra un spinner mientras se cargan
 *   - Agrega listeners de input y change para guardar datos
 *   - Ejecuta validaciones específicas por paso (ej. paso 3)
 *   - Llama a un callback opcional al terminar
 * 
 * Parámetros:
 * - callback (func): función que se ejecutará cuando todos los pasos hayan cargado.
 *******************************************/
async function cargarTodosLosPasos(callback) {
    // Mapeo de cada paso del wizard con su archivo de formulario correspondiente
    const rutas = {
        1: "php/gestion/formularios/formulario_municipio.php",
        2: "php/gestion/formularios/formulario_informacion.php",
        3: "php/gestion/formularios/formulario_fases.php",
        4: "php/gestion/formularios/formulario_documentos.php",
        5: "php/gestion/formularios/formulario_participacion.php",
        6: "php/gestion/formularios/formulario_noticias.php",
        7: "php/gestion/formularios/formulario_faqs.php"
    };

    // Al reabrir retiramos los editores y los inspectores de la sesión anterior.
    await destruirEditoresEnriquecidos(document.getElementById("modalWizard"));
    document.querySelectorAll("#modalWizard .modal-content > .offcanvas").forEach(function (panel) {
        bootstrap.Offcanvas.getInstance(panel)?.dispose();
        panel.remove();
    });
    content.innerHTML = "";

    // Muestra el spinner de carga
    mostrarSpinnerModal();
    deshabilitarBotonSiguiente();

    try {
        // 1. Descargamos los siete formularios en paralelo.
        const formularios = await Promise.all(
            Object.entries(rutas).map(async function ([paso, url]) {
                const respuesta = await fetch(url, { cache: 'no-store' });

                if (!respuesta.ok) {
                    throw new Error(`No se pudo cargar el paso ${paso}.`);
                }

                return {
                    paso: Number(paso),
                    html: await respuesta.text()
                };
            })
        );

        // 2. Los insertamos de una sola vez y siempre en el mismo orden.
        //    Antes se añadían según terminaba cada petición y la modal cambiaba
        //    de tamaño varias veces, que era el parpadeo visible.
        content.innerHTML = "";

        formularios
            .sort(function (a, b) { return a.paso - b.paso; })
            .forEach(function (formulario) {
                const div = document.createElement("div");
                div.classList.add("wizard-paso");
                div.dataset.step = String(formulario.paso);
                div.innerHTML = formulario.html;

                if (formulario.paso !== currentStep) {
                    div.classList.add("d-none");
                }

                content.appendChild(div);
            });

        // 3. Inicializamos cada paso cuando todo el HTML ya está estable.
        formularios.forEach(function (formulario) {
            const pasoNum = formulario.paso;
            const div = content.querySelector(`.wizard-paso[data-step="${pasoNum}"]`);

            if (!div) {
                return;
            }

            if (typeof inicializarEditoresEnriquecidos === 'function') {
                inicializarEditoresEnriquecidos(div);
            }

            if (pasoNum === 5) {
                inicializarPasoParticipacion();

                // El título inicial de Participación no cuenta como edición del paso.
                if (!modoEdicion) {
                    guardarDatosPaso(5);
                    estadoInicialWizard[5] = { ...datosWizard[5] };
                }

                if (typeof inicializarBotonConfiguradorPortal === 'function') {
                    inicializarBotonConfiguradorPortal();
                }
            }

            if (pasoNum === 6) {
                initNoticiasWizard();
            }

            if (pasoNum !== 4 && pasoNum !== 6) {
                div.querySelectorAll("input, textarea, select").forEach(function (campo) {
                    campo.addEventListener("input", function () {
                        guardarDatosPaso(pasoNum);
                        actualizarEstadoBotonGuardar();
                    });
                    campo.addEventListener("change", function () {
                        guardarDatosPaso(pasoNum);
                        actualizarEstadoBotonGuardar();
                    });
                });
            }
        });

        // 4. Esperamos al selector del paso 1 antes de rellenar una edición.
        promesaPaso1 = Promise.resolve(inicializarSelectMunicipiosPaso1());
        await promesaPaso1;
        if (!modoEdicion) {
            await inicializarFasesWizardModoCreacion();
        }

        inicializarBotonBuscarPolitica();

        if (typeof inicializarBotonConfiguradorPortal === 'function') {
            inicializarBotonConfiguradorPortal();
        }

        habilitarBotonSiguiente();

        if (typeof callback === "function") {
            await callback();
        }
    } catch (error) {
        console.error(error);
        content.innerHTML = `
            <div class="alert alert-danger mb-0">
                No se pudieron cargar todos los pasos del asistente.
            </div>`;
        ocultarSpinnerModal();
        Swal.fire('No se pudo abrir el asistente', error.message, 'error');
    }

    // Navegación por clic en los iconos del header (solo una vez)
    document.querySelectorAll('.wizard-step').forEach(stepEl => {
        if (stepEl.dataset.navBound === '1') return;

        stepEl.addEventListener('click', () => {
            const dest = stepEl.getAttribute('data-step');
            intentarNavegarA(dest);
        });

        stepEl.dataset.navBound = '1';
    });
}


/*******************************************
 * BOTONES SIGUIENTE Y ATRÁS
 *******************************************/
document.getElementById("nextBtn")?.addEventListener("click", () => {
    const pasoActual = currentStep;

    // Validar
    if (!validarPaso(pasoActual)) return;

    guardarDatosPaso(pasoActual);
    if (currentStep < totalSteps) currentStep++;
    updateWizard();
});


document.getElementById("prevBtn")?.addEventListener("click", () => {
    const pasoActual = currentStep;

    // No permitir retroceder si el paso está incompleto pero ya tocado
    if (pasoTocadoPeroIncompleto(pasoActual)) {
        Swal.fire({
            title: "Formulario incompleto",
            text: "Completa todos los campos obligatorios antes de retroceder.",
            icon: "warning",
            confirmButtonText: "OK",
            customClass: {
                confirmButton: 'btn btn-warning'
            },
            buttonsStyling: false
        });
        return;
    }

    guardarDatosPaso(pasoActual);
    if (currentStep > 1) currentStep--;
    updateWizard();
});


/*******************************************
 * SPINNER DE CARGA
 *******************************************/
function mostrarSpinnerModal() {
    modalWizardLoader?.classList.remove("hidden");
    modalElement?.querySelector('.wizard-modal-content')
        ?.classList.add('is-loading');
    document.getElementById("btnGuardar")?.setAttribute("disabled", "disabled");
}
function ocultarSpinnerModal() {
    modalWizardLoader?.classList.add("hidden");
    window.requestAnimationFrame(function () {
        modalElement?.querySelector('.wizard-modal-content')
            ?.classList.remove('is-loading');
    });
}

// ------------------------------------------------------------
// FUNCIÓN AUXILIAR: esVacio()
// ------------------------------------------------------------
// Sirve para saber si un paso está completamente vacío:
// - sin datos
// - sin valores relevantes
// - o todos sus campos están en blanco.
// ------------------------------------------------------------
const esVacio = (obj) => {
    if (!obj) return true; // Si no existe → vacío
    const keys = Object.keys(obj);
    if (keys.length === 0) return true; // Sin propiedades → vacío

    // Revisamos cada propiedad y confirmamos que no tenga valor útil
    return keys.every(k => {
        const v = obj[k];
        return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
    });
};

/*******************************************
 * FUNCIÓN: pasoModificado
 * -----------------------------------------
 * Detecta si un paso del wizard ha sido modificado
 * respecto a su estado original (cuando se cargó).
 *
 * Comparación entre:
 * - `estadoInicialWizard[paso]`: valores originales
 * - `datosWizard[paso]`: valores actuales
 *
 * Si encuentra alguna diferencia en cualquier campo:
 *   - devuelve `true`
 * Si todo sigue igual:
 *   - devuelve `false`
 * Se usa en muchas partes del wizard:
    - Para decidir si habilitar el botón Guardar.
    - Para mostrar la alerta de “¿Cancelar cambios?”.
    - Para enviar solo los pasos realmente modificados al backend.
 *******************************************/
function pasoModificado(paso) {
    // ------------------------------------------------------------
    // CASO ESPECIAL: Paso 7 (FAQs)
    // ------------------------------------------------------------
    // Este paso no se basa en formularios tradicionales,
    // sino en una lista de preguntas que pueden ordenarse,
    // crearse o eliminarse.
    // Por eso se compara con una función específica que detecta
    // cambios entre las listas iniciales y las actuales.
    // ------------------------------------------------------------
    if (paso === 7) {
        return compararPreguntasFaq(preguntasAsignadasLocal, preguntasAsignadasInicial);
    }

    // ------------------------------------------------------------
    // OBTENEMOS LOS DOS ESTADOS DEL PASO
    // ------------------------------------------------------------
    const original = estadoInicialWizard[paso];  // Estado inicial (lo que se cargó del backend)
    const actual = datosWizard[paso];            // Estado actual (lo que ha rellenado el usuario)

    // ------------------------------------------------------------
    // REGLAS DE COMPARACIÓN RÁPIDA
    // ------------------------------------------------------------
    // Evita falsos positivos cuando ambos objetos están vacíos
    // o cuando un paso aún no se ha “congelado” (no se guardó).
    // ------------------------------------------------------------

    // 1. Ambos vacíos - sin cambios
    if (esVacio(original) && esVacio(actual)) return false;

    // ------------------------------------------------------------
    // NORMALIZACIÓN DE VALORES
    // ------------------------------------------------------------
    // Convertimos los valores nulos o indefinidos a cadena vacía
    // para poder comparar correctamente campos vacíos o no definidos.
    // ------------------------------------------------------------
    const norm = (v) => (v === undefined || v === null) ? '' : String(v);

    // Creamos un conjunto con todas las claves de ambos objetos
    // para asegurarnos de comparar todos los campos.
    const keys = new Set([
        ...Object.keys(original || {}),
        ...Object.keys(actual || {})
    ]);

    // ------------------------------------------------------------
    // COMPARACIÓN CAMPO A CAMPO
    // ------------------------------------------------------------
    // Si cualquiera de los valores no coincide (tras normalizar),
    // significa que el usuario cambió algo asi que devolvemos TRUE.
    // ------------------------------------------------------------
    for (const k of keys) {
        if (norm(original?.[k]) !== norm(actual?.[k])) return true;
    }

    // Si no se encontró ninguna diferencia, el paso no ha cambiado
    return false;
}

/**
 * BOTÓN: Guardar municipio
 * --------------------------------------------
 * Se activa al hacer clic en el botón "Guardar".
 *
 * FUNCIONALIDAD PRINCIPAL:
 * - Valida todos los pasos modificados del wizard.
 * - Si el usuario confirma, genera un FormData y lo envía al backend.
 * - Según si estamos creando o editando un municipio, el comportamiento varía.
 *
 * MODO CREACIÓN (¡Nuevo municipio!):
 * -----------------------------------
 * - Se permiten guardar todos los pasos con contenido, hayan sido modificados o no.
 * - Si los pasos 2 y 3 tienen contenido, se les asigna automáticamente el `cod_mun`.
 * - Se incluye también el `usuario_id` para saber quién creó el municipio.
 * - Todos los pasos con contenido se envían al backend.
 *
 * MODO EDICIÓN (municipio ya guardado):
 * ---------------------------------------
 * - Solo se envían al backend los pasos que realmente fueron modificados.
 * - Esto reduce tráfico innecesario y evita sobrescribir sin querer.
 * - `cod_mun` también se incluye explícitamente para que el backend sepa qué municipio editar
 */
document.getElementById("btnGuardar")?.addEventListener("click", () => {

    // 1. Validamos todos los pasos antes de guardar
    // Si algún paso obligatorio está incompleto, detenemos el proceso
    if (!validarTodoAntesDeGuardar()) return;

    // 2. Si es un municipio nuevo (modo creación), propagamos datos clave como cod_mun y usuario_id
    if (!modoEdicion) {
        const codMun = datosWizard[1]?.cod_mun || '';  // Código del municipio
        const usuarioId = document.getElementById("usuario_id")?.value || '';  // Usuario conectado

        datosWizard[1].usuario_id = usuarioId; // Se guarda para paso 1

        // Solo propagamos el código si los pasos 2 o 3 tienen contenido
        for (let paso of [2, 3]) {
            const tieneContenido = Object.values(datosWizard[paso] || {}).some(val => val?.trim?.() !== '');
            if (tieneContenido) datosWizard[paso].cod_mun = codMun;
        }
    }

    // 3. Mostramos confirmación con SweetAlert2 antes de enviar los datos
    Swal.fire({
        title: "¿Deseas guardar los datos?",
        text: "Se almacenará la información del municipio.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, guardar",
        cancelButtonText: "Cancelar",
        customClass: {
            confirmButton: 'btn btn-success me-2',
            cancelButton: 'btn btn-secondary'
        },
        buttonsStyling: false
    }).then((result) => {
        if (!result.isConfirmed) return; // Si el usuario cancela, detenemos todo

        // 4. Preparamos el FormData con todos los pasos rellenados
        // Esta función separada crea un FormData solo con los pasos necesarios
        const formData = generarFormDataDesdeWizard();

        // 5. Mostramos el spinner de carga en la modal
        mostrarSpinnerModal();

        // 6. Enviamos los datos al backend por fetch POST
        fetch("php/gestion/acciones/acciones_panel.php", {
            method: "POST",
            body: formData
        })

        // 7. Procesamos la respuesta del servidor
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                municipioGuardado = true; // Marcamos que ya se ha guardado
                if (plantillaPendiente) {
                    cargarBotonesParticipacion(datosWizard[1].cod_mun);
                }

                // Mostramos mensaje de éxito
                if (!modoEdicion) {
                    // Swal especial para creación
                    Swal.fire({
                        icon: 'success',
                        title: 'Municipio creado correctamente',
                        html: `
                        <hr class="my-2"><br>
                        <div class="d-flex align-items-start gap-2 text-start justify-content-start">
                        <i class="bi bi-info-circle-fill text-primary fs-4"></i>
                        <div style="text-align: justify; font-size: 0.95rem;">
                            Recuerda: el municipio <strong> no estará visible públicamente hasta que sea activado </strong>.  
                            Pulse en Publicar desde el panel de gestion para que este disponible al público.
                        </div>
                        </div>
                    `,
                        confirmButtonText: 'Entendido',
                        customClass: {
                            popup: 'text-sm',
                            confirmButton: 'btn btn-primary'
                        },
                        buttonsStyling: false
                    }).then(() => {
                        recargarTablaMunicipios();

                        // Hacemos una “foto” del formulario tal y como ha quedado tras guardar.
                        // Esto sirve para que, si el usuario no toca nada más, el sistema sepa
                        // que no hay cambios pendientes y no muestre avisos por error.
                        refrescarFotoInicial();

                        modoEdicion = true;         // Tras crear, nos comportamos como edición

                        actualizarEstadoBotonGuardar();
                    });

                } else {
                    // Swal clásico para edición
                    Swal.fire({
                        title: "Guardado",
                        text: "El municipio ha sido guardado correctamente.",
                        icon: "success",
                        confirmButtonText: "OK",
                        customClass: {
                            confirmButton: 'btn btn-success'
                        },
                        buttonsStyling: false
                    }).then(() => {
                        recargarTablaMunicipios();

                        // Hacemos una “foto” del formulario tal y como ha quedado tras guardar.
                        // Esto sirve para que, si el usuario no toca nada más, el sistema sepa
                        // que no hay cambios pendientes y no muestre avisos por error.
                        refrescarFotoInicial();
                        actualizarEstadoBotonGuardar();
                    });
                }

            } else {
                // Si hubo un error, lo lanzamos para mostrarlo abajo
                throw new Error(data.message || "Error al guardar");
            }
        })
        // 8. Si ocurre un error de red o backend, lo capturamos
        .catch(err => {
            console.error(err);

            const msg = err.message || "";

            // Error por duplicado
            if (msg.includes("ya existe un municipio") || msg.includes("municipio con este código")) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al crear municipio',
                    html: `
                    <p>Este municipio ya existe.</p>
                    <hr class="my-2"><br>
                    <div class="d-flex align-items-start gap-2 text-start justify-content-start">
                        <i class="bi bi-info-circle-fill text-primary fs-4"></i>
                        <div style="text-align: justify; font-size: 0.95rem;">
                            Si no aparece en tu <strong>panel de gestión</strong>, es posible que lo esté gestionando otro usuario.<br>
                            Si no aparece en la <strong>página principal</strong> del POU, puede estar desactivado.
                        </div>
                    </div>
                `,
                    confirmButtonText: 'Entendido',
                    customClass: {
                        popup: 'text-sm',
                        confirmButton: 'btn btn-primary'
                    },
                    buttonsStyling: false
                });

                // Habilitar botón para volver a intentar
                document.getElementById("btnGuardar").disabled = false;

            } else {
                Swal.fire("No se pudo guardar", msg || "No se pudo guardar el municipio.", "error");

                // Habilitar botón para volver a intentar
                document.getElementById("btnGuardar").disabled = false
            }
        })
        // 9. Ocultamos el spinner al finalizar (éxito o fallo)
        .finally(() => ocultarSpinnerModal());
    });
});


/**
 * Valida todos los pasos modificados antes de guardar el municipio.
 *
 * Recorre todos los pasos del wizard (menos el paso 4).
 * Solo valida si el paso ha sido modificado (con `pasoModificado()`).
 * Usa validación HTML5 (`form.checkValidity()`).
 *
 * Si encuentra errores:
 *   - Muestra el paso con errores.
 *   - Ejecuta `reportValidity()` o alerta personalizada.
 *   - Detiene el proceso de guardado.
 *
 * @returns {boolean} true si todo está correcto, false si hay errores.
 */
function validarTodoAntesDeGuardar() {
    for (let paso = 1; paso <= totalSteps; paso++) {

        if (paso === 4 || paso === 6) continue; // Documentos y Noticias van por libre

        // Solo validamos los pasos que han sido modificados
        if (!pasoModificado(paso)) continue;

        // Guardamos el contenido actual antes de validarlo
        guardarDatosPaso(paso);

        // Buscamos el formulario dentro del paso actual
        const divPaso = document.querySelector(`.wizard-paso[data-step='${paso}']`);
        const form = divPaso?.querySelector("form");

        // Validación estándar HTML5: required, email, url, etc.
        if (form && !form.checkValidity()) {
            currentStep = paso;
            updateWizard();
            form.reportValidity(); // Muestra los errores en pantalla nativamente
            return false;
        }

    }

    return true;
}


/**
 * Genera un objeto FormData con los datos de los pasos del wizard
 * para ser enviado al backend (`acciones_panel.php`).
 *
 * Comportamiento:
 * - En modo creación, incluye todos los pasos que tienen contenido.
 * - En modo edición, incluye SOLO los pasos que han sido modificados.
 * - El paso 4 (Documentos) se excluye siempre, ya que se gestiona aparte.
 *
 * @returns {FormData} Objeto listo para ser enviado vía fetch()
 */
function generarFormDataDesdeWizard() {
    const formData = new FormData();  // Objeto que contiene todos los datos a enviar
    const codMun = datosWizard[1]?.cod_mun || '';  // Código del municipio

    //  Indicamos el modo: creación o edición
    formData.append("modo", modoEdicion ? "editar" : "crear");

    // El botón de plantilla puede preparar también el diseño, los textos
    // generales y los accesos iniciales del portal.
    if (plantillaPendiente) {
        formData.append("aplicar_plantilla_portal", "1");
    }

    // En modo edición, también enviamos explícitamente el código del municipio
    if (modoEdicion) formData.append("cod_mun", codMun);

    // Recorremos todos los pasos del wizard (del 1 al 7)
    for (let paso = 1; paso <= totalSteps; paso++) {

        if (paso === 4 || paso === 6) continue; // Documentos y Noticias van por libre

        const datos = datosWizard[paso];

        // Verificamos si hay algún dato no vacío (para evitar enviar pasos vacíos)
        const tieneContenido = Object.values(datos || {}).some(val => val?.trim?.() !== '');
        if (!tieneContenido) continue;

        // La plantilla sustituye los textos del diseño y las asignaciones de
        // preguntas incluso si su contenido visible coincide con el anterior.
        const formaParteDelReemplazo = plantillaPendiente && (paso === 5 || paso === 7);
        if (!formaParteDelReemplazo && (modoEdicion || paso === 5) && !pasoModificado(paso)) continue;

        // Aseguramos que todos los pasos (excepto 1) tengan `cod_mun` al enviarlos
        if (!datos.cod_mun && paso !== 1) datos.cod_mun = codMun;

        // Añadimos el paso al FormData (como JSON)
        formData.append(`paso${paso}`, JSON.stringify(datos));
    }

    return formData;
}


/*******************************************
 * BOTÓN CREAR MUNICIPIO
 *******************************************/
document.getElementById("btnCrearMunicipio")?.addEventListener("click", () => {
    municipioGuardado = false;
    modoEdicion = false;
    currentStep = 1;

    estadoInicialWizard = {};
    datosWizard = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {} };

    window.pasoPendienteApertura = null;
    window.docIdPendienteEdicion = null;

    // Limpiar estado visual de pasos
    steps.forEach(step => {
        step.classList.remove("complete", "active");
        step.style.pointerEvents = "none";
    });

    content.innerHTML = "";
    mostrarSpinnerModal();

    // Reseteamos paso 7
    resetearEstadoFaqsWizard();

    modalWizard.show();

    cargarTodosLosPasos(() => {
        updateWizard(); // esto asignará correctamente active al paso 1
        ocultarSpinnerModal();

        // Inicializamos categorias y fases documentos del paso 4
        cargarCategoriasDocumento();
        cargarFasesDocumento();

        // Inicializamos el paso 7
        inicializarFaqsWizard(); // sin codMun porque estamos creando
    });
});


/*******************************************
 * BOTÓN CANCELAR
 *******************************************/
document.getElementById("btnCancelar")?.addEventListener("click", () => {

    let cambios = false;

    // 1) Construyo la lista de pasos 1..totalSteps
    const pasos = [];
    for (let i = 1; i <= totalSteps; i++) {
    pasos.push(i);
    }

    // 2) Excluyo pasos 4 y 6 (gestionan guardado aparte)
    const pasosAComprobar = pasos.filter(p => p !== 4 && p !== 6);

    // 3) Compruebo si alguno fue modificado
    for (const paso of pasosAComprobar) {
        if (pasoModificado(paso)) {
            cambios = true;
            break; // corto en cuanto encuentro uno
        }
    }

    if (cambios) {
        Swal.fire({
            title: "¿Cancelar cambios?",
            text: "Se perderán los datos no guardados.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, cancelar",
            cancelButtonText: "No, continuar",
            customClass: {
                confirmButton: 'btn btn-danger me-2',
                cancelButton: 'btn btn-secondary'
            },
            buttonsStyling: false
        }).then((result) => {
            if (result.isConfirmed) modalWizard.hide();
        });
    } else {
        modalWizard.hide();
    }
});


/*******************************************
 * BOTÓN PREVISUALIZAR
 *******************************************/
document.getElementById("btnPreviewMunicipio")?.addEventListener("click", () => {

    // Obtenemos el código de municipio del paso 1 (desde datosWizard o desde el input)
    const codMun = (datosWizard[1]?.cod_mun || '').trim()
        || (document.getElementById('cod_mun')?.value || '').trim();

    if (!codMun) {
        Swal.fire({
            icon: 'info',
            title: 'Completa el Paso 1',
            text: 'Para previsualizar necesitas seleccionar el municipio (nombre y código INE) en el Paso 1.',
            confirmButtonText: 'Entendido',
            customClass: { confirmButton: 'btn btn-primary' },
            buttonsStyling: false
        });
        return;
    }

    // CASO A: estamos creando y aún NO se ha guardado nunca
    if (!modoEdicion && !municipioGuardado) {

        // Opcionalmente, usamos la misma validación global que en Guardar
        if (!validarTodoAntesDeGuardar()) return;

        Swal.fire({
            title: "Guardar antes de previsualizar",
            text: "Se guardará el municipio con los datos actuales para generar la previsualización.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Guardar y previsualizar",
            cancelButtonText: "Cancelar",
            customClass: {
                confirmButton: 'btn btn-success me-2',
                cancelButton: 'btn btn-secondary'
            },
            buttonsStyling: false
        }).then((result) => {
            if (!result.isConfirmed) return;

            // Reutilizamos tu flujo de guardado genérico,
            // pero en modo "silencioso": sin SweetAlert de éxito, solo callback.
            guardarYPrevisualizarMunicipio(codMun);
        });

        return;
    }

    // CASO B: municipio ya existe (modo edición) o ya se guardó al menos una vez
    // Si hay cambios sin guardar, pedimos guardar antes (siguiendo el mismo paradigma de seguridad)
    if (hayCambiosPendientesEnWizard()) {

        // Opcional: puedes saltarte validarTodoAntesDeGuardar aquí o reutilizarlo
        if (!validarTodoAntesDeGuardar()) return;

        Swal.fire({
            title: "Hay cambios sin guardar",
            text: "Para que la previsualización refleje los últimos cambios, primero se guardará el municipio.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Guardar y previsualizar",
            cancelButtonText: "Cancelar",
            customClass: {
                confirmButton: 'btn btn-success me-2',
                cancelButton: 'btn btn-secondary'
            },
            buttonsStyling: false
        }).then((result) => {
            if (!result.isConfirmed) return;

            guardarYPrevisualizarMunicipio(codMun);
        });

    } else {
        // CASO C: sin cambios pendientes → abrimos directamente la previsualización
        abrirPreviewMunicipio(codMun);
    }
});


/*******************************************
 * EDITAR MUNICIPIO

 * FUNCIÓN: editarMunicipio
 * -----------------------------------------
 * Se ejecuta cuando el usuario pulsa "Editar" en la tabla de municipios.
 * Carga los datos del municipio correspondiente (`codMun`) desde la BBDD
 * y los inyecta en cada paso del wizard de edición.
 *
 * También:
 * - Muestra el modal del wizard.
 * - Prepara el entorno para edición (marcando modo, paso inicial, etc.).
 * - Rellena `datosWizard` y `estadoInicialWizard` para detectar cambios.
 *
 * @param {string} codMun - Código INE del municipio a editar.
 */
async function editarMunicipio(codMun) {
    // ===========================
    // 1. Inicialización de entorno
    // ===========================
    cargandoEdicion = true;            // Evita que los cambios programáticos disparen guardado/estado
    modoEdicion = true;                // Modo edición activado
    municipioGuardado = true;          // Se asume que ya existe en BBDD

    // Si venimos con un paso pendiente desde la URL, lo usamos.
    // Si no, empezamos en el 1 como siempre.
    currentStep = window.pasoPendienteApertura
        ? Number(window.pasoPendienteApertura)
        : 1;

    // Reiniciamos los datos actuales y el estado inicial
    datosWizard = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {} };
    estadoInicialWizard = {};

    content.innerHTML = "";            // Limpiamos contenido del wizard
    resetearEstadoFaqsWizard();        // Reseteamos paso 7
    modalWizard.show();                // Mostramos la modal
    mostrarSpinnerModal();             // Mostramos spinner de carga

    // ===========================
    // 2. Cargamos los formularios HTML
    // ===========================
    cargarTodosLosPasos(async () => {
        // Asegura que el HTML del Paso 1 ya se ha cargado antes de empezar a editar campo
        await promesaPaso1;

        try {
            // ===========================
            // PASO 1: Datos del municipio
            // ===========================
            const res1 = await fetch(`php/gestion/acciones/acciones_panel.php?action=obtenerMunicipio&cod_mun=${encodeURIComponent(codMun)}`);
            const data1 = await res1.json();
            if (!data1.success) throw new Error(data1.message || "Error obteniendo municipio");
            const mun = data1.data;

            // Cargamos municipio
            const $selNombre = $('#nombre');
            const inpCod = document.getElementById('cod_mun');

            if ($selNombre.length && inpCod) {
                const selectNombre = $selNombre[0];
                const codMunStr = String(mun.cod_mun || '');
                const opcionPorCodigo = Array.from(selectNombre.options).find(opt =>
                    String(opt.getAttribute('data-codigo') || '') === codMunStr
                );

                // En edición no necesitamos que el municipio sea un select.
                // Convertimos el selectpicker en un input readonly para evitar la condición de carrera
                // del plugin al refrescar/deshabilitar, que podía duplicar la etiqueta visible.
                const nombreVisible = (opcionPorCodigo?.textContent || mun.nombre || '').trim();
                convertirNombreMunicipioAReadonly($selNombre, nombreVisible);

                inpCod.value = codMunStr;
                inpCod.setAttribute('disabled', 'disabled');
            }

            document.getElementById("correo_contacto").value = mun.correo_contacto || "";
            document.getElementById("correo_contacto_gestor").value = mun.correo_contacto_gestor || "";
            document.getElementById("politica_privacidad_url").value = mun.politica_privacidad_url || "";
            document.getElementById("imagen_cabecera").value = mun.imagen_cabecera || "";
            document.getElementById("url_escudo").value = mun.escudo || "";
            document.getElementById("fecha_creacion").value = mun.fecha_creacion || "";
            document.getElementById("fecha_modificacion").value = mun.fecha_modificacion || "";

            // Check “enviar_docs_a_arquitecto”
            const cbArquitecto = document.getElementById('enviar_docs_a_arquitecto');
             // desde el backend puede venir true/false, "1"/"0" o 1/0 → normalizamos a boolean
            if (cbArquitecto) {
                cbArquitecto.checked = convertirBooleanoWizard(
                    mun.enviar_docs_a_arquitecto
                );
            }

            // Check “buzon_participacion_activo”
            const cbBuzon = document.getElementById('buzon_participacion_activo');
            if (cbBuzon) {
                cbBuzon.checked = convertirBooleanoWizard(
                    mun.buzon_participacion_activo
                );
            }

            guardarDatosPaso(1); // Guardamos en datosWizard
            estadoInicialWizard[1] = { ...datosWizard[1] }; // Clonamos como estado inicial

            // Estos pasos comparten los campos de la plantilla. Esperamos su
            // carga para que una respuesta tardía no pise los cambios del usuario.
            const urlPanel = 'php/gestion/acciones/acciones_panel.php';
            const codigo = encodeURIComponent(codMun);
            const [informacion, fase, participacion] = await Promise.all(
                ['obtenerInformacion', 'obtenerFaseActual', 'obtenerParticipacion'].map(async function (accion) {
                    const respuesta = await fetch(`${urlPanel}?action=${accion}&cod_mun=${codigo}`);
                    const datos = await respuesta.json();
                    if (!datos.success) throw new Error(datos.message || 'No se pudo completar la carga.');
                    return datos.data;
                })
            );

            document.getElementById('cod_mun_informacion').value = codMun;
            document.getElementById('titulo').value = informacion?.titulo ?? '';
            actualizarEditorEnriquecido('descripcion', informacion?.descripcion ?? '');

            await inicializarFasesWizardModoEdicion({ ...fase, cod_mun: codMun });

            document.getElementById('titulo1').value = participacion.titulo1 ?? '';
            actualizarEditorEnriquecido('descripcion1', participacion.descripcion1 ?? '');

            for (const paso of [2, 3, 5]) {
                guardarDatosPaso(paso);
                estadoInicialWizard[paso] = { ...datosWizard[paso] };
            }
            await inicializarFaqsWizard(codMun);

            // Los listados de recursos se cargan por separado del guardado general.
            cargarCategoriasDocumento();
            cargarFasesDocumento();
            cargarDocumentos(codMun);

            // ===========================
            // PASO 5.1: Botones de participación
            // ===========================
            cargarBotonesParticipacion(codMun);

            // ===========================
            // PASO 6: Noticias
            // ===========================
             cargarNoticias() //ahora vive en noticiasWizard.js

        } catch (err) {
            cargandoEdicion = false;
            console.error(err);
            Swal.fire("Error", "No se pudieron cargar todos los datos del municipio", "error");
            ocultarSpinnerModal();
            modalWizard.hide();
            return;
        }

        cargandoEdicion = false;
        updateWizard();
        ocultarSpinnerModal();
    });
}

/**
 * Convierte los booleanos devueltos por PostgreSQL o por JSON.
 *
 * @param {*} valor Valor recibido del servidor.
 * @returns {boolean} Verdadero únicamente para valores afirmativos conocidos.
 */
function convertirBooleanoWizard(valor) {
    if (valor === true || valor === 1) {
        return true;
    }

    const texto = String(valor ?? '').trim().toLowerCase();
    return ['1', 't', 'true', 'yes', 'si', 'sí'].includes(texto);
}

/* FUNCIONES AUXILIARES */

// ============================
// FUNCIÓN: guardarMunicipioAntesDeSubir
// ============================
/**
 * Guarda todos los pasos del wizard si aún no se ha guardado el municipio.
 * Ejecuta un callback tras guardado exitoso (útil para subir documentos, botones, etc.).
 *
 * @param {Function} callback - Función a ejecutar tras guardar.
 */
function guardarMunicipioAntesDeSubir(callback, opciones = {}) {
    for (let paso = 1; paso <= totalSteps; paso++) {
        guardarDatosPaso(paso);
    }

    // Un municipio ya guardado y sin cambios no necesita otra petición.
    if (modoEdicion && !hayCambiosPendientesEnWizard()) {
        if (typeof callback === "function") callback();
        return;
    }

    // Preparamos el FormData con todos los pasos rellenados.
    const formData = generarFormDataDesdeWizard();

    mostrarSpinnerModal();

    fetch("php/gestion/acciones/acciones_panel.php", {
        method: "POST",
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                municipioGuardado = true;
                modoEdicion = true;
                if (plantillaPendiente) {
                    cargarBotonesParticipacion(datosWizard[1].cod_mun);
                }

                refrescarFotoInicial();
                
                recargarTablaMunicipios();

                // Mostrar Swal solo si no está en modo silencioso
                if (!opciones.silencioso) {
                    Swal.fire({
                        title: "Guardado",
                        text: "El municipio se guardó correctamente.",
                        icon: "success",
                        confirmButtonText: "OK",
                        customClass: {
                            confirmButton: 'btn btn-success'
                        },
                        buttonsStyling: false
                    }).then(() => {
                        if (typeof callback === "function") callback();
                    });
                } else {
                    if (typeof callback === "function") callback();
                }
            } else {
                throw new Error(data.message || "Error al guardar el municipio");
            }
        })
        .catch(err => {
            console.error(err);
            if (typeof opciones.alError === 'function') {
                opciones.alError(err);
            }
            Swal.fire("Error", err.message || "No se pudo guardar el municipio.", "error");
        })
        .finally(() => ocultarSpinnerModal());
}


function abrirPreviewMunicipio(codMun, ventanaPreparada = null) {
    if (!codMun) return;
    const url = `php/municipio/municipio.php?cod_mun=${encodeURIComponent(codMun)}&preview=1`;
    if (ventanaPreparada && !ventanaPreparada.closed) {
        ventanaPreparada.location.href = url;
    } else {
        window.open(url, '_blank', 'noopener');
    }
}

// Reservamos la pestaña en la confirmación, antes de esperar al servidor.
function guardarYPrevisualizarMunicipio(codMun) {
    const ventana = window.open('about:blank', '_blank');
    if (!ventana) {
        Swal.fire('Previsualización', 'Permite las ventanas emergentes para abrir la vista previa.', 'info');
        return;
    }
    ventana.opener = null;
    guardarMunicipioAntesDeSubir(function () {
        abrirPreviewMunicipio(codMun, ventana);
    }, {
        silencioso: true,
        alError: function () { ventana.close(); }
    });
}





function deshabilitarBotonSiguiente() {
    document.getElementById("nextBtn").disabled = true;
}

function habilitarBotonSiguiente() {
    document.getElementById("nextBtn").disabled = false;
}


/**
 * Valida si el formulario del paso indicado está correctamente rellenado.
 * 
 * Se usa antes de permitir avanzar al siguiente paso o antes de guardar el municipio.
 * 
 * - Comprueba los campos con `required` y otros tipos nativos de HTML5.
 *
 * @param {number} step - Número del paso del wizard (del 1 al 7)
 * @returns {boolean} - Devuelve true si el formulario es válido, o false si hay errores.
 */
function validarPaso(step) {
    // Localiza el contenedor del paso que corresponde al número indicado
    const divPaso = document.querySelector(`.wizard-paso[data-step='${step}']`);

    // Busca el formulario dentro del paso
    const form = divPaso?.querySelector("form");

    // Validacion de Municipio
    if (step === 1) {
        const sel = document.getElementById("nombre");
        const cod = document.getElementById("cod_mun");
        if (!sel.value || !/^\d{5}$/.test(cod.value)) {
            sel.reportValidity(); // dispara nativo
            return false;
        }
    }

    // Paso 6: NO PERMITIR avanzar si está abierto el formulario de noticias
    if (step === 6 && formularioNoticiaAbierto()) {
        Swal.fire({
            title: "Formulario abierto",
            text: "Guarda o cierra el formulario de noticias antes de continuar.",
            icon: "warning",
            confirmButtonText: "Entendido",
            customClass: {
                confirmButton: 'btn btn-primary'
            },
            buttonsStyling: false
        });
        return false;
    }

    // Al guardar la plantilla se crearán los botones de participación.
    if (Number(step) === 5 && !plantillaPendiente) {
        if (typeof participacionTieneBotones === "function" && !participacionTieneBotones()) {
            Swal.fire({
                title: "Botón requerido",
                text: "Debes añadir al menos un botón de participación para continuar.",
                icon: "warning",
                confirmButtonText: "OK",
                customClass: { confirmButton: 'btn btn-primary' },
                buttonsStyling: false
            });
            return false;
        }
    }

    // Validación estándar HTML5 (required, type=email, etc.)
    if (form && !form.checkValidity()) {
        form.reportValidity();  // Muestra los errores en pantalla
        return false;           // No es válido, detener avance
    }

    // Si todo está bien, permite continuar
    return true;
}

/**
 * Determina si el usuario ha comenzado a rellenar un paso del wizard
 * pero no ha completado correctamente todos los campos requeridos.
 *
 * Esta función se usa para **bloquear la navegación hacia atrás** o el **guardado**
 * si el usuario ha "tocado" (modificado) un paso y dejó campos obligatorios incompletos.
 *
 * EN MODO EDICIÓN:
 * - No se considera un paso como "tocado" si el usuario simplemente lo visita
 *   pero no ha modificado ningún campo.
 *
 * Lógica aplicada:
 * - Si el paso no ha sido modificado (`pasoModificado`): se permite continuar.
 * - Si ha sido modificado:
 *    - Se comprueba si hay datos introducidos (`hayDatos`)
 *    - Se valida el formulario con las reglas HTML5.
 *    - Si hay datos pero el formulario es inválido => se bloquea la acción.
 *
 * @param {number} paso - Número del paso del wizard a evaluar (1 al 7)
 * @returns {boolean} - Devuelve true si el paso fue modificado pero está incompleto; false si no hay problema.
 */
function pasoTocadoPeroIncompleto(paso) {
    const divPaso = document.querySelector(`.wizard-paso[data-step='${paso}']`);
    const form = divPaso?.querySelector("form");
    if (!form) return false;

    // Si el usuario no ha modificado nada respecto al estado inicial, no se aplica validación
    if (!pasoModificado(paso)) return false;

    let hayDatos = false;               // Marcará si se ha introducido algún dato
    let esValido = form.checkValidity(); // Validación estándar HTML5

    // Recorre todos los campos del paso actual
    divPaso.querySelectorAll("input, textarea, select").forEach(el => {
        if (el.type === "checkbox" || el.type === "radio") {
            if (el.checked) hayDatos = true;
        } else if (el.value.trim() !== "") {
            hayDatos = true;
        }
    });


    // Solo devuelve true si hay datos introducidos y la validación falla
    return hayDatos && !esValido;
}


/**
 * Compara dos arrays de preguntas FAQ (asignadas vs inicial) para detectar cambios.
 * Retorna true si hay diferencias en ID, orden o contenido.
 * 
 * @param {Array} lista1 - Lista actual (preguntasAsignadasLocal)
 * @param {Array} lista2 - Lista inicial (preguntasAsignadasInicial)
 * @returns {boolean} - true si hay cambios, false si son iguales
 */
function compararPreguntasFaq(lista1, lista2) {
    // Si el número de elementos cambia, hay cambios sí o sí
    if (lista1.length !== lista2.length) return true;

    // Comparamos en el mismo orden; cualquier reordenación contará como cambio
    for (let i = 0; i < lista1.length; i++) {
        const p1 = lista1[i];
        const p2 = lista2[i];

        if (
            String(p1.id) !== String(p2.id) ||
            p1.pregunta !== p2.pregunta ||
            p1.respuesta !== p2.respuesta
        ) {
            return true;
        }
    }

    return false;
}


/**
 *  Carga opciones en <select name="nombre"> y sincroniza cod_mun (readonly)
 * 
 **/
function inicializarSelectMunicipiosPaso1() {

    const $sel = $('#nombre');
    const cod = document.getElementById('cod_mun');

    if (!$sel.length || !cod) return Promise.resolve();

    // Limpieza total: wrappers y listeners previos
    try {
        $sel.off('.bs.select changed.bs.select');
        if ($sel.data('selectpicker')) $sel.selectpicker('destroy');
    } catch (_) { }
    $sel.nextAll('.bootstrap-select').remove();

    // Vaciar y cargar opciones
    $sel.empty();

    return fetch('php/gestion/acciones/acciones_panel.php?action=listarMunicipiosINE')
        .then(r => r.json())
        .then(({ success, data }) => {
            if (!success || !Array.isArray(data)) throw new Error('No se pudieron cargar municipios');

            const opts = data.map(m => `
                            <option value="${escapeHtml(m.nombre)}" data-codigo="${escapeHtml(m.codigo)}">
                                ${escapeHtml(m.nombre)}
                            </option>`).join('');

            $sel.html(opts);

            // Inicializar (cuando ya están las opciones)
            $sel.selectpicker({ liveSearch: true, size: 8 });

            // Un único listener
            $sel.on('changed.bs.select', function () {
                const opt = this.selectedOptions[0];
                cod.value = opt?.getAttribute('data-codigo') || '';

                // limpia el buscador y cierra el menú
                resetSearchAndLabel($(this));

                // Durante la carga inicial de edición no marcamos cambios por eventos del plugin.
                if (!cargandoEdicion) {
                    guardarDatosPaso(1);
                    actualizarEstadoBotonGuardar();
                }
            });

            // En modo edición no bloqueamos aquí: editarMunicipio() espera a que
            // existan las opciones y después sustituye el selectpicker por un readonly estable.
        });
}

/**
 * Lanza la búsqueda automática de la URL de política de privacidad
 * usando el nombre del municipio.
 */
function inicializarBotonBuscarPolitica() {
    const btn = document.getElementById('btnBuscarPolitica');
    const inputUrl = document.getElementById('politica_privacidad_url');
    if (!btn || !inputUrl) {
        return;
    }

    // Evitar eventos duplicados al volver a abrir el asistente.
    if (btn.dataset.bound === '1') {
        return;
    }
    btn.dataset.bound = '1';

    btn.addEventListener('click', async () => {
        if (btn.disabled) {
            return;
        }

        // 1. Leer el nombre actual. En edición es un input; en creación, un select.
        const campoNombre = document.getElementById('nombre');
        let nombreMunicipio = '';
        if (campoNombre && campoNombre.tagName === 'SELECT' && campoNombre.value) {
            nombreMunicipio = campoNombre.selectedOptions[0].textContent.trim();
        } else if (campoNombre && campoNombre.tagName === 'INPUT') {
            nombreMunicipio = campoNombre.value.trim();
        }
        if (nombreMunicipio === '') {
            Swal.fire({
                icon: 'info', title: 'Selecciona un municipio',
                text: 'Primero debes escoger el municipio en el Paso 1.'
            });
            return;
        }

        // 2. Bloquear el botón y enviar una única búsqueda al servidor.
        const valorMunicipio = campoNombre.value;
        const contenidoBoton = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Buscando…';
        const parametros = new URLSearchParams();
        parametros.append('action', 'buscarPoliticaPrivacidad');
        parametros.append('municipio', nombreMunicipio);
        const controlBusqueda = new AbortController();
        const temporizador = setTimeout(() => controlBusqueda.abort(), 28000);

        try {
            const respuesta = await fetch('php/gestion/acciones/acciones_panel.php', {
                method: 'POST', body: parametros, signal: controlBusqueda.signal
            });
            if (respuesta.status === 401) {
                throw new Error('La sesión ha caducado. Vuelve a iniciar sesión para buscar.');
            }
            if (!respuesta.ok) {
                throw new Error('El servidor no ha podido completar la búsqueda. Puedes escribir la URL manualmente.');
            }
            const datos = await respuesta.json();

            // No rellenar otro municipio si el usuario cambió de selección o reabrió el asistente.
            if (!btn.isConnected || document.getElementById('nombre') !== campoNombre || campoNombre.value !== valorMunicipio) {
                return;
            }
            if (datos.success && datos.url) {
                inputUrl.value = datos.url;
                guardarDatosPaso(1);
                actualizarEstadoBotonGuardar();
                Swal.fire({
                    icon: 'success', title: 'URL encontrada',
                    text: 'Se ha encontrado una dirección probable. Ábrela para comprobarla antes de guardar.'
                });
            } else {
                Swal.fire({
                    icon: 'info', title: 'Búsqueda sin resultado',
                    text: datos.message || 'No se ha localizado el enlace. Puedes escribir la URL manualmente.'
                });
            }
        } catch (error) {
            if (!btn.isConnected || document.getElementById('nombre') !== campoNombre || campoNombre.value !== valorMunicipio) {
                return;
            }
            let mensaje = 'No se pudo completar la búsqueda. Puedes escribir la URL manualmente.';
            if (error.name === 'AbortError') {
                mensaje = 'La web del ayuntamiento tarda demasiado en responder. Puedes escribir la URL manualmente.';
            } else if (error.name !== 'SyntaxError' && error.name !== 'TypeError') {
                mensaje = error.message;
            }
            Swal.fire({icon: 'error', title: 'Error al buscar', text: mensaje});
        } finally {
            // 3. Restaurar siempre el botón, tanto si se encuentra la URL como si falla la red.
            clearTimeout(temporizador);
            btn.disabled = false;
            btn.innerHTML = contenidoBoton;
        }
    });
}


// --- Helper: refresca datosWizard desde el DOM y hace la "foto" inicial ---
function refrescarFotoInicial() {
  // Solo se llama después de guardar: la plantilla ya no debe volver a aplicarse.
  plantillaPendiente = false;
  // 1) Regenerar datosWizard de TODOS los pasos desde el DOM
  for (let p = 1; p <= totalSteps; p++) {
    guardarDatosPaso(p);
  }

  // 2) Clonar estado actual como una "foto" inicial
  estadoInicialWizard = JSON.parse(JSON.stringify(datosWizard));

  // 3) Paso 7 (FAQs): alinear la foto inicial también
  if (typeof preguntasAsignadasLocal !== "undefined") {
    preguntasAsignadasInicial = preguntasAsignadasLocal.map(p => ({ ...p }));
  }

  // 4) Recalcular botones (guardar/cancelar)
  actualizarEstadoBotonGuardar();
}


function avisarYEnfocarPaso(paso, mensaje, icon='warning') {
  currentStep = paso;
  updateWizard();
  Swal.fire({
    title: WIZARD_RULES[paso]?.name || `Paso ${paso}`,
    text: mensaje,
    icon,
    confirmButtonText: 'Entendido',
    customClass: { confirmButton: 'btn btn-primary' },
    buttonsStyling: false
  });
}


/**
 * Intenta navegar al paso "destStep" comprobando validaciones/estado.
 * - Bloquea si el paso actual está tocado e incompleto.
 * - Si se avanza, valida cada paso intermedio obligatorio.
 * - Los opcionales se pueden saltar si no están tocados; si están tocados e incompletos, bloquea.
 */
function intentarNavegarA(destStep) {
  destStep = Number(destStep);
  if (destStep === currentStep) return;

  // 0) Paso actual tocado pero incompleto → bloquear
  if (pasoTocadoPeroIncompleto(currentStep)) {
    avisarYEnfocarPaso(
      currentStep,
      'Completa los campos del paso actual antes de salir.'
    );
    return;
  }

  // 1) Ir hacia atrás: permitido (ya comprobamos el actual)
  if (destStep < currentStep) {
    currentStep = destStep;
    updateWizard();
    return;
  }

  // 2) Ir hacia delante: validar todos los pasos intermedios
  for (let s = currentStep; s < destStep; s++) {
    const rule = WIZARD_RULES[s] || { required: true, name: `Paso ${s}`, validator: () => true };

    // Guarda por si el validator lo necesita
    guardarDatosPaso(s);

    // a) Si el paso está tocado pero incompleto → bloquear
    if (pasoTocadoPeroIncompleto(s)) {
      avisarYEnfocarPaso(
        s,
        `Este paso tiene cambios sin completar. Termina “${rule.name}” antes de continuar.`
      );
      return;
    }

    // b) Si es obligatorio, exigir validez completa
    if (rule.required) {
      const ok = rule.validator();
      if (!ok) {
        // El propio validator ya puede haber mostrado mensajes nativos; reforzamos:
        avisarYEnfocarPaso(
          s,
          `Debes completar correctamente el paso “${rule.name}” antes de saltar a otro.`
        );
        return;
      }
    }
    // c) Si es opcional y no está tocado → puede saltarse sin más
    //    (si estuviera tocado e incompleto, ya habría sido frenado en (a))
  }

  // 3) Todo OK → navegar
  currentStep = destStep;
  updateWizard();
}


function convertirNombreMunicipioAReadonly($sel, nombreVisible) {
  if (!$sel || !$sel.length) return;

  const select = $sel[0];
  const input = document.createElement('input');
  input.type = 'text';
  input.id = select.id;
  input.name = select.name;
  input.className = 'form-control';
  input.required = true;
  input.readOnly = true;
  input.value = nombreVisible || '';

  try {
    $sel.off('.bs.select changed.bs.select');
    if ($sel.data('selectpicker')) $sel.selectpicker('destroy');
  } catch (_) {}

  // Elimina posibles restos visuales del plugin si quedaran en el DOM.
  $sel.nextAll('.bootstrap-select').remove();
  select.replaceWith(input);
}

function resetSearchAndLabel($sel) {
  const sp = $sel.data('selectpicker');
  if (!sp) return;

  // 1) Vaciar buscador y refrescar filtro
  if (sp.$searchbox) {
    sp.$searchbox.val('').trigger('input');
    sp.$menuInner.scrollTop(0);
  }

  // 2) Forzar la etiqueta visible a EXACTAMENTE el texto de la opción seleccionada
  const opt = $sel[0].selectedOptions?.[0];
  const label = opt ? opt.text : ($sel.attr('title') || '');
  sp.$button.find('.filter-option-inner-inner').text(label);
}


/* ============================
 *  AUTO-APERTURA DESDE URL
 *  (cuando venimos de panel_documentos.php)
 * ==========================*/
document.addEventListener('DOMContentLoaded', () => {
    const params  = new URLSearchParams(window.location.search);
    const abrirPaso = params.get('abrirPaso');
    const codMunParam = params.get('cod_mun');
    const docIdParam  = params.get('doc_id');

    if (abrirPaso && codMunParam) {
        window.pasoPendienteApertura = Number(abrirPaso);
        if (docIdParam) window.docIdPendienteEdicion = docIdParam;

        // Abrimos directamente el wizard en modo edición para ese municipio
        editarMunicipio(codMunParam);

        // limpia la URL para evitar que se reabra al recargar
        limpiarUrlAutoApertura();
    }
});

/* ============================
 *  AUTO-EDICIÓN DE DOCUMENTO
 *  (cuando volvemos de pantalla completa)
 * ==========================*/
document.addEventListener('documentosCargados', () => {
    if (!window.docIdPendienteEdicion) return;

    const botonEditar = document.querySelector(
        `.btn-editar-documento[data-id="${window.docIdPendienteEdicion}"]`
    );
    if (botonEditar) {
        botonEditar.click();
        window.docIdPendienteEdicion = null;
    }
});


function limpiarUrlAutoApertura() {
  const url = new URL(window.location.href);
  const p = url.searchParams;

  // Quitamos solo lo que provoca la auto-apertura
  p.delete('abrirPaso');
  p.delete('doc_id');

  // Si quieres también quitar cod_mun, descomenta:
  p.delete('cod_mun');

  const newQs = p.toString();
  const nuevaUrl = url.pathname + (newQs ? `?${newQs}` : '') + url.hash;

  history.replaceState({}, document.title, nuevaUrl);
}


function formularioNoticiaAbierto() {
  const off = document.getElementById('offcanvasNoticia');
  return off && off.classList.contains('show');
}
