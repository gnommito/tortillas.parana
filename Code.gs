/**
 * API de Sincronización Total - VERSIÓN 3.2 [NUCLEAR]
 * Scopes requeridos: DriveApp, SpreadsheetApp
 */

const GS_VERSION = "3.3.0-FINAL";

const SPREADSHEET_ID = '1lPE8mco8DlFcawaMRljf-RhsC_sG7bLSbTeazs0f33s';
const IMAGES_FOLDER_NAME = 'Web_Producto_Imagenes';

function inicializarTablas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 1. Pestaña de Productos
  let sheetProd = ss.getSheetByName('Productos');
  if (!sheetProd) {
    sheetProd = ss.insertSheet('Productos');
    sheetProd.appendRow(['id', 'name', 'price', 'stock', 'img', 'imgFull', 'featured', 'desc']);
  }
  
  // 2. Pestaña de Pedidos (ESTRUCTURA CORRECTA)
  let sheetPed = ss.getSheetByName('Pedidos');
  if (!sheetPed) {
    sheetPed = ss.insertSheet('Pedidos');
    // ESTRUCTURA COMPLETA PARA PEDIDOS
    // ESTRUCTURA COMPLETA PARA PEDIDOS (Sincronizada con imagen de usuario)
    sheetPed.appendRow([
      'ID_Pedido',      // A
      'Cliente',        // B
      'WhatsApp',       // C
      'Direccion',      // D
      'Resumen_Pedido', // E
      'Notas',          // F (Antes Gap)
      'Total',          // G
      'Fecha',          // H
      'Estado'          // I
    ]);
  } else {
    const expectedHeaders = ['ID_Pedido', 'Cliente', 'WhatsApp', 'Direccion', 'Resumen_Pedido', 'Notas', 'Total', 'Fecha', 'Estado'];
    const currentHeaders = sheetPed.getRange(1, 1, 1, sheetPed.getLastColumn()).getValues()[0];
    
    if (!arraysEqual(currentHeaders, expectedHeaders)) {
      console.log('Sincronizando hoja de Pedidos a 9 columnas (v3.2)...');
      sheetPed.clear();
      sheetPed.appendRow(expectedHeaders);
    }
  }
  
  // 3. Pestaña de Configuración (CMS)
  let sheetConf = ss.getSheetByName('Configuracion');
  if (!sheetConf) {
    sheetConf = ss.insertSheet('Configuracion');
    sheetConf.appendRow(['clave', 'valor']);
    sheetConf.appendRow(['title', 'TANIA DIAZ']);
    sheetConf.appendRow(['color', '#F1948A']);
  }
  
  // 4. Agregar Tortilla de trigo si no existe
  const existingData = sheetProd.getDataRange().getValues();
  const headers = existingData[0];
  const idIndex = headers.indexOf('id');
  const tortillaExists = existingData.some(row => row[idIndex] === '6');
  
  if (!tortillaExists) {
    sheetProd.appendRow([
      '6',                                    // id
      'Tortilla de trigo',                    // name  
      2500,                                  // price
      10,                                    // stock
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca38?w=500', // img
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca38?w=500', // imgFull
      true,                                  // featured
      'Tortilla tradicional de trigo, suave y flexible, perfecta para preparar tus comidas favoritas.' // desc
    ]);
  }

  // 5. Carpeta de Drive
  getOrCreateFolder(IMAGES_FOLDER_NAME);
  
  Logger.log('¡Sistema inicializado con éxito! Tablas creadas correctamente.');
}

// Función auxiliar para comparar arrays
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Función para crear o obtener carpeta en Drive
function getOrCreateFolder(folderName) {
  const actualFolderName = folderName || 'IMAGES_PRODUCTOS';
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const parentFolder = DriveApp.getFileById(ss.getId()).getParents()[0];
  
  try {
    const folders = parentFolder.getFoldersByName(actualFolderName);
    if (folders.hasNext()) {
      return folders.next();
    } else {
      return parentFolder.createFolder(actualFolderName);
    }
  } catch (err) {
    Logger.log('Error al crear/obtener carpeta: ' + err.toString());
    return null;
  }
}

