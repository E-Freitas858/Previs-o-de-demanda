import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { initializeDatabase, getDemandas, criarDemanda, dbMode } from './src/db.js';

dotenv.config();

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const START_PORT = Number(process.env.PORT || 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'adega-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8,
      secure: false,
    },
  })
);

app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_USER = process.env.ADMIN_USER || 'adega';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adega123';

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  return res.status(401).json({ ok: false, message: 'Sessão expirada ou não autenticada.' });
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
    req.session.user = { username: ADMIN_USER };
    return res.json({ ok: true, user: { username: ADMIN_USER } });
  }

  return res.status(401).json({ ok: false, message: 'Usuário ou senha inválidos.' });
});

app.get('/api/session', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ ok: true, user: req.session.user });
  }

  return res.json({ ok: false, user: null });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true, message: 'Logout realizado com sucesso.' });
  });
});

app.get('/api/weather', async (req, res) => {
  const city = req.query.city || process.env.DEFAULT_CITY || 'Guarulhos, SP';
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return res.json({
      ok: true,
      source: 'fallback',
      city,
      clima: 'Céu limpo',
      descricao: 'Céu limpo',
      temperatura: 28,
      sensacao: 30,
      umidade: 62,
      vento: 12,
      icone: '01d',
      previsao: [
        { dia: 'Seg', temperatura: 27, clima: 'Ensolarado' },
        { dia: 'Ter', temperatura: 29, clima: 'Parcialmente nublado' },
        { dia: 'Qua', temperatura: 30, clima: 'Quente' },
        { dia: 'Qui', temperatura: 31, clima: 'Sol forte' },
        { dia: 'Sex', temperatura: 28, clima: 'Chuva leve' }
      ]
    });
  }

  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&lang=pt_br&appid=${apiKey}`);

    if (!response.ok) {
      throw new Error('Cidade não encontrada ou chave inválida.');
    }

    const data = await response.json();
    const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&lang=pt_br&cnt=5&appid=${apiKey}`);
    const forecastData = forecastResponse.ok ? await forecastResponse.json() : null;

    const forecast = forecastData?.list?.map((item) => ({
      dia: new Date(item.dt * 1000).toLocaleDateString('pt-BR', { weekday: 'short' }),
      temperatura: Math.round(item.main.temp),
      clima: item.weather[0].description,
    })) || [];

    return res.json({
      ok: true,
      source: 'openweather',
      city: data.name,
      clima: data.weather[0].description,
      descricao: data.weather[0].description,
      temperatura: Math.round(data.main.temp),
      sensacao: Math.round(data.main.feels_like),
      umidade: data.main.humidity,
      vento: Math.round(data.wind.speed * 3.6),
      icone: data.weather[0].icon,
      previsao: forecast,
    });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Erro ao consultar previsão do tempo.' });
  }
});

app.get('/api/demandas', ensureAuthenticated, async (req, res) => {
  try {
    const demandas = await getDemandas();
    return res.json({ ok: true, demandas, database: dbMode });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

app.post('/api/demandas', ensureAuthenticated, async (req, res) => {
  try {
    const { produto, quantidade, temperatura, clima, previsao_data, observacao } = req.body;

    if (!produto || !quantidade || !previsao_data) {
      return res.status(400).json({ ok: false, message: 'Produto, quantidade e data são obrigatórios.' });
    }

    const item = await criarDemanda({
      produto,
      quantidade: Number(quantidade),
      temperatura: temperatura ?? 0,
      clima: clima || 'Sem informação',
      previsao_data,
      observacao: observacao || '',
    });

    return res.status(201).json({ ok: true, demanda: item });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  await initializeDatabase();

  const listen = (chosenPort) => {
    app.listen(chosenPort, HOST, () => {
      console.log(`🚀 Aplicação rodando em http://localhost:${chosenPort}`);
      console.log(`🌐 Acesso pela rede em http://${HOST}:${chosenPort}`);
      console.log(`🔐 Login padrão: ${ADMIN_USER} / ${ADMIN_PASSWORD}`);
    }).on('error', (error) => {
      if (error.code === 'EADDRINUSE' && chosenPort === START_PORT) {
        const fallbackPort = START_PORT + 1;
        console.log(`⚠️ Porta ${START_PORT} ocupada. Tentando ${fallbackPort}...`);
        listen(fallbackPort);
        return;
      }

      console.error('Erro ao iniciar servidor:', error.message);
      process.exit(1);
    });
  };

  listen(PORT);
}

startServer();
