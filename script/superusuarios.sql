-- SUPERUSUARIOS DE POU
-- Ejecutar este archivo en la base de datos del entorno donde se instale la aplicación.
-- El perfil permite consultar, editar, subir documentos, publicar y eliminar municipios.
-- El usuario necesita tener un convenio activo y vigente de POU.
-- Crear la tabla no asigna el perfil a ninguna cuenta.

CREATE TABLE IF NOT EXISTS pou.superusuarios (
    usuario_id INTEGER PRIMARY KEY REFERENCES dbo.web_usuarios(idusuario),
    fecha_alta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE pou.superusuarios IS
'Usuarios con gestión completa de todos los municipios de POU, sujetos a convenio vigente.';

-- 1. Buscar la cuenta por correo y comprobar su identificador.
-- Sustituye correo@ejemplo.es por el correo real y ejecuta la consulta.
-- SELECT idusuario, identificador, nombre, apellido1, apellido2
-- FROM dbo.web_usuarios
-- WHERE LOWER(identificador) = LOWER('correo@ejemplo.es');

-- 2. Asignar el perfil a una cuenta existente y activa.
-- Sustituye correo@ejemplo.es por el correo real y ejecuta estas líneas.
-- INSERT INTO pou.superusuarios (usuario_id)
-- SELECT idusuario FROM dbo.web_usuarios
-- WHERE LOWER(identificador) = LOWER('correo@ejemplo.es')
--   AND (baja IS NULL OR baja = 0)
-- ON CONFLICT (usuario_id) DO NOTHING;

-- 3. Retirar el perfil. Se conserva la cuenta y sus municipios.
-- DELETE FROM pou.superusuarios
-- WHERE usuario_id IN (
--     SELECT idusuario FROM dbo.web_usuarios
--     WHERE LOWER(identificador) = LOWER('correo@ejemplo.es')
-- );

-- Consultar los perfiles asignados.
SELECT s.usuario_id, u.identificador, u.nombre, u.apellido1, u.apellido2, s.fecha_alta
FROM pou.superusuarios s
JOIN dbo.web_usuarios u ON u.idusuario = s.usuario_id
ORDER BY u.identificador;
