CREATE TABLE pou.fases_documentos (
  num_fase      INTEGER PRIMARY KEY,         -- 1,2,21,3 (21 = 2.1)
  codigo        VARCHAR(10)  NOT NULL,       -- '1','2','2.1','3'
  etiqueta      VARCHAR(50)  NOT NULL,       -- 'FASE 1', 'FASE 2', ...
  titulo        VARCHAR(255) NOT NULL,       -- texto largo visible
  es_fase_21    BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO pou.fases_documentos (num_fase, codigo, etiqueta, titulo, es_fase_21)
VALUES
  (1,  '1',   'FASE 1',
   'AVANCE Y DOCUMENTO INCIAL ESTRATÉGICO', FALSE),
  (2,  '2',   'FASE 2',
   'APROBACIÓN INICIAL Y EVALUACIÓN AMBIENTAL ESTRATÉGICA', FALSE),
  (21, '2.1', 'FASE 2.1',
   'SEGUNDA APROBACIÓN INICIAL Y EVALUACIÓN AMBIENTAL ESTRATÉGICA', TRUE),
  (3,  '3',   'FASE 3',
   'APROBACIÓN DEFINITIVA Y EVALUACIÓN AMBIENTAL ESTRATÉGICA', FALSE);


ALTER TABLE pou.documentos
  DROP CONSTRAINT documentos_fase_id_fkey;

ALTER TABLE pou.documentos
  ADD CONSTRAINT documentos_fase_id_fkey
  FOREIGN KEY (fase_id)
  REFERENCES pou.fases_documentos(num_fase)
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
