const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// --- CONFIGURAÇÃO DA BASE DE DADOS ---
// ATENÇÃO: Verifique se a password aqui é a mesma do seu MySQL!
const dbConfig = {
  host: "localhost",
  user: "root", // O seu utilizador (geralmente 'root')
  password: "Smith1990@", // <--- SUBSTITUA PELA SUA SENHA DO MYSQL
  database: "escala_enterprise",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Configuração de Middlewares
app.use(cors());
app.use(bodyParser.json());

// Criar Pool de Conexões
const db = mysql.createPool(dbConfig);

// --- TESTE DE CONEXÃO AO INICIAR ---
db.getConnection((err, connection) => {
  if (err) {
    console.error("\n❌ ERRO FATAL AO CONECTAR AO MYSQL:");
    if (err.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("-> A senha ou utilizador estão incorretos.");
      console.error('-> Verifique a variável "password" no ficheiro server.js');
    } else if (err.code === "ER_BAD_DB_ERROR") {
      console.error('-> A base de dados "escala_enterprise" não existe.');
      console.error(
        "-> Execute o script database.sql no seu MySQL Workbench/Terminal."
      );
    } else if (err.code === "ECONNREFUSED") {
      console.error(
        "-> O MySQL não parece estar a correr ou não está na porta 3306."
      );
    } else {
      console.error("-> Erro desconhecido:", err.code);
      console.error(err);
    }
    console.log("\n");
  } else {
    console.log("✅ Conexão ao MySQL bem sucedida!");
    connection.release();
  }
});

// --- ROTAS DA API ---

// 1. Buscar toda a escala
app.get("/api/escala", (req, res) => {
  const sql = "SELECT * FROM plantoes ORDER BY data ASC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao ler dados:", err.message);
      return res.status(500).json({ error: "Erro de banco de dados" });
    }
    // Formatação de data
    const formatted = results.map((row) => ({
      ...row,
      data: row.data.toISOString().split("T")[0],
    }));
    res.json(formatted);
  });
});

// 2. Salvar/Atualizar (Upsert)
app.post("/api/escala", (req, res) => {
  const { data, nome, tipo } = req.body;

  const sql = `
    INSERT INTO plantoes (data, nome, tipo) 
    VALUES (?, ?, ?) 
    ON DUPLICATE KEY UPDATE nome = VALUES(nome), tipo = VALUES(tipo)
  `;

  db.query(sql, [data, nome, tipo], (err, result) => {
    if (err) {
      console.error("Erro ao salvar:", err.message);
      return res.status(500).json({ error: "Erro ao salvar" });
    }
    res.json({ message: "Salvo com sucesso", id: result.insertId });
  });
});

// 3. Resetar/Sobrescrever (Usado pelo botão de reset e sincronização)
app.post("/api/escala/reset", (req, res) => {
  const novosPlantoes = req.body;

  if (!Array.isArray(novosPlantoes)) {
    return res.status(400).json({ error: "Dados inválidos" });
  }

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: "Erro de conexão" });

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: "Erro transaction" });
      }

      connection.query("TRUNCATE TABLE plantoes", (err) => {
        if (err) {
          connection.rollback(() => connection.release());
          return res.status(500).json({ error: "Erro ao limpar tabela" });
        }

        if (novosPlantoes.length === 0) {
          connection.commit((err) => {
            connection.release();
            res.json({ message: "Tabela limpa" });
          });
          return;
        }

        const values = novosPlantoes.map((p) => [p.data, p.nome, p.tipo]);
        const sql = "INSERT INTO plantoes (data, nome, tipo) VALUES ?";

        connection.query(sql, [values], (err) => {
          if (err) {
            connection.rollback(() => connection.release());
            return res.status(500).json({ error: "Erro ao inserir dados" });
          }

          connection.commit((err) => {
            if (err) {
              connection.rollback(() => connection.release());
              return res.status(500).json({ error: "Erro ao commitar" });
            }
            connection.release();
            res.json({ message: "Reset concluído" });
          });
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor a correr em http://localhost:${PORT}`);
});
