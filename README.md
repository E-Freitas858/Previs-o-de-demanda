# Sistema de previsão de demanda para adega

Aplicação web para controlar previsão de demanda com autenticação simples, banco MySQL e integração com API de previsão do tempo.

## Funcionalidades

- Login com usuário e senha definidos
- Dashboard para visualizar demanda estimada
- Cadastro de demandas por produto e data
- Integração com OpenWeatherMap para considerar clima
- Persistência em MySQL com fallback em memória caso o banco não esteja disponível

## Tecnologias

- Node.js + Express
- MySQL
- HTML/CSS/JS
- OpenWeatherMap API

## Começar

1. Instale as dependências:

```bash
npm install
```

2. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

3. Ajuste os valores do arquivo `.env`.

4. Inicie o banco MySQL com Docker ou localmente.

```bash
docker compose up -d
```

5. Inicie a aplicação:

```bash
npm start
```

Acesse: http://localhost:3000

## Credenciais padrão

- Usuário: `adega`
- Senha: `adega123`

## MySQL

O projeto tenta conectar ao banco `adega` usando as variáveis `MYSQL_HOST`, `MYSQL_PORT`, etc. O arquivo `database/init.sql` também cria as tabelas necessárias.

## OpenWeatherMap

Para usar a previsão real do clima, gere uma chave em https://openweathermap.org/api e coloque em `OPENWEATHER_API_KEY`.

## Estrutura

- `server.js` – servidor Express
- `src/db.js` – conexão com MySQL e fallback
- `public/` – frontend
- `database/init.sql` – script SQL inicial
