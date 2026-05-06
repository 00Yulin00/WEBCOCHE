const axios = require('axios');
require('dotenv').config({ path: './config/entorno.env' });

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
        const xquery = `
            xquery version "3.1";
            <vehiculos>
            {
                for $v in doc("/db/apps/vehiculos.xml")//vehiculo
                order by replace($v/@id, '[0-9]', ''), number(replace($v/@id, '[^0-9]', ''))
                return $v
            }
            </vehiculos>
        `;
        return await executeXQuery(xquery);
    },
    // Obtener un solo vehículo por ID
    getVehicleById: async (id) => {
        const xquery = `
            xquery version "3.1";
            doc("/db/apps/vehiculos.xml")//vehiculo[@id='${id}']
        `;
        return await executeXQuery(xquery);
    },
    // Obtener marcas únicas
    getBrands: async () => {
        const xquery = `
            xquery version "3.1";
            <marcas>
            {
                for $m in distinct-values(doc("/db/apps/vehiculos.xml")//marca)
                order by $m
                return <marca>{$m}</marca>
            }
            </marcas>
        `;
        return await executeXQuery(xquery);
    },
    // Obtener colores únicos
    getColors: async () => {
        const xquery = `
            xquery version "3.1";
            <colores>
            {
                for $c in distinct-values(doc("/db/apps/vehiculos.xml")//color)
                order by $c
                return <color>{$c}</color>
            }
            </colores>
        `;
        return await executeXQuery(xquery);
    },

    // Create: Añadir un nuevo vehículo
    addVehicle: async (v) => {
        const xquery = `
            xquery version "3.1";
            let $doc := doc("/db/apps/vehiculos.xml")
            let $ids := $doc//vehiculo/number(replace(@id, '[^0-9]', ''))
            let $maxId := if (exists($ids)) then max($ids) else 0
            let $newIdNum := $maxId + 1
            let $newId := concat("V", format-number($newIdNum, "000"))
            return
                if (not(matches("${v.anio}", "^[0-9]{4}$")))
                then error(xs:QName("INVALID_YEAR"), "El año debe tener 4 dígitos.")
                else update insert 
                    <vehiculo id="{$newId}">
                        <marca>${v.marca}</marca>
                        <modelo>${v.modelo}</modelo>
                        <color>${v.color || ''}</color>
                        <anio>${v.anio}</anio>
                        <precio>${v.precio}</precio>
                        <tipo_motor>${v.tipo_motor}</tipo_motor>
                        <imagen>${v.imagen || ''}</imagen>
                    </vehiculo>
                    into $doc/vehiculos
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
                <color>${data.color || ''}</color>
                <anio>${data.anio}</anio>
                <precio>${data.precio}</precio>
                <tipo_motor>${data.tipo_motor}</tipo_motor>
                <imagen>${data.imagen || ''}</imagen>
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

    // Consultas XQuery Complejas: Filtro por Marca, Color y Precio
    filterVehicles: async (marca, color, minPrecio, maxPrecio) => {
        const min = minPrecio ? Number(minPrecio) : 0;
        const max = maxPrecio ? Number(maxPrecio) : 9999999;

        const xquery = `
            xquery version "3.1";
            <resultados>
            {
                for $v in doc("/db/apps/vehiculos.xml")//vehiculo
                where (string-length("${marca || ''}") = 0 or contains(lower-case($v/marca), lower-case("${marca || ''}")))
                    and (string-length("${color || ''}") = 0 or contains(lower-case($v/color), lower-case("${color || ''}")))
                    and number($v/precio) >= ${min} 
                    and number($v/precio) <= ${max}
                order by replace($v/@id, '[0-9]', ''), number(replace($v/@id, '[^0-9]', ''))
                return $v
            }
            </resultados>
        `;
        return await executeXQuery(xquery);
    }
};

module.exports = existService;