// Variables globales
let catalogo = [];
let pedidoActual = [];
let rubrosDisponibles = new Set();

// Función para cargar el catálogo inicial desde el archivo JSON
function cargarCatalogoInicial() {
    // Intentar cargar primero del localStorage
    const catalogoGuardado = localStorage.getItem('catalogoProductos');
    
    if (catalogoGuardado) {
        catalogo = JSON.parse(catalogoGuardado);
        procesarCatalogo();
    } else {
        // Si no hay datos en localStorage, cargar desde el archivo JSON
        fetch('catalogo_productos.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('No se pudo cargar el catálogo de productos');
                }
                return response.json();
            })
            .then(data => {
                catalogo = data;
                guardarCatalogoLocal();
                procesarCatalogo();
            })
            .catch(error => {
                console.error('Error al cargar el catálogo:', error);
                mostrarMensaje('No se pudo cargar el catálogo de productos. Por favor, cargue un archivo Excel.', 'error');
            });
    }
}

// Función para procesar el catálogo una vez cargado
function procesarCatalogo() {
    // Limpiar y actualizar filtros
    actualizarFiltrosRubros();
    
    // Mostrar productos en la tabla
    mostrarProductosEnTabla();
    
    // Cargar pedido guardado si existe
    cargarPedidoGuardado();
}

// Función para actualizar los filtros de rubros
function actualizarFiltrosRubros() {
    rubrosDisponibles.clear();
    
    // Obtener todos los rubros únicos
    catalogo.forEach(producto => {
        if (producto.Rubro) {
            rubrosDisponibles.add(producto.Rubro);
        }
    });
    
    // Actualizar el select de rubros
    const filtroRubro = document.getElementById('filtro-rubro');
    filtroRubro.innerHTML = '<option value="todos">Todos</option>';
    
    rubrosDisponibles.forEach(rubro => {
        const option = document.createElement('option');
        option.value = rubro;
        option.textContent = rubro;
        filtroRubro.appendChild(option);
    });
}

