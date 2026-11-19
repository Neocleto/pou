/**
 * Vista previa del portal: aplica el estado del editor al iframe municipal.
 * No guarda datos. Los bloques personalizados se dibujan en configuradorBloquesPortal.js.
 */

/**
 * Espera unos milisegundos antes de actualizar el iframe.
 * Así evitamos recalcular la vista previa por cada pulsación de teclado.
 */
function programarVistaPrevia() {
    window.clearTimeout(temporizadorVistaPrevia);
    temporizadorVistaPrevia = window.setTimeout(aplicarCambiosEnVistaPrevia, 120);
}

/**
 * Aplica los cambios visuales directamente sobre el documento del iframe.
 * Al ser una página del mismo proyecto, el navegador permite modificarla.
 */
function aplicarCambiosEnVistaPrevia() {
    const iframe = document.getElementById('iframeVistaPreviaPortal');
    const documento = iframe.contentDocument;

    if (!documento || !documento.body) {
        return;
    }

    const cuerpo = documento.body;
    const config = estadoPortal.configuracion;

    // El menú del configurador muestra el mismo color que el portal público.
    document.body.style.setProperty('--pou-editor-primary', config.color_primario);

    cuerpo.style.setProperty('--pou-primary', config.color_primario);
    cuerpo.style.setProperty('--pou-secondary', config.color_secundario);
    cuerpo.style.setProperty('--pou-participation', config.color_participacion);
    cuerpo.style.setProperty('--pou-documents', config.color_documentos);
    cuerpo.style.setProperty('--pou-news', config.color_noticias);
    cuerpo.style.setProperty('--pou-mailbox', config.color_buzon);
    cuerpo.style.setProperty('--pou-width', `${config.ancho_contenido}px`);
    cuerpo.style.setProperty('--pou-scale', config.escala_texto);

    actualizarCabeceraVistaPrevia(documento);
    actualizarAccesosVistaPrevia(documento);
    actualizarSeccionesVistaPrevia(documento);
    actualizarBotonesParticipacionVistaPrevia(documento);
    actualizarContenidoVistaPrevia(documento);
    // El dibujo pertenece únicamente al buzón y sigue su interruptor sin recargar.
    const ilustracionBuzon = documento.querySelector('[data-mailbox-illustration]');
    if (ilustracionBuzon) {
        ilustracionBuzon.hidden = !convertirBooleano(estadoPortal.contenido.buzon?.mostrar_ilustracion, false);
    }
    const modal = documento.getElementById('modalDocumentosPortal');
    const documentos = estadoPortal.secciones.find(function (seccion) { return seccion.id === 'documentos'; });
    if (modal && documentos) modal.style.setProperty('--pou-documents', documentos.color);
}

/**
 * Actualiza los textos editables y los datos basicos dentro del iframe.
 */
function actualizarContenidoVistaPrevia(documento) {
    documento.querySelectorAll('[data-content]').forEach(function (elemento) {
        const ruta = elemento.dataset.content;
        const valor = obtenerValorRuta(estadoPortal.contenido, ruta);

        if (valor !== undefined && !Array.isArray(valor) && typeof valor !== 'object') {
            const valorFinal = reemplazarMunicipioPortal(valor);
            if (esRutaEnriquecidaPortal(ruta)) {
                elemento.innerHTML = prepararHtmlEditorEnriquecido(valorFinal);
            } else {
                elemento.textContent = valorFinal;
            }
        }
    });

    documento.querySelectorAll('[data-db-content]').forEach(function (elemento) {
        const ruta = elemento.dataset.dbContent;
        let valor = obtenerValorRuta(estadoPortal.datosContenido, ruta);

        if (ruta === 'fase_actual.titulo') {
            const fase = estadoPortal.datosContenido.fase_actual || {};
            const numero = fase.num_fase_padre || fase.num_fase || '';
            const subfase = fase.titulo_subfase || obtenerTituloSubfaseSeleccionada();

            // La vista previa utiliza exactamente el mismo formato que PHP.
            valor = numero
                ? `${numero}${subfase ? '. ' + subfase : ''}`
                : 'Sin fase asignada';
        }

        if (valor !== undefined && valor !== null) {
            let valorFinal = reemplazarMunicipioPortal(valor);

            if (esRutaEnriquecidaPortal(ruta)) {
                elemento.innerHTML = prepararHtmlEditorEnriquecido(valorFinal);
            } else {
                elemento.textContent = valorFinal;
            }
        }
    });

    // La imagen informativa se actualiza con la subfase seleccionada.
    const visualFases = documento.querySelector('.portal-phases__visual');
    const imagenFases = estadoPortal.datosContenido.fase_actual?.imagen_url || '';
    if (visualFases) {
        // Sin diagrama mostramos la ilustracion discreta de datos pendientes.
        visualFases.hidden = false;
        visualFases.classList.toggle('portal-phases__visual--sin-datos', !imagenFases);
        const botonAmpliar = visualFases.querySelector('.portal-phase-zoom');
        if (botonAmpliar) botonAmpliar.hidden = !imagenFases;
    }
    documento.querySelectorAll('.portal-phase-image, #modalImagenFases img').forEach(function (imagen) {
        if (imagenFases) imagen.src = obtenerRutaProyecto(imagenFases);
        else if (imagen.classList.contains('portal-phase-image')) {
            imagen.src = obtenerRutaProyecto('images/diseno/sin_datos_pou.png');
        } else imagen.removeAttribute('src');
    });

    // Mostrar o quitar el estado al editarlo, incluso si el municipio no tenía texto.
    const notaEstado = documento.querySelector('.portal-phase-note');
    if (notaEstado) {
        notaEstado.hidden = !String(estadoPortal.datosContenido.fase_actual?.estado_tramitacion || '').trim();
    }

    documento.querySelectorAll('[data-content-icon]').forEach(function (elemento) {
        const valor = String(obtenerValorRuta(estadoPortal.contenido, elemento.dataset.contentIcon) || '');
        elemento.hidden = valor === '';
        elemento.className = valor ? `bi bi-${valor}` : '';
    });

}

