const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');

// 1. CONFIGURACIÓN DE LA CONEXIÓN A POSTGRESQL (CRÍTICO)
// Usa la cadena de conexión de tu base de datos Render
// Ejemplo: postgresql://user:password@host:port/database
const connectionString = "postgresql://ahorrape_db_user:j38kzLisZsCYVs6oFFu72l9zeWSIUJvY@dpg-d43lkjgdl3ps73a2b0d0-a.virginia-postgres.render.com/ahorrape_db"; 
const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false // Necesario para la conexión SSL a Render
    }
});

const app = express();
const PORT = process.env.PORT || 10000; // Render usa el puerto 10000

// Middlewares
app.use(cors()); // Permite peticiones desde el frontend (Android/Web)
app.use(express.json()); // Permite que Express lea cuerpos JSON

// ====================================================
// RUTAS DE LA A P I
// ====================================================

// Versión: 1.3 - Fix de Columna 'nombre' y 'apellido'
// Endpoint para verificar el estado de la API
app.get('/status', async (req, res) => {
    try {
        await pool.query('SELECT 1'); // Prueba simple de conexión
        res.json({
            status: "OK",
            mensaje: "API AhorraPE está funcionando correctamente.",
            servicio: "Render PostgreSQL"
        });
    } catch (error) {
        console.error('Error al probar la conexión con la base de datos:', error.message);
        res.status(500).json({
            status: "Error",
            mensaje: "La API funciona, pero la base de datos no es accesible.",
            error: error.message
        });
    }
});

// ----------------------------------------------------
// RUTA PRINCIPAL: REGISTRO DE USUARIOS (POST)
// ----------------------------------------------------
app.post('/registro', async (req, res) => {
    // 🛑 CAMBIO CLAVE 1: Ahora se esperan 'nombre' y 'apellido' por separado
    const { nombre, apellido, email, contrasena, id_distrito, id_moneda } = req.body;

    // Se asume que id_distrito puede ser nulo, pero los demás no.
    if (!nombre || !apellido || !email || !contrasena || !id_moneda) {
        return res.status(400).json({
            status: 400,
            mensaje: "Faltan campos obligatorios: nombre, apellido, email, contrasena e id_moneda."
        });
    }

    try {
        // 1. Generar el Hash de la Contraseña (Seguridad)
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(contrasena, saltRounds);

        // 2. Consulta de Inserción del Usuario
        // 🛑 CAMBIO CLAVE 2: Incluimos 'nombre' y 'apellido' en la lista de columnas y valores.
        const queryText = `
            INSERT INTO usuarios (nombre, apellido, email, password_hash, id_distrito, id_moneda)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id_usuario, email; 
        `;
        // Los valores ahora coinciden con los $1, $2... en la consulta.
        const values = [nombre, apellido, email, passwordHash, id_distrito, id_moneda];

        const result = await pool.query(queryText, values);
        
        // 3. Respuesta Exitosa
        res.status(201).json({
            status: 201,
            mensaje: "Usuario registrado exitosamente.",
            usuario_id: result.rows[0].id_usuario
        });

    } catch (error) {
        console.error('Error en el registro de usuario:', error);

        // Manejo específico de error de email duplicado (PostgreSQL error code 23505)
        if (error.code === '23505') {
            return res.status(400).json({
                status: 400,
                mensaje: "Error en el registro.",
                error: "El email ya está registrado."
            });
        }
        
        // Manejo de error de clave foránea (id_moneda o id_distrito no existe) (PostgreSQL error code 23503)
        if (error.code === '23503') {
            return res.status(400).json({
                status: 400,
                mensaje: "Error de clave foránea.",
                error: "El ID de moneda o distrito proporcionado no existe."
            });
        }

        // Otro error
        res.status(500).json({
            status: 500,
            mensaje: "Error interno del servidor al intentar registrar el usuario.",
            error: error.message
        });
    }
});

// ====================================================
// INICIO DEL SERVIDOR
// ====================================================
app.listen(PORT, () => {
    console.log(`Servidor Express escuchando en el puerto ${PORT}`);
});

