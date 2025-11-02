// Importamos las librerías necesarias
const express = require('express');
const { Pool } = require('pg'); 

const app = express();
// Render asignará un puerto automáticamente a través de la variable de entorno PORT
const port = process.env.PORT || 3000;

// Configuración de la Conexión a PostgreSQL (Tus Credenciales)
// ESTOS DATOS YA ESTÁN PERSONALIZADOS.
const pool = new Pool({
    user: 'ahorrape_db_user', 
    host: 'dpg-d43lkjgdl3ps73a2b0d0-a.virginia-postgres.render.com', // AGREGUÉ EL DOMINIO COMPLETO PARA MAYOR CLARIDAD
    database: 'ahorrape_db',         
    password: 'j38kzLisZsCYVs6oFFu72l9zeWSIUJvY', 
    port: 5432, 
    // Esta opción es crucial para que Render se conecte de forma segura
    ssl: {
        rejectUnauthorized: false 
    }
});

// Middleware para parsear JSON en las peticiones (si usas POST)
app.use(express.json());

// ----------------------------------------------------
// Endpoint de Prueba: /status
// ----------------------------------------------------
app.get('/status', (req, res) => {
    res.json({ 
        status: 'OK', 
        mensaje: 'API AhorraPE está funcionando correctamente.',
        servicio: 'Render PostgreSQL'
    });
});

// ----------------------------------------------------
// Endpoint PRINCIPAL: /monedas 
// 🛑 MODIFICADO: Ahora usa la ruta /monedas y consulta la tabla monedas.
// ----------------------------------------------------
app.get('/monedas', async (req, res) => {
    try {
        // Ejecuta la consulta SQL para la tabla 'monedas' que creaste
        const result = await pool.query('SELECT id, codigo, nombre, simbolo FROM monedas ORDER BY nombre ASC;');
        
        // Devuelve el resultado como JSON limpio
        res.json({
            status: 200,
            mensaje: 'Lista de monedas obtenida exitosamente.',
            data: result.rows 
        });

    } catch (err) {
        console.error('Error ejecutando la consulta SQL', err);
        // Si hay un error, devuelve un 500 para informar al cliente
        res.status(500).json({ 
            status: 500, 
            mensaje: 'Error interno del servidor al consultar la base de datos.',
            error: err.message
        });
    }
});

// Iniciamos el servidor
app.listen(port, () => {
    console.log(`API AhorraPE escuchando en el puerto ${port}`);
});
