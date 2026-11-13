--###########  MODIFICACIONES PARA DESACTIVAR BUZON Y ENVIAR CORREO A GESTOR Y ARQUITECTO ########### 
ALTER TABLE pou.municipios
  ADD COLUMN correo_contacto_gestor VARCHAR(100),
  ADD COLUMN enviar_docs_a_arquitecto BOOLEAN DEFAULT false,
  ADD COLUMN buzon_participacion_activo BOOLEAN DEFAULT false;


--###########  MODIFICACIONES PARA HACER DRAG AND DROP EN FAQS ########### 
ALTER TABLE pou.faq_municipio
  ADD COLUMN orden INTEGER NOT NULL DEFAULT 0;

-- Backfill: orden secuencial por municipio
WITH t AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY cod_mun ORDER BY id) AS rn
  FROM pou.faq_municipio
)
UPDATE pou.faq_municipio fm
SET orden = t.rn
FROM t
WHERE t.id = fm.id;

-- (Opcional) trigger para poner MAX(orden)+1 al insertar
CREATE OR REPLACE FUNCTION pou.faq_mun_set_orden()
RETURNS trigger AS $$
BEGIN
  IF NEW.orden IS NULL OR NEW.orden = 0 THEN
    SELECT COALESCE(MAX(orden), 0) + 1 INTO NEW.orden
    FROM pou.faq_municipio
    WHERE cod_mun = NEW.cod_mun;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_orden ON pou.faq_municipio;
CREATE TRIGGER trg_set_orden
BEFORE INSERT ON pou.faq_municipio
FOR EACH ROW EXECUTE FUNCTION pou.faq_mun_set_orden();


--########### MODIFICACIONES DE LAS TABLAS FASES (AHORA ES GLOBAL Y SIEMPRE SON LAS MISMAS FASES PARA TODOS) ########### 

-- 1) Crear nueva tabla global de fases (si quieres conservar la anterior, renómbrala antes)
DROP TABLE IF EXISTS pou.fases CASCADE;

CREATE TABLE pou.fases (
  id SERIAL PRIMARY KEY,
  num_fase INTEGER UNIQUE NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  imagen_url VARCHAR(255) NOT NULL,
  fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2) Relleno con las 10 fases
INSERT INTO pou.fases (num_fase, titulo, imagen_url) VALUES
(1,'Programa de trabajo y plan de participación','images/municipios/fases/fase1.png'),
(2,'Información y diagnóstico','images/municipios/fases/fase2.png'),
(3,'Avance y Documento Inicial Estratégico','images/municipios/fases/fase3.png'),
(4,'Aprobación inicial y exposición pública','images/municipios/fases/fase4.png'),
(5,'Informes sectoriales y alegaciones','images/municipios/fases/fase5.png'),
(6,'Aprobación provisional','images/municipios/fases/fase6.png'),
(7,'Evaluación ambiental estratégica','images/municipios/fases/fase7.png'),
(8,'Aprobación definitiva municipal','images/municipios/fases/fase8.png'),
(9,'Supervisión/registro','images/municipios/fases/fase9.png'),
(10,'Publicación y entrada en vigor','images/municipios/fases/fase10.png');

-- 3) Actualizar FK de fase_actual: ahora referencia SOLO a num_fase global
ALTER TABLE pou.fase_actual DROP CONSTRAINT IF EXISTS fase_actual_cod_mun_num_fase_fkey;

ALTER TABLE pou.fase_actual
  ADD CONSTRAINT fase_actual_num_fase_fkey
  FOREIGN KEY (num_fase) REFERENCES pou.fases(num_fase)
  ON UPDATE NO ACTION ON DELETE NO ACTION;