function doGet(e) {
  if (!e || !e.parameter || Object.keys(e.parameter).length === 0 || !e.parameter.p) {
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Panadería Tania | Gestión')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  const p = e.parameter.p;
  try {
    let data = {};
    if (p === 'settings' || p === 'cms') data = getSettings();
    else if (p === 'products') data = getProducts();
    else if (p === 'orders') data = getOrders();
    else if (p === 'test') data = testConnection();
    else return ContentService.createTextOutput(JSON.stringify({ error: 'Endpoint no encontrado: ' + p })).setMimeType(ContentService.MimeType.JSON);
    
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const result = runAction(body);
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handler para google.script.run (más rápido y sin CORS)
 */
function runAction(body) {
  const action = body.action;
  let result = { success: false };

  try {
    if (action === 'saveSettings' || action === 'saveCMS') result = saveSettings(body.config);
    else if (action === 'syncProducts') result = syncProducts(body.products);
    else if (action === 'saveOrder') result = saveOrder(body.order || body); // Soporte para objeto directo o envuelto
    else if (action === 'uploadImage') result = { success: true, url: uploadToDrive(body.base64, body.name) };
    else if (action === 'uploadImageWithMetadata') result = uploadImageWithMetadata(body.base64, body.name, body.productId, body.isMain);
    else if (action === 'organizeProductImages') result = organizeProductImages(body.productId);
    else if (action === 'cleanupOldImages') result = cleanupOldImages(body.productId, body.keepLatest);
    else if (action === 'getDriveStats') result = getDriveStats();
    else if (action === 'deleteProduct') result = deleteProduct(body.productId);
    else if (action === 'deleteOrder') result = deleteOrder(body.orderId);
    else if (action === 'updateOrderStatus') result = updateOrderStatus(body.orderId, body.status);
    else if (action === 'get') {
        if (body.p === 'settings') result = getSettings();
        else if (body.p === 'products') result = getProducts();
        else if (body.p === 'orders') result = getOrders();
        else if (body.p === 'test') result = testConnection();
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }
  return result;
}

// --- LOGICA AVANZADA DE GOOGLE DRIVE ---

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  const folder = DriveApp.createFolder(folderName);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return folder;
}

function uploadToDrive(base64Data, fileName) {
  try {
    if (!base64Data || !base64Data.startsWith('data:')) return base64Data;
    const folder = getOrCreateFolder(IMAGES_FOLDER_NAME);
    
    // Limpiar base64 header
    const parts = base64Data.split(',');
    if (parts.length < 2) return base64Data;
    
    const mimeType = parts[0].match(/:(.*?);/)[1];
    const data = Utilities.base64Decode(parts[1]);
    const blob = Utilities.newBlob(data, mimeType, fileName);
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return `https://lh3.googleusercontent.com/d/${file.getId()}`;
  } catch (e) {
    console.error('Error en uploadToDrive:', e);
    return base64Data; // Retornar original si falla para no perder el dato
  }
}

// NUEVA: Función para subir imágenes con metadatos
function uploadImageWithMetadata(base64Data, fileName, productId, isMain = false) {
  if (!base64Data) return "";
  
  const folder = getOrCreateFolder(IMAGES_FOLDER_NAME);
  const parts = base64Data.split(',');
  const mimeType = parts[0].match(/:(.*?);/)[1];
  const data = Utilities.base64Decode(parts[1]);
  const blob = Utilities.newBlob(data, mimeType, fileName);
  
  const file = folder.createFile(blob);
  
  // Agregar metadatos
  file.setDescription(`Producto ID: ${productId} | Principal: ${isMain} | Subido: ${new Date().toISOString()}`);
  
  // Optimizar para web
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // Retornar múltiples formatos de URL
  return {
    viewUrl: `https://lh3.googleusercontent.com/d/${file.getId()}`,
    fileId: file.getId(),
    fileName: fileName
  };
}

// NUEVA: Función para organizar imágenes por producto
function organizeProductImages(productId) {
  const folder = getOrCreateFolder(IMAGES_FOLDER_NAME);
  const files = folder.getFiles();
  const productImages = [];
  
  while (files.hasNext()) {
    const file = files.next();
    const description = file.getDescription() || '';
    if (description.includes(`Producto ID: ${productId}`)) {
      productImages.push({
        fileId: file.getId(),
        fileName: file.getName(),
        viewUrl: `https://lh3.googleusercontent.com/d/${file.getId()}`,
        isMain: description.includes('Principal: true'),
        uploadDate: file.getDateCreated()
      });
    }
  }
  
  return productImages.sort((a, b) => b.uploadDate - a.uploadDate);
}

// NUEVA: Función para limpiar imágenes antiguas
function cleanupOldImages(productId, keepLatest = 3) {
  const images = organizeProductImages(productId);
  if (images.length <= keepLatest) return { deleted: 0 };
  
  const folder = getOrCreateFolder(IMAGES_FOLDER_NAME);
  let deletedCount = 0;
  
  // Mantener solo las más recientes
  const imagesToDelete = images.slice(keepLatest);
  imagesToDelete.forEach(img => {
    try {
      const file = DriveApp.getFileById(img.fileId);
      file.setTrashed(true);
      deletedCount++;
    } catch (e) {
      Logger.log('Error al eliminar imagen ' + img.fileId + ': ' + e.toString());
    }
  });
  
  return { deleted: deletedCount, kept: keepLatest };
}

// NUEVA: Función para obtener estadísticas de Drive
function getDriveStats() {
  const folder = getOrCreateFolder(IMAGES_FOLDER_NAME);
  const files = folder.getFiles();
  let totalSize = 0;
  let fileCount = 0;
  const fileTypes = {};
  
  while (files.hasNext()) {
    const file = files.next();
    totalSize += file.getSize();
    fileCount++;
    
    const mimeType = file.getMimeType();
    fileTypes[mimeType] = (fileTypes[mimeType] || 0) + 1;
  }
  
  return {
    totalFiles: fileCount,
    totalSize: totalSize,
    totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
    fileTypes: fileTypes,
    folderUrl: folder.getUrl()
  };
}

// --- FUNCIONES ADICIONALES ---

function deleteProduct(productId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Productos');
    if (!sheet) return { success: false, error: 'No existe hoja de productos' };
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    
    // Encontrar la fila del producto
    let rowIndex = -1;
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][headers.indexOf('id')]) === String(productId)) {
        rowIndex = i + 2; // +2 porque headers es fila 1 y data empieza en fila 2
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: 'Producto no encontrado' };
    }
    
    // Eliminar la fila
    sheet.deleteRow(rowIndex);
    return { success: true };
    
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function updateOrderStatus(orderId, status) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Pedidos');
    
    if (!sheet) {
      return { success: false, error: 'Hoja "Pedidos" no encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: false, error: 'No hay pedidos registrados' };
    
    const headers = data[0];
    const normHeaders = headers.map(h => h.toString().toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, ''));
    
    const idColIdx = normHeaders.findIndex(h => h === 'idpedido' || h === 'id' || h === 'nro' || h === 'pedido');
    const statusColIdx = normHeaders.findIndex(h => h === 'estado' || h === 'status' || h === 'est' || h === 'stat');
    
    if (idColIdx === -1) return { success: false, error: 'Columna ID no encontrada' };
    if (statusColIdx === -1) return { success: false, error: 'Columna Estado no encontrada' };
    
    const searchId = String(orderId).trim().toUpperCase();
    
    for (let i = 1; i < data.length; i++) {
        const rowId = String(data[i][idColIdx]).trim().toUpperCase();
        
        if (rowId === searchId || (rowId.startsWith('#') && rowId.substring(1) === searchId)) {
            sheet.getRange(i + 1, statusColIdx + 1).setValue(status);
            return { 
                success: true, 
                message: `Pedido ${orderId} actualizado a "${status}"`,
                row: i + 1
            };
        }
    }
    
    return { success: false, error: `Pedido "${orderId}" no encontrado` };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function testConnection() {
  return { 
    success: true, 
    version: GS_VERSION,
    spreadsheetId: SPREADSHEET_ID,
    timestamp: new Date().toISOString()
  };
}

// Función para forzar la recarga de productos con descripciones
function refreshProductsWithDescriptions() {
  const products = getProducts();
  console.log('Productos actualizados con descripciones:', products);
  return products;
}

function getSettings() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Configuracion') || ss.insertSheet('Configuracion');
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return {};
    data.shift();
    
    const config = {};
    const slidesMap = {};
    
    data.forEach(row => {
      const key = row[0];
      let val = row[1];
      
      // Manejar slides guardados por fila: slide_1_title
      if (key && key.startsWith('slide_') && key !== 'slides_count') {
        const parts = key.split('_');
        if (parts.length >= 3) {
          const index = parts[1];
          const property = parts[2];
          if (!slidesMap[index]) slidesMap[index] = {};
          slidesMap[index][property] = val;
        }
      } else {
        // Otros ajustes
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try {
            val = JSON.parse(val);
          } catch (e) {}
        }
        config[key] = val;
      }
    });

    // Reconstruir array de slides
    const slides = Object.keys(slidesMap)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(idx => slidesMap[idx]);
    
    if (slides.length > 0) config.slides = slides;
    
    return config;
  } catch (err) {
    return { error: err.toString() };
  }
}

