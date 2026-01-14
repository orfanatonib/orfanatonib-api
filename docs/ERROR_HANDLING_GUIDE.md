# Guia de Tratamento de Erros - API Orfanato NIB

**📅 Última atualização:** Janeiro 2026
**🔧 Estado atual:** Rate limiting e timeout temporariamente desabilitados
**📝 Sem Swagger:** Documentação manual mantida atualizada

## Visão Geral

Esta API possui um sistema robusto e profissional de tratamento de erros, projetado para fornecer informações claras e acionáveis para o frontend. Todos os erros seguem um formato padronizado, facilitando o tratamento consistente no lado do cliente.

**Nota:** A API não utiliza Swagger/OpenAPI. Este documento substitui qualquer documentação automática.

## Mudanças Recentes

- ✅ **Swagger removido** - Sem dependências desnecessárias
- ✅ **Logs simplificados** - Só mostra erros, console limpo
- ⚠️ **Rate limiting desabilitado** - Temporariamente para estabilidade
- ⚠️ **Timeout desabilitado** - Temporariamente para estabilidade
- ✅ **Build limpo** - Sem warnings ou erros
- ✅ **Código enxuto** - Imports e dependências otimizadas

## Estrutura Padrão dos Erros

Todos os erros da API seguem este formato JSON:

```json
{
  "statusCode": 400,
  "message": "Campo 'email' é obrigatório",
  "error": "Bad Request",
  "category": "RULE",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "correlationId": "corr-1705312200000-abc123def",
  "details": {
    "field": "email",
    "validation": "isNotEmpty"
  }
}
```

### Campos da Resposta de Erro

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `statusCode` | number | Código HTTP padrão (400, 401, 403, 404, 422, 429, 500, etc.) |
| `message` | string \| string[] | Mensagem descritiva do erro (ou array de mensagens) |
| `error` | string | Nome do erro HTTP (Bad Request, Unauthorized, etc.) |
| `category` | string | Categoria do erro (ver seção de categorias) |
| `timestamp` | string | Data/hora ISO do erro |
| `path` | string | Endpoint onde o erro ocorreu |
| `requestId` | string | ID único da requisição (para rastreamento) |
| `correlationId` | string | ID de correlação (para debugging interno) |
| `details` | object | Detalhes adicionais específicos do erro (opcional) |

## Categorias de Erro

### 🔵 RULE (Regras de Negócio)
**Código HTTP típico:** 400, 422
**Quando ocorre:** Validações de entrada, regras de negócio violadas

```json
{
  "statusCode": 400,
  "message": "O abrigo deve ter pelo menos um líder responsável",
  "error": "Bad Request",
  "category": "RULE",
  "details": {
    "field": "leaderId",
    "reason": "required_for_shelter_creation"
  }
}
```

**Como tratar no frontend:**
- Mostrar mensagem diretamente ao usuário
- Destacar campos específicos com erro
- Não tentar novamente automaticamente

### 🟡 BUSINESS (Regras de Negócio)
**Código HTTP típico:** 404, 409, 422
**Quando ocorre:** Operações de negócio inválidas

```json
{
  "statusCode": 404,
  "message": "Usuário não encontrado",
  "error": "Not Found",
  "category": "BUSINESS"
}
```

**Como tratar no frontend:**
- Verificar se é erro de "não encontrado"
- Oferecer ações alternativas (ex: "criar novo usuário")
- Pode tentar novamente em alguns casos

### 🔴 SERVER (Erros do Servidor)
**Código HTTP típico:** 500, 502, 503
**Quando ocorre:** Erros internos, falhas de infraestrutura

```json
{
  "statusCode": 500,
  "message": "Erro interno do servidor",
  "error": "Internal Server Error",
  "category": "SERVER"
}
```

**Como tratar no frontend:**
- Mostrar mensagem genérica de erro
- Sugerir tentar novamente mais tarde
- Logar o `correlationId` para suporte

### 🔴 PROCESS (Processamento)
**Código HTTP típico:** 500
**Quando ocorre:** Falhas em processos assíncronos

```json
{
  "statusCode": 500,
  "message": "Falha ao processar documento",
  "error": "Internal Server Error",
  "category": "PROCESS",
  "details": {
    "processId": "doc-123",
    "step": "pdf_generation"
  }
}
```

## Códigos HTTP Específicos

### 2xx - Sucesso
- **200 OK** - Operação bem-sucedida
- **201 Created** - Recurso criado com sucesso
- **204 No Content** - Operação bem-sucedida, sem conteúdo de retorno