/**
 * Campos que admiten párrafos, listas, enlaces y texto destacado.
 */
function esRutaEnriquecidaPortal(ruta) {
    return [
        'cabecera.descripcion',
        'participacion.introduccion',
        'participacion.formularios_descripcion',
        'documentos.descripcion',
        'buzon.introduccion',
        'buzon.privacidad_texto',
        'informacion.descripcion',
        'fase_actual.estado_tramitacion'
    ].includes(String(ruta || ''));
}

/**
 * Obtiene un valor mediante una ruta como cabecera.titulo.
 */
function obtenerValorRuta(objeto, ruta) {
    return String(ruta || '').split('.').reduce(function (valor, parte) {
        return valor === undefined || valor === null ? undefined : valor[parte];
    }, objeto);
}

/**
 * Cambia el marcador de municipio en los textos de cabecera y pie.
 */
function reemplazarMunicipioPortal(valor) {
    return String(valor ?? '').replaceAll('{municipio}', estadoPortal.municipio.nombre || '');
}

/**
 * Localiza el titulo de la subfase seleccionada en los datos cargados.
 */
function obtenerTituloSubfaseSeleccionada() {
    const fase = estadoPortal.datosContenido.fase_actual || {};
    const subfase = (estadoPortal.datosContenido.subfases || []).find(function (item) {
        return Number(item.id) === Number(fase.subfase_id);
    });

    return subfase?.titulo || '';
}

/**
 * Actualiza banner y escudo dentro del iframe.
 */
function actualizarCabeceraVistaPrevia(documento) {
    const hero = documento.querySelector('.portal-hero__image');
    const escudos = documento.querySelectorAll('.portal-hero-layout__crest img, .portal-footer__crest img');

    if (hero) {
        const imagenMunicipio = String(estadoPortal.municipio.imagen_cabecera || '').trim();
        const esImagenProvisional = /(?:^|\/)(?:no_(?:pbom|pou|pgom)_data|sin_datos_)/i.test(imagenMunicipio);
        const tieneFoto = imagenMunicipio !== '' && !esImagenProvisional;
        // La vista previa aplica el mismo fallback que la página pública.
        hero.classList.toggle('portal-hero__image--sin-foto', !tieneFoto);
        const imagenVisible = tieneFoto ? imagenMunicipio : 'images/diseno/sin_datos_pou.png';
        hero.style.backgroundImage = `url('${obtenerRutaProyecto(imagenVisible)}')`;
        hero.setAttribute('aria-label', tieneFoto
            ? 'Fotografía del municipio'
            : 'Ilustración de planeamiento municipal');
    }

    escudos.forEach(function (escudo) {
        escudo.src = obtenerRutaProyecto(estadoPortal.municipio.escudo || estadoPortal.municipio.escudo_automatico);
    });
}

/**
 * Reconstruye el índice del portal dentro del iframe.
 */
function actualizarAccesosVistaPrevia(documento) {
    const navegacion = documento.querySelector('.portal-quick-access');
    const lista = documento.querySelector('.portal-access-list');

    if (!navegacion || !lista) {
        return;
    }

    navegacion.style.display = estadoPortal.configuracion.mostrar_accesos ? '' : 'none';

    lista.innerHTML = estadoPortal.accesos
        .filter(function (acceso) {
            return acceso.visible !== false
                && acceso.titulo
                && acceso.destino
                && accesoTieneDestinoDisponible(acceso);
        })
        .map(function (acceso) {
            const href = obtenerHrefAccesoVistaPrevia(acceso);
            const icono = obtenerIconoAccesoPortal(acceso);
            // El buzón se dibuja como imagen, igual que en la plantilla PHP.
            const dibujoIcono = `<i class="bi bi-${escaparHtml(icono)}" aria-hidden="true"></i>`;
            const nuevaPestana = acceso.tipo_destino === 'url'
                ? ' target="_blank" rel="noopener noreferrer"'
                : '';

            return `
                <a class="portal-access-item" style="--access-color:${escaparHtml(acceso.color || estadoPortal.configuracion.color_primario)}" title="${escaparHtml(acceso.descripcion || acceso.titulo)}" href="${escaparHtml(href)}"${nuevaPestana}>
                    ${icono ? `<span class="portal-access-item__icon portal-access-item__icon--${escaparHtml(icono)}">${dibujoIcono}</span>` : ''}
                    <span class="portal-access-item__copy">
                        <strong>${escaparHtml(acceso.titulo)}</strong>
                    </span>
                </a>
            `;
        })
        .join('');
}