function saveSettings(config) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Configuracion') || ss.insertSheet('Configuracion');
    
    // 1. Procesar imágenes del carrusel primero
    if (config.slides && Array.isArray(config.slides)) {
      config.slides = config.slides.map((slide, index) => {
        if (slide.image && slide.image.startsWith('data:')) {
          slide.image = uploadToDrive(slide.image, `slide_${index + 1}_${Date.now()}.jpg`);
        }
        return slide;
      });
    }
    
    // 2. Procesar logo
    if (config.logoUrl && config.logoUrl.startsWith('data:')) {
      config.logoUrl = uploadToDrive(config.logoUrl, `logo_${Date.now()}.jpg`);
    }

    // 3. Limpiar y reconstruir hoja
    sheet.clear();
    sheet.appendRow(['clave', 'valor']);
    
    Object.keys(config).forEach(key => {
      if (key === 'slides' && Array.isArray(config.slides)) {
        // Expandir slides en múltiples filas (lo que pidió el usuario)
        config.slides.forEach((slide, idx) => {
          const prefix = `slide_${idx + 1}_`;
          sheet.appendRow([prefix + 'title', slide.title || '']);
          sheet.appendRow([prefix + 'subtitle', slide.subtitle || '']);
          sheet.appendRow([prefix + 'image', slide.image || '']);
          sheet.appendRow([prefix + 'buttonText', slide.buttonText || 'Ver Tienda']);
          sheet.appendRow([prefix + 'buttonLink', slide.buttonLink || 'tienda']);
          sheet.appendRow([prefix + 'id', String(slide.id || Date.now())]);
        });
        sheet.appendRow(['slides_count', config.slides.length]);
      } else if (key !== 'slides') {
        let valor = config[key];
        if (typeof valor === 'object' && valor !== null) {
          valor = JSON.stringify(valor);
        }
        sheet.appendRow([key, valor]);
      }
    });
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function getProducts() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Productos');
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const headers = data.shift();
    // Deduplicación por ID (siempre toma el último ingresado o el que tenga más stock)
    const uniqueProducts = [];
    const idMap = new Map();
    
    data.forEach(row => {
      let obj = {};
      headers.forEach((h, i) => {
        if (!h) return;
        let val = row[i];
        let originalKey = h.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let key = originalKey;
        
        if (originalKey === 'id') key = 'id';
        else if (originalKey.includes('nom') || originalKey.includes('name')) key = 'name';
        else if (originalKey.includes('pre') || originalKey.includes('price')) key = 'price';
        else if (originalKey.includes('sto') || originalKey.includes('cant')) key = 'stock';
        else if (originalKey === 'img' || originalKey.includes('imagen')) {
          key = (originalKey.includes('full')) ? 'imgFull' : 'img';
        }
        else if (originalKey.includes('dest') || originalKey.includes('feat')) key = 'featured';
        else if (originalKey.includes('desc') || originalKey.includes('det')) key = 'desc';
        
        if (key === 'id') val = String(val);
        if (key === 'price') val = parseFloat(val) || 0;
        if (key === 'stock') val = parseInt(val) || 0;
        if (key === 'featured') val = (val === true || val === 'TRUE' || val === 'SI' || val === '1');
        
        obj[key] = val;
      });
      
      if (!obj.id || obj.id === '---') return;

      if (!obj.name) obj.name = 'Producto sin nombre';
      if (!obj.desc) obj.desc = generateDescription(obj.name);
      if (!obj.img) obj.img = 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=500';
      if (!obj.imgFull) obj.imgFull = obj.img;

      // Mantener el que tenga más stock si el ID está duplicado
      if (!idMap.has(obj.id) || obj.stock > idMap.get(obj.id).stock) {
        idMap.set(obj.id, obj);
      }
    });

    return Array.from(idMap.values());
  } catch (err) {
    console.error('Error en getProducts:', err);
    return { error: err.toString() };
  }
}

