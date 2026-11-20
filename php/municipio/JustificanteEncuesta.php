<?php
// JUSTIFICANTE DE PARTICIPACIÓN
// Este archivo define el aspecto del PDF. guardar_respuesta_formulario.php lo
// genera una vez y utiliza los mismos bytes para el correo y para la descarga.
require_once __DIR__ . '/../../lib/tfpdf/font/unifont/ttfonts.php';
require_once __DIR__ . '/../../lib/tfpdf/tfpdf.php';

class JustificanteEncuesta extends tFPDF
{
    private const COLOR_MARCA = [84, 0, 0];
    public $color = self::COLOR_MARCA;
    public $nombreMunicipio = '';
    public $escudo = null;

    // Cabecera y pie se repiten cuando las respuestas ocupan varias páginas.
    public function Header()
    {
        $this->Image(__DIR__ . '/../../images/logo_diputacion_pdf.png', 135, 13, 59);
        $xTexto = 16;
        if ($this->escudo) {
            $ancho = min(11, 13 * $this->escudo['ancho'] / $this->escudo['alto']);
            $alto = $ancho * $this->escudo['alto'] / $this->escudo['ancho'];
            try {
                $this->Image($this->escudo['archivo'], 16 + (11 - $ancho) / 2, 18 - $alto / 2,
                    $ancho, $alto, $this->escudo['tipo']);
                $xTexto = 30;
            } catch (Exception $error) {
                // Un escudo con un formato que tFPDF no lee no debe impedir el justificante.
                $this->escudo = null;
            }
        }

        $this->SetFont('DejaVu', 'B', 9);
        $this->SetTextColor(...self::COLOR_MARCA);
        $anchoTexto = 130 - $xTexto;
        $yTexto = $this->GetStringWidth($this->nombreMunicipio) > $anchoTexto - 2 ? 13 : 15.5;
        $this->SetXY($xTexto, $yTexto);
        $this->MultiCell($anchoTexto, 5, $this->nombreMunicipio, 0, 'L');
        $this->SetDrawColor(...$this->color);
        $this->Line(16, 27, 194, 27);
        $this->SetY(34);
    }

    public function Footer()
    {
        $this->SetY(-15);
        $this->SetFont('DejaVu', '', 8);
        $this->SetTextColor(75, 85, 99);
        $this->Cell(110, 7, 'Copia de la respuesta registrada');
        $this->Cell(68, 7, 'Página ' . $this->PageNo(), 0, 0, 'R');
    }
}