// Función para mostrar los productos en la tabla
function mostrarProductosEnTabla(filtroRubro = 'todos', textoBusqueda = '') {
    const tbody = document.getElementById('productos-body');
    tbody.innerHTML = '';
    
    const productosFiltrados = catalogo.filter(producto => {
        const coincideRubro = filtroRubro === 'todos' || producto.Rubro === filtroRubro;
        const coincideBusqueda = textoBusqueda === '' || 
            producto.Nombre.toLowerCase().includes(textoBusqueda.toLowerCase()) || 
            producto.Codigo.toString().toLowerCase().includes(textoBusqueda.toLowerCase());
        
        return coincideRubro && coincideBusqueda;
    });
    
    if (productosFiltrados.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="6" class="text-center">No se encontraron productos</td>';
        tbody.appendChild(tr);
        return;
    }
    
    productosFiltrados.forEach(producto => {
        const tr = document.createElement('tr');
        
        // Encontrar si el producto ya está en el pedido
        const enPedido = pedidoActual.find(item => item.Codigo === producto.Codigo);
        const cantidadActual = enPedido ? enPedido.cantidad : 0;
        
        tr.innerHTML = `
            <td>${producto.Rubro}</td>
            <td>${producto.Codigo}</td>
            <td>${producto.Nombre}</td>
            <td>$${parseFloat(producto.Precio).toFixed(2)}</td>
            <td>
                <input type="number" class="cantidad-input" value="${cantidadActual}" min="0">
            </td>
            <td>
                <button class="btn btn-small agregar-producto" data-codigo="${producto.Codigo}">
                    ${cantidadActual > 0 ? 'Actualizar' : 'Agregar'}
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Agregar eventos a los botones de agregar
    document.querySelectorAll('.agregar-producto').forEach(btn => {
        btn.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            const cantidadInput = this.closest('tr').querySelector('.cantidad-input');
            const cantidad = parseInt(cantidadInput.value);
            
            if (cantidad > 0) {
                agregarProductoAlPedido(codigo, cantidad);
            } else {
                eliminarProductoDelPedido(codigo);
            }
        });
    });
}

// Función para agregar un producto al pedido
function agregarProductoAlPedido(codigo, cantidad) {
    const producto = catalogo.find(p => p.Codigo === codigo);
    
    if (!producto) return;
    
    // Verificar si el producto ya está en el pedido
    const indexEnPedido = pedidoActual.findIndex(item => item.Codigo === codigo);
    
    if (indexEnPedido >= 0) {
        // Actualizar cantidad si ya existe
        pedidoActual[indexEnPedido].cantidad = cantidad;
    } else {
        // Agregar nuevo producto al pedido
        pedidoActual.push({
            ...producto,
            cantidad: cantidad
        });
    }
    
    actualizarTablaPedido();
    guardarPedidoLocal();
    
    // Actualizar texto del botón en la tabla de productos
    const boton = document.querySelector(`.agregar-producto[data-codigo="${codigo}"]`);
    if (boton) {
        boton.textContent = 'Actualizar';
/*        boton.classList.add('btn-actualizar');*/
    }
}

// Función para eliminar un producto del pedido
function eliminarProductoDelPedido(codigo) {
    pedidoActual = pedidoActual.filter(item => item.Codigo !== codigo);
    
    actualizarTablaPedido();
    guardarPedidoLocal();
    
    // Actualizar texto del botón y valor del input en la tabla de productos
    const boton = document.querySelector(`.agregar-producto[data-codigo="${codigo}"]`);
    if (boton) {
        boton.textContent = 'Agregar';
/*        boton.classList.remove('btn-actualizar');*/
        const cantidadInput = boton.closest('tr').querySelector('.cantidad-input');
        cantidadInput.value = 0;
    }
}

// Función para actualizar la tabla de pedido
function actualizarTablaPedido() {
    const tbody = document.getElementById('pedido-body');
    tbody.innerHTML = '';
    
    let total = 0;
    
    if (pedidoActual.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="7" style="text-align: center;">No hay productos en el pedido</td>';
        tbody.appendChild(tr);
    } else {
        pedidoActual.forEach(producto => {
            const subtotal = producto.cantidad * parseFloat(producto.Precio);
            total += subtotal;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${producto.Rubro}</td>
                <td>${producto.Codigo}</td>
                <td>${producto.Nombre}</td>
                <td>$${parseFloat(producto.Precio).toFixed(2)}</td>
                <td>${producto.cantidad}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td>
                    <button class="btn btn-small btn-secondary eliminar-del-pedido" data-codigo="${producto.Codigo}">
                        Eliminar
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
    }
    
    // Actualizar el total
    document.getElementById('total-pedido').textContent = `$${total.toFixed(2)}`;
    
    // Agregar eventos a los botones de eliminar
    document.querySelectorAll('.eliminar-del-pedido').forEach(btn => {
        btn.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            eliminarProductoDelPedido(codigo);
        });
    });
      setTimeout(fixMobileNumericKeyboard, 100);
}

// Guardar catálogo en localStorage
function guardarCatalogoLocal() {
    localStorage.setItem('catalogoProductos', JSON.stringify(catalogo));
}

// Guardar pedido en localStorage
function guardarPedidoLocal() {
    localStorage.setItem('pedidoActual', JSON.stringify(pedidoActual));
}

// Cargar pedido guardado
function cargarPedidoGuardado() {
    const pedidoGuardado = localStorage.getItem('pedidoActual');
    
    if (pedidoGuardado) {
        pedidoActual = JSON.parse(pedidoGuardado);
        actualizarTablaPedido();
    }
}

// Función para procesar archivo Excel
function procesarArchivoExcel(archivo) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            // Verificar que el Excel tiene la estructura correcta
            if (jsonData.length > 0 && 
                ('Rubro' in jsonData[0] || 'rubro' in jsonData[0]) && 
                ('Codigo' in jsonData[0] || 'Código' in jsonData[0] || 'codigo' in jsonData[0]) && 
                ('Nombre' in jsonData[0] || 'nombre' in jsonData[0]) && 
                ('Precio' in jsonData[0] || 'precio' in jsonData[0])) {
                
                // Normalizar nombres de campos
                const datosNormalizados = jsonData.map(item => {
                    return {
                        Rubro: item.Rubro || item.rubro || '',
                        Codigo: (item.Codigo || item.Código || item.codigo || '').toString(),
                        Nombre: item.Nombre || item.nombre || '',
                        Precio: item.Precio || item.precio || 0
                    };
                });
                
                // Actualizar catálogo
                catalogo = datosNormalizados;
                
                // Guardar en localStorage
                guardarCatalogoLocal();
                
                // Actualizar la interfaz
                procesarCatalogo();
                
                mostrarMensaje('Catálogo actualizado correctamente', 'success');
            } else {
                mostrarMensaje('El archivo no tiene el formato correcto. Debe contener columnas: Rubro, Código, Nombre y Precio', 'error');
            }
        } catch (error) {
            console.error('Error al procesar el archivo:', error);
            mostrarMensaje('Error al procesar el archivo Excel', 'error');
        }
    };
    
    reader.onerror = function() {
        mostrarMensaje('Error al leer el archivo', 'error');
    };
    
    reader.readAsArrayBuffer(archivo);
}

// Función para enviar pedido por WhatsApp
function enviarPedidoPorWhatsApp() {
    const nombreCliente = document.getElementById('nombre-cliente').value.trim();
    const telefonoCliente = document.getElementById('telefono-cliente').value.trim();
    const direccionCliente = document.getElementById('direccion-cliente').value.trim();
    
    if (!nombreCliente || !telefonoCliente) {
        mostrarMensaje('Por favor complete los datos del cliente', 'error');
        return;
    }
    
    if (pedidoActual.length === 0) {
        mostrarMensaje('No hay productos en el pedido', 'error');
        return;
    }
    
    // Formatear mensaje para WhatsApp
    let mensaje = `*NUEVO PEDIDO*\n\n`;
    mensaje += `*Cliente:* ${nombreCliente}\n`;
    
    if (direccionCliente) {
        mensaje += `*Dirección:* ${direccionCliente}\n`;
    }
    
    mensaje += `\n*Detalle del Pedido:*\n`;
    
    let total = 0;
    pedidoActual.forEach(producto => {
        const subtotal = producto.cantidad * parseFloat(producto.Precio);
        total += subtotal;
        
        mensaje += `\n- ${producto.cantidad}x ${producto.Nombre}\n`;
        mensaje += `  ${producto.Rubro} | Cód: ${producto.Codigo}\n`;
        mensaje += `  $${parseFloat(producto.Precio).toFixed(2)} c/u | Subtotal: $${subtotal.toFixed(2)}\n`;
    });
    
    mensaje += `\n*TOTAL: $${total.toFixed(2)}*`;
    
    // Codificar mensaje para URL
    const mensajeCodificado = encodeURIComponent(mensaje);
    
    // Número de teléfono sin el signo '+' para WhatsApp
    const telefonoFormateado = telefonoCliente.replace(/\D/g, '');
    
    // Crear URL de WhatsApp
    const urlWhatsApp = `https://wa.me/${telefonoFormateado}?text=${mensajeCodificado}`;
    
    // Abrir en nueva pestaña
    window.open(urlWhatsApp, '_blank');
}

// Función para vaciar el pedido actual
function vaciarPedido() {
    if (confirm('¿Está seguro de vaciar el pedido actual?')) {
        pedidoActual = [];
        actualizarTablaPedido();
        guardarPedidoLocal();
        
        // Resetear las cantidades en la tabla de productos
        document.querySelectorAll('.cantidad-input').forEach(input => {
            input.value = 0;
        });
        
        // Actualizar textos de botones
        document.querySelectorAll('.agregar-producto').forEach(btn => {
            btn.textContent = 'Agregar';
/*            btn.classList.remove('btn-actualizar');*/
        });
    }
}

// Función para mostrar mensajes
function mostrarMensaje(texto, tipo) {
    // Verificar si ya existe un mensaje y eliminarlo
    const mensajeExistente = document.querySelector('.mensaje');
    if (mensajeExistente) {
        mensajeExistente.remove();
    }
    
    // Crear nuevo mensaje
    const mensaje = document.createElement('div');
    mensaje.className = `mensaje mensaje-${tipo}`;
    mensaje.textContent = texto;
    
    // Estilos del mensaje
    mensaje.style.position = 'fixed';
    mensaje.style.top = '20px';
    mensaje.style.left = '50%';
    mensaje.style.transform = 'translateX(-50%)';
    mensaje.style.padding = '10px 20px';
    mensaje.style.borderRadius = '4px';
    mensaje.style.zIndex = '1000';
    mensaje.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    
    if (tipo === 'error') {
        mensaje.style.backgroundColor = '#f44336';
        mensaje.style.color = 'white';
    } else {
        mensaje.style.backgroundColor = '#4CAF50';
        mensaje.style.color = 'white';
    }
    
    // Añadir al body
    document.body.appendChild(mensaje);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        mensaje.remove();
    }, 3000);
}

