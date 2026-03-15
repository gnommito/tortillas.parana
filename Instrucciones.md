# 🥖 Guía de Implementación: Web App Panadería Tania

He creado todos los archivos necesarios en la carpeta `Proyecto_Panaderia`. Sigue estos pasos para que tu sitio funcione al 100%:

## 1. Configurar la Base de Datos (Google Sheets)
Crea un nuevo **Google Sheet** y añade 4 pestañas con estos nombres exactos:

| Pestaña | Columnas Requeridas |
| :--- | :--- |
| **Productos** | `id`, `nombre`, `precio`, `descripción`, `url_imagen` |
| **Pedidos** | `id_pedido`, `email`, `items`, `total`, `estado`, `fecha`, `teléfono` |
| **Clientes** | `email`, `nombre`, `password`, `teléfono` |
| **Mensajes** | `fecha`, `nombre`, `email`, `mensaje` |

*Añade al menos un producto a la pestaña **Productos** para ver contenido.*

## 2. Configurar el Script
1. Copia el **ID de tu Google Sheet** (está en la URL: `https://docs.google.com/spreadsheets/d/ESTE_ID/edit`).
2. Abre el archivo `Code.gs` que he creado para ti.
3. Busca la línea: `const SPREADSHEET_ID = 'TU_ID_DE_GOOGLE_SHEET_AQUI';` y pega allí tu ID.

## 3. Subir el Código a Google Apps Script
1. En tu Google Sheet, ve a **Extensiones > Apps Script**.
2. Crea los archivos correspondientes en el editor con el MISMO NOMBRE:
   - `Code.gs` (reemplaza el contenido).
   - `Index.html` (vía + Nuevo > HTML).
   - `Styles.html` (vía + Nuevo > HTML).
   - `Scripts.html` (vía + Nuevo > HTML).
   - `Admin.html` (vía + Nuevo > HTML).
3. Pega el contenido de cada archivo local en su respectivo archivo en la web.

## 4. Implementar
1. Haz clic en el botón azul **"Implementar" -> "Nueva implementación"**.
2. Tipo: **Aplicación Web**.
3. Descripción: "Panadería Tania v1".
4. Ejecutar como: **Yo**.
5. Quién tiene acceso: **Cualquier persona**.
6. Copia la URL que te proporciona (esta será tu página web).

---
### 🌟 Características Premium Incluidas:
- **Carrito de compra persistente** (se guarda en el navegador).
- **Diseño responsive** (funciona en móviles y computadoras).
- **Botón de WhatsApp flotante** integrado.
- **Transiciones suaves** y estética basada en tus imágenes.
- **Panel de Administración** accesible vía `?p=admin` en la URL.


# 🥖 Migración Completa a Google Apps Script

Este proyecto **ya está diseñado para trabajar con Apps Script**. Solo necesitas el backend. Aquí está la solución completa:

---

## 📁 ESTRUCTURA DE GOOGLE SHEETS

Crea una hoja de cálculo con **3 pestañas**:

### 1. **Productos** (Sheet name: `Productos`)
| id | nombre | precio | stock | img | imgFull | desc | destacado |
|----|--------|--------|-------|-----|---------|------|-----------|
| 1234567890 | Concha | 35 | 50 | data:image... | data:image... | Pan dulce... | TRUE |

### 2. **Pedidos** (Sheet name: `Pedidos`)
| idpedido | cliente | telefono | direccion | productos | total | estado | fecha |
|----------|---------|----------|-----------|-----------|-------|--------|-------|
| PED-001 | Juan Pérez | 521234567890 | Calle 123 | [{"name":"Concha","qty":2}] | 70 | Pendiente | 2025-01-15 |

### 3. **Configuración** (Sheet name: `Configuracion`)
| clave | valor |
|-------|-------|
| title | TANIA DIAZ |
| color | #E8A598 |
| logoUrl | data:image... |
| footerWa | 521234567890 |
| footerLoc | Calle Principal #123 |
| slides_count | 3 |
| slide_1_title | Sabores Artesanales |
| slide_1_subtitle | Pan recién horneado |
| slide_1_image | data:image... |
| slide_1_buttonText | Ver Tienda |
| slide_1_buttonLink | tienda |

---

## 📄 CODE.GS (Backend Completo)

