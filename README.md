# 🚗 Vehicle Manager  - Gestión de Vehículos

Sistema de gestión de inventario de vehículos desarrollado con **Node.js** y **eXist-db**.

## 🌟 Funcionalidades
- **CRUD Completo**: Gestión de vehículos (Crear, Leer, Actualizar, Borrar).
- **Base de Datos XML**: Almacenamiento persistente en eXist-db mediante **XQuery**.
- **Filtrado Avanzado**: Búsqueda dinámica por marca, color y rango de precios.
- **Gestión de Imágenes**: Subida de archivos con **Multer** y limpieza automática del disco al eliminar registros.
- **Normalización**: Control de duplicados en categorías (marcas/colores) mediante estandarización de texto.

## 🛠️ Tecnologías y Librerías
- **Express**: Framework web para la gestión de rutas y middleware.
- **Axios**: Cliente HTTP para realizar peticiones REST a eXist-db.
- **Multer**: Middleware para la subida y gestión de imágenes.
- **EJS**: Motor de plantillas para renderizar las vistas dinámicamente.
- **Dotenv**: Gestión de variables de entorno seguras.

## 📁 Estructura del Código
- **`src/app.js`**: Núcleo del servidor, definición de rutas y lógica de negocio.
- **`src/services/existService.js`**: Servicio de comunicación con eXist-db (Consultas XQuery).
- **`src/views/index.ejs`**: Interfaz de usuario dinámica.
- **`config/entorno.env`**: Configuración de variables de entorno (URL, Credenciales).
- **`public/`**: Recursos estáticos (CSS, Imágenes subidas).

## 🚀 Inicio Rápido
1. Configura tu conexión en `config/entorno.env`.
2. Instala dependencias: `npm install`.
3. Ejecuta el servidor: `npm start` o `node src/app.js`.