// Función para generar descripciones automáticas basadas en el nombre del producto
function generateDescription(productName) {
  const name = (productName || '').toString().toLowerCase();
  
  // Descripciones específicas según el tipo de producto
  if (name.includes('pan') || name.includes('bread')) {
    if (name.includes('campesino') || name.includes('rústico')) {
      return 'Pan artesanal de corteza crujiente y miga suave, elaborado con harinas seleccionadas y fermentación lenta.';
    } else if (name.includes('baguette')) {
      return 'Clásica baguette francesa, ideal para sándwiches o acompañar comidas con su textura característica.';
    } else if (name.includes('centeno') || name.includes('integral')) {
      return 'Pan denso y nutritivo, rico en fibra y sabor, perfecto para una dieta balanceada.';
    } else if (name.includes('blanco') || name.includes('común')) {
      return 'Pan tradicional de miga blanda y corteza dorada, ideal para el consumo diario.';
    } else {
      return 'Pan fresco horneado diariamente con los mejores ingredientes y técnicas artesanales.';
    }
  } else if (name.includes('croissant') || name.includes('hojaldre')) {
    return 'Hojaldre francés 100% mantequilla, con capas delicadas y textura aireada, horneado diariamente.';
  } else if (name.includes('factura') || name.includes('medialuna') || name.includes('vigilante')) {
    return 'Variedad de facturas argentinas recién horneadas, con el toque dulce perfecto para tu desayuno.';
  } else if (name.includes('alfajor')) {
    return 'Tradicional alfargentino con dos tapas tiernas y dulce de leche, cubierto con coco rallado.';
  } else if (name.includes('muffin') || name.includes('muffins')) {
    return 'Esponjoso muffin casero, recién horneado y lleno de sabor, perfecto para acompañar tu café.';
  } else if (name.includes('torta') || name.includes('torta') || name.includes('pastel')) {
    return 'Deliciosa torta casera, preparada con ingredientes frescos y mucho amor para tus celebraciones.';
  } else if (name.includes('tortilla') || name.includes('tortilla')) {
      return 'Tortilla tradicional de trigo, suave y flexible, perfecta para preparar tus comidas favoritas.';
  } else if (name.includes('galletita') || name.includes('galleta')) {
    return 'Galletas caseras crujientes por fuera y tiernas por dentro, ideales para cualquier momento del día.';
  } else {
    return 'Delicioso producto artesanal preparado con los mejores ingredientes y mucho cuidado.';
  }
}

