// ============================================================================
// ACCESO AL PANEL DE GESTIÓN
// ============================================================================

let bootstrapModal;

/**
 * Muestra u oculta la contraseña y actualiza el texto accesible del botón.
 */
function togglePassword(inputId, iconId) {
    // 1. Buscamos el campo y el icono.
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    const boton = icon?.closest("button");

    if (!input || !icon) {
        return;
    }

    // 2. Cambiamos el tipo del campo.
    const mostrarPassword = input.type === "password";
    input.type = mostrarPassword ? "text" : "password";

    // 3. Cambiamos el icono de Bootstrap.
    icon.classList.toggle("bi-eye", mostrarPassword);
    icon.classList.toggle("bi-eye-slash", !mostrarPassword);

    // 4. Actualizamos la ayuda del botón.
    const textoAyuda = mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña";
    boton?.setAttribute("aria-label", textoAyuda);
    boton?.setAttribute("title", textoAyuda);
}

function mostrarAlertaLoginRegistro(mensaje, tipo = "danger") {
    const alerta = document.getElementById("alertaLoginRegistro");

    if (!alerta) {
        return;
    }

    alerta.className = `alert alert-${tipo} text-center py-2`;
    alerta.textContent = mensaje;
    alerta.classList.remove("d-none");
}

function ocultarAlertaLoginRegistro() {
    const alerta = document.getElementById("alertaLoginRegistro");

    alerta?.classList.add("d-none");

    if (alerta) {
        alerta.textContent = "";
    }
}

function mostrarSpinnerLogin(id) {
    document.getElementById(id)?.classList.remove("d-none");
}

function ocultarSpinnerLogin(id) {
    document.getElementById(id)?.classList.add("d-none");
}

function abrirModalLogin() {
    document.getElementById("formLogin")?.classList.remove("d-none");
    document.getElementById("formRegistro")?.classList.add("d-none");
    ocultarAlertaLoginRegistro();
    bootstrapModal?.show();
}

function abrirModalRegistro() {
    document.getElementById("formLogin")?.classList.add("d-none");
    document.getElementById("formRegistro")?.classList.remove("d-none");
    ocultarAlertaLoginRegistro();
    bootstrapModal?.show();
}

function limpiarFormularios() {
    document.getElementById("formLogin")?.reset();

    const clave = document.getElementById("clave");
    const icono = document.getElementById("iconoLogin");

    if (clave) {
        clave.type = "password";
    }

    if (icono) {
        icono.classList.remove("bi-eye");
        icono.classList.add("bi-eye-slash");
    }
}

/**
 * Inicia la sesión sin volver a cargar el listado público de municipios.
 */
function login(evento) {
    evento.preventDefault();

    mostrarSpinnerLogin("spinnerLogin");
    ocultarAlertaLoginRegistro();

    const correo = document.getElementById("correo")?.value.trim() || "";
    const clave = document.getElementById("clave")?.value || "";

    fetch("php/login/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ correo, clave })
    })
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (datos) {
            if (!datos.success) {
                mostrarAlertaLoginRegistro(datos.message || "Error al iniciar sesión.");
                return;
            }

            // El usuario entra directamente en su zona de trabajo.
            // Así evitamos recargar la portada y volver a pedir los municipios.
            window.location.href = datos.redirect || "php/gestion/panel_gestion.php";
        })
        .catch(function () {
            mostrarAlertaLoginRegistro("No ha sido posible conectar con el servidor.");
        })
        .finally(function () {
            ocultarSpinnerLogin("spinnerLogin");
        });
}

document.addEventListener("DOMContentLoaded", function () {
    const modalElement = document.getElementById("loginModal");

    if (!modalElement) {
        return;
    }

    bootstrapModal = new bootstrap.Modal(modalElement);

    document.getElementById("linkRegistro")?.addEventListener("click", function (evento) {
        evento.preventDefault();
        abrirModalRegistro();
    });

    document.getElementById("linkLogin")?.addEventListener("click", function (evento) {
        evento.preventDefault();
        abrirModalLogin();
    });

    document.getElementById("formLogin")?.addEventListener("submit", login);

    modalElement.addEventListener("hidden.bs.modal", function () {
        limpiarFormularios();
        ocultarAlertaLoginRegistro();
    });
});
