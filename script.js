// Variables globales
let catalogo = [];
let pedidoActual = [];
let rubrosDisponibles = new Set();

function cargarCatalogoInicial() {
    // 1. Limpiar cualquier dato previo en localStorage
    localStorage.removeItem('catalogoProductos');
    
    // 2. Cargar directamente desde el archivo JSON
    fetch('catalogo_productos.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Validar estructura del JSON recibido
            if (!data) {
                throw new Error('El archivo JSON está vacío');
            }
            
            // Manejar tanto array directo como objeto con propiedad 'productos'
            catalogo = Array.isArray(data) ? data : data.productos || [];
            
            // Opcional: Si quieres evitar completamente el almacenamiento local,
            // eliminamos estas líneas que guardarían en localStorage
            // localStorage.setItem('catalogoProductos', JSON.stringify(catalogo));
            
            procesarCatalogo();
        })
        .catch(error => {
            console.error('Error al cargar catálogo:', error);
            mostrarMensaje('Error al cargar productos. Intente recargar la página.', 'error');
            
            // Opcional: Cargar datos de respaldo si existen
            if (typeof catalogoBackup !== 'undefined') {
                catalogo = catalogoBackup;
                procesarCatalogo();
                mostrarMensaje('Mostrando datos de respaldo', 'warning');
            }
        });
}
// Función para cargar el catálogo inicial desde el archivo JSON
function cargarCatalogoInicial_ori() {
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
    });
    
    document.getElementById('busqueda').addEventListener('input', function() {
        const filtroRubro = document.getElementById('filtro-rubro').value;
        mostrarProductosEnTabla(filtroRubro, this.value);
    });
    
    // Eventos para botones del pedido
    document.getElementById('enviar-whatsapp').addEventListener('click', enviarPedidoPorWhatsApp);
    document.getElementById('vaciar-pedido').addEventListener('click', vaciarPedido);
});