```javascript
// ============================================
// CONFIGURACIÓN
// ============================================
const SHEET_ID = 'TU_SPREADSHEET_ID_AQUI'; // ← Reemplaza con tu ID
const SHEETS = {
  PRODUCTS: 'Productos',
  ORDERS: 'Pedidos',
  SETTINGS: 'Configuracion'
};

// ============================================
// DO GET - Maneja solicitudes GET
// ============================================
function doGet(e) {
  const action = e.parameter.action || 'get';
  const p = e.parameter.p;
  
  try {
    let result;
    
    if (action === 'get') {
      if (p === 'products') {
        result = getProducts();
      } else if (p === 'orders') {
        result = getOrders();
      } else if (p === 'settings') {
        result = getSettings();
      } else {
        return jsonResponse({ error: 'Parámetro p no válido' });
      }
    } else {
      return jsonResponse({ error: 'Acción no soportada en GET' });
    }
    
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}

// ============================================
// DO POST - Maneja solicitudes POST
// ============================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let result;
    
    switch (action) {
      case 'saveOrder':
        result = saveOrder(data.order);
        break;
      case 'saveSettings':
        result = saveSettings(data.config);
        break;
      case 'syncProducts':
        result = syncProducts(data.products);
        break;
      case 'deleteProduct':
        result = deleteProduct(data.productId);
        break;
      case 'deleteOrder':
        result = deleteOrder(data.orderId);
        break;
      default:
        return jsonResponse({ error: 'Acción no reconocida' });
    }
    
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}

// ============================================
// FUNCIONES DE PRODUCTOS
// ============================================
function getProducts() {
  const sheet = getSheet(SHEETS.PRODUCTS);
  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  
  if (rows.length <= 1) return [];
  
  const products = [];
  for (let i = 1; i < rows.length; i++) {
    const product = rowToObject(headers, rows[i]);
    if (product.id) {
      // Asegurar tipos correctos
      product.precio = Number(product.precio) || 0;
      product.stock = Number(product.stock) || 0;
      product.destacado = product.destacado === 'TRUE' || product.destacado === true;
      products.push(product);
    }
  }
  
  return products;
}

function syncProducts(products) {
  const sheet = getSheet(SHEETS.PRODUCTS);
  
  // Limpiar hoja (mantener headers)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  
  // Escribir productos
  const headers = ['id', 'nombre', 'precio', 'stock', 'img', 'imgFull', 'desc', 'destacado'];
  
  if (products.length > 0) {
    const values = products.map(p => [
      p.id,
      p.name || p.nombre,
      p.price || p.precio,
      p.stock,
      p.img,
      p.imgFull || p.img,
      p.desc,
      p.featured !== undefined ? (p.featured ? 'TRUE' : 'FALSE') : (p.destacado ? 'TRUE' : 'FALSE')
    ]);
    
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }
  
  return { success: true, count: products.length };
}

function deleteProduct(productId) {
  const sheet = getSheet(SHEETS.PRODUCTS);
  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    const product = rowToObject(headers, rows[i]);
    if (String(product.id) === String(productId)) {
      sheet.deleteRow(i + 1);
      return { success: true, deletedId: productId };
    }
  }
  
  return { success: false, error: 'Producto no encontrado' };
}

// ============================================
// FUNCIONES DE PEDIDOS
// ============================================
function getOrders() {
  const sheet = getSheet(SHEETS.ORDERS);
  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  
  if (rows.length <= 1) return [];
  
  const orders = [];
  for (let i = 1; i < rows.length; i++) {
    const order = rowToObject(headers, rows[i]);
    if (order.idpedido) {
      orders.push(order);
    }
  }
  
  return orders.reverse(); // Más recientes primero
}

function saveOrder(orderData) {
  const sheet = getSheet(SHEETS.ORDERS);
  const headers = getHeaders(sheet);
  
  const orderId = 'PED-' + Date.now().toString().slice(-6);
  const timestamp = new Date();
  
  const newRow = [
    orderId,
    orderData.customer,
    orderData.phone,
    orderData.address,
    JSON.stringify(orderData.items),
    orderData.total,
    'Pendiente',
    timestamp.toISOString()
  ];
  
  sheet.appendRow(newRow);
  
  // Enviar notificación por email (opcional)
  sendOrderNotification(orderId, orderData);
  
  return { success: true, orderId: orderId };
}

function deleteOrder(orderId) {
  const sheet = getSheet(SHEETS.ORDERS);
  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    const order = rowToObject(headers, rows[i]);
    if (String(order.idpedido) === String(orderId) || 
        String(order.id) === String(orderId) ||
        String(order.nro) === String(orderId)) {
      sheet.deleteRow(i + 1);
      return { success: true, deletedId: orderId };
    }
  }
  
  return { success: false, error: 'Pedido no encontrado' };
}

function sendOrderNotification(orderId, orderData) {
  try {
    const subject = `🥖 Nuevo Pedido #${orderId}`;
    let body = `Nuevo pedido recibido:\n\n`;
    body += `Cliente: ${orderData.customer}\n`;
    body += `Dirección: ${orderData.address}\n`;
    body += `WhatsApp: ${orderData.phone}\n\n`;
    body += `Productos:\n`;
    orderData.items.forEach(item => {
      body += `• ${item.name} x${item.qty} - $${item.price * item.qty}\n`;
    });
    body += `\nTOTAL: $${orderData.total}`;
    
    // Enviar al dueño (cambia el email)
    MailApp.sendEmail('tuemail@gmail.com', subject, body);
  } catch (e) {
    console.error('Error enviando notificación:', e);
  }
}