function crearJustificanteEncuesta(array $formulario, array $municipio, array $respuestas, $referencia)
{
    $pdf = new JustificanteEncuesta();
    $pdf->nombreMunicipio = 'POU - ' . mb_strtoupper($municipio['nombre'], 'UTF-8');
    $pdf->escudo = prepararEscudoJustificante($municipio);
    $pdf->AddFont('DejaVu', '', 'DejaVuSans.ttf', true);
    $pdf->AddFont('DejaVu', 'B', 'DejaVuSans-Bold.ttf', true);
    $pdf->SetTitle('Justificante de participación', true);
    $pdf->SetAuthor('Diputación Provincial de Málaga', true);
    $pdf->SetMargins(16, 34, 16);
    $pdf->SetAutoPageBreak(true, 22);

    // Cambiar el color del formulario en el configurador cambia también su PDF.
    $color = $formulario['color'] ?? '';
    if (preg_match('/^#[a-f0-9]{6}$/iD', $color)) {
        $pdf->color = [
            hexdec(substr($color, 1, 2)),
            hexdec(substr($color, 3, 2)),
            hexdec(substr($color, 5, 2))
        ];
    }

    $pdf->AddPage();
    $pdf->SetTextColor(26, 36, 52);
    $pdf->SetFont('DejaVu', 'B', 20);
    $pdf->MultiCell(0, 9, $formulario['titulo']);
    $pdf->Ln(2);
    $pdf->SetFont('DejaVu', '', 11);
    $pdf->MultiCell(0, 6, $municipio['nombre']);
    $pdf->SetFillColor(240, 243, 247);
    // Fecha local de la Diputación, aunque PHP esté configurado en UTC.
    $fecha = new DateTimeImmutable('now', new DateTimeZone('Europe/Madrid'));
    $pdf->MultiCell(0, 8, 'Referencia: ' . $referencia . '     ·     ' . $fecha->format('d/m/Y H:i'), 0, 'L', true);
    $pdf->Ln(7);

    // Se respeta el orden de los apartados y se muestra el texto de cada opción marcada.
    $apartadoAnterior = null;
    foreach ($respuestas as $respuesta) {
        if ($apartadoAnterior !== $respuesta['apartado_id']) {
            if ($pdf->GetY() > 241) {
                $pdf->AddPage();
            }
            $pdf->SetTextColor(...$pdf->color);
            $pdf->SetFont('DejaVu', 'B', 13);
            $pdf->MultiCell(0, 7, $respuesta['apartado']);
            $pdf->Ln(2);
            $apartadoAnterior = $respuesta['apartado_id'];
        }

        // Deja espacio para la pregunta y la primera línea de su respuesta.
        if ($pdf->GetY() > 248) {
            $pdf->AddPage();
        }
        $pdf->SetTextColor(26, 36, 52);
        $pdf->SetFont('DejaVu', 'B', 10);
        $pdf->MultiCell(0, 6, $respuesta['pregunta'], 0, 'L', true);

        $texto = $respuesta['respuesta'];
        if (is_array($texto)) {
            $texto = implode("\n", $texto);
        }
        if ($texto === '' || $texto === null) {
            $texto = 'Sin respuesta';
        }
        $pdf->SetFont('DejaVu', '', 10);
        $pdf->MultiCell(0, 5.6, (string)$texto, 0, 'L');
        $pdf->Ln(5);
    }

    // S devuelve el PDF en memoria. Las respuestas no quedan en carpetas públicas.
    return $pdf->Output('S');
}

/**
 * Utiliza el escudo elegido en el portal cuando es un archivo del proyecto.
 * tFPDF obtiene el formato real: algunos escudos PNG se guardaron con extensión JPG.
 * Si la imagen es externa o no se puede leer, se prueba el escudo municipal automático.
 */
function prepararEscudoJustificante(array $municipio): ?array
{
    $raiz = dirname(__DIR__, 2);
    $carpetaImagenes = $raiz . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR;
    $candidatos = [$municipio['escudo'] ?? '', $municipio['escudo_automatico'] ?? ''];
    foreach (array_unique($candidatos) as $ruta) {
        if ($ruta === '' || basename($ruta) === 'logo_mipbom.png') {
            continue;
        }
        $archivo = realpath($raiz . '/' . ltrim($ruta, '/'));
        if (!$archivo || !str_starts_with($archivo, $carpetaImagenes) || !is_file($archivo)) {
            continue;
        }

        $imagen = @getimagesize($archivo);
        if (!$imagen || !$imagen[0] || !$imagen[1]) {
            continue;
        }

        if (in_array($imagen[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG], true)) {
            $tipo = $imagen[2] === IMAGETYPE_PNG ? 'png' : 'jpg';
            return ['archivo' => $archivo, 'ancho' => $imagen[0], 'alto' => $imagen[1], 'tipo' => $tipo];
        }

        // Las subidas admiten WebP. GD lo convierte a PNG si está disponible.
        if ($imagen[2] === IMAGETYPE_WEBP && function_exists('imagecreatefromwebp')
            && $imagen[0] * $imagen[1] <= 4000000) {
            $escudo = @imagecreatefromwebp($archivo);
            $temporal = $escudo ? tmpfile() : false;
            if ($temporal) {
                $rutaTemporal = stream_get_meta_data($temporal)['uri'];
                imagesavealpha($escudo, true);
                if (@imagepng($escudo, $rutaTemporal)) {
                    // El recurso mantiene vivo el archivo durante la generación del PDF.
                    return ['archivo' => $rutaTemporal, 'ancho' => $imagen[0], 'alto' => $imagen[1],
                        'tipo' => 'png', 'temporal' => $temporal];
                }
                fclose($temporal);
            }
        }
    }
    return null;
}
