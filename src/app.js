const express = require('express');
const existService = require('./services/existService');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: './config/entorno.env' });

const app = express();
const multer = require('multer');

// Configuración de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Normalizar texto (Primera letra mayúscula, resto minúscula)
const normalizar = (txt) => {
    if (!txt) return '';
    const t = txt.trim();
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

// Función auxiliar para borrar imágenes físicas
async function borrarImagenFisica(id) {
    try {
        const xml = await existService.getVehicleById(id);
        console.log(`DEBUG: XML para borrar ID ${id}:`, xml);
        // Regex mejorada para ignorar espacios y namespaces si los hay
        const match = xml.match(/<imagen[^>]*>(.*?)<\/imagen>/);
        if (match && match[1]) {
            const filename = match[1].trim();
            if (filename) {
                const filePath = path.join(__dirname, '../public/uploads', filename);
                console.log(`DEBUG: Intentando borrar archivo: ${filePath}`);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`DEBUG: Archivo borrado con éxito.`);
                } else {
                    console.log(`DEBUG: El archivo no existe en la ruta: ${filePath}`);
                }
            }
        }
    } catch (err) {
        console.error("No se pudo borrar el archivo físico:", err);
    }
}

// Dashboard: Listado de vehículos
app.get('/', async (req, res) => {
    const errorMsg = req.query.error || null;
    try {
        const brands = await existService.getBrands();
        const colors = await existService.getColors();
        const data = await existService.getAll();
        res.render('index', { data, brands, colors, error: errorMsg });
    } catch (err) {
        res.render('index', { data: null, brands: null, colors: null, error: 'Error al conectar con eXist-db: ' + err.message });
    }
});

// Endpoint API para filtros dinámicos (AJAX)
app.post('/api/filter', async (req, res) => {
    const { marca, color, min, max } = req.body;
    try {
        const filteredXml = await existService.filterVehicles(marca, color, min, max);
        res.header('Content-Type', 'application/xml');
        res.send(filteredXml);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Crear Vehículo
app.post('/add', upload.single('imagen'), async (req, res) => {
    let { marca, marca_nueva, color, color_nuevo, anio } = req.body;
    
    if (marca === 'NEW') {
        marca = normalizar(marca_nueva);
    } else {
        marca = normalizar(marca);
    }
    req.body.marca = marca;

    if (color === 'NEW') {
        color = normalizar(color_nuevo);
    } else {
        color = normalizar(color);
    }
    req.body.color = color;

    if (!/^\d{4}$/.test(anio)) {
        return res.redirect(`/?error=${encodeURIComponent("El año debe tener exactamente 4 números.")}`);
    }

    // Guardar nombre de la imagen si existe
    if (req.file) {
        req.body.imagen = req.file.filename;
    }

    try {
        await existService.addVehicle(req.body);
        res.redirect('/');
    } catch (err) {
        let message = "Error al guardar el vehículo.";
        const errorDetail = err.response ? err.response.data : err.message;

        console.error("Error al añadir:", errorDetail);
        res.redirect(`/?error=${encodeURIComponent(message)}`);
    }
});

// Editar Vehículo
app.post('/edit/:id', upload.single('imagen'), async (req, res) => {
    let { marca, marca_nueva, color, color_nuevo } = req.body;
    
    if (marca === 'NEW') {
        marca = normalizar(marca_nueva);
    } else {
        marca = normalizar(marca);
    }
    req.body.marca = marca;

    if (color === 'NEW') {
        color = normalizar(color_nuevo);
    } else {
        color = normalizar(color);
    }
    req.body.color = color;

    try {
        // Obtener datos actuales para no perder la imagen si no se sube una nueva
        const xmlActual = await existService.getVehicleById(req.params.id);
        console.log(`DEBUG: XML actual para editar:`, xmlActual);
        const matchImagen = xmlActual.match(/<imagen[^>]*>(.*?)<\/imagen>/);
        let imagenAnterior = (matchImagen && matchImagen[1]) ? matchImagen[1].trim() : '';

        if (req.file) {
            // Si hay nueva imagen, borramos la física anterior
            if (imagenAnterior) {
                const filePath = path.join(__dirname, '../public/uploads', imagenAnterior);
                console.log(`DEBUG: Borrando imagen anterior por edición: ${filePath}`);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            req.body.imagen = req.file.filename;
        } else {
            req.body.imagen = imagenAnterior;
        }

        await existService.updateVehicle(req.params.id, req.body);
        res.redirect('/');
    } catch (err) {
        console.error("Error al editar:", err.response ? err.response.data : err.message);
        res.redirect(`/?error=${encodeURIComponent("Error al actualizar el vehículo.")}`);
    }
});

// Eliminar Vehículo
app.get('/delete/:id', async (req, res) => {
    try {
        // Borrar imagen física antes de borrar el registro XML
        await borrarImagenFisica(req.params.id);
        await existService.deleteVehicle(req.params.id);
        res.redirect('/');
    } catch (err) {
        console.error("Error al eliminar:", err.response ? err.response.data : err.message);
        res.status(500).send("Error al eliminar: " + (err.response ? err.response.statusText : err.message));
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor experto en el puerto ${PORT}`));