// ============================================
// FUNCIONES DE CONFIGURACIÓN (CMS)
// ============================================
function getSettings() {
  const sheet = getSheet(SHEETS.SETTINGS);
  const rows = sheet.getDataRange().getValues();
  
  const config = {};
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && rows[i][1] !== undefined) {
      config[rows[i][0]] = rows[i][1];
    }
  }
  
  return config;
}

function saveSettings(config) {
  const sheet = getSheet(SHEETS.SETTINGS);
  
  // Limpiar hoja
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  
  // Escribir configuración como clave-valor
  const values = Object.keys(config).map(key => [key, config[key]]);
  
  if (values.length > 0) {
    sheet.getRange(2, 1, values.length, 2).setValues(values);
  }
  
  return { success: true, savedKeys: Object.keys(config).length };
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Crear headers según la hoja
    if (name === SHEETS.PRODUCTS) {
      sheet.appendRow(['id', 'nombre', 'precio', 'stock', 'img', 'imgFull', 'desc', 'destacado']);
    } else if (name === SHEETS.ORDERS) {
      sheet.appendRow(['idpedido', 'cliente', 'telefono', 'direccion', 'productos', 'total', 'estado', 'fecha']);
    } else if (name === SHEETS.SETTINGS) {
      sheet.appendRow(['clave', 'valor']);
    }
  }
  
  return sheet;
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function rowToObject(headers, row) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    obj[headers[i]] = row[i];
  }
  return obj;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// INICIALIZACIÓN (Ejecutar una vez manualmente)
// ============================================
function setupSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // Crear hojas si no existen
  [SHEETS.PRODUCTS, SHEETS.ORDERS, SHEETS.SETTINGS].forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
  });
  
  Logger.log('Hojas configuradas correctamente');
}
```

---

## 🚀 PASOS DE IMPLEMENTACIÓN

### 1. **Crear Google Apps Script**
```
1. Ve a script.google.com
2. Nuevo proyecto
3. Pega el código en Code.gs
4. Reemplaza SHEET_ID con tu ID de Google Sheets
```

### 2. **Configurar Google Sheets**
```
1. Crea nueva hoja de cálculo
2. Copia el ID de la URL (entre /d/ y /edit)
3. Pega el ID en SHEET_ID
4. Ejecuta setupSheets() una vez desde el editor
```

### 3. **Deploy como Web App**
```
1. Click en "Implementar" → "Nueva implementación"
2. Tipo: "Aplicación web"
3. Ejecutar como: "Yo"
4. Quién tiene acceso: "Cualquier usuario"
5. Click en "Implementar"
6. Copia la URL del Web App
```

### 4. **Actualizar Frontend**
En tu HTML, reemplaza:
```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/TU_NUEVA_URL/exec';
```

---

## ⚙️ PERMISOS NECESARIOS

En `appsscript.json` (Editor → Configuración del manifiesto):

```json
{
  "timeZone": "America/Mexico_City",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "accessAs": "ANYONE_ANONYMOUS"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.send_mail"
  ]
}
```

---

## 📋 RESUMEN DE FUNCIONALIDADES

| Función | Endpoint | Método | Descripción |
|---------|----------|--------|-------------|
| Obtener Productos | `?p=products` | GET | Lista todos los productos |
| Obtener Pedidos | `?p=orders` | GET | Lista todos los pedidos |
| Obtener Settings | `?p=settings` | GET | Configuración CMS |
| Guardar Pedido | `saveOrder` | POST | Crea nuevo pedido |
| Guardar Settings | `saveSettings` | POST | Actualiza configuración |
| Sync Productos | `syncProducts` | POST | Actualiza inventario |
| Eliminar Producto | `deleteProduct` | POST | Borra producto |
| Eliminar Pedido | `deleteOrder` | POST | Borra pedido |

---

## 🔒 SEGURIDAD RECOMENDADA

1. **Contraseña Admin**: Cambia `'admin123'` en el frontend
2. **Email Notificaciones**: Actualiza `tuemail@gmail.com`
3. **CORS**: El código ya usa `Content-Type: text/plain` para evitar preflight
4. **Backup**: Activa version history en Google Sheets

---

¿Necesitas que ajuste algo específico o agregue funcionalidades adicionales? 🎯