// Inicializar eventos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Cargar catálogo inicial
    cargarCatalogoInicial();
    
    // Evento para cargar archivo Excel
    document.getElementById('cargar-excel').addEventListener('click', function() {
        const fileInput = document.getElementById('excel-file');
        
        if (fileInput.files.length > 0) {
            procesarArchivoExcel(fileInput.files[0]);
        } else {
            mostrarMensaje('Por favor seleccione un archivo Excel', 'error');
        }
    });
    
    // Eventos para filtros
    document.getElementById('filtro-rubro').addEventListener('change', function() {
        const textoBusqueda = document.getElementById('busqueda').value;
        mostrarProductosEnTabla(this.value, textoBusqueda);
        setTimeout(fixMobileNumericKeyboard, 100);
    });
    
    document.getElementById('busqueda').addEventListener('input', function() {
        const filtroRubro = document.getElementById('filtro-rubro').value;
        mostrarProductosEnTabla(filtroRubro, this.value);
        setTimeout(fixMobileNumericKeyboard, 100);
    });
    
    // Eventos para botones del pedido
    document.getElementById('enviar-whatsapp').addEventListener('click', enviarPedidoPorWhatsApp);
    document.getElementById('vaciar-pedido').addEventListener('click', vaciarPedido);
    setTimeout(fixMobileNumericKeyboard, 500);
});
// Agregar este código al final del evento DOMContentLoaded en script.js

