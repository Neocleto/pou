-- Crear trigger para actualizar automaticamente fecha_modificacion
-- Paso 1: Crear una funcion que actualice la columna fecha_modificacion:

CREATE OR REPLACE FUNCTION pou.actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--Paso 2: Crear un trigger que llame a la funcion cuando se actualice la fila:
CREATE TRIGGER trigger_actualizar_fecha_modificacion
BEFORE UPDATE ON pou.usuarios
FOR EACH ROW
EXECUTE FUNCTION pou.actualizar_fecha_modificacion();

-- TABLA USUARIOS (LA ELIMINAMOS SE USA DBO.USUARIOS_WEB)
CREATE TABLE pou.usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100),
    correo VARCHAR(100) UNIQUE,
    clave VARCHAR(255) NOT NULL,
    tipo_usuario VARCHAR(10) CHECK (tipo_usuario IN ('SUPER', 'NORMAL')) DEFAULT 'NORMAL',
    baja BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_baja DATE
);


-- TABLA MUNICIPIOS
CREATE TABLE pou.municipios (
    cod_mun VARCHAR(10) PRIMARY KEY,
    nombre VARCHAR(100),
	escudo VARCHAR(255),
    imagen_cabecera VARCHAR(255),
    usuario_id INT,
    correo_contacto VARCHAR(100),
    politica_privacidad_url TEXT,
    baja BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_baja DATE,
    FOREIGN KEY (usuario_id) REFERENCES pou.usuarios(id)
);

--2. Crear Trigger para la tabla municipios
CREATE TRIGGER trigger_actualizar_fecha_modificacion_municipios
BEFORE UPDATE ON pou.municipios
FOR EACH ROW
EXECUTE FUNCTION pou.actualizar_fecha_modificacion();

--3. Eliminar constraint existente
ALTER TABLE pou.municipios DROP CONSTRAINT IF EXISTS municipios_usuario_id_fkey;

--4. Añadir columna activo
ALTER TABLE pou.municipios ADD COLUMN activo BOOLEAN DEFAULT false;

--5. Crear constraint con tabla dbo.usuarios_web
ALTER TABLE pou.municipios
ADD CONSTRAINT municipios_usuario_id_fkey FOREIGN KEY (usuario_id)
REFERENCES dbo.web_usuarios(idusuario);


-- TABLA INFORMACION GENERAL
CREATE TABLE pou.informacion_general (
    cod_mun VARCHAR(10),
    titulo TEXT,
    descripcion TEXT,
    FOREIGN KEY (cod_mun) REFERENCES pou.municipios(cod_mun)
);


-- TABLA FASES
CREATE TABLE pou.fases (
    id SERIAL PRIMARY KEY,
    cod_mun VARCHAR(10),
    num_fase INT,
    imagen_url VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cod_mun) REFERENCES pou.municipios(cod_mun)
);

ALTER TABLE pou.fases
ADD CONSTRAINT unique_codmun_numfase UNIQUE (cod_mun, num_fase);


-- TABLA FASES ACTUAL
CREATE TABLE pou.fase_actual (
    cod_mun VARCHAR(10) PRIMARY KEY,
    num_fase INT,
    fecha_inicio DATE NOT NULL,
    FOREIGN KEY (cod_mun) REFERENCES pou.municipios(cod_mun),
    FOREIGN KEY (cod_mun, num_fase) REFERENCES pou.fases(cod_mun, num_fase)
);


-- TABLA DOCUMENTOS
CREATE TABLE pou.documentos (
    id SERIAL PRIMARY KEY,
    cod_mun VARCHAR(10),
    fase_id INT,
    titulo VARCHAR(255),
    archivo_url VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cod_mun) REFERENCES pou.municipios(cod_mun),
    FOREIGN KEY (fase_id) REFERENCES pou.fases(id)
);

-- Constraint documentos/fase
ALTER TABLE pou.documentos
ADD CONSTRAINT documentos_cod_mun_fase_id_fkey
FOREIGN KEY (cod_mun, fase_id)
REFERENCES pou.fases(cod_mun, num_fase)
ON DELETE NO ACTION
ON UPDATE NO ACTION
NOT DEFERRABLE;

-- TABLA CATEGORIAS DOCUMENTOS
CREATE TABLE pou.categorias_documentos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL UNIQUE
);

-- AÑADIR COLUMNA CATECORIA EN DOCUMENTOS
ALTER TABLE pou.documentos
ADD COLUMN categoria_id INTEGER REFERENCES pou.categorias_documentos(id);

-- Categoia unica
ALTER TABLE pou.categorias_documentos ADD CONSTRAINT nombre_categoria_unique UNIQUE (nombre);

-- TABLA PARTICIPACION
CREATE TABLE pou.participacion (
    cod_mun VARCHAR(10) PRIMARY KEY,
    titulo1 TEXT,
    descripcion1 TEXT,
    titulo2 TEXT,
    descripcion2 TEXT,
    FOREIGN KEY (cod_mun) REFERENCES pou.municipios(cod_mun)
);


-- TABLA PARTICIPACION BOTONES
CREATE TABLE pou.participacion_botones (
    id SERIAL PRIMARY KEY,
    cod_mun VARCHAR(10),
    texto_boton VARCHAR(100),
    archivo_url VARCHAR(255),
    FOREIGN KEY (cod_mun) REFERENCES pou.municipios(cod_mun)
);


-- TABLA NOTICIAS
CREATE TABLE pou.noticias (
    id SERIAL PRIMARY KEY,
    cod_mun VARCHAR(10),
    titulo VARCHAR(255),
    fecha_publicacion DATE,
    resumen TEXT,
    imagen_url VARCHAR(255),
    enlace_detalle VARCHAR(255),
    FOREIGN KEY (cod_mun) REFERENCES pou.municipios(cod_mun)
);


-- TABLA  FAQS
CREATE TABLE pou.faqs (
  id SERIAL PRIMARY KEY,
  pregunta TEXT NOT NULL UNIQUE,
  respuesta TEXT NOT NULL
);


-- TABLA  MUNICIPIO (relaciona preguntas con municipios)
CREATE TABLE pou.faq_municipio (
  id SERIAL PRIMARY KEY,
  cod_mun VARCHAR(10) NOT NULL,
  pregunta_id INTEGER NOT NULL,
  CONSTRAINT fk_municipio FOREIGN KEY (cod_mun) REFERENCES pou.municipios(cod_mun),
  CONSTRAINT fk_pregunta FOREIGN KEY (pregunta_id) REFERENCES pou.faqs(id),
  CONSTRAINT uq_municipio_pregunta UNIQUE (cod_mun, pregunta_id)  -- evitar duplicados
);

