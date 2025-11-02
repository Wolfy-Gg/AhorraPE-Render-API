const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');

// 1. CONFIGURACIÓN DE LA CONEXIÓN A POSTGRESQL
const connectionString = "postgresql://ahorrape_db_user:j38kzLisZsCYVs6oFFu72l9zeWSIUJvY@dpg-d43lkjgdl3ps73a2b0d0-a.virginia-postgres.render.com/ahorrape_db"; 
const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// ====================================================
// RUTAS DE LA A P I
// ====================================================

// RUTA DE PRUEBA DE RAÍZ (NUEVA): Si accedes a la URL base, obtendrás este mensaje.
app.get('/', (req, res) => {
    res.json({
        status: "Running",
        mensaje: "Bienvenido a la API AhorraPE. Rutas disponibles: /status, /registro (POST)."
    });
});

// Endpoint de Estado (GET /status)
app.get('/status', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: "OK", mensaje: "API AhorraPE y DB están accesibles." });
    } catch (error) {
        res.status(500).json({ status: "Error", mensaje: "La API funciona, pero la base de datos no es accesible." });
    }
});


// Endpoint de REGISTRO DE USUARIOS (POST /registro)
app.post('/registro', async (req, res) => {
    const { 
        dni, nombre, apellido, fecha_nacimiento, sexo, 
        email, contrasena, id_distrito, id_moneda 
    } = req.body;

    if (!nombre || !apellido || !email || !contrasena || !id_moneda) {
        return res.status(400).json({
            status: 400,
            mensaje: "Faltan campos obligatorios."
        });
    }

    try {
        const passwordHash = await bcrypt.hash(contrasena, 10);

        const queryText = `
            INSERT INTO usuarios (
                dni, nombre, apellido, email, password_hash, 
                fecha_nacimiento, sexo, id_distrito, id_moneda,
                pref_idioma, pref_tema, pref_notificaciones, pref_ubicacion
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id_usuario; 
        `;
        
        const values = [
            dni, nombre, apellido, email, passwordHash,
            fecha_nacimiento, sexo, id_distrito, id_moneda,
            'es', 'claro', true, null
        ];

        const result = await pool.query(queryText, values);
        
        res.status(201).json({
            status: 201,
            mensaje: "Usuario registrado exitosamente.",
            usuario_id: result.rows[0].id_usuario
        });

    } catch (error) {
        console.error('Error al procesar el registro:', error);
        
        if (error.code === '23505') { 
            return res.status(400).json({
                status: 400,
                mensaje: "Error en el registro.",
                error: "El DNI o el Email ya están registrados."
            });
        }
        if (error.code === '23503') {
            return res.status(400).json({
                status: 400,
                mensaje: "Error de clave foránea.",
                error: "El ID de moneda o distrito proporcionado no existe."
            });
        }

        res.status(500).json({
            status: 500,
            mensaje: "Error interno del servidor.",
            error: error.message
        });
    }
});


// Middleware para capturar rutas no definidas (404)
app.use((req, res) => {
    res.status(404).json({
        status: 404,
        mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    });
});


app.listen(PORT, () => {
    console.log(`Servidor Express escuchando en el puerto ${PORT}`);
});