// Crear un clon de la sección de filtros para hacerla fija
function crearFiltrosFijos() {
    const filtrosOriginales = document.getElementById('filtros');
    
    // Crear el contenedor para los filtros fijos
    const filtrosFijos = document.createElement('div');
    filtrosFijos.className = 'filtros-fijos';
    filtrosFijos.id = 'filtros-fijos';
    
    // Clonar el contenido de los filtros
    filtrosFijos.innerHTML = filtrosOriginales.innerHTML;
    
    // Agregar al body
    document.body.appendChild(filtrosFijos);
    
    // Crear espacio adicional para evitar saltos de contenido
    const espacioFiltros = document.createElement('div');
    espacioFiltros.className = 'filtros-fijos-espacio';
    espacioFiltros.id = 'filtros-fijos-espacio';
    
    // Insertar antes del catálogo
    const catalogoSeccion = document.getElementById('catalogo');
    catalogoSeccion.parentNode.insertBefore(espacioFiltros, catalogoSeccion);
    
    // Configurar eventos para los nuevos filtros
    const nuevoFiltroRubro = filtrosFijos.querySelector('#filtro-rubro');
    const nuevoBusqueda = filtrosFijos.querySelector('#busqueda');
    
    nuevoFiltroRubro.id = 'filtro-rubro-fijo';
    nuevoBusqueda.id = 'busqueda-fijo';
    
    // Sincronizar filtros
    nuevoFiltroRubro.addEventListener('change', function() {
        const filtroOriginal = document.getElementById('filtro-rubro');
        filtroOriginal.value = this.value;
        filtroOriginal.dispatchEvent(new Event('change'));
    });
    
    nuevoBusqueda.addEventListener('input', function() {
        const busquedaOriginal = document.getElementById('busqueda');
        busquedaOriginal.value = this.value;
        busquedaOriginal.dispatchEvent(new Event('input'));
    });

    // También sincronizar en dirección opuesta
    const filtroOriginal = document.getElementById('filtro-rubro');
    filtroOriginal.addEventListener('change', function() {
        nuevoFiltroRubro.value = this.value;
    });
    
    const busquedaOriginal = document.getElementById('busqueda');
    busquedaOriginal.addEventListener('input', function() {
        nuevoBusqueda.value = this.value;
    });
}

// Función para controlar la visibilidad de los filtros fijos
function controlarFiltrosFijos() {
    const filtrosFijos = document.getElementById('filtros-fijos');
    const espacioFiltros = document.getElementById('filtros-fijos-espacio');
    const catalogoSeccion = document.getElementById('catalogo');
    const pedidoSeccion = document.getElementById('pedido');
    const rectCatalogo = catalogoSeccion.getBoundingClientRect();
    const rectPedido = pedidoSeccion.getBoundingClientRect();
    
    // Mostrar filtros cuando:
    // 1. El catálogo está visible (parte superior ya pasó el viewport)
    // 2. Y el pedido aún no es visible (parte superior no ha entrado en viewport)
    if (rectCatalogo.top < 0 && rectPedido.top > 0) {
        filtrosFijos.classList.add('visible');
        espacioFiltros.classList.add('visible');
    } else {
        filtrosFijos.classList.remove('visible');
        espacioFiltros.classList.remove('visible');
    }
}

