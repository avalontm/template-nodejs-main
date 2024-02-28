const express = require('express');
var pg = require('pg');
var bodyParser = require('body-parser')
const crypto = require('crypto');

const app = express();
const port = process.env.PORT ? process.env.PORT : 3000;

const dbConfig = {
  host: 'ep-solitary-glade-a5y52u8p.us-east-2.aws.neon.fl0.io',
  port: 5432,
  database: 'database',
  user: 'fl0user',
  password: 'Gd1u4tTlpBNg',
  ssl: true,
};

const auth = async (req, res, next) => {
  const apiKey = req.headers['api-key'];
  var user = null;

  if (!apiKey) {
    return res.status(401).json({ status: false, message: 'Falta clave API' });
  }

  try {
    user = await validateApiKey(apiKey); 
    if (!user) {
      return res.status(401).json({ status: false, message: 'Clave API no válida' });
    }
  } catch (error) {
    console.error('Error al validar la clave API:', error.message);
    return res.status(500).json({ status: false, message: 'Error Interno del Servidor' });
  }

  req.user = user; 
  next();
};


const pgClient = new pg.Client(dbConfig);

pgClient.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.stack);
  } else {
    console.log('Conectado a la base de datos PostgreSQL');
  }
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

async function validateApiKey(apiKey) {
  try {
    // Consultar la tabla "acceso" por la API key
    const result = await pgClient.query(`
    SELECT u.*
    FROM usuarios AS u
    INNER JOIN accesos AS a ON u.id = a.usuario_id
    WHERE a.api_key = $1;
  `, [apiKey]);

    // Check for invalid API key
    if (result.rows.length === 0) {
      return null;
    }

    // Return the complete user object
    return result.rows[0];
  } catch (error) {
    console.error('Error al validar la clave API:', error.stack);
    throw error; // Handle error appropriately
  }
}

function generarApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

function generarToken() {
  return crypto.randomBytes(16).toString('hex');
}

app.post('/api/acceso/crear_tabla', auth, (req, res) => {
  // Create the authorization table only if the user is authorized
  pgClient.query(`
    CREATE TABLE IF NOT EXISTS accesos (
      id SERIAL PRIMARY KEY,
      usuario_id INT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
      api_key VARCHAR(255) NOT NULL UNIQUE,
      acceso_level INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `, (err) => {
    if (err) {
      console.error('Error al crear la tabla:', err.stack);
      res.status(500).json({ status: false, message: 'Error al crear la tabla' });
    } else {
      console.log('Tabla autorizacion creada correctamente');
      res.status(201).json({ status: true, message: 'Tabla autorizacion creada correctamente' });
    }
  });
});

app.post('/api/acceso/crear', auth, (req, res) => {

  const { usuario_id, acceso_level } = req.body;

  if (!usuario_id || !acceso_level) {
    return res.status(400).json({ status: false, message: 'Faltan campos obligatorios: usuario_id, acceso_level'});
  }

  const apikey = generarApiKey();

  const sql = `
    INSERT INTO accesos (usuario_id, api_key, acceso_level)
    VALUES ($1, $2, $3 )
    RETURNING id, api_key;
  `;

  pgClient.query(sql, [usuario_id, apikey, acceso_level], (err, result) => {
    if (err) {
      console.error('Error al crear el acceso:', err.stack);
      res.status(500).json({ message: 'Error al crear el acceso' });
    } else {
      console.log('Acceso creado correctamente:', result.rows[0]);
      res.status(201).json({ status: true, message: 'Acceso creado correctamente', ...result.rows[0] });
    }
  });
});

app.post('/api/usuarios/crear_tabla', auth, (req, res) => {

  const sql = `
    CREATE TABLE usuarios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      contrasena VARCHAR(255) NOT NULL
    );
  `;

  pgClient.query(sql, (err) => {
    if (err) {
      console.error('Error al crear la tabla:', err.stack);
      res.status(500).json({status: false,  message: 'Error al crear la tabla' });
    } else {
      console.log('Tabla usuarios creada correctamente');
      res.status(201).json({status: true,  message: 'Tabla usuarios creada correctamente' });
    }
  });
});

app.post('/api/cursos/del_tabla', auth, (req, res) => {
  const sql = `DROP TABLE cursos;`;

  pgClient.query(sql, (err) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({status: false,  message: err.message });
    } else {
      console.log("Tabla eliminada exitosamente!");
      res.status(201).json({status: true,  message: 'Tabla eliminada exitosamente!' });
    }
  });
});

