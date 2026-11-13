-- Sustituye los valores entre comillas por los reales:
-- identificador del usuario (ej. 'usuario123')
-- codconvenio del convenio (ej. 'CONV-001')

INSERT INTO dbo.web_usuarios_convenios (cod_usuario, cod_convenio, es_baja)
SELECT u.idusuario, c.idconvenio, false
FROM dbo.web_usuarios u
JOIN dbo.web_convenios c ON 1=1
WHERE u.identificador = 'test@malaga.es'    -- ← identificador real del usuario
  AND c.codconvenio = 'POU001'        -- ← código real del convenio
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.web_usuarios_convenios x
    WHERE x.cod_usuario = u.idusuario
      AND x.cod_convenio = c.idconvenio
  );
