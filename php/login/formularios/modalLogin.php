<!-- MODAL DE ACCESO AL PANEL DE GESTIÓN -->
<div class="modal fade" id="loginModal" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content login-modal px-4 py-3">
            <div class="modal-header border-0 pb-0">
                <div class="login-modal__heading">
                    <span class="login-modal__icon"><i class="bi bi-shield-lock"></i></span>
                    <div>
                        <h4 class="modal-title" id="loginModalLabel">Acceso al panel de gestión</h4>
                        <p>Introduce tus credenciales de IDEMAP.</p>
                    </div>
                </div>
                <button type="button" class="btn-close me-1" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <div class="modal-body">
                <div id="alertaLoginRegistro" class="alert d-none text-center py-2" role="alert"></div>

                <div id="spinnerLogin" class="text-center my-2 d-none">
                    <div class="spinner-border text-primary" role="status"></div>
                </div>

                <form id="formLogin" method="post" action="php/login/login.php">
                    <div class="mb-3">
                        <label for="correo" class="form-label">Correo electrónico</label>
                        <input type="email" class="form-control" name="correo" id="correo" required autocomplete="username">
                    </div>

                    <div class="mb-3">
                        <label for="clave" class="form-label">Contraseña</label>
                        <div class="input-group login-password-group">
                            <input type="password" class="form-control" name="clave" id="clave" required autocomplete="current-password">
                            <button
                                type="button"
                                class="btn login-password-toggle"
                                onclick="togglePassword('clave', 'iconoLogin')"
                                aria-label="Mostrar contraseña"
                                title="Mostrar contraseña">
                                <i class="bi bi-eye-slash" id="iconoLogin"></i>
                            </button>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-login w-100 mt-2 mb-2">
                        Entrar al panel
                    </button>

                    <div class="login-modal__help">
                        <span>¿No tienes acceso?</span>
                        <a href="#" id="linkRegistro">Consultar cómo solicitarlo</a>
                    </div>
                </form>

                <div id="formRegistro" class="d-none text-center px-3">
                    <h5 class="mb-3 mt-2 text-primary"><i class="bi bi-info-circle-fill me-2"></i>Solicitud de acceso</h5>

                    <p class="mb-3">
                        El alta se realiza a través de IDEMAP y debe quedar vinculada a un convenio activo.
                    </p>

                    <a href="https://idemap.es/" class="btn btn-primary mb-3" target="_blank" rel="noopener noreferrer">
                        Ir a IDEMAP
                        <i class="bi bi-box-arrow-up-right ms-2"></i>
                    </a>

                    <div class="alert alert-info small mt-3" role="alert">
                        Si tienes dudas, ponte en contacto con el <strong>Departamento GIS</strong> de la Diputación de Málaga.
                    </div>

                    <div class="mt-4">
                        <a href="#" id="linkLogin">Volver al inicio de sesión</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
