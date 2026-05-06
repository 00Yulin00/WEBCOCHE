const express = require('express');
const existService = require('./services/existService');
const path = require('path');
require('dotenv').config({ path: './config/entorno.env' });

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Dashboard: Listado de vehículos
app.get('/', async (req, res) => {
    const errorMsg = req.query.error || null;
    try {
        const xmlData = await existService.getAll();
        const xmlBrands = await existService.getBrands();
        res.render('index', { data: xmlData, brands: xmlBrands, error: errorMsg });
    } catch (err) {
        res.render('index', { data: null, error: 'Error al conectar con eXist-db: ' + err.message });
    }
});

// Endpoint de Filtro Complejo (POST)
app.post('/api/filter', async (req, res) => {
    const { marca, min, max } = req.body;
    try {
        const result = await existService.filterVehicles(marca, min, max);
        res.send(result); // Devuelve XML limpio filtrado
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Crear Vehículo
app.post('/add', async (req, res) => {
    let { marca, marca_nueva, anio } = req.body;
    if (marca === 'NEW') {
        marca = marca_nueva;
        req.body.marca = marca; // Actualizar el objeto para el servicio
    }
    if (!/^\d{4}$/.test(anio)) {
        return res.redirect(`/?error=${encodeURIComponent("El año debe tener exactamente 4 números.")}`);
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
app.post('/edit/:id', async (req, res) => {
    let { marca, marca_nueva, anio } = req.body;
    if (marca === 'NEW') {
        marca = marca_nueva;
        req.body.marca = marca;
    }
    try {
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
        await existService.deleteVehicle(req.params.id);
        res.redirect('/');
    } catch (err) {
        console.error("Error al eliminar:", err.response ? err.response.data : err.message);
        res.status(500).send("Error al eliminar: " + (err.response ? err.response.statusText : err.message));
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor experto en el puerto ${PORT}`));