/****************************************************************************
 * EDITORES DE TEXTO ENRIQUECIDO
 *
 * Este archivo mantiene el mismo editor en el wizard y en el configurador.
 * Para activar un campo basta con añadir: data-rich-editor="1".
 ****************************************************************************/

window.POU_EDITORES_ENRIQUECIDOS = window.POU_EDITORES_ENRIQUECIDOS || new Map();

/** Conserva los intros de texto plano al abrirlo en el editor o en la vista previa. */
function prepararHtmlEditorEnriquecido(valor) {
    let texto = String(valor ?? '').replace(/\r\n?/g, '\n');
    if (texto === '') return '';
    // Un texto sin etiquetas se trata como texto, incluso si contiene < o &.
    if (!/<\/?[a-z][^>]*>/i.test(texto)) {
        const entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
        texto = texto.replace(/[&<>"]/g, function (caracter) { return entidades[caracter]; });
    }
    if (!/<(p|br|ul|ol|li|blockquote|h[1-6])\b/i.test(texto)) {
        // El párrafo evita volver a escapar las entidades al reabrir o actualizar el editor.
        return '<p>' + texto.replace(/\n/g, '<br>') + '</p>';
    }
    return texto;
}


/**
 * Inicia todos los editores que haya dentro del contenedor recibido.
 */
function inicializarEditoresEnriquecidos(contenedor) {
    const raiz = contenedor || document;

    if (typeof ClassicEditor === 'undefined') {
        return;
    }

    raiz.querySelectorAll('textarea[data-rich-editor="1"]').forEach(function (textarea) {
        if (textarea.dataset.richReady === '1') {
            return;
        }

        textarea.dataset.richReady = '1';
        textarea.value = prepararHtmlEditorEnriquecido(textarea.value);

        ClassicEditor.create(textarea, {
            toolbar: [
                'heading', '|',
                'bold', 'italic', 'link', '|',
                'bulletedList', 'numberedList', '|',
                'undo', 'redo'
            ]
        }).then(function (editor) {
            // El usuario puede cerrar y reabrir el asistente mientras carga el editor.
            if (!textarea.isConnected) {
                editor.destroy();
                return;
            }
            window.POU_EDITORES_ENRIQUECIDOS.set(textarea, editor);

            // Conservamos cualquier valor escrito antes de que cargase CKEditor.
            if (textarea.value !== editor.getData()) {
                editor.setData(prepararHtmlEditorEnriquecido(textarea.value));
            }

            editor.model.document.on('change:data', function () {
                textarea.value = editor.getData();
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                textarea.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }).catch(function (error) {
            textarea.dataset.richReady = '0';
            console.error('No se pudo iniciar el editor enriquecido:', error);
        });
    });
}

/**
 * Cambia el valor de un editor aunque todavía no haya terminado de cargar.
 */
function actualizarEditorEnriquecido(campo, valor) {
    const textarea = typeof campo === 'string'
        ? document.getElementById(campo)
        : campo;

    if (!textarea) {
        return;
    }

    const nuevoValor = prepararHtmlEditorEnriquecido(valor);
    textarea.value = nuevoValor;

    const editor = window.POU_EDITORES_ENRIQUECIDOS.get(textarea);
    if (editor && editor.getData() !== nuevoValor) {
        editor.setData(nuevoValor);
    }
}

/** Libera los editores de un formulario antes de reemplazar su HTML. */
async function destruirEditoresEnriquecidos(contenedor) {
    for (const [textarea, editor] of window.POU_EDITORES_ENRIQUECIDOS) {
        if (contenedor.contains(textarea) || !textarea.isConnected) {
            window.POU_EDITORES_ENRIQUECIDOS.delete(textarea);
            await editor.destroy();
        }
    }
}

/**
 * Al cambiar el panel del configurador aparecen campos nuevos.
 * El observador los convierte automáticamente en editores.
 */
function observarEditoresEnriquecidos() {
    const observador = new MutationObserver(function (cambios) {
        const hayNodosNuevos = cambios.some(function (cambio) {
            return cambio.addedNodes && cambio.addedNodes.length > 0;
        });

        if (hayNodosNuevos) {
            inicializarEditoresEnriquecidos(document);
        }
    });

    observador.observe(document.body, {
        childList: true,
        subtree: true
    });
}

document.addEventListener('DOMContentLoaded', function () {
    inicializarEditoresEnriquecidos(document);
    observarEditoresEnriquecidos();
});

window.inicializarEditoresEnriquecidos = inicializarEditoresEnriquecidos;
window.actualizarEditorEnriquecido = actualizarEditorEnriquecido;