app.post('/api/cursos/crear_tabla', auth, (req, res) => {

  const sql = `
    CREATE TABLE cursos (
      id SERIAL PRIMARY KEY,
      curso_id VARCHAR(10) NOT NULL,
      usuario_id INT NOT NULL,
      token VARCHAR(32) NOT NULL,
      completado BOOLEAN DEFAULT FALSE
    );
  `;

  pgClient.query(sql, (err) => {
    if (err) {
      console.error('Error al crear la tabla:', err.stack);
      res.status(500).json({status: false,  message: 'Error al crear la tabla' });
    } else {
      console.log('Tabla cursos creada correctamente');
      res.status(201).json({status: true,  message: 'Tabla cursos creada correctamente' });
    }
  });
});

// Login route
app.post('/api/login', (req, res) => {
  const { email, contrasena } = req.body;

  if (!email || !contrasena) {
    return res.status(400).json({status: false,  message: 'Faltan campos obligatorios: correo electrónico y contraseña'});
  }

  pgClient.query('SELECT u.id, u.nombre, u.email, u.contrasena, a.api_key FROM usuarios AS u LEFT JOIN accesos AS a ON u.id = a.usuario_id WHERE u.email = $1', [email], (err, result) => {
    if (err) {
      console.error('Error al obtener el usuario:', err.stack);
      res.status(500).json({status: false,  message: 'Error al obtener el usuario' });
    } else if (result.rows.length === 0) {
      res.status(404).json({status: false,  message: 'Email incorrecto.' });
    } else {

      var user =  result.rows[0];

      if(user.contrasena == contrasena)
      {
        res.json(user);
      }else
      {
        res.status(404).json({status: false,  message: 'Contraseña incorrecta.' });
      }
    }
  });
});


/* ============================================================================== */
/* ========================        USUARIOS     ================================= */
/* ============================================================================== */

app.post('/api/usuarios', auth, (req, res) => {

  const { nombre, email, contrasena } = req.body;

  if (!nombre || !email || !contrasena) {
    return res.status(400).json({status: false,  message: 'Faltan campos obligatorios: nombre, email, contrasena'});
  }

  pgClient.query('INSERT INTO usuarios (nombre, email, contrasena) VALUES ($1, $2, $3)', [nombre, email, contrasena], (err, result) => {
    if (err) {
      console.error('Error al crear el usuario:', err.stack);
      res.status(500).json({status: false,  message: 'Error al crear el usuario' });
    } else {
      res.status(201).json({status: true,  message: 'Usuario creado correctamente' });
    }
  });
});

app.get('/api/usuarios', auth, (req, res) => {
  pgClient.query('SELECT id, nombre, email, contrasena FROM usuarios', (err, result) => {
    if (err) {
      console.error('Error al obtener los usuarios:', err.stack);
      res.status(500).json({status: false, message: 'Error al obtener los usuarios' });
    } else {
      res.json(result.rows);
    }
  });
});

app.get('/api/usuarios/:id', auth, (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({ status: false, message: 'Faltan campos obligatorios: id'});
  }

  pgClient.query('SELECT id, nombre, email FROM usuarios WHERE id = $1', [id], (err, result) => {
    if (err) {
      console.error('Error al obtener el usuario:', err.stack);
      res.status(500).json({ status: false, message: 'Error al obtener el usuario' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ status: false, message: 'Usuario no encontrado' });
    } else {
      res.json(result.rows[0]);
    }
  });
});

app.put('/api/usuarios/:id', auth, (req, res) => {
  const id = req.params.id;
  const { nombre, contrasena } = req.body;

  if (!nombre || !contrasena) {
    return res.status(400).json({status: false,  message: 'Faltan campos obligatorios: nombre, contrasena'});
  }

  pgClient.query('UPDATE usuarios SET nombre = $1, contrasena = $2 WHERE id = $3', [nombre, contrasena, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar el usuario:', err.stack);
      res.status(500).json({status: false,  message: 'Error al actualizar el usuario' });
    } else if (result.rowCount === 0) {
      res.status(404).json({status: false,  message: 'Usuario no encontrado' });
    } else {
      res.json({status: true,  message: 'Usuario actualizado correctamente' });
    }
  });
});

app.delete('/api/usuarios/:id', auth, (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({status: false,  message: 'Faltan campos obligatorios: id'});
  }

  pgClient.query('DELETE FROM usuarios WHERE id = $1', [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar el usuario:', err.stack);
      res.status(500).json({status: false, message: 'Error al eliminar el usuario' });
    } else if (result.rowCount === 0) {
      res.status(404).json({status: false, message: 'Usuario no encontrado' });
    } else {
      res.status(200).json({status: true, message: 'Usuario eliminado correctamente' });
    }
  });
});

