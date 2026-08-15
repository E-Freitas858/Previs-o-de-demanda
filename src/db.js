import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '123456',
  database: process.env.MYSQL_DATABASE || 'adega',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

export let dbMode = 'memory';
export const memoryDemands = [];

export const pool = mysql.createPool(config);

export async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
    await connection.end();

    await pool.query(`USE \`${config.database}\``);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS demandas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        produto VARCHAR(100) NOT NULL,
        quantidade INT NOT NULL,
        temperatura DECIMAL(5,2),
        clima VARCHAR(100),
        previsao_data DATE NOT NULL,
        observacao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    dbMode = 'mysql';
    console.log('✅ Conectado ao MySQL com sucesso.');
  } catch (error) {
    dbMode = 'memory';
    console.warn('⚠️ MySQL indisponível. Usando armazenamento em memória:', error.message);
  }
}

export async function getDemandas() {
  if (dbMode === 'mysql') {
    const [rows] = await pool.query('SELECT * FROM demandas ORDER BY created_at DESC');
    return rows;
  }

  return [...memoryDemands].reverse();
}

export async function criarDemanda(dados) {
  if (dbMode === 'mysql') {
    const [result] = await pool.query(
      'INSERT INTO demandas (produto, quantidade, temperatura, clima, previsao_data, observacao) VALUES (?, ?, ?, ?, ?, ?)',
      [dados.produto, dados.quantidade, dados.temperatura, dados.clima, dados.previsao_data, dados.observacao || '']
    );

    return { id: result.insertId, ...dados };
  }

  const novo = {
    id: Date.now(),
    ...dados,
    created_at: new Date().toISOString(),
  };

  memoryDemands.push(novo);
  return novo;
}
