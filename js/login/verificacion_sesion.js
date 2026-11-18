let modalSesionMostrada = false;

function verificarSesionCada(minutos = 1) {
    setInterval(() => {
        if (modalSesionMostrada) return; // prevenir mostrar varias veces
        fetch("php/login/check_sesion.php")
            .then(res => res.json())
            .then(data => {
                if (data.status === "forbidden" || data.status === "no_session") {
                    modalSesionMostrada = true;
                    Swal.fire({
                        title: "Acceso no disponible",
                        text: data.message || "Debes volver a identificarte.",
                        icon: "warning",
                        allowOutsideClick: false,
                        allowEscapeKey: false
                    }).then(() => { location.href = "index.php"; });
                    return;
                }
                if (data.status === "expired") {
                    modalSesionMostrada = true;

                    let segundosRestantes = 300;
                    let timerInterval;

                    Swal.fire({
                        title: "Sesión expirada",
                        html: `<p>¿Deseas continuar con tu sesión?</p>
                               <p class="mt-2"><strong>Tiempo restante: <span id="contadorSesion">5:00</span></strong></p>`,
                        icon: "warning",
                        showCancelButton: true,
                        confirmButtonText: "Sí, continuar",
                        cancelButtonText: "No, salir",
                        customClass: {
                            confirmButton: 'btn btn-success me-2',
                            cancelButton: 'btn btn-secondary'
                        },
                        buttonsStyling: false,
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        didOpen: () => {
                            const contadorEl = document.getElementById('contadorSesion');
                            timerInterval = setInterval(() => {
                                segundosRestantes--;
                                const min = Math.floor(segundosRestantes / 60).toString().padStart(2, '0');
                                const sec = (segundosRestantes % 60).toString().padStart(2, '0');
                                contadorEl.textContent = `${min}:${sec}`;
                                if (segundosRestantes <= 0) {
                                    clearInterval(timerInterval);
                                    location.href = "php/login/logout.php";
                                }
                            }, 1000);
                        },
                        willClose: () => {
                            clearInterval(timerInterval);
                            modalSesionMostrada = false;
                        }
                    }).then((result) => {
                        if (result.isConfirmed) {
                            fetch("php/login/renovar_sesion.php")
                                .then(res => res.json())
                                .then(data => {
                                    if (data.status === "renewed") {
                                        Swal.fire({
                                            title: "¡Sesión renovada!",
                                            icon: "success",
                                            confirmButtonText: "Aceptar",
                                            customClass: {
                                                confirmButton: 'btn btn-primary'
                                            },
                                            buttonsStyling: false
                                        });
                                    } else {
                                        location.href = "php/login/logout.php";
                                    }
                                });
                        } else {
                            location.href = "php/login/logout.php";
                        }
                    });
                }
            });
    }, minutos * 60 * 1000); // en milisegundos
}

document.addEventListener("DOMContentLoaded", function () {
    verificarSesionCada(2); // Verificar cada 5 minutos
});
