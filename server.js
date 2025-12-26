const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "Smith1990@", // <--- COLOQUE A SUA SENHA AQUI
  database: "escala_enterprise",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createPool(dbConfig);

// Teste de conexão
db.getConnection((err, connection) => {
  if (err) {
    console.error("\n❌ ERRO FATAL AO CONECTAR AO MYSQL:");
    if (err.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("-> Senha ou utilizador incorretos.");
    } else if (err.code === "ER_BAD_DB_ERROR") {
      console.error('-> Base de dados "escala_enterprise" não existe.');
    } else {
      console.error("-> Erro:", err.code);
    }
  } else {
    console.log("✅ Conexão ao MySQL bem sucedida!");
    connection.release();
  }
});

// Rotas
app.get("/api/escala", (req, res) => {
  const sql = "SELECT * FROM plantoes ORDER BY data ASC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Erro ao buscar dados" });
    const formatted = results.map((row) => ({
      ...row,
      data: row.data.toISOString().split("T")[0],
    }));
    res.json(formatted);
  });
});

app.post("/api/escala/reset", (req, res) => {
  const novosPlantoes = req.body;
  if (!Array.isArray(novosPlantoes))
    return res.status(400).json({ error: "Dados inválidos" });

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: "Erro conexão" });

    connection.beginTransaction((err) => {
      if (err) return connection.release();

      connection.query("TRUNCATE TABLE plantoes", (err) => {
        if (err) {
          connection.rollback(() => connection.release());
          return res.status(500).json({ error: "Erro limpar" });
        }

        if (novosPlantoes.length === 0) {
          connection.commit((err) => {
            connection.release();
            res.json({ message: "Limpo" });
          });
          return;
        }

        const values = novosPlantoes.map((p) => [p.data, p.nome, p.type]);
        const sql = "INSERT INTO plantoes (data, nome, tipo) VALUES ?";

        connection.query(sql, [values], (err) => {
          if (err) {
            connection.rollback(() => connection.release());
            return res.status(500).json({ error: "Erro inserir" });
          }
          connection.commit((err) => {
            if (err) connection.rollback(() => connection.release());
            connection.release();
            res.json({ message: "Sucesso" });
          });
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
