const axios = require('axios');
require('dotenv').config();

const auth = { //  Inserta automáticamente el usuario y contraseña en cada petición.
    username: process.env.EXISTDB_USER,
    password: process.env.EXISTDB_PASS
};

const client = axios.create({
    baseURL: process.env.EXISTDB_URL,
    auth: auth,
    headers: { 'Content-Type': 'application/xml' }
});

// Función auxiliar para envolver las peticiones XQuery en el formato XML esperado por eXist-db
const executeXQuery = async (xquery) => {
    const xmlBody = `
        <exist:query xmlns:exist="http://exist.sourceforge.net/NS/exist">
            <exist:text><![CDATA[${xquery}]]></exist:text>
        </exist:query>
    `;
    const response = await client.post('/', xmlBody);
    return response.data;
};

const existService = {
    // Obtener todos los vehículos
    getAll: async () => {
        const response = await client.get('/vehiculos.xml');
        return response.data;
    },

    // Create: Añadir un nuevo vehículo
    addVehicle: async (v) => {
        const xquery = `
            xquery version "3.1";
            update insert 
            <vehiculo id="${v.id}">
                <marca>${v.marca}</marca>
                <modelo>${v.modelo}</modelo>
                <anio>${v.anio}</anio>
                <precio>${v.precio}</precio>
                <tipo_motor>${v.tipo_motor}</tipo_motor>
            </vehiculo>
            into doc("/db/apps/vehiculos.xml")/vehiculos
        `;
        return await executeXQuery(xquery);
    },

    // Update: Usando XQuery Update Facility
    updateVehicle: async (id, data) => {
        const xquery = `
            xquery version "3.1";
            update replace doc("/db/apps/vehiculos.xml")//vehiculo[@id='${id}']
            with 
            <vehiculo id="${id}">
                <marca>${data.marca}</marca>
                <modelo>${data.modelo}</modelo>
                <anio>${data.anio}</anio>
                <precio>${data.precio}</precio>
                <tipo_motor>${data.tipo_motor}</tipo_motor>
            </vehiculo>
        `;
        return await executeXQuery(xquery);
    },

    // Delete: Eliminar por ID
    deleteVehicle: async (id) => {
        const xquery = `
            xquery version "3.1";
            update delete doc("/db/apps/vehiculos.xml")//vehiculo[@id='${id}']
        `;
        return await executeXQuery(xquery);
    },

    // Consultas XQuery Complejas: Filtro por Marca y Precio
    filterVehicles: async (marca, minPrecio, maxPrecio) => {
        const min = minPrecio ? Number(minPrecio) : 0;
        const max = maxPrecio ? Number(maxPrecio) : 9999999;
        
        const xquery = `
            xquery version "3.1";
            <resultados>
            {
                for $v in doc("/db/apps/vehiculos.xml")//vehiculo
                where (string-length("${marca || ''}") = 0 or contains(lower-case($v/marca), lower-case("${marca || ''}")))
                    and number($v/precio) >= ${min} 
                    and number($v/precio) <= ${max}
                return $v
            }
            </resultados>
        `;
        return await executeXQuery(xquery);
    }
};

module.exports = existService;