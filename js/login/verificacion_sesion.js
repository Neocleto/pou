// Control de sesión exclusivo de las pantallas de gestión.
// La portada pública permite consultar los municipios sin iniciar sesión.
let modalSesionMostrada = false;
let comprobandoSesion = false;
let intervaloSesion = null;

function verificarSesionCada(minutos = 2) {
    if (intervaloSesion !== null) return;

    intervaloSesion = window.setInterval(comprobarSesionGestion, minutos * 60 * 1000);
}

async function comprobarSesionGestion() {
    if (modalSesionMostrada || comprobandoSesion) return;
    comprobandoSesion = true;

    try {
        const respuesta = await fetch("php/login/check_sesion.php", { cache: "no-store" });
        const datos = await respuesta.json();

        if (datos.status === "forbidden" || datos.status === "no_session") {
            modalSesionMostrada = true;
            window.clearInterval(intervaloSesion);
            await Swal.fire({
                title: "Acceso no disponible",
                text: datos.message || "Debes volver a identificarte.",
                icon: "warning",
                allowOutsideClick: false,
                allowEscapeKey: false
            });
            window.location.href = "index.php";
        } else if (datos.status === "expired") {
            modalSesionMostrada = true;
            await ofrecerRenovacionSesion();
        }
        // Si falla temporalmente el servidor, se vuelve a comprobar en el siguiente intervalo.
    } catch (error) {
        console.error("No se pudo comprobar la sesión de gestión.", error);
    } finally {
        comprobandoSesion = false;
    }
}

async function ofrecerRenovacionSesion() {
    const limiteRespuesta = Date.now() + 5 * 60 * 1000;
    let intervaloCuentaAtras;

    try {
        const resultado = await Swal.fire({
            title: "Sesión expirada",
            html: `<p>¿Deseas continuar con tu sesión?</p>
                   <p class="mt-2"><strong>Tiempo restante: <span id="contadorSesion">5:00</span></strong></p>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, continuar",
            cancelButtonText: "No, salir",
            customClass: {
                confirmButton: "btn btn-success me-2",
                cancelButton: "btn btn-secondary"
            },
            buttonsStyling: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: function () {
                intervaloCuentaAtras = window.setInterval(function () {
                    // Se usa la hora real para que una pestaña en segundo plano respete el plazo.
                    const segundos = Math.max(0, Math.ceil((limiteRespuesta - Date.now()) / 1000));
                    const minutos = Math.floor(segundos / 60);
                    const resto = String(segundos % 60).padStart(2, "0");
                    document.getElementById("contadorSesion").textContent = `${minutos}:${resto}`;

                    if (segundos === 0) {
                        window.clearInterval(intervaloCuentaAtras);
                        window.location.href = "php/login/logout.php";
                    }
                }, 1000);
            },
            willClose: function () {
                window.clearInterval(intervaloCuentaAtras);
            }
        });

        if (!resultado.isConfirmed) {
            window.location.href = "php/login/logout.php";
            return;
        }

        const respuesta = await fetch("php/login/renovar_sesion.php", { cache: "no-store" });
        const datos = await respuesta.json();

        if (respuesta.ok && datos.status === "renewed") {
            await Swal.fire({
                title: "Sesión renovada",
                icon: "success",
                confirmButtonText: "Aceptar",
                customClass: { confirmButton: "btn btn-primary" },
                buttonsStyling: false
            });
        } else if (datos.status === "forbidden" || datos.status === "no_session") {
            await Swal.fire("Acceso no disponible", datos.message || "Debes volver a identificarte.", "warning");
            window.location.href = "index.php";
        } else {
            throw new Error("No se pudo renovar la sesión.");
        }
    } catch (error) {
        console.error("No se pudo renovar la sesión de gestión.", error);
        await Swal.fire("No se pudo renovar la sesión", "Comprueba la conexión e inténtalo de nuevo.", "warning");
    } finally {
        window.clearInterval(intervaloCuentaAtras);
        modalSesionMostrada = false;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    verificarSesionCada(2);
});
