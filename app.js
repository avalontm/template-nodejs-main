const express = require('express');
var pg = require('pg');
var bodyParser = require('body-parser')
const crypto = require('crypto');

const app = express();
const port = process.env.PORT ?? 3000;

const dbConfig = {
  host: 'ep-solitary-glade-a5y52u8p.us-east-2.aws.neon.fl0.io',
  port: 5432,
  database: 'database',
  user: 'fl0user',
  password: 'Gd1u4tTlpBNg',
  ssl: true,
};

function generarToken() {
  return crypto.randomBytes(16).toString('hex');
}

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

app.post('/api/usuarios/crear_tabla', (req, res) => {

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

app.post('/api/cursos/crear_tabla', (req, res) => {

  const sql = `
    CREATE TABLE cursos (
      id SERIAL PRIMARY KEY,
      curso_id INT NOT NULL,
      usuario_id INT NOT NULL,
      token VARCHAR(255) UNIQUE NOT NULL,
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
app.post('/api/login',  (req, res) => {
  const { email, contrasena } = req.body;

  if (!email || !contrasena) {
    return res.status(400).json({status: false,  message: 'Faltan campos obligatorios: correo electrónico y contraseña'});
  }

  pgClient.query('SELECT id, nombre, email, contrasena FROM usuarios WHERE email = $1 ', [email], (err, result) => {
    if (err) {
      console.error('Error al obtener el usuario:', err.stack);
      res.status(500).json({status: false,  message: 'Error al obtener el usuario' });
    } else if (result.rows.length === 0) {
      res.status(404).json({status: false,  message: 'Email incorrecto.' });
    } else {

      var user =  result.rows[0];
      console.log(user.contrasena); 
    
      if(user.contrasena == contrasena)
      {
        res.json(user);
      }else
      {
        res.status(404).json({status: true,  message: 'Contraseña incorrecta.' });
      }
    }
  });
});


app.post('/api/usuarios', (req, res) => {

  const { nombre, email, contrasena } = req.body;

  if (!nombre || !email || !contrasena) {
    return res.status(400).json({status: false,  message: 'Faltan campos obligatorios: correo electrónico y contraseña'});
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

app.get('/api/usuarios', (req, res) => {
  pgClient.query('SELECT id, nombre, email, contrasena FROM usuarios', (err, result) => {
    if (err) {
      console.error('Error al obtener los usuarios:', err.stack);
      res.status(500).json({ message: 'Error al obtener los usuarios' });
    } else {
      res.json(result.rows);
    }
  });
});

app.get('/api/usuarios/:id', (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({ message: 'Faltan campos obligatorios: id'});
  }

  pgClient.query('SELECT id, nombre, email FROM usuarios WHERE id = $1', [id], (err, result) => {
    if (err) {
      console.error('Error al obtener el usuario:', err.stack);
      res.status(500).json({ message: 'Error al obtener el usuario' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ message: 'Usuario no encontrado' });
    } else {
      res.json(result.rows[0]);
    }
  });
});

app.put('/api/usuarios/:id', (req, res) => {
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

app.delete('/api/usuarios/:id', (req, res) => {
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

  const { curso_id, usuario_id } = req.body;

  if (!curso_id || !usuario_id) {
    return res.status(400).json({ status: false, message: 'Faltan campos obligatorios: curso_id, usuario_id'});
  }

  const token = generarToken();

  const sql = `
    INSERT INTO cursos (curso_id, usuario_id, token, completado)
    VALUES ($1, $2, $3, FALSE)
    RETURNING id, token;
  `;

  pgClient.query(sql, [curso_id, usuario_id, token], (err, result) => {
    if (err) {
      console.error('Error al crear el curso:', err.stack);
      res.status(500).json({ message: 'Error al crear el curso' });
    } else {
      console.log('Curso creado correctamente:', result.rows[0]);
      res.status(201).json({ status: true, message: 'Curso creado correctamente', ...result.rows[0] });
    }
  });
});

app.get('/api/cursos', (req, res) => {

  const sql = `
    SELECT curso_id, usuario_id, completado FROM cursos;
  `;

  pgClient.query(sql, (err, result) => {
    if (err) {
      console.error('Error al obtener los cursos:', err.stack);
      res.status(500).json({ message: 'Error al obtener los cursos' });
    } else {
      console.log('Cursos encontrados:', result.rows);
      res.status(200).json({ cursos: result.rows });
    }
  });
});

app.get('/api/cursos/usuario/:usuario_id', (req, res) => {

  const usuario_id = parseInt(req.params.usuario_id); // Ensure correct conversion

  const sql = `
    SELECT curso_id, usuario_id, completado
    FROM cursos
    WHERE usuario_id = $1;
  `;

  pgClient.query(sql, [usuario_id], (err, result) => {
    if (err) {
      console.error('Error al obtener los cursos:', err.stack);
      res.status(500).json({ message: 'Error al obtener los cursos' });
    } else {
      console.log('Cursos encontrados:', result.rows);
      res.status(200).json({ cursos: result.rows });
    }
  });
});

app.post('/api/cursos/completar', (req, res) => {

  const { curso_id, usuario_id, token } = req.body;

  if (!curso_id || !usuario_id || !token) {
    return res.status(400).json({ status: false, message: 'Faltan campos obligatorios: curso_id, usuario_id, token' });
  }

  const sql = `
    SELECT * FROM cursos
    WHERE curso_id = $1 AND usuario_id = $2;
  `;

  pgClient.query(sql, [curso_id, usuario_id], (err, result) => {
    if (err) {
      console.error('Error al obtener el curso:', err.stack);
      res.status(500).json({ status: false, message: 'Error al obtener el curso' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ status: false, message: 'Curso no encontrado o usuario no inscrito' });
    } else {
      const curso = result.rows[0];
      const tokenValido = curso.token === token;

      if (!tokenValido) {
        return res.status(401).json({ status: false, message: 'Token inválido' });
      }

      const sqlUpdate = `
        UPDATE cursos
        SET completado = TRUE
        WHERE curso_id = $1 AND usuario_id = $2;
      `;

      pgClient.query(sqlUpdate, [curso_id, usuario_id], (err) => {
        if (err) {
          console.error('Error al completar el curso:', err.stack);
          res.status(500).json({ status: false, message: 'Error al completar el curso' });
        } else {
          console.log('Curso completado correctamente');
          res.status(200).json({ status: true, message: 'Curso completado exitosamente' });
        }
      });
    }
  });
});


app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