### 4xx - Erros do Cliente

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["Email deve ser um endereço válido", "Senha deve ter pelo menos 6 caracteres"],
  "error": "Bad Request",
  "category": "RULE",
  "details": {
    "fields": {
      "email": ["isEmail"],
      "password": ["minLength"]
    }
  }
}
```

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Token de autenticação inválido ou expirado",
  "error": "Unauthorized",
  "category": "BUSINESS"
}
```

#### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Você não tem permissão para acessar este recurso",
  "error": "Forbidden",
  "category": "BUSINESS"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "O abrigo solicitado não foi encontrado",
  "error": "Not Found",
  "category": "BUSINESS"
}
```

#### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Já existe um usuário com este email",
  "error": "Conflict",
  "category": "BUSINESS"
}
```

#### 422 Unprocessable Entity
```json
{
  "statusCode": 422,
  "message": "Dados fornecidos não podem ser processados",
  "error": "Unprocessable Entity",
  "category": "BUSINESS"
}
```

#### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "Muitas tentativas de login. Tente novamente em 15 minutos.",
  "error": "Too Many Requests",
  "category": "RULE",
  "details": {
    "retryAfter": 900
  }
}
```

### 5xx - Erros do Servidor

#### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Erro interno do servidor",
  "error": "Internal Server Error",
  "category": "SERVER",
  "correlationId": "corr-1705312200000-abc123def"
}
```

#### 502 Bad Gateway
```json
{
  "statusCode": 502,
  "message": "Serviço temporariamente indisponível",
  "error": "Bad Gateway",
  "category": "SERVER"
}
```

#### 503 Service Unavailable
```json
{
  "statusCode": 503,
  "message": "Serviço indisponível. Tente novamente em alguns minutos.",
  "error": "Service Unavailable",
  "category": "SERVER"
}
```

## Rate Limiting (Limitação de Taxa)

**⚠️ ATUALMENTE DESABILITADO:** Os middlewares de rate limiting estão temporariamente desabilitados para estabilidade. Quando reabilitados, implementarão:

### Limites por Tipo de Operação (Quando Ativo)

| Operação | Limite | Janela de Tempo |
|----------|--------|-----------------|
| **Geral** | 1000 requests | 15 minutos |
| **Autenticação** | 5 tentativas | 15 minutos |
| **Escrita (POST/PUT/PATCH/DELETE)** | 50 operações | 5 minutos |
| **Upload de Arquivos** | 10 uploads | 1 hora |

### Headers de Rate Limiting (Quando Ativo)

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705313100
Retry-After: 900  // Aparece quando limite excedido
```

## Timeouts

**⚠️ ATUALMENTE DESABILITADO:** Os middlewares de timeout estão temporariamente desabilitados. Quando reabilitados:

- **Timeout padrão:** 30 segundos
- Se uma requisição exceder este tempo, retorna erro 408 Request Timeout

```json
{
  "statusCode": 408,
  "message": "Request timeout after 30000ms",
  "error": "Request Timeout",
  "category": "SERVER",
  "details": {
    "url": "/api/shelters",
    "method": "GET",
    "timeout": 30000
  }
}
```

## Headers Importantes

### Request Headers

```http
Authorization: Bearer <token>
Content-Type: application/json
X-Request-ID: <uuid>  // Opcional, usado para rastreamento
```

### Response Headers

```http
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000  // Mesmo ID da request (sempre presente)
// Headers de rate limiting ausentes (middleware desabilitado)
```

## Logging e Monitoramento

### Comportamento Atual
- ✅ **Requests normais:** Não geram logs (console limpo)
- ✅ **Erros (4xx/5xx):** Logam apenas informações essenciais
- ✅ **Headers de segurança:** Sempre aplicados
- ✅ **Request ID:** Sempre incluído para rastreamento

### Exemplo de Log de Erro
```
❌ ERROR [550e8400-e29b-41d4-a716-446655440000] POST /auth/login - 401 - 150ms - Invalid credentials
```

**Vantagem:** Console muito mais limpo, foco em problemas reais.

## Tratamento no Frontend

### Estrutura Base de Tratamento

```typescript
interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  category: 'RULE' | 'BUSINESS' | 'SERVER' | 'PROCESS';
  timestamp: string;
  path: string;
  requestId: string;
  correlationId: string;
  details?: any;
}

class ApiErrorHandler {
  static handleError(error: ApiError): void {
    switch (error.category) {
      case 'RULE':
        this.handleRuleError(error);
        break;
      case 'BUSINESS':
        this.handleBusinessError(error);
        break;
      case 'SERVER':
        this.handleServerError(error);
        break;
      case 'PROCESS':
        this.handleProcessError(error);
        break;
    }
  }

