# Estructura del Código: Proyecto Panadería v3.3-FINAL

## Propósito
Sistema de gestión y e-commerce artesanal para una panadería, implementado en Google Apps Script con arquitectura modular y diseño premium.

## Stack Tecnológico
- **Frontend:** HTML5, CSS3 Moderno (Variables, Flexbox, Grid), JavaScript (Vanilla ES6+).
- **Backend:** Google Apps Script (GAS).
- **Base de Datos:** Google Sheets.
- **Librerías:** SweetAlert2 (Alertas), Swiper.js (Carrusel), Cropper.js (Recorte de imágenes).

## Módulos y Archivos

### Backend
#### [Code.gs](file:///c:/Users/maxim/OneDrive/Escritorio/TANIA/Proyecto_Panaderia/Code.gs)
- **Versión:** 3.3.0-FINAL.
- **Responsabilidad:** Manejo de peticiones `doGet` y `doPost`. Conexión con Google Sheets para persistencia de Pedidos, Productos y Configuración (CMS).
- **Funciones Crave:** `saveOrder`, `syncProducts`, `saveSettings`, `getInventory`.
- **Base de Datos:** Hoja 'Pedidos' (Columnas: ID, Fecha, Cliente, Teléfono, Dirección, **Notas**, Productos, Total, Estado).

### Frontend (Modular)
#### [Index.html](file:///c:/Users/maxim/OneDrive/Escritorio/TANIA/Proyecto_Panaderia/Index.html)
- **Propósito:** Estructura base la interfaz. Carga los módulos de CSS y JS.
- **Secciones:** Header, Hero (Carrusel), Tienda, Contacto, Panel Staff (Admin), Modals.

#### [Styles.html](file:///c:/Users/maxim/OneDrive/Escritorio/TANIA/Proyecto_Panaderia/Styles.html)
- **Propósito:** Sistema de diseño premium.
- **Tokens:** Esquema de colores melocotón/salmón (`--primary`), tipografía Outfit/Playfair Display.

#### [Scripts.html](file:///c:/Users/maxim/OneDrive/Escritorio/TANIA/Proyecto_Panaderia/Scripts.html)
- **Propósito:** Lógica del cliente.
- **Funciones:** Gestión de carrito, Checkout vía WhatsApp, Panel de Administración, Integración con Apps Script vía `gsCall`.

---
Última actualización: 2026-03-15 (v3.3.0-FINAL)
