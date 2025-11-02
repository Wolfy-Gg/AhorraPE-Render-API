const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');

// 1. CONFIGURACIÓN DE LA CONEXIÓN A POSTGRESQL (CRÍTICO)
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

// Versión: 1.4 - Integración con Interfaz (DNI, Sexo, Fecha Nacimiento)
app.post('/registro', async (req, res) => {
    // 🛑 CAMPOS DE LA INTERFAZ: Se extraen todos los campos de la pantalla.
    const { 
        dni, nombre, apellido, fecha_nacimiento, sexo, 
        email, contrasena, id_distrito, id_moneda 
    } = req.body;

    // VALIDACIÓN CRÍTICA: Los campos básicos (nombre, email, clave, moneda) son OBLIGATORIOS.
    if (!nombre || !apellido || !email || !contrasena || !id_moneda) {
        return res.status(400).json({
            status: 400,
            mensaje: "Faltan campos obligatorios: nombre, apellido, email, contrasena e id_moneda.",
            campos_faltantes: {
                nombre: !nombre,
                apellido: !apellido,
                email: !email,
                contrasena: !contrasena,
                id_moneda: !id_moneda
            }
        });
    }

    try {
        const passwordHash = await bcrypt.hash(contrasena, 10);

        // 🛑 CONSULTA ACTUALIZADA: Incluye DNI, Fecha Nacimiento y Sexo.
        const queryText = `
            INSERT INTO usuarios (
                dni, nombre, apellido, email, password_hash, 
                fecha_nacimiento, sexo, id_distrito, id_moneda
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id_usuario; 
        `;
        // Asegúrate de que los valores coincidan en orden con la consulta
        const values = [
            dni, nombre, apellido, email, passwordHash,
            fecha_nacimiento, sexo, id_distrito, id_moneda
        ];

        const result = await pool.query(queryText, values);
        
        res.status(201).json({
            status: 201,
            mensaje: "Usuario registrado exitosamente.",
            usuario_id: result.rows[0].id_usuario
        });

    } catch (error) {
        // Manejo de errores
        if (error.code === '23505') { 
            return res.status(400).json({
                status: 400,
                mens
        res.status(500).json({
            status: 500,
            mensaje: "Error interno del servidor.",
            error: error.message
        });
    }
});

// Endpoint de Estado
app.get('/status', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: "OK", mensaje: "API AhorraPE está funcionando correctamente." });
    } catch (error) {
        res.status(500).json({ status: "Error", mensaje: "La API funciona, pero la base de datos no es accesible." });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor Express escuchando en el puerto ${PORT}`);
});
```eof

---

## 2. Prueba Final en Postman con JSON Completo

Después de hacer el commit de `server.js` y esperar a que Render esté "Live", haz la prueba final.

**¡IMPORTANTE!** El JSON de prueba debe incluir **TODOS** los campos de la interfaz, incluso si envías algunos como `null` o vacíos si son opcionales.

**JSON de Prueba Requerido:**

```json
{
    "dni": "70123456",
    "nombre": "Sofia",
    "apellido": "Rios",
    "fecha_nacimiento": "1995-10-25",
    "sexo": "F",
    "email": "sofia.interfaz.final@ejemplo.com", 
    "contrasena": "MiClaveSegura123",
    "id_distrito": 1, 
    "id_moneda": 1  
}aje: "Error en el registro.",
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


