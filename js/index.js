// ============================================================================
// PÁGINA DE ACCESO POU
// Carga el listado público de municipios, el buscador y los filtros.
// ============================================================================

document.addEventListener("DOMContentLoaded", function () {
    // 1. Estado básico de la pantalla.
    let paginaActual = 1;
    let temporizadorBusqueda = null;
    let primeraCarga = true;
    let controladorPeticion = null;

    // 2. Elementos utilizados por el listado.
    const contenedor = document.getElementById("contenedorMunicipios");
    const paginacion = document.getElementById("paginacionMunicipios");
    const buscador = document.getElementById("buscadorMunicipios");
    const filtro = document.getElementById("filtroMunicipios");
    const estadoVacio = document.getElementById("imagenSinMunicipios");
    const cargando = document.getElementById("cargandoMunicipios");
    const botonExplorar = document.getElementById("btnExplorarMunicipios");

    // Si la vista no contiene el listado, no se ejecuta el resto del código.
    if (!contenedor || !paginacion || !buscador || !filtro) {
        return;
    }

    // 3. Evita insertar HTML recibido directamente desde la base de datos.
    function escaparTexto(valor) {
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

    // 4. Muestra u oculta el indicador sin cambiar bruscamente el contenido.
    function mostrarCargando(mostrar) {
        contenedor.setAttribute("aria-busy", mostrar ? "true" : "false");

        // La primera carga usa el indicador completo.
        if (primeraCarga) {
            cargando.classList.toggle("d-none", !mostrar);

            if (mostrar) {
                contenedor.classList.add("d-none");
                estadoVacio.classList.add("d-none");
            }
        } else {
            // En búsquedas posteriores mantenemos el contenido para evitar parpadeos.
            cargando.classList.add("d-none");
            contenedor.classList.toggle("is-refreshing", mostrar);
        }

        if (!mostrar) {
            contenedor.classList.remove("is-refreshing");
            primeraCarga = false;
        }
    }

    // 5. Solicita los municipios publicados al servidor.
    function cargarMunicipios() {
        mostrarCargando(true);

        const parametros = new URLSearchParams({
            page: paginaActual,
            search: buscador.value.trim(),
            filter: filtro.value
        });

        // Cancelamos la petición anterior para que una búsqueda lenta no sobrescriba la última.
        controladorPeticion?.abort();
        controladorPeticion = new AbortController();

        fetch("php/api/municipios_obtener.php?" + parametros.toString(), {
            signal: controladorPeticion.signal
        })
            .then(function (respuesta) {
                if (!respuesta.ok) {
                    throw new Error("No se pudo obtener el listado.");
                }

                return respuesta.json();
            })
            .then(function (datos) {
                renderizarMunicipios(datos.municipios || []);
                renderizarPaginacion(datos);
            })
            .catch(function (error) {
                if (error.name === "AbortError") {
                    return;
                }

                console.error("Error al cargar municipios:", error);
                contenedor.innerHTML = "";
                contenedor.classList.remove("d-none");
                contenedor.insertAdjacentHTML(
                    "beforeend",
                    '<div class="alert alert-danger">No ha sido posible cargar los municipios.</div>'
                );
            })
            .finally(function () {
                mostrarCargando(false);
            });
    }

    // 6. Dibuja las tarjetas del listado.
    function renderizarMunicipios(municipios) {
        contenedor.innerHTML = "";

        const noHayMunicipios = municipios.length === 0;
        estadoVacio.classList.toggle("d-none", !noHayMunicipios);
        contenedor.classList.toggle("d-none", noHayMunicipios);

        municipios.forEach(function (municipio) {
            const tarjeta = document.createElement("article");
            tarjeta.className = "access-municipality-card";

            const rutaEscudo = municipio.escudo
                || `images/municipios/${encodeURIComponent(municipio.cod_mun)}/${encodeURIComponent(municipio.cod_mun)}_escudo.jpg`;

            // Tarjeta compacta: escudo destacado junto a la información del municipio.
            tarjeta.innerHTML = `
                <div class="access-municipality-card__escudo">
                    <img
                        src="${escaparTexto(rutaEscudo)}"
                        alt="Escudo de ${escaparTexto(municipio.nombre)}"
                        loading="lazy">
                </div>

                <div class="access-municipality-card__contenido">
                    <div>
                        <span class="access-municipality-card__etiqueta">Portal municipal · POU</span>
                        <h3>${escaparTexto(municipio.nombre)}</h3>
                        <p>Plan de Ordenación Urbana</p>
                    </div>

                    <a href="php/municipio/municipio.php?cod_mun=${encodeURIComponent(municipio.cod_mun)}"
                       aria-label="Entrar al POU de ${escaparTexto(municipio.nombre)}">
                        Entrar <i class="bi bi-arrow-right" aria-hidden="true"></i>
                    </a>
                </div>
            `;

            const imagenEscudo = tarjeta.querySelector("img");

            imagenEscudo?.addEventListener("error", function () {
                imagenEscudo.src = "images/logo_mipou.png";
                imagenEscudo.classList.add("is-placeholder");
            }, { once: true });

            contenedor.appendChild(tarjeta);
        });
    }

    // 7. Dibuja los controles de paginación.
    function renderizarPaginacion(datos) {
        paginacion.innerHTML = "";

        const limite = Number(datos.limit || 15);
        const total = Number(datos.total || 0);
        const paginaServidor = Number(datos.page || 1);
        const totalPaginas = Math.max(1, Math.ceil(total / limite));

        paginaActual = paginaServidor;

        if (totalPaginas <= 1) {
            return;
        }

        crearBotonPagina("Anterior", Math.max(1, paginaActual - 1), paginaActual === 1);

        for (let numero = 1; numero <= totalPaginas; numero += 1) {
            crearBotonPagina(numero, numero, false, numero === paginaActual);
        }

        crearBotonPagina(
            "Siguiente",
            Math.min(totalPaginas, paginaActual + 1),
            paginaActual === totalPaginas
        );
    }

    // 8. Crea un único botón de paginación.
    function crearBotonPagina(texto, pagina, deshabilitado, activo) {
        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "access-page-btn" + (activo ? " active" : "");
        boton.textContent = texto;
        boton.disabled = deshabilitado;

        boton.addEventListener("click", function () {
            paginaActual = pagina;
            cargarMunicipios();
        });

        paginacion.appendChild(boton);
    }

    // 9. El botón de presentación lleva al listado y sitúa el cursor en el buscador.
    botonExplorar?.addEventListener("click", function () {
        document.getElementById("municipios")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        window.setTimeout(function () {
            buscador.focus();
        }, 450);
    });

    // 10. El buscador espera unos milisegundos para no realizar peticiones innecesarias.
    buscador.addEventListener("input", function () {
        window.clearTimeout(temporizadorBusqueda);

        temporizadorBusqueda = window.setTimeout(function () {
            paginaActual = 1;
            cargarMunicipios();
        }, 280);
    });

    // 11. El filtro recarga el listado desde la primera página.
    filtro.addEventListener("change", function () {
        paginaActual = 1;
        cargarMunicipios();
    });

    // Primera carga.
    cargarMunicipios();
});
