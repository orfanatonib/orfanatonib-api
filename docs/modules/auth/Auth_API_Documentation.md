# Auth API Collection - Postman

Esta collection contém todos os endpoints do Auth Controller da API.

## 📁 Arquivos Incluídos

- `Auth_API_Collection.postman_collection.json` - Collection principal com todos os endpoints
- `Auth_API_Environment.postman_environment.json` - Ambiente com variáveis pré-configuradas
- `Auth_API_Documentation.md` - Esta documentação

## 🚀 Como Usar

### 1. Importar no Postman

1. Abra o Postman
2. Clique em "Import"
3. Selecione os arquivos:
   - `Auth_API_Collection.postman_collection.json`
   - `Auth_API_Environment.postman_environment.json`

### 2. Configurar o Ambiente

1. No Postman, selecione o ambiente "Auth API Environment"
2. Ajuste a variável `base_url` conforme necessário:
   - Desenvolvimento: `http://localhost:3000`
   - Produção: `https://sua-api.com`

### 3. Testar o Fluxo de Autenticação

1. **Execute o Login**:
   - Vá para "Login" na collection
   - Use os dados de teste: `admin@example.com` / `password123`
   - Clique em "Send"
   - ✅ **Verifique**: Na aba "Test Results" deve mostrar "PASS" nos testes
   - ✅ **Verifique**: Na aba "Console" deve mostrar "Tokens salvos nas variáveis de ambiente"

2. **Verificar se o Token foi Salvo**:
   - Clique no ícone de olho (👁️) no canto superior direito
   - Selecione o ambiente "Auth API Environment"
   - ✅ **Verifique**: `access_token` deve estar preenchido
   - ✅ **Verifique**: `refresh_token` deve estar preenchido
   - ✅ **Verifique**: `user_id` deve estar preenchido

3. **Testar Endpoint Protegido**:
   - Vá para "Get Me" na collection
   - Clique em "Send"
   - ✅ **Deve funcionar** sem erro 401 (Unauthorized)
   - ✅ **Verifique**: Na aba "Console" deve mostrar dados do usuário

## 📋 Endpoints Incluídos

### 🔐 Autenticação

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/auth/login` | Login com email e senha | ❌ |
| POST | `/auth/google` | Login com Google OAuth | ❌ |
| POST | `/auth/refresh` | Renovar access token | ❌ |
| POST | `/auth/logout` | Logout | ✅ |
| GET | `/auth/me` | Obter dados do usuário | ✅ |

### 👤 Registro de Usuários

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/auth/register` | Registrar novo usuário | ❌ |
| POST | `/auth/complete-register` | Completar registro | ❌ |

## 🔧 Variáveis de Ambiente

| Variável | Descrição | Valor Padrão |
|----------|-----------|--------------|
| `base_url` | URL base da API | `http://localhost:3000` |
| `access_token` | Token JWT de acesso | (preenchido automaticamente) |
| `refresh_token` | Token de refresh | (preenchido automaticamente) |
| `user_id` | ID do usuário logado | (preenchido automaticamente) |
| `admin_email` | Email do admin para testes | `admin@example.com` |
| `admin_password` | Senha do admin para testes | `password123` |
| `test_user_email` | Email para testes | `test@example.com` |
| `test_user_password` | Senha para testes | `testpassword123` |

## 📝 Exemplos de Uso

### 1. Login
```json
POST /auth/login
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### 2. Registrar Usuário
```json
POST /auth/register
{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "+5511999999999",
  "password": "password123",
  "role": "teacher"
}
```

### 3. Obter Dados do Usuário
```http
GET /auth/me
Authorization: Bearer {{access_token}}
```

## 🎭 Roles Disponíveis

- `admin` - Administrador
- `teacher` - Professor
- `leader` - Líder (anteriormente coordinator)

## 📊 Respostas de Exemplo

### Login Success
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "user_id",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin",
    "active": true,
    "completed": true
  }
}
```

### Get Me Success
```json
{
  "id": "user_id",
  "name": "Admin User",
  "email": "admin@example.com",
  "phone": "+5511999999999",
  "active": true,
  "completed": true,
  "commonUser": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "role": "admin",
  "teacherProfile": null,
  "leaderProfile": {
    "id": "leader_profile_id",
    "active": true,
    "shelter": {
      "id": "shelter_id",
      "number": 1,
      "weekday": "monday"
    }
  }
}
```

## 🔒 Fluxo de Autenticação

1. **Login**: Use `/auth/login` para obter tokens
2. **Armazenar Token**: O `access_token` será salvo automaticamente nas variáveis
3. **Usar Token**: Endpoints protegidos usarão automaticamente o token
4. **Refresh**: Use `/auth/refresh` quando o token expirar
5. **Logout**: Use `/auth/logout` para invalidar tokens

## 🧪 Testes Automatizados

A collection inclui testes automatizados que:
- Verificam se as respostas têm status 200/201
- Salvam automaticamente tokens nas variáveis de ambiente
- Validam a estrutura das respostas JSON
- **Capturam tokens automaticamente** após login
- **Limpa tokens** após logout

### 🔄 Fluxo Automático de Tokens

1. **Login/Google Login**: 
   - Captura `access_token`, `refresh_token` e `user_id`
   - Salva automaticamente nas variáveis de ambiente
   - Console mostra confirmação

2. **Refresh Token**: 
   - Renova tokens automaticamente
   - Atualiza variáveis de ambiente com novos tokens

3. **Logout**: 
   - Remove todos os tokens das variáveis de ambiente
   - Limpa `access_token`, `refresh_token` e `user_id`

4. **Get Me**: 
   - Verifica se o token está funcionando
   - Atualiza `user_id` se necessário

## ⚠️ Notas Importantes

- Todos os endpoints que requerem autenticação precisam do header `Authorization: Bearer {{access_token}}`
- O token JWT tem tempo de expiração limitado
- Use o endpoint `/auth/refresh` para renovar tokens expirados
- O campo `role` aceita: `admin`, `teacher`, `leader`
- O campo `phone` deve estar no formato internacional (ex: +5511999999999)

## 🐛 Troubleshooting

### Token Expirado
Se receber erro 401 (Unauthorized):
1. Use `/auth/refresh` com o `refresh_token`
2. Ou faça login novamente com `/auth/login`

### Email Já Existe
Se receber erro 409 (Conflict) no registro:
- Use um email diferente
- Ou use `/auth/complete-register` se o usuário já existe

### Dados Inválidos
Verifique se:
- Email está no formato correto
- Senha tem pelo menos 6 caracteres
- Phone está no formato internacional
- Role é um dos valores aceitos