  private static handleRuleError(error: ApiError): void {
    // Mostrar erros de validação nos campos apropriados
    if (Array.isArray(error.message)) {
      error.message.forEach(msg => {
        toast.error(msg);
      });
    } else {
      toast.error(error.message);
    }

    // Destacar campos com erro se details.fields existir
    if (error.details?.fields) {
      Object.keys(error.details.fields).forEach(field => {
        highlightFieldError(field, error.details.fields[field]);
      });
    }
  }

  private static handleBusinessError(error: ApiError): void {
    switch (error.statusCode) {
      case 404:
        toast.error('Recurso não encontrado');
        // Redirecionar ou oferecer criar novo
        break;
      case 409:
        toast.warning(error.message);
        break;
      default:
        toast.error(error.message);
    }
  }

  private static handleServerError(error: ApiError): void {
    toast.error('Erro interno do servidor. Tente novamente mais tarde.');

    // Log para debugging
    console.error('Server Error:', {
      correlationId: error.correlationId,
      requestId: error.requestId,
      timestamp: error.timestamp
    });

    // Em produção, enviar para serviço de monitoring
    if (process.env.NODE_ENV === 'production') {
      errorReportingService.captureException(error);
    }
  }

  private static handleProcessError(error: ApiError): void {
    toast.error('Operação em andamento. Verifique o status mais tarde.');
  }
}

// Uso em chamadas API
try {
  const result = await api.post('/users', userData);
} catch (error) {
  if (error.response?.data) {
    ApiErrorHandler.handleError(error.response.data);
  } else {
    // Erro de rede
    toast.error('Erro de conexão. Verifique sua internet.');
  }
}
```

### Tratamento de Rate Limiting

**⚠️ ATUALMENTE DESABILITADO:** Quando reabilitado, usar:

```typescript
// Interceptador axios para rate limiting
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.data.details?.retryAfter || 60;
      toast.error(`Muitas tentativas. Tente novamente em ${retryAfter} segundos.`);

      // Opcional: implementar retry automático
      return new Promise(resolve => {
        setTimeout(() => resolve(axios(error.config)), retryAfter * 1000);
      });
    }
    return Promise.reject(error);
  }
);
```

### Tratamento de Autenticação

```typescript
// Interceptador para erros 401
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Limpar tokens
      localStorage.removeItem('token');
      sessionStorage.removeItem('user');

      // Redirecionar para login
      window.location.href = '/login';

      toast.error('Sessão expirada. Faça login novamente.');
    }
    return Promise.reject(error);
  }
);
```

## Validações de Entrada

### Campos Obrigatórios
```json
{
  "statusCode": 400,
  "message": "Campo 'nome' é obrigatório",
  "category": "RULE",
  "details": {
    "field": "nome",
    "validation": "isNotEmpty"
  }
}
```

### Formatos Inválidos
```json
{
  "statusCode": 400,
  "message": "Email deve ser um endereço válido",
  "category": "RULE",
  "details": {
    "field": "email",
    "validation": "isEmail"
  }
}
```

### Comprimento Mínimo/Máximo
```json
{
  "statusCode": 400,
  "message": "Senha deve ter entre 6 e 100 caracteres",
  "category": "RULE",
  "details": {
    "field": "password",
    "validation": "length",
    "min": 6,
    "max": 100
  }
}
```

## Health Check

A API fornece endpoints para verificar saúde (sem dependência de Swagger):

### Health Básico
```http
GET /health
```

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "used": 104857600,
    "total": 2147483648,
    "percentage": 4.88
  },
  "version": "1.0.0"
}
```

### Health Detalhado
```http
GET /health/detailed
```

Inclui verificações de conectividade com banco de dados e serviços externos.

## Boas Práticas para o Frontend

1. **Sempre verifique a categoria do erro** antes de mostrar mensagens ao usuário
2. **Use o `requestId`** para rastreamento quando reportar bugs
3. **Implemente retry automático** apenas para erros 5xx
4. **Não tente novamente automaticamente** para erros 4xx
5. **Valide dados no frontend** antes de enviar para reduzir erros 400
6. **Rate limiting:** Atualmente desabilitado - implementar quando reabilitado
7. **Implemente loading states** para operações que podem demorar
8. **Log erros de servidor** para debugging, mas não exponha detalhes sensíveis
9. **Console limpo:** A API não polui logs com requests normais

## Suporte e Debugging

Para reportar problemas:

1. Inclua o `requestId` da requisição que falhou
2. Descreva a ação que o usuário estava tentando fazer
3. Anexe screenshots se for erro visual
4. Mencione o navegador e versão utilizados

**Contato para suporte técnico:** Use o `correlationId` em comunicações com a equipe de backend.
