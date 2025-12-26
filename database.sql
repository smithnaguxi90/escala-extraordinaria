-- 1. Criar a Base de Dados (se não existir)
CREATE DATABASE IF NOT EXISTS escala_enterprise;
USE escala_enterprise;

-- 2. Criar a Tabela
CREATE TABLE IF NOT EXISTS plantoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data DATE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'Sábado (50%)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_data (data) 
);

-- 3. Inserir dado de teste
INSERT INTO plantoes (data, nome, tipo) 
VALUES ('2026-01-03', 'Jessé', 'Sábado (50%)')
ON DUPLICATE KEY UPDATE nome = VALUES(nome), tipo = VALUES(tipo);