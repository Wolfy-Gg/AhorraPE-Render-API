const express = require('express');
const { Pool } = require('pg'); 
const bcrypt = require('bcrypt'); // Librería para hashear contraseñas
const cors = require('cors'); // Middleware para permitir peticiones desde cualquier origen (necesario para Render)

const app = express();
// Render asignará un puerto automáticamente a través de la variable de entorno PORT
const PORT = process.env.PORT || 10000;

// Configuración de la Conexión a PostgreSQL
const pool = new Pool({
    user: 'ahorrape_db_user', 
    // Usamos el host completo para evitar ambigüedades
    host: 'dpg-d43lkjgdl3ps73a2b0d0-a.virginia-postgres.render.com',     
    database: 'ahorrape_db',         
    password: 'j38kzLisZsCYVs6oFFu72l9zeWSIUJvY', 
    port: 5432, 
    // Opción crucial para que Render se conecte de forma segura
    ssl: {
        rejectUnauthorized: false 
    }
});

// Middlewares
app.use(cors()); // Permite peticiones CORS
app.use(express.json()); // Permite parsear el cuerpo de la solicitud como JSON

// ----------------------------------------------------
// Ruta Raíz: Diagnóstico
// ----------------------------------------------------
app.get('/', (req, res) => {
    res.json({
        status: "Running",
        mensaje: "Bienvenido a la API AhorraPE. Rutas disponibles: /status, /registro (POST)."
    });
});

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
// Endpoint de Registro: POST /registro
// ----------------------------------------------------
app.post('/registro', async (req, res) => {
    const { dni, nombre, apellido, fecha_nacimiento, sexo, email, contrasena, id_distrito, id_moneda } = req.body;

    // Validación básica de campos requeridos
    if (!dni || !email || !contrasena) {
        return res.status(400).json({ status: 400, mensaje: "Faltan campos requeridos (dni, email, contrasena)." });
    }

    try {
        // 1. Hashear la contraseña con bcrypt
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(contrasena, saltRounds);

        // 2. Consulta de inserción
        const query = `
            INSERT INTO usuarios (
                dni, nombre, apellido, email, password_hash, 
                fecha_nacimiento, sexo, id_distrito, id_moneda,
                pref_idioma, pref_tema, pref_notificaciones, google_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id_usuario;
        `;
        
        // VALORES POR DEFECTO CORREGIDOS
        // CLAVE: pref_tema cambiado a 'Claro' (mayúscula inicial)
        const values = [
            dni, nombre, apellido, email, passwordHash,
            fecha_nacimiento, sexo, id_distrito, id_moneda,
            'es', 'Claro', true, null 
        ];

        const result = await pool.query(query, values);

        // 3. Respuesta de éxito
        res.status(201).json({
            status: 201,
            mensaje: "Usuario registrado exitosamente.",
            usuario_id: result.rows[0].id_usuario
        });

    } catch (err) {
        console.error('Error durante el registro:', err);

        // Manejo de error de duplicado (DNI o Email ya existe - restricción UNIQUE)
        if (err.code === '23505') {
            return res.status(409).json({ 
                status: 409, 
                mensaje: "Error de duplicidad: El DNI o el Email ya están registrados.",
                error: err.detail
            });
        }
        
        // Manejo de cualquier otro error interno (ej: violación de CHECK, como la que acabamos de corregir)
        res.status(500).json({ 
            status: 500, 
            mensaje: "Error interno del servidor.", 
            error: err.message 
        });
    }
});


// Iniciamos el servidor, forzando a escuchar en 0.0.0.0 (solución para Render)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Express escuchando en http://0.0.0.0:${PORT}`);
});

