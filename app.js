const express = require('express');
const existService = require('./existService');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Dashboard: Listado de vehículos
app.get('/', async (req, res) => {
    try {
        const xmlData = await existService.getAll();
        // Nota: En un entorno real, usarías un parser como xml2js 
        // Aquí pasamos el XML crudo o lo procesamos para la tabla
        res.render('index', { data: xmlData, error: null });
    } catch (err) {
        res.render('index', { data: null, error: 'Error al conectar con eXist-db' });
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
    try {
        await existService.addVehicle(req.body);
        res.redirect('/');
    } catch (err) {
        console.error("Error al añadir:", err.response ? err.response.data : err.message);
        res.status(500).send("Error al guardar: " + (err.response ? err.response.statusText : err.message));
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