function getOrders() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Pedidos');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data.shift();
  
  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val instanceof Date) val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      
      // Limpiar encabezado: minúsculas, sin tildes, sin espacios
      let key = h.toString().toLowerCase().trim()
                 .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                 .replace(/\s+/g, '');
      
      obj[key] = val;
    });
    return obj;
  });
}

function syncProducts(products) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Productos') || ss.insertSheet('Productos');
  
  // Verificar estructura actual de columnas
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const descIndex = headers.indexOf('desc');
  const descripcionIndex = headers.indexOf('descripción');
  const descripcionSinTildeIndex = headers.indexOf('descripcion');
  const imgFullIndex = headers.indexOf('imgFull');
  const imgfullIndex = headers.indexOf('imgfull');
  
  // Si no existe la columna desc, agregarla después de featured
  if (descIndex === -1 && descripcionIndex === -1 && descripcionSinTildeIndex === -1) {
    const featuredIndex = headers.indexOf('featured');
    if (featuredIndex !== -1) {
      // Insertar columna desc después de featured
      sheet.insertColumnAfter(featuredIndex + 1);
      sheet.getRange(1, featuredIndex + 2).setValue('desc');
    } else {
      sheet.appendRow(['desc']);
    }
  }
  
  // Si no existe imgFull, agregarla después de img
  if (imgFullIndex === -1 && imgfullIndex === -1) {
    const imgIndex = headers.indexOf('img');
    if (imgIndex !== -1) {
      sheet.insertColumnAfter(imgIndex + 1);
      sheet.getRange(1, imgIndex + 2).setValue('imgFull');
    }
  }
  
  // Releer headers actualizados
  const updatedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Reconstruir el sheet con el orden correcto
  sheet.clear();
  sheet.appendRow(['id', 'name', 'price', 'stock', 'img', 'imgFull', 'featured', 'desc']);

  // Asegurar que todos los productos tengan descripción
  products.forEach(p => {
    if (!p.desc || p.desc.toString().trim() === '') {
      p.desc = generateDescription(p.name || 'producto');
    }
  });

  products.forEach(p => {
    // 1. Imagen recortada (para el grid)
    let imgUrl = p.img || "";
    if (imgUrl.startsWith('data:')) {
      imgUrl = uploadToDrive(imgUrl, `p_${p.id}_thumb.jpg`);
    }

    // 2. Imagen original (para el detalle)
    // p.imgFull es la original guardada en el frontend. Si no existe, usamos la thumb.
    let imgFullUrl = p.imgFull || p.img || "";
    if (imgFullUrl.startsWith('data:')) {
      imgFullUrl = uploadToDrive(imgFullUrl, `p_${p.id}_full.jpg`);
    }

    // Agregar en el orden correcto: id, name, price, stock, img, imgFull, featured, desc
    sheet.appendRow([
      String(p.id),                    // id como string
      p.name || '',                    // name
      Number(p.price) || 0,           // price como número
      Number(p.stock) || 0,           // stock como número
      imgUrl,                         // img
      imgFullUrl,                     // imgFull
      Boolean(p.featured),            // featured como boolean
      p.desc || generateDescription(p.name) // desc
    ]);
  });
  return { success: true };
}

