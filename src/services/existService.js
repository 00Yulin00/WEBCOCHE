const axios = require('axios');
require('dotenv').config({ path: './config/entorno.env' });

/**
 * Configuración de autenticación para eXist-db
 */
const auth = {
    username: process.env.EXISTDB_USER,
    password: process.env.EXISTDB_PASS
};

/**
 * Cliente Axios configurado para la API REST de eXist-db
 */
const client = axios.create({
    baseURL: process.env.EXISTDB_URL,
    auth: auth,
    headers: { 'Content-Type': 'application/xml' }
});

/**
 * Función auxiliar para envolver las peticiones XQuery en el formato XML esperado por eXist-db.
 * Utiliza CDATA para proteger el código XQuery de caracteres especiales de XML.
 */
const executeXQuery = async (xquery) => {
    const xmlBody = `
        <exist:query xmlns:exist="http://exist.sourceforge.net/NS/exist">
            <exist:text><![CDATA[${xquery}]]></exist:text>
        </exist:query>
    `;
    try {
        const response = await client.post('/', xmlBody);
        return response.data;
    } catch (err) {
        if (err.response && err.response.data) {
            // Extraer el mensaje de error de eXist-db si está presente en el XML de respuesta
            const match = err.response.data.match(/<message>(.*?)<\/message>/);
            const detail = match ? match[1] : err.response.statusText;
            throw new Error(`eXist-db Error [${err.response.status}]: ${detail}`);
        }
        throw err;
    }
};

const existService = {
    /**
     * Obtiene todos los vehículos ordenados por ID (alfanumérico: V001, V002...)
     */
    getAll: async () => {
        const xquery = `
            xquery version "3.1";
            <vehiculos>
            {
                for $v in doc("/db/apps/vehiculos.xml")//vehiculo
                (: Ordenamiento lógico: extrae prefijo y valor numérico separado :)
                order by replace($v/@id, '[0-9]', ''), number(replace($v/@id, '[^0-9]', ''))
                return $v
            }
            </vehiculos>
        `;
        return await executeXQuery(xquery);
    },

    /**
     * Obtiene un vehículo específico mediante su atributo @id
     */
    getVehicleById: async (id) => {
        const xquery = `
            xquery version "3.1";
            doc("/db/apps/vehiculos.xml")//vehiculo[@id='${id}']
        `;
        return await executeXQuery(xquery);
    },

    /**
     * Obtiene la lista de marcas únicas existentes en la base de datos para los selectores
     */
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

    /**
     * Obtiene la lista de colores únicos existentes en la base de datos
     */
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

    /**
     * Añade un nuevo vehículo generando el ID automáticamente (V + autoincremento)
     */
    addVehicle: async (v) => {
        const xquery = `
            xquery version "3.1";
            let $doc := doc("/db/apps/vehiculos.xml")
            (: Buscar el ID máximo actual convirtiendo el texto en número :)
            let $ids := $doc//vehiculo/number(replace(@id, '[^0-9]', ''))
            let $maxId := if (exists($ids)) then max($ids) else 0
            let $newIdNum := $maxId + 1
            let $newId := concat("V", format-number($newIdNum, "000"))
            return
                if (not(matches("${v.anio}", "^[0-9]{4}$")))
                then error(xs:QName("INVALID_YEAR"), "El año debe tener 4 dígitos.")
                else if (number("${v.precio}") < 0)
                then error(xs:QName("INVALID_PRICE"), "El precio no puede ser negativo.")
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

    /**
     * Actualiza un vehículo reemplazando su nodo completo en el XML
     */
    updateVehicle: async (id, data) => {
        const xquery = `
            xquery version "3.1";
            let $precio := number("${data.precio}")
            return
                if ($precio < 0)
                then error(xs:QName("INVALID_PRICE"), "El precio no puede ser negativo.")
                else update replace doc("/db/apps/vehiculos.xml")//vehiculo[@id='${id}']
                with 
                <vehiculo id="${id}">
                    <marca>${data.marca}</marca>
                    <modelo>${data.modelo}</modelo>
                    <color>${data.color || ''}</color>
                    <anio>${data.anio}</anio>
                    <precio>{$precio}</precio>
                    <tipo_motor>${data.tipo_motor}</tipo_motor>
                    <imagen>${data.imagen || ''}</imagen>
                </vehiculo>
        `;
        return await executeXQuery(xquery);
    },

    /**
     * Elimina un vehículo buscando por ID
     */
    deleteVehicle: async (id) => {
        const xquery = `
            xquery version "3.1";
            update delete doc("/db/apps/vehiculos.xml")//vehiculo[@id='${id}']
        `;
        return await executeXQuery(xquery);
    },

    /**
     * Realiza búsquedas avanzadas combinando marca, color y rangos de precio
     */
    filterVehicles: async (marca, color, minPrecio, maxPrecio) => {
        // Asegurar que el precio mínimo no sea negativo
        let min = minPrecio ? Number(minPrecio) : 0;
        if (min < 0) min = 0;

        // Asegurar que el precio máximo no sea negativo y tenga un valor coherente
        let max = maxPrecio ? Number(maxPrecio) : 9999999;
        if (max < 0) max = 0;

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