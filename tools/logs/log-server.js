#!/usr/bin/env node

const http = require('http');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3001;

// Função para executar o script de logs
function fetchLogs(env) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'watch-logs.sh');

        exec(`bash ${scriptPath} ${env}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Erro ao buscar logs de ${env}:`, error);
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
}

// Servidor HTTP
const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Servir o HTML
    if (req.url === '/' || req.url === '/index.html') {
        const htmlPath = path.join(__dirname, 'log-viewer.html');
        fs.readFile(htmlPath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Erro ao carregar a página');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }

    // API de logs
    if (req.url === '/api/logs/staging') {
        try {
            console.log('📡 Buscando logs de STAGING...');
            const logs = await fetchLogs('staging');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ logs, timestamp: new Date().toISOString() }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    if (req.url === '/api/logs/prod') {
        try {
            console.log('📡 Buscando logs de PRODUCTION...');
            const logs = await fetchLogs('prod');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ logs, timestamp: new Date().toISOString() }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

server.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║     📡 Log Viewer Server - Orfanato NIB API          ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ Servidor rodando em: http://localhost:${PORT}`);
    console.log('');
    console.log('🌐 Abra no navegador: http://localhost:3001');
    console.log('');
    console.log('📋 Endpoints disponíveis:');
    console.log('   GET /                    - Interface web');
    console.log('   GET /api/logs/staging    - Logs de staging');
    console.log('   GET /api/logs/prod       - Logs de produção');
    console.log('');
    console.log('⏹️  Pressione Ctrl+C para parar');
    console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Encerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor encerrado com sucesso!');
        process.exit(0);
    });
});