function saveOrder(order) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheetPed = ss.getSheetByName('Pedidos') || ss.insertSheet('Pedidos');
  
  if (sheetPed.getLastRow() === 0) {
    sheetPed.appendRow(['ID_Pedido', 'Cliente', 'WhatsApp', 'Direccion', 'Resumen_Pedido', 'Notas', 'Total', 'Fecha', 'Estado']);
  }
  
  const orderId = 'ORD-' + new Date().getTime();
  
  // LOG DE SEGURIDAD: Ver exactamente qué llega al servidor
  console.log("DEBUG RAW ORDER:", JSON.stringify(order));

  // SEGURIDAD: Desempaquetar si el objeto viene envuelto en una propiedad 'order'
  const data = (order && order.order) ? order.order : order;
  
  console.log("DEBUG DATA UNPACKED:", JSON.stringify(data));

  // Formatear items de manera segura
  let itemsFormatted = "";
  let itemsArray = [];
  
  const itemsSource = data.items || data.productos || [];
  if (itemsSource) {
    if (Array.isArray(itemsSource)) {
      itemsArray = itemsSource;
    } else if (typeof itemsSource === 'string') {
      try {
        itemsArray = JSON.parse(itemsSource);
      } catch (e) {
        itemsFormatted = itemsSource;
      }
    }
  }

  if (itemsArray.length > 0) {
    itemsFormatted = itemsArray.map(function(it) {
      const qty = it.qty || it.cant || 1;
      const name = it.name || it.nom || 'Producto';
      return `${name} x${qty}`; 
    }).join(", ");
  } else if (!itemsFormatted) {
    itemsFormatted = "S/P";
  }

  // ESTRATEGIA DE DETECCIÓN DE NOMBRE (MÁXIMA PRIORIDAD)
  let cliente = "";
  
  // 1. Detección por claves prioritarias (ignorando mayúsculas/minúsculas)
  const nameKeys = ['customer', 'nombre', 'cliente', 'client', 'name', 'usuario'];
  for (let key in data) {
    if (nameKeys.includes(key.toLowerCase())) {
      cliente = String(data[key]).trim();
      if (cliente) break;
    }
  }

  // 2. Detección por fuerza bruta (si sigue vacío)
  if (!cliente) {
    for (let key in data) {
      const val = data[key];
      const lowerKey = key.toLowerCase();
      // Si el valor es texto, tiene longitud coherente y la clave no es técnica...
      if (typeof val === 'string' && val.length > 1 && 
          !['address', 'phone', 'direc', 'tel', 'whatsapp', 'total', 'items', 'action'].some(k => lowerKey.includes(k))) {
        cliente = val;
        break;
      }
    }
  }

  // 3. Fallback final + MARCADOR DE VERSIÓN PARA DEPUREACIÓN
  if (!cliente) {
    cliente = "Cliente (ver WhatsApp)";
  }
  
  // LIMPIEZA: No añadir prefijos de versión al nombre
  cliente = (cliente || "Cliente (vía WhatsApp)").trim();

  // El nombre limpio ya está en la variable cliente

  const tel = (data.phone || data.whatsapp || data.telefono || data.tel || 'S/T').toString().trim();
  const dir = (data.address || data.direccion || data.dir || 'S/D').toString().trim();
  const total = parseFloat(data.total) || 0;

  // LOG de depuración interna
  console.log('Procesando pedido de:', cliente, 'Tel:', tel);

  if (!cliente || cliente === '') {
    // Fallback de última instancia
    const fallbackName = 'Cliente_' + orderId;
    return registerOrder(orderId, fallbackName, tel, dir, itemsFormatted, total, sheetPed);
  }

  // ALINEACIÓN ESTRICTA 9 COLUMNAS (Exacto a tu captura de pantalla)
  // A:ID, B:Cliente, C:WhatsApp, D:Dir, E:Resumen, F:Gap, G:Total, H:Fecha, I:Estado
  sheetPed.appendRow([
    orderId,        // A
    cliente,        // B
    tel,            // C
    dir,            // D
    itemsFormatted, // E
    "",             // F (Gap column detectada en foto)
    total,          // G
    new Date(),     // H
    'Pendiente'     // I
  ]);

  // Descontar Stock
  let sheetProd = ss.getSheetByName('Productos');
  if (sheetProd && order.items && Array.isArray(order.items)) {
    const prodData = sheetProd.getDataRange().getValues();
    const headers = prodData[0];
    const idIdx = headers.indexOf('id');
    const stockIdx = headers.indexOf('stock');

    if (idIdx !== -1 && stockIdx !== -1) {
      order.items.forEach(function(item) {
        for (let i = 1; i < prodData.length; i++) {
          if (String(prodData[i][idIdx]) === String(item.id)) { 
            const currentStock = Number(prodData[i][stockIdx]) || 0;
            const newStock = Math.max(0, currentStock - Number(item.qty));
            sheetProd.getRange(i + 1, stockIdx + 1).setValue(newStock);
            break;
          }
        }
      });
    }
  }

  return { 
    success: true, 
    orderId: orderId, 
    customer: cliente,
    server_version: GS_VERSION 
  };
}

