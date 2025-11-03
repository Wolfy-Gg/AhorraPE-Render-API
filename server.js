const express = require('express');
const { Pool } = require('pg'); 
const bcrypt = require('bcrypt'); // Librería para hashear contraseñas
const cors = require('cors'); // Middleware para permitir peticiones desde orígenes cruzados

const app = express();
// El puerto es asignado por el entorno (como Render) o usa 10000 por defecto
const PORT = process.env.PORT || 10000;

// Configuración de la Conexión a PostgreSQL
const pool = new Pool({
    user: 'ahorrape_db_user', 
    host: 'dpg-d43lkjgdl3ps73a2b0d0-a.virginia-postgres.render.com',      
    database: 'ahorrape_db',         
    password: 'j38kzLisZsCYVs6oFFu72l9zeWSIUJvY', 
    port: 5432, 
    // Necesario para conexiones seguras con PostgreSQL en Render
    ssl: {
        rejectUnauthorized: false 
    }
});

// Middlewares
app.use(cors()); // Habilita CORS
app.use(express.json()); // Habilita el parsing del cuerpo de la solicitud como JSON

// ----------------------------------------------------
// Ruta Raíz: Diagnóstico
// ----------------------------------------------------
app.get('/', (req, res) => {
    res.json({
        status: "Running",
        mensaje: "Bienvenido a la API AhorraPE. Rutas disponibles: /status, /registro (POST), /login (POST)."
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
        // Hashear la contraseña antes de guardarla
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(contrasena, saltRounds);

        // Consulta de inserción de un nuevo usuario
        const query = `
            INSERT INTO usuarios (
                dni, nombre, apellido, email, password_hash, 
                fecha_nacimiento, sexo, id_distrito, id_moneda,
                pref_idioma, pref_tema, pref_notificaciones, google_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id_usuario;
        `;
        
        // Valores con los datos del usuario y valores por defecto
        const values = [
            dni, nombre, apellido, email, passwordHash,
            fecha_nacimiento, sexo, id_distrito, id_moneda,
            'es', 'Claro', true, null 
        ];

        const result = await pool.query(query, values);

        // Respuesta de éxito
        res.status(201).json({
            status: 201,
            mensaje: "Usuario registrado exitosamente.",
            usuario_id: result.rows[0].id_usuario
        });

    } catch (err) {
        console.error('Error durante el registro:', err);

        // Código de error 23505 indica una violación de restricción única (duplicidad de DNI o Email)
        if (err.code === '23505') {
            return res.status(409).json({ 
                status: 409, 
                mensaje: "Error de duplicidad: El DNI o el Email ya están registrados.",
                error: err.detail
            });
        }
        
        // Manejo de error genérico del servidor
        res.status(500).json({ 
            status: 500, 
            mensaje: "Error interno del servidor.", 
            error: err.message 
        });
    }
});

// ----------------------------------------------------
// Endpoint de Inicio de Sesión: POST /login
// ----------------------------------------------------
app.post('/login', async (req, res) => {
    const { email, contrasena } = req.body;

    if (!email || !contrasena) {
        // Solicitud inválida
        return res.status(400).json({ exito: false, error: "Faltan campos: email y contrasena son requeridos." });
    }

    try {
        // Buscar al usuario por email para obtener su hash de contraseña
        const userQuery = `
            SELECT id_usuario, nombre, email, password_hash
            FROM usuarios
            WHERE email = $1;
        `;
        const result = await pool.query(userQuery, [email]);

        if (result.rows.length === 0) {
            // Usuario no encontrado (devolvemos 200 para evitar dar pistas sobre si el email existe)
            return res.status(200).json({ exito: false, error: "Email o contraseña incorrectos." });
        }

        const user = result.rows[0];
        const passwordHash = user.password_hash;

        // Comparar la contraseña ingresada con el hash guardado
        const match = await bcrypt.compare(contrasena, passwordHash);

        if (match) {
            // Credenciales válidas: Login Exitoso
            return res.status(200).json({
                exito: true,
                mensaje: "Inicio de sesión exitoso.",
                id_usuario: user.id_usuario, // Formato snake_case para compatibilidad con el backend
                nombre_usuario: user.nombre
            });
        } else {
            // Contraseña incorrecta
            return res.status(200).json({ exito: false, error: "Email o contraseña incorrectos." });
        }

    } catch (err) {
        console.error('Error durante el login:', err);
        // Error interno del servidor (por ejemplo, base de datos no disponible)
        res.status(500).json({ 
            exito: false, 
            error: "Error interno del servidor al intentar iniciar sesión.", 
            detail: err.message 
        });
    }
});


// ----------------------------------------------------
// Iniciamos el servidor
// ----------------------------------------------------
// Inicia el servidor escuchando en 0.0.0.0 (requerido por algunos entornos de hosting)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Express escuchando en http://0.0.0.0:${PORT}`);
});