/**
 * Aplica en la vista previa las mismas reglas que usa la página pública.
 */
function accesoTieneDestinoDisponible(acceso) {
    if (acceso.tipo_destino === 'formulario') {
        return estadoPortal.formularios.some(function (formulario) {
            return formulario.slug === acceso.destino
                && convertirBooleano(formulario.activo, false);
        });
    }

    if ((acceso.tipo_destino || 'seccion') !== 'seccion') {
        return true;
    }

    const idSeccion = String(acceso.destino || '').replace(/^#/, '');
    const seccion = estadoPortal.secciones.find(function (item) {
        return item.id === idSeccion;
    });

    if (!seccion || seccion.visible === false) {
        return false;
    }

    if (idSeccion === 'buzon') {
        return convertirBooleano(estadoPortal.datosContenido.buzon_activo, false);
    }

    return true;
}

/**
 * Cambia la visibilidad y el orden de los bloques públicos.
 */
function actualizarSeccionesVistaPrevia(documento) {
    estadoPortal.secciones.forEach(function (seccion, indice) {
        const elemento = buscarSeccionVistaPrevia(documento, seccion.id);

        if (!elemento) {
            return;
        }

        const buzonDisponible = seccion.id !== 'buzon'
            || convertirBooleano(estadoPortal.datosContenido.buzon_activo, false);
        const seccionVisible = seccion.visible !== false && buzonDisponible;

        elemento.style.order = String(indice + 1);
        elemento.style.display = seccionVisible ? '' : 'none';
        elemento.style.setProperty('--section-color', seccion.color || estadoPortal.configuracion.color_primario);

        const titulo = elemento.querySelector('[data-section-title]');
        const contenedorIcono = elemento.querySelector('[data-section-icon]');

        if (titulo) {
            titulo.textContent = seccion.titulo || '';
        }

        if (contenedorIcono) {
            contenedorIcono.hidden = !seccion.icono;
            contenedorIcono.innerHTML = seccion.icono
                ? `<i class="bi bi-${escaparHtml(seccion.icono)}"></i>`
                : '';
        }
    });
    actualizarBloquesPersonalizadosVistaPrevia(documento);
}

/**
 * Actualiza los recursos de participación sin recargar la vista previa.
 */
function actualizarBotonesParticipacionVistaPrevia(documento) {
    estadoPortal.botonesParticipacion.forEach(function (boton) {
        const iconoBoton = obtenerIconoBotonParticipacionPortal(boton);
        const elemento = documento.querySelector(
            `[data-participation-button-id="${Number(boton.id)}"]`
        );

        if (!elemento) {
            return;
        }

        elemento.style.setProperty('--resource-color', boton.color || estadoPortal.configuracion.color_primario);
        const visible = boton.documento_pendiente || boton.visible !== false;
        elemento.style.display = visible ? '' : 'none';
        elemento.dataset.resourceVisible = visible ? '1' : '0';
        elemento.dataset.resourceSurvey = /^\s*encuesta\b/i.test(boton.texto_boton || '') ? '1' : '0';

        const texto = elemento.querySelector('[data-participation-button-text]');
        let contenedorIcono = elemento.querySelector('.participation-resource-card__icon');

        if (texto) {
            texto.textContent = boton.texto_boton || '';
        }

        if (iconoBoton && !contenedorIcono) {
            contenedorIcono = documento.createElement('span');
            contenedorIcono.className = 'participation-resource-card__icon';
            elemento.prepend(contenedorIcono);
        }

        if (contenedorIcono) {
            contenedorIcono.hidden = !iconoBoton;
            contenedorIcono.innerHTML = iconoBoton
                ? `<i class="bi bi-${escaparHtml(iconoBoton)}"></i>`
                : '';
        }
    });
}

/**
 * Devuelve el elemento del portal que representa una sección configurable.
 */
function buscarSeccionVistaPrevia(documento, idSeccion) {
    if (idSeccion === 'actualidad') {
        return documento.querySelector('[data-portal-section="actualidad"]')
            || documento.querySelector('.portal-two-columns');
    }

    return documento.querySelector(`[data-portal-section="${idSeccion}"]`)
        || documento.getElementById(idSeccion);
}

/**
 * Construye el mismo enlace que utiliza el portal al representar un acceso.
 */
function obtenerHrefAccesoVistaPrevia(acceso) {
    if (acceso.tipo_destino === 'formulario') {
        return `/pou/php/municipio/formulario.php?cod_mun=${encodeURIComponent(estadoPortal.codMun)}&slug=${encodeURIComponent(acceso.destino || '')}`;
    }

    if ((acceso.tipo_destino || 'seccion') === 'seccion') {
        return `#${String(acceso.destino || '').replace(/^#/, '')}`;
    }

    return acceso.destino || '#';
}
