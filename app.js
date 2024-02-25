const express = require('express');
const app = express();
const port = process.env.PORT ?? 3000;

const dbConfig = {
  host: 'ep-solitary-glade-a5y52u8p.us-east-2.aws.neon.fl0.io',
  port: 5432,
  database: 'database',
  user: 'fl0user',
  password: 'Gd1u4tTlpBNg',
};

const pgClient = new pg.Client(dbConfig);

pgClient.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.stack);
  } else {
    console.log('Conectado a la base de datos PostgreSQL');
  }
});

app.post('/api/usuarios', (req, res) => {
  const { nombre, email } = req.body;

  pgClient.query('INSERT INTO usuarios (nombre, email) VALUES ($1, $2)', [nombre, email], (err, result) => {
    if (err) {
      console.error('Error al crear el usuario:', err.stack);
      res.status(500).json({ error: 'Error al crear el usuario' });
    } else {
      res.status(201).json({ message: 'Usuario creado correctamente' });
    }
  });
});

app.get('/api/usuarios', (req, res) => {
  pgClient.query('SELECT * FROM usuarios', (err, result) => {
    if (err) {
      console.error('Error al obtener los usuarios:', err.stack);
      res.status(500).json({ error: 'Error al obtener los usuarios' });
    } else {
      res.json(result.rows);
    }
  });
});

app.get('/api/usuarios/:id', (req, res) => {
  const id = req.params.id;

  pgClient.query('SELECT * FROM usuarios WHERE id = $1', [id], (err, result) => {
    if (err) {
      console.error('Error al obtener el usuario:', err.stack);
      res.status(500).json({ error: 'Error al obtener el usuario' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
    } else {
      res.json(result.rows[0]);
    }
  });
});

app.put('/api/usuarios/:id', (req, res) => {
  const id = req.params.id;
  const { nombre, email } = req.body;

  pgClient.query('UPDATE usuarios SET nombre = $1, email = $2 WHERE id = $3', [nombre, email, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar el usuario:', err.stack);
      res.status(500).json({ error: 'Error al actualizar el usuario' });
    } else if (result.rowCount === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
    } else {
      res.json({ message: 'Usuario actualizado correctamente' });
    }
  });
});


app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