/* ======================================================================================== */
/* SECCION DE CURSOS */
/* ======================================================================================== */

app.post('/api/cursos/crear', (req, res) => {

  const { curso_id } = req.body;
  let count = 0;

  if (!curso_id ) {
    return res.status(400).json({ status: false, message: 'Faltan campos obligatorios: curso_id'});
  }

  //Asignamos el curso a cada uno de los usuarios.
  pgClient.query('SELECT * FROM usuarios', (err, result) => {
    if (err) {
      console.error('Error al obtener los usuarios:', err.stack);
      res.status(500).json({ status: false, message: 'Error al obtener los usuarios' });
    } else {
      console.log('Generar cursos para los usuarios');

      result.rows.forEach((usuario) => {
        const token = generarToken();
        console.log(`token: ${token} | usaurio: ${usuario.nombre}`);

        pgClient.query('INSERT INTO cursos (curso_id, usuario_id, token, completado) VALUES ($1, $2, $3, FALSE)', [curso_id, usuario.id, token], (err2, result2) => {
          if (err2) {
            console.error('Error al crear el curso:', err2.stack);
            res.status(500).json({ status: false, message: 'Error al crear el curso' });
            } else {
              count++;
              console.log(`curso creado para el usaurio: ${usuario.nombre} | contador: ${count}`);
            }
          });
      
      });

      res.status(200).json({ status: true, message: `Curso creado correctamente: ${count} usuarios.`});
    }

  });
});

app.get('/api/cursos/:id', auth, (req, res) => {
  const curso_id = req.params.id;
  const { id } = req.user; 

  const sql = `
    SELECT curso_id, usuario_id, token, completado FROM cursos WHERE curso_id = $1 AND usuario_id = $2;
  `;

  pgClient.query(sql, [curso_id, id], (err, result) => {
    if (err) {
      console.error('Error al obtener los cursos:', err.stack);
      res.status(500).json({ message: 'Error al obtener los cursos' });
    } else {
      console.log('Cursos encontrados:', result.rows);
      res.status(200).json({ cursos: result.rows });
    }
  });
});


app.get('/api/cursos', auth, (req, res) => {
  const { id } = req.user; 

  const sql = `
    SELECT curso_id, usuario_id, completado FROM cursos WHERE usuario_id = $1;
  `;

  pgClient.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al obtener los cursos:', err.stack);
      res.status(500).json({ message: 'Error al obtener los cursos' });
    } else {
      console.log('Cursos encontrados:', result.rows);
      res.status(200).json({ cursos: result.rows });
    }
  });
});

app.post('/api/cursos/completar', auth, (req, res) => {
  const { id } = req.user; 
  const { curso_id, token } = req.body;

  if (!id || !curso_id || !token) {
    return res.status(400).json({ status: false, message: 'Faltan campos obligatorios: curso_id, token' });
  }

  const sql = `
    SELECT * FROM cursos
    WHERE curso_id = $1 AND usuario_id = $2;
  `;

  pgClient.query(sql, [curso_id, id], (err, result) => {
    if (err) {
      console.error('Error al obtener el curso:', err.stack);
      res.status(500).json({ status: false, message: 'Error al obtener el curso' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ status: false, message: 'Curso no encontrado o usuario no inscrito' });
    } else {
      const curso = result.rows[0];
      const tokenValido = curso.token === token;

      if (!tokenValido) {
        return res.status(401).json({ status: false, message: 'El token del curso es inválido' });
      }

      const sqlUpdate = `
        UPDATE cursos
        SET completado = TRUE
        WHERE curso_id = $1 AND usuario_id = $2;
      `;

      pgClient.query(sqlUpdate, [curso_id, id], (err) => {
        if (err) {
          console.error('Error al completar el curso:', err.stack);
          res.status(500).json({ status: false, message: 'Error al completar el curso' });
        } else {

          var curso = result.rows[0];
          if(curso.completado == true)
          {
            console.log('Este curso ya esta completado');
            res.status(200).json({ status: true, message: 'Este curso ya ha sido completado.' });
          }
          else
          {
            console.log('Curso completado correctamente');
            res.status(200).json({ status: true, message: 'Has completado el curso exitosamente' });
          }
        }
      });
    }
  });
});


app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
