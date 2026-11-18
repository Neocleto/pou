// ============================================================================
// PORTAL PÚBLICO DEL MUNICIPIO
// Controla la carga, el desplazamiento, la accesibilidad y el buzón.
// ============================================================================

document.addEventListener("DOMContentLoaded", function () {
    // 1. Elementos principales de la página.
    const cuerpo = document.body;
    const cargador = document.getElementById("pageSpinner");
    const botonSubir = document.getElementById("btnScrollTop");
    const piePagina = document.querySelector(".portal-footer");

    // 2. La página se muestra únicamente cuando el DOM ya está preparado.
    requestAnimationFrame(function () {
        cuerpo.classList.remove("portal-loading");
        cargador?.classList.add("is-hidden");

        window.setTimeout(function () {
            cargador?.remove();
        }, 220);
    });

    // 3. Delegación: también funciona con los accesos que regenera el configurador.
    // Solo desplazamos esta ventana; scrollIntoView puede mover el editor exterior.
    document.addEventListener('click', function (evento) {
        const enlace = evento.target.closest('a[href^="#"]');
        if (!enlace) return;
        const id = enlace.getAttribute('href').slice(1);
        if (!id) return;
        const destino = document.getElementById(id);
        if (!destino) return;
        evento.preventDefault();
        window.scrollTo({
            top: window.scrollY + destino.getBoundingClientRect().top - 20,
            behavior: 'smooth'
        });
    });

    // 4. Botón para volver al inicio.
    function actualizarBotonSubir() {
        if (!botonSubir) {
            return;
        }

        // 1. Mostramos el botón cuando el usuario ya ha bajado por la página.
        botonSubir.classList.toggle("visible", window.scrollY > 350);

        // 2. Si el footer entra en pantalla, elevamos el botón para que nunca
        //    quede oculto dentro del fondo corporativo.
        let separacionInferior = 18;

        if (piePagina) {
            const posicionPie = piePagina.getBoundingClientRect();
            const parteVisible = Math.max(0, window.innerHeight - posicionPie.top);
            separacionInferior = Math.max(18, parteVisible + 18);
        }

        botonSubir.style.bottom = `${separacionInferior}px`;
    }

    window.addEventListener("scroll", actualizarBotonSubir, { passive: true });
    window.addEventListener("resize", actualizarBotonSubir);
    actualizarBotonSubir();

    botonSubir?.addEventListener("click", function () {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    // 5. Prepara el buzón solo cuando está habilitado para el municipio.
    inicializarAdjuntoBuzon();
    inicializarBuzonParticipacion();
    inicializarPreguntasFrecuentes();
    prepararImagenesNoticias();
});

/**
 * Envía el buzón mediante AJAX y mantiene al ciudadano en la misma pantalla.
 */
function inicializarBuzonParticipacion() {
    const formulario = document.getElementById("formBuzon");
    const cargando = document.getElementById("spinnerEnvio");
    const resultado = document.getElementById("resultadoEnvio");

    if (!formulario || !resultado) {
        return;
    }

    let enviando = false;
    formulario.addEventListener("submit", function (evento) {
        evento.preventDefault();
        if (enviando) return;
        enviando = true;

        cargando?.classList.remove("d-none");
        resultado.innerHTML = "";

        const datos = new FormData(formulario);
        // El archivo y el botón de envío no cambian mientras se procesa esta petición.
        const controlesEnvio = formulario.querySelectorAll('[type="submit"], #archivoBuzon, #btnSeleccionarArchivoBuzon, #btnQuitarArchivoBuzon');
        controlesEnvio.forEach(function (control) { control.disabled = true; });

        fetch(formulario.action, {
            method: "POST",
            body: datos
        })
            .then(function (respuesta) {
                return respuesta.text().then(function (texto) {
                    let contenido;

                    try {
                        contenido = JSON.parse(texto);
                    } catch (error) {
                        throw new Error(texto || "Respuesta no válida del servidor.");
                    }

                    return {
                        ok: respuesta.ok,
                        contenido: contenido
                    };
                });
            })
            .then(function (respuesta) {
                if (!respuesta.ok || respuesta.contenido.status !== "ok") {
                    throw new Error(
                        respuesta.contenido.message || "No se pudo enviar el mensaje."
                    );
                }

                mostrarResultadoBuzon(
                    resultado,
                    respuesta.contenido.advertencia ? "warning" : "success",
                    respuesta.contenido.advertencia || respuesta.contenido.message || "El mensaje se ha enviado correctamente."
                );

                formulario.reset();
            })
            .catch(function (error) {
                mostrarResultadoBuzon(
                    resultado,
                    "danger",
                    error.message || "Se ha producido un error inesperado."
                );
            })
            .finally(function () {
                cargando?.classList.add("d-none");
                enviando = false;
                controlesEnvio.forEach(function (control) { control.disabled = false; });
            });
    });
}

/**
 * Muestra una respuesta clara debajo del formulario del buzón.
 */
function mostrarResultadoBuzon(contenedor, tipo, mensaje) {
    let clase = "alert-danger";
    if (tipo === "success") clase = "alert-success";
    if (tipo === "warning") clase = "alert-warning";

    contenedor.innerHTML = `
        <div class="alert ${clase} mb-0" role="alert">
            ${escaparMensaje(mensaje)}
        </div>
    `;

    window.setTimeout(function () {
        contenedor.innerHTML = "";
    }, 6000);
}

/**
 * Evita insertar mensajes del servidor directamente como HTML.
 */
function escaparMensaje(valor) {
    return String(valor || "").replace(/[&<>'"]/g, function (caracter) {
        const equivalencias = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#039;",
            '"': "&quot;"
        };

        return equivalencias[caracter];
    });
}


/** Muestra las preguntas adicionales sin agrandar inicialmente la sección. */
function inicializarPreguntasFrecuentes() {
    const boton = document.getElementById('btnMostrarFaq');
    if (!boton) return;
    boton.addEventListener('click', function () {
        const mostrar = boton.getAttribute('aria-expanded') !== 'true';
        document.querySelectorAll('[data-faq-extra]').forEach(function (pregunta) {
            pregunta.hidden = !mostrar;
        });
        boton.setAttribute('aria-expanded', String(mostrar));
        boton.textContent = mostrar ? 'Mostrar menos preguntas' : boton.dataset.moreLabel;
    });
}

/** Oculta una imagen de noticia solo cuando el navegador indica un error de carga. */
function prepararImagenesNoticias() {
    document.querySelectorAll('[data-news-image]').forEach(function (imagen) {
        imagen.addEventListener('error', function () {
            imagen.hidden = true;
        }, { once: true });
    });
}

/**
 * Adjunta un único documento al input que ya envía FormData.
 * Arrastrar y seleccionar terminan en la misma validación, sin subir nada todavía.
 */
function inicializarAdjuntoBuzon() {
    const zona = document.getElementById('zonaArchivoBuzon');
    const campo = document.getElementById('archivoBuzon');
    const seleccionar = document.getElementById('btnSeleccionarArchivoBuzon');
    const quitar = document.getElementById('btnQuitarArchivoBuzon');
    const estado = document.getElementById('estadoArchivoBuzon');
    const error = document.getElementById('errorArchivoBuzon');
    if (!zona || !campo || !seleccionar || !quitar || !estado || !error) return;

    let archivoActual = null;
    let entradasArrastre = 0;
    const limite = 5 * 1024 * 1024;

    function mostrarEstado() {
        zona.classList.toggle('has-file', archivoActual !== null);
        quitar.hidden = archivoActual === null;
        seleccionar.textContent = archivoActual ? 'Cambiar archivo' : 'Seleccionar archivo';
        if (archivoActual) {
            const tamano = (archivoActual.size / 1024 / 1024).toFixed(2).replace('.', ',');
            // textContent muestra el nombre literalmente, nunca como HTML.
            estado.textContent = archivoActual.name + ' · ' + tamano + ' MB';
        } else {
            estado.textContent = 'Ningún archivo adjunto';
        }
    }

    function mostrarError(mensaje) {
        error.textContent = mensaje;
        error.hidden = !mensaje;
    }

    function asignarArchivo(archivo) {
        if (!archivo) {
            campo.value = '';
            return;
        }
        // DataTransfer coloca el archivo soltado en el input real del formulario.
        const transferencia = new DataTransfer();
        transferencia.items.add(archivo);
        campo.files = transferencia.files;
    }

    function recibirArchivo(archivos) {
        if (campo.disabled || !archivos.length) return;
        let mensaje = '';
        const archivo = archivos[0];
        const extensionValida = /\.(pdf|jpe?g|png)$/i.test(archivo.name);
        const tipoValido = !archivo.type || ['application/pdf', 'image/jpeg', 'image/png'].includes(archivo.type);

        if (archivos.length !== 1) {
            mensaje = 'Adjunta solo un archivo. Puedes cambiarlo antes de enviar.';
        } else if (!extensionValida || !tipoValido) {
            mensaje = 'Elige un documento PDF o una imagen JPG o PNG.';
        } else if (archivo.size === 0) {
            mensaje = 'El archivo está vacío. Elige otro documento.';
        } else if (archivo.size > limite) {
            mensaje = 'El archivo supera los 5 MB. Elige uno más pequeño.';
        }

        if (mensaje) {
            // Una selección incorrecta conserva el adjunto anterior, si lo había.
            asignarArchivo(archivoActual);
            mostrarError(mensaje);
            return;
        }
        asignarArchivo(archivo);
        archivoActual = archivo;
        mostrarError('');
        mostrarEstado();
    }

    seleccionar.addEventListener('click', function () { campo.click(); });
    campo.addEventListener('change', function () { recibirArchivo(campo.files); });
    quitar.addEventListener('click', function () {
        archivoActual = null;
        asignarArchivo(null);
        mostrarError('');
        mostrarEstado();
        seleccionar.focus();
    });

    // Soltar un documento fuera del recuadro no debe sacar al usuario del formulario.
    window.addEventListener('dragover', function (evento) {
        if (evento.dataTransfer.types.includes('Files')) evento.preventDefault();
    });
    window.addEventListener('drop', function (evento) {
        if (evento.dataTransfer.files.length) evento.preventDefault();
    });

    zona.addEventListener('dragenter', function (evento) {
        if (!evento.dataTransfer.types.includes('Files') || campo.disabled) return;
        evento.preventDefault();
        entradasArrastre++;
        zona.classList.add('is-dragging');
    });
    zona.addEventListener('dragover', function (evento) {
        if (!evento.dataTransfer.types.includes('Files')) return;
        evento.preventDefault();
        evento.dataTransfer.dropEffect = campo.disabled ? 'none' : 'copy';
    });
    zona.addEventListener('dragleave', function () {
        entradasArrastre = Math.max(0, entradasArrastre - 1);
        if (entradasArrastre === 0) zona.classList.remove('is-dragging');
    });
    zona.addEventListener('drop', function (evento) {
        evento.preventDefault();
        entradasArrastre = 0;
        zona.classList.remove('is-dragging');
        recibirArchivo(evento.dataTransfer.files);
    });
    campo.form.addEventListener('reset', function () {
        archivoActual = null;
        asignarArchivo(null);
        mostrarError('');
        mostrarEstado();
    });
    mostrarEstado();
}
