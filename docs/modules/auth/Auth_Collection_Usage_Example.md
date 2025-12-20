# Exemplo de Uso da Auth Collection

## 🎯 Fluxo Completo de Autenticação

### Passo 1: Fazer Login
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "{{admin_email}}",
  "password": "{{admin_password}}"
}
```

**Resultado**: Os tokens são automaticamente salvos nas variáveis de ambiente.

### Passo 2: Usar Token em Endpoint Protegido
```http
GET {{base_url}}/auth/me
Authorization: Bearer {{access_token}}
```

**Resultado**: A requisição usa automaticamente o token salvo.

### Passo 3: Renovar Token (quando expirar)
```http
POST {{base_url}}/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{{refresh_token}}"
}
```

**Resultado**: Novos tokens são automaticamente salvos.

### Passo 4: Fazer Logout
```http
POST {{base_url}}/auth/logout
Authorization: Bearer {{access_token}}
```

**Resultado**: Todos os tokens são removidos das variáveis.

## 🔧 Como Criar uma Nova Requisição que Use o Token

### 1. Criar Nova Requisição
1. No Postman, crie uma nova requisição
2. Defina o método (GET, POST, PUT, DELETE)
3. Digite a URL: `{{base_url}}/seu-endpoint`

### 2. Adicionar Header de Autorização
1. Vá para a aba "Headers"
2. Adicione um novo header:
   - **Key**: `Authorization`
   - **Value**: `Bearer {{access_token}}`

### 3. Executar Requisição
- A variável `{{access_token}}` será automaticamente substituída pelo token salvo

## 📝 Exemplo de Requisição Personalizada

```http
GET {{base_url}}/shelters
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

## 🐛 Troubleshooting

### Token não está sendo salvo?
1. Verifique se o ambiente "Auth API Environment" está selecionado
2. Execute o login novamente
3. Verifique a aba "Test Results" - deve mostrar "PASS"
4. Verifique a aba "Console" - deve mostrar mensagem de confirmação

### Erro 401 (Unauthorized)?
1. Verifique se o token foi salvo nas variáveis
2. Execute o refresh token
3. Ou faça login novamente

### Como verificar se o token está salvo?
1. Clique no ícone de olho (👁️) no canto superior direito
2. Selecione "Auth API Environment"
3. Verifique se `access_token` tem valor

## 🎨 Dicas de Uso

### Usar Variáveis em URLs
```http
GET {{base_url}}/users/{{user_id}}
Authorization: Bearer {{access_token}}
```

### Usar Variáveis no Body
```json
{
  "userId": "{{user_id}}",
  "email": "{{admin_email}}"
}
```

### Usar Variáveis em Query Parameters
```http
GET {{base_url}}/shelters?userId={{user_id}}
Authorization: Bearer {{access_token}}
```

## 🔄 Fluxo de Trabalho Recomendado

1. **Sempre execute o Login primeiro** para obter os tokens
2. **Use os endpoints protegidos** - eles usarão automaticamente o token
3. **Quando receber erro 401**, execute o Refresh Token
4. **Ao final da sessão**, execute o Logout para limpar os tokens
5. **Para nova sessão**, execute o Login novamente

## 📊 Monitoramento

### Console do Postman
- Abra a aba "Console" (Ctrl+Alt+C)
- Veja as mensagens de confirmação dos scripts
- Monitore erros e warnings

### Test Results
- Abra a aba "Test Results" após cada requisição
- Verifique se todos os testes passaram
- Analise falhas para identificar problemas