function deleteOrder(orderId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Pedidos');
    if (!sheet) return { success: false, error: 'No existe hoja de pedidos' };
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const normHeaders = headers.map(h => h.toString().toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, ''));
    
    const idColIdx = normHeaders.findIndex(h => h === 'idpedido' || h === 'id' || h === 'nro' || h === 'pedido');
    
    if (idColIdx === -1) return { success: false, error: 'Columna ID no encontrada' };
    
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idColIdx]).trim() === String(orderId).trim()) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) return { success: false, error: 'Pedido no encontrado' };
    
    sheet.deleteRow(rowIndex);
    return { success: true };
  } catch (err) {
    console.error('Error en deleteOrder:', err);
    return { success: false, error: err.toString() };
  }
}



function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Función auxiliar para registrar pedidos de forma consistente (Fallback)
function registerOrder(id, name, tel, dir, items, total, sheet) {
  // A:ID, B:Cliente, C:WhatsApp, D:Dir, E:Resumen, F:Gap, G:Total, H:Fecha, I:Estado
  sheet.appendRow([id, "[v3.2] " + name, tel, dir, items, "", total, new Date(), 'Pendiente']);
  return { success: true, orderId: id, customer: name };
}

// Auxiliar para Admin
function getV(obj, tags) {
  if (!obj) return '---';
  for (let tag of tags) {
    if (obj[tag] !== undefined && obj[tag] !== null) return obj[tag];
  }
  return '---';
}

function getServerStatus() {
  return { 
    success: true, 
    version: GS_VERSION,
    status: "NUCLEAR-READY"
  };
}