// Crear filtros fijos y configurar evento de scroll
crearFiltrosFijos();
window.addEventListener('scroll', controlarFiltrosFijos);
// Agrega este código al final del archivo script.js, dentro del evento DOMContentLoaded

// Botón flotante de navegación
const toggleFloatingNav = document.getElementById('toggle-floating-nav');
const floatingNavMenu = document.getElementById('floating-nav-menu');

toggleFloatingNav.addEventListener('click', function() {
    floatingNavMenu.classList.toggle('active');
    this.classList.toggle('active');
});

// Cerrar el menú al hacer clic en un enlace
document.querySelectorAll('.floating-nav-menu a').forEach(link => {
    link.addEventListener('click', function() {
        floatingNavMenu.classList.remove('active');
        toggleFloatingNav.classList.remove('active');
        
        // Pequeño retraso para el scroll suave
        setTimeout(() => {
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                // Scroll suave a la sección
                window.scrollTo({
                    top: targetElement.offsetTop - 20,
                    behavior: 'smooth'
                });
            }
        }, 100);
    });
});

// Cerrar el menú al hacer clic fuera
document.addEventListener('click', function(event) {
    if (!event.target.closest('.floating-nav-button') && 
        floatingNavMenu.classList.contains('active')) {
        floatingNavMenu.classList.remove('active');
        toggleFloatingNav.classList.remove('active');
    }
});

// Agregar esto al final del archivo script.js

// Función para detectar si es dispositivo móvil
function esDispositivoMovil() {
    return window.innerWidth <= 768;
}

// Función para mostrar productos en formato adaptado para móviles
function mostrarProductosFormatoMovil(productosFiltrados) {
    const contenedor = document.getElementById('productos-mobile-container');
    
    // Si no existe el contenedor, créalo
    if (!contenedor) {
        // Crear contenedor para vista móvil
        const mobileContainer = document.createElement('div');
        mobileContainer.id = 'productos-mobile-container';
        mobileContainer.className = 'tabla-productos-mobile';
        
        // Insertar después de la tabla original
        const tablaOriginal = document.getElementById('tabla-productos');
        tablaOriginal.parentNode.insertBefore(mobileContainer, tablaOriginal.nextSibling);
    }
    
    // Limpiar el contenedor
    contenedor.innerHTML = '';
    
    if (productosFiltrados.length === 0) {
        contenedor.innerHTML = '<div class="producto-card"><p style="text-align: center;">No se encontraron productos</p></div>';
        return;
    }
    
    // Crear tarjetas para cada producto
    productosFiltrados.forEach(producto => {
        // Encontrar si el producto ya está en el pedido
        const enPedido = pedidoActual.find(item => item.Codigo === producto.Codigo);
        const cantidadActual = enPedido ? enPedido.cantidad : 0;
        
        const productoCard = document.createElement('div');
        productoCard.className = 'producto-card';
        
        productoCard.innerHTML = `
            <div class="producto-card-header">
                <span class="producto-codigo">Cód: ${producto.Codigo}</span>
                <span class="producto-rubro">${producto.Rubro}</span>
            </div>
            <div class="producto-nombre">${producto.Nombre}</div>
            <div class="producto-precio">$${parseFloat(producto.Precio).toFixed(2)}</div>
            <div class="producto-acciones">
                <input type="number" class="cantidad-input" value="${cantidadActual}" min="0">
                <button class="btn btn-small agregar-producto-mobile" data-codigo="${producto.Codigo}">
                    ${cantidadActual > 0 ? 'Actualizar' : 'Agregar'}
                </button>
            </div>
        `;
        
        contenedor.appendChild(productoCard);
    });
    
    // Agregar eventos a los botones de agregar en vista móvil
    document.querySelectorAll('.agregar-producto-mobile').forEach(btn => {
        btn.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            const cantidadInput = this.closest('.producto-card').querySelector('.cantidad-input');
            const cantidad = parseInt(cantidadInput.value);
            
            if (cantidad > 0) {
                agregarProductoAlPedido(codigo, cantidad);
                this.textContent = 'Actualizar';
                 // Agregar clase para el estilo de actualización
/*                this.classList.add('btn-actualizar');*/
            } else {
                eliminarProductoDelPedido(codigo);
                this.textContent = 'Agregar';
                 // Remover clase de actualización
            /*this.classList.remove('btn-actualizar');*/
            }
        });
    });
}

