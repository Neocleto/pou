-- POU v1.08 - Configuración visual, secciones y formularios dinámicos
-- Ejecutar una sola vez en el esquema pou.

CREATE TABLE IF NOT EXISTS pou.configuracion_visual (
    cod_mun VARCHAR(10) PRIMARY KEY,
    color_primario VARCHAR(20) NOT NULL DEFAULT '#540000',
    color_secundario VARCHAR(20) NOT NULL DEFAULT '#540000',
    color_participacion VARCHAR(20) NOT NULL DEFAULT '#540000',
    color_documentos VARCHAR(20) NOT NULL DEFAULT '#540000',
    color_noticias VARCHAR(20) NOT NULL DEFAULT '#540000',
    color_buzon VARCHAR(20) NOT NULL DEFAULT '#540000',
    ancho_contenido INTEGER NOT NULL DEFAULT 1800,
    escala_texto NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    mostrar_accesos BOOLEAN NOT NULL DEFAULT TRUE,
    secciones_portal JSONB NOT NULL DEFAULT '[]'::jsonb,
    actualizado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pou_config_visual_municipio_fk FOREIGN KEY (cod_mun)
      REFERENCES pou.municipios(cod_mun) ON DELETE CASCADE
);

-- Compatibilidad con instalaciones que ya ejecutaron la versión 1.05.
ALTER TABLE pou.configuracion_visual
ADD COLUMN IF NOT EXISTS secciones_portal JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS pou.accesos_publicos (
    id SERIAL PRIMARY KEY,
    cod_mun VARCHAR(10) NOT NULL,
    titulo VARCHAR(80) NOT NULL,
    descripcion VARCHAR(160),
    icono VARCHAR(50) NOT NULL DEFAULT 'link-45deg',
    color VARCHAR(20) NOT NULL DEFAULT '#540000',
    destino VARCHAR(255) NOT NULL,
    tipo_destino VARCHAR(20) NOT NULL DEFAULT 'seccion',
    orden INTEGER NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pou_accesos_municipio_fk FOREIGN KEY (cod_mun)
      REFERENCES pou.municipios(cod_mun) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pou_accesos_cod_mun
ON pou.accesos_publicos(cod_mun, orden);

CREATE TABLE IF NOT EXISTS pou.formularios (
    id SERIAL PRIMARY KEY,
    cod_mun VARCHAR(10) NOT NULL,
    titulo VARCHAR(180) NOT NULL,
    descripcion TEXT,
    slug VARCHAR(180) NOT NULL,
    icono VARCHAR(50) NOT NULL DEFAULT 'clipboard-check',
    color VARCHAR(20) NOT NULL DEFAULT '#540000',
    modalidad VARCHAR(10) NOT NULL DEFAULT 'online',
    pdf_url VARCHAR(500),
    texto_boton_online VARCHAR(80) DEFAULT 'Realizar encuesta online',
    texto_boton_pdf VARCHAR(80) DEFAULT 'Descargar encuesta en PDF',
    mensaje_confirmacion TEXT DEFAULT 'Gracias por participar. Tu respuesta se ha registrado correctamente.',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INTEGER NOT NULL DEFAULT 0,
    creado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pou_formularios_modalidad_chk CHECK (modalidad IN ('online','pdf','ambos')),
    CONSTRAINT pou_formularios_slug_uq UNIQUE (cod_mun, slug),
    CONSTRAINT pou_formularios_municipio_fk FOREIGN KEY (cod_mun)
      REFERENCES pou.municipios(cod_mun) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pou.formulario_secciones (
    id SERIAL PRIMARY KEY,
    formulario_id INTEGER NOT NULL,
    titulo VARCHAR(180) NOT NULL,
    descripcion TEXT,
    orden INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT pou_form_seccion_form_fk FOREIGN KEY (formulario_id)
      REFERENCES pou.formularios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pou.formulario_preguntas (
    id SERIAL PRIMARY KEY,
    seccion_id INTEGER NOT NULL,
    enunciado TEXT NOT NULL,
    ayuda TEXT,
    tipo VARCHAR(30) NOT NULL DEFAULT 'texto',
    obligatorio BOOLEAN NOT NULL DEFAULT FALSE,
    ancho VARCHAR(10) NOT NULL DEFAULT 'completo',
    opciones JSONB NOT NULL DEFAULT '[]'::jsonb,
    orden INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT pou_form_pregunta_tipo_chk CHECK (tipo IN (
      'texto','texto_largo','numero','fecha','si_no','opcion_unica','opcion_multiple','desplegable'
    )),
    CONSTRAINT pou_form_pregunta_ancho_chk CHECK (ancho IN ('medio','completo')),
    CONSTRAINT pou_form_pregunta_seccion_fk FOREIGN KEY (seccion_id)
      REFERENCES pou.formulario_secciones(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pou.formulario_respuestas (
    id BIGSERIAL PRIMARY KEY,
    formulario_id INTEGER NOT NULL,
    cod_mun VARCHAR(10) NOT NULL,
    referencia VARCHAR(40) NOT NULL,
    respuestas JSONB NOT NULL,
    ip_hash VARCHAR(64),
    enviado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pou_form_respuesta_form_fk FOREIGN KEY (formulario_id)
      REFERENCES pou.formularios(id) ON DELETE RESTRICT,
    CONSTRAINT pou_form_respuesta_municipio_fk FOREIGN KEY (cod_mun)
      REFERENCES pou.municipios(cod_mun) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_pou_formularios_cod_mun
ON pou.formularios(cod_mun, activo, orden);
CREATE INDEX IF NOT EXISTS idx_pou_form_respuestas_form
ON pou.formulario_respuestas(formulario_id, enviado_en DESC);

-- Índices para mantener fluida la carga del diseñador con formularios grandes.
CREATE INDEX IF NOT EXISTS idx_pou_form_secciones_formulario
ON pou.formulario_secciones(formulario_id, orden);

CREATE INDEX IF NOT EXISTS idx_pou_form_preguntas_seccion
ON pou.formulario_preguntas(seccion_id, orden);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pou_form_respuestas_referencia
ON pou.formulario_respuestas(referencia);
