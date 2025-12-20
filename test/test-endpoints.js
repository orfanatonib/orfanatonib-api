const http = require('http');

const CONFIG = {
  baseURL: 'http://localhost:3000',
  adminEmail: 'joao@example.com',
  adminPassword: 'password123',
};

// Função para fazer login como admin
async function login() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: CONFIG.adminEmail,
      password: CONFIG.adminPassword,
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 201) {
          const responseBody = JSON.parse(data);
          console.log('✅ Login realizado com sucesso!');
          resolve(responseBody.accessToken);
        } else {
          const errorBody = JSON.parse(data);
          console.error('❌ Erro no login:', errorBody);
          reject(new Error('Login failed'));
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Erro na requisição de login:', e.message);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Função para testar endpoint
async function testEndpoint(path, method, accessToken, body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({ 
          statusCode: res.statusCode, 
          data: data,
          path: path,
          method: method
        });
      });
    });

    req.on('error', (e) => {
      resolve({ 
        error: e.message, 
        path: path,
        method: method
      });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Função principal
async function main() {
  console.log('🧪 Testando endpoints do sistema...');

  try {
    const accessToken = await login();

    console.log('\n📋 Testando endpoints:');

    // Testar diferentes endpoints
    const endpoints = [
      { path: '/users', method: 'GET', description: 'Listar usuários' },
      { path: '/users?limit=10', method: 'GET', description: 'Listar usuários com limite' },
      { path: '/leader-profiles', method: 'GET', description: 'Listar leader profiles' },
      { path: '/shelters', method: 'GET', description: 'Listar shelters' },
      { path: '/sheltered', method: 'GET', description: 'Listar sheltered' },
    ];

    for (const endpoint of endpoints) {
      console.log(`\n🔍 Testando: ${endpoint.description}`);
      const result = await testEndpoint(endpoint.path, endpoint.method, accessToken);
      
      if (result.error) {
        console.log(`   ❌ Erro: ${result.error}`);
      } else {
        console.log(`   📊 Status: ${result.statusCode}`);
        if (result.statusCode === 200) {
          try {
            const data = JSON.parse(result.data);
            if (data.data) {
              console.log(`   📋 Items encontrados: ${data.data.length}`);
            } else if (data.items) {
              console.log(`   📋 Items encontrados: ${data.items.length}`);
            } else if (Array.isArray(data)) {
              console.log(`   📋 Items encontrados: ${data.length}`);
            } else {
              console.log(`   📋 Resposta: ${JSON.stringify(data).substring(0, 100)}...`);
            }
          } catch (e) {
            console.log(`   📋 Resposta: ${result.data.substring(0, 100)}...`);
          }
        } else {
          console.log(`   📝 Erro: ${result.data}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();