// Sobrescribir la función mostrarProductosEnTabla para que use la vista móvil si corresponde
const mostrarProductosEnTablaOriginal = mostrarProductosEnTabla;

mostrarProductosEnTabla = function(filtroRubro = 'todos', textoBusqueda = '') {
    // Obtener productos filtrados
    const productosFiltrados = catalogo.filter(producto => {
        const coincideRubro = filtroRubro === 'todos' || producto.Rubro === filtroRubro;
        const coincideBusqueda = textoBusqueda === '' || 
            producto.Nombre.toLowerCase().includes(textoBusqueda.toLowerCase()) || 
            producto.Codigo.toString().toLowerCase().includes(textoBusqueda.toLowerCase());
        
        return coincideRubro && coincideBusqueda;
    });
    
    // Usar la función original para la vista escritorio
    mostrarProductosEnTablaOriginal(filtroRubro, textoBusqueda);
    
    // Si es móvil, mostrar vista alternativa
    if (esDispositivoMovil()) {
        mostrarProductosFormatoMovil(productosFiltrados);
        fixMobileNumericKeyboard();
    }
};

// Verificar tamaño de pantalla al cargar y al redimensionar
function verificarTamañoPantalla() {
    const tablaOriginal = document.getElementById('tabla-productos');
    const contenedorMobile = document.getElementById('productos-mobile-container');
    
    if (esDispositivoMovil()) {
        if (tablaOriginal) tablaOriginal.style.display = 'none';
        if (contenedorMobile) contenedorMobile.style.display = 'block';
        
        // Si ya tenemos productos, mostrarlos en formato móvil
        if (catalogo.length > 0) {
            const filtroRubro = document.getElementById('filtro-rubro').value;
            const textoBusqueda = document.getElementById('busqueda').value;
            
            const productosFiltrados = catalogo.filter(producto => {
                const coincideRubro = filtroRubro === 'todos' || producto.Rubro === filtroRubro;
                const coincideBusqueda = textoBusqueda === '' || 
                    producto.Nombre.toLowerCase().includes(textoBusqueda.toLowerCase()) || 
                    producto.Codigo.toString().toLowerCase().includes(textoBusqueda.toLowerCase());
                
                return coincideRubro && coincideBusqueda;
            });
            
            mostrarProductosFormatoMovil(productosFiltrados);
            fixMobileNumericKeyboard();
        }
    } else {
        if (tablaOriginal) tablaOriginal.style.display = 'table';
        if (contenedorMobile) contenedorMobile.style.display = 'none';
    }
}

// Añadir evento resize
window.addEventListener('resize', verificarTamañoPantalla);

// Verificar al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    // Añadir esto al final del DOMContentLoaded existente
    verificarTamañoPantalla();
});

// Función para arreglar el problema del teclado numérico en Android
function fixMobileNumericKeyboard() {
    // Seleccionar todos los inputs numéricos en la vista móvil
    const numericInputs = document.querySelectorAll('.cantidad-input');
    
    numericInputs.forEach(input => {
        // Prevenir el comportamiento por defecto del focus/click en los inputs
        input.addEventListener('click', function(e) {
            // Prevenir que se cierre el teclado
            e.preventDefault();
            
            // Mantener el input enfocado
            this.focus();
            
            // Asegurarse de que el tipo de teclado sea numérico
            this.setAttribute('inputmode', 'numeric');
            
            // Para Android necesitamos este truco para mantener el teclado abierto
            setTimeout(() => {
                // Reposicionar el cursor al final del texto
                const value = this.value;
                this.value = '';
                this.value = value;
                
                // Seleccionar todo el texto (mejor UX)
                this.select();
            }, 10);
        });
        
        // Asegurarse de que el teclado sea numérico
        input.setAttribute('inputmode', 'numeric');
        
        // Otra solución común es usar pattern para invocar teclado numérico
        input.setAttribute('pattern', '[0-9]*');
    });
}