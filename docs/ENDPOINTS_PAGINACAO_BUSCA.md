# 🔍 Endpoints de Paginação e Busca - Guia para Frontend

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Endpoint: Listar Abrigos](#-endpoint-listar-abrigos)
3. [Endpoint: Listar Abrigados](#-endpoint-listar-abrigados)
4. [Endpoint: Listar Pagelas](#-endpoint-listar-pagelas)
5. [DTOs Comuns](#-dtos-comuns)
6. [Dicas de Implementação](#-dicas-de-implementação)

---

## 📋 Visão Geral

Este documento descreve **3 endpoints principais** que utilizam paginação e busca unificada através de um único parâmetro `searchString`. Todos os endpoints seguem o mesmo padrão de paginação e retornam respostas consistentes.

### 🎯 Características Comuns

- ✅ **Paginação**: Todos os endpoints suportam `page` e `limit`
- ✅ **Busca Unificada**: Um único parâmetro `searchString` busca em múltiplos campos
- ✅ **Ordenação**: Suporte a ordenação por diferentes campos
- ✅ **Filtros Adicionais**: Alguns endpoints têm filtros específicos (ex: `shelterId`, `shelteredId`)

---

## 🏠 Endpoint: Listar Abrigos

### **GET** `/shelters`

**Descrição:** Lista abrigos com paginação e busca unificada.

**Autenticação:** Requerida (Bearer Token)

**Permissões:** Apenas administradores e líderes (professores não podem acessar)

### Query Parameters

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `page` | number | Não | `1` | Número da página (mínimo: 1) |
| `limit` | number | Não | `10` | Itens por página (mínimo: 1) |
| `sort` | string | Não | `name` | Campo para ordenação: `name`, `createdAt`, `updatedAt`, `city`, `state` |
| `order` | string | Não | `ASC` | Ordem: `ASC` ou `DESC` |
| `searchString` | string | Não | - | Busca unificada (ver campos abaixo) |

### 🔍 Campos de Busca (`searchString`)

O parâmetro `searchString` busca nos seguintes campos:

- ✅ **Nome do abrigo** (`shelter.name`)
- ✅ **Cidade** (`address.city`)
- ✅ **UF/Estado** (`address.state`)
- ✅ **Bairro** (`address.district`)
- ✅ **Nome de um dos professores** (através das equipes)
- ✅ **Nome de um dos líderes** (através das equipes)

**Nota:** A busca é case-insensitive e usa `LIKE` (busca parcial).

### Exemplo de Requisição

```http
GET /shelters?page=1&limit=5&sort=name&order=ASC&searchString=São Paulo
Authorization: Bearer {token}
```

### Exemplo de Resposta

```json
{
  "items": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "name": "Abrigo Esperança",
      "description": "Abrigo localizado em São Paulo",
      "teamsQuantity": 3,
      "address": {
        "id": "880e8400-e29b-41d4-a716-446655440000",
        "street": "Rua das Flores",
        "number": "123",
        "district": "Centro",
        "city": "São Paulo",
        "state": "SP",
        "postalCode": "01234-567",
        "complement": null
      },
      "teams": [
        {
          "id": "990e8400-e29b-41d4-a716-446655440001",
          "numberTeam": 1,
          "description": "Equipe Matutina",
          "leaders": [...],
          "members": [...]
        }
      ],
      "leaders": [...],
      "members": [...],
      "createdAt": "2024-11-29T10:00:00.000Z",
      "updatedAt": "2024-11-29T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 5
}
```

### Estrutura de Resposta

```typescript
interface PaginatedResponse<ShelterResponseDto> {
  items: ShelterResponseDto[];  // Array de abrigos
  total: number;                 // Total de itens encontrados (todas as páginas)
  page: number;                  // Página atual
  limit: number;                 // Itens por página
}
```

---

## 👥 Endpoint: Listar Abrigados

### **GET** `/sheltered`

**Descrição:** Lista abrigados com paginação e busca unificada.

**Autenticação:** Requerida (Bearer Token)

**Permissões:** 
- Administradores: veem todos os abrigados
- Líderes: veem apenas abrigados dos abrigos onde são líderes
- Professores: veem apenas abrigados dos abrigos onde são professores

### Query Parameters

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `page` | number | Não | `1` | Número da página (mínimo: 1) |
| `limit` | number | Não | `20` | Itens por página (mínimo: 1) |
| `orderBy` | string | Não | `name` | Campo para ordenação: `name`, `birthDate`, `joinedAt`, `createdAt`, `updatedAt` |
| `order` | string | Não | `ASC` | Ordem: `ASC` ou `DESC` |
| `searchString` | string | Não | - | Busca unificada (ver campos abaixo) |
| `shelterId` | string (UUID) | Não | - | Filtrar por ID do abrigo |

### 🔍 Campos de Busca (`searchString`)

O parâmetro `searchString` busca nos seguintes campos:

- ✅ **Nome do abrigado** (`sheltered.name`)
- ✅ **Nome do responsável** (`sheltered.guardianName`)
- ✅ **Número do responsável** (`sheltered.guardianPhone`)

**Nota:** A busca é case-insensitive e usa `LIKE` (busca parcial).

### Exemplo de Requisição

```http
GET /sheltered?page=1&limit=20&orderBy=name&order=ASC&shelterId=99a5cf39-10be-41c1-8db3-729cb0181039&searchString=Maria
Authorization: Bearer {token}
```

### Exemplo de Resposta

```json
{
  "data": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "name": "Maria Silva",
      "birthDate": "2010-05-15",
      "gender": "F",
      "guardianName": "João Silva",
      "guardianPhone": "(11) 98765-4321",
      "joinedAt": "2024-01-10",
      "shelter": {
        "id": "99a5cf39-10be-41c1-8db3-729cb0181039",
        "name": "Abrigo Esperança"
      },
      "address": {...},
      "createdAt": "2024-01-10T10:00:00.000Z",
      "updatedAt": "2024-01-10T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1,
    "orderBy": "name",
    "order": "ASC"
  }
}
```

### Estrutura de Resposta

```typescript
interface PaginatedResponseDto<ShelteredResponseDto> {
  data: ShelteredResponseDto[];  // Array de abrigados
  meta: {
    page: number;                 // Página atual
    limit: number;                // Itens por página
    totalItems: number;           // Total de itens encontrados
    totalPages: number;           // Total de páginas
    orderBy: string;              // Campo de ordenação usado
    order: string;                // Ordem usada (ASC/DESC)
  };
}
```

---

## 📄 Endpoint: Listar Pagelas

### **GET** `/pagelas/paginated`

**Descrição:** Lista pagelas com paginação e busca unificada.

**Autenticação:** Requerida (Bearer Token)

**Permissões:** Depende do contexto (verificar regras de negócio)

### Query Parameters

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `page` | number | Não | `1` | Número da página (mínimo: 1) |
| `limit` | number | Não | `20` | Itens por página (mínimo: 1, máximo: 200) |
| `shelteredId` | string (UUID) | Não | - | Filtrar por ID do abrigado |
| `searchString` | string | Não | - | Busca unificada (ver campos abaixo) |

### 🔍 Campos de Busca (`searchString`)

O parâmetro `searchString` busca nos seguintes campos:

- ✅ **Número da visita** (`pagela.visit`) - convertido para string
- ✅ **Ano** (`pagela.year`) - convertido para string
- ✅ **Observação** (`pagela.notes`)
- ✅ **Nome do professor que lançou a pagela** (`member.user.name`)

**Nota:** A busca é case-insensitive e usa `LIKE` (busca parcial). Para números (visita e ano), a busca funciona convertendo para string.

### Exemplo de Requisição

```http
GET /pagelas/paginated?page=1&limit=5&shelteredId=0af63fc5-80fe-4503-919d-c8faacb527c9&searchString=2025
Authorization: Bearer {token}
```

### Exemplo de Resposta

```json
{
  "items": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440000",
      "year": 2025,
      "visit": 6,
      "present": true,
      "notes": "Acompanhamento realizado com sucesso",
      "referenceDate": "2025-01-15",
      "sheltered": {
        "id": "0af63fc5-80fe-4503-919d-c8faacb527c9",
        "name": "Maria Silva"
      },
      "member": {
        "id": "cc0e8400-e29b-41d4-a716-446655440000",
        "active": true,
        "user": {
          "id": "dd0e8400-e29b-41d4-a716-446655440000",
          "name": "João Professor",
          "email": "joao@example.com",
          "phone": "(11) 91234-5678",
          "active": true,
          "completed": true,
          "commonUser": false
        }
      },
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 5
}
```

### Estrutura de Resposta

```typescript
interface PaginatedResponse<PagelaResponseDto> {
  items: PagelaResponseDto[];  // Array de pagelas
  total: number;                // Total de itens encontrados (todas as páginas)
  page: number;                 // Página atual
  limit: number;                // Itens por página
}
```

---

## 💻 DTOs Comuns

### QuerySheltersDto

```typescript
interface QuerySheltersDto {
  page?: number;              // Padrão: 1
  limit?: number;             // Padrão: 10
  sort?: 'name' | 'createdAt' | 'updatedAt' | 'city' | 'state';  // Padrão: 'name'
  order?: 'ASC' | 'DESC' | 'asc' | 'desc';  // Padrão: 'ASC'
  searchString?: string;      // Busca unificada
}
```

### QueryShelteredDto

```typescript
interface QueryShelteredDto {
  page?: number;              // Padrão: 1
  limit?: number;             // Padrão: 20
  orderBy?: 'name' | 'birthDate' | 'joinedAt' | 'createdAt' | 'updatedAt';  // Padrão: 'name'
  order?: 'ASC' | 'DESC' | 'asc' | 'desc';  // Padrão: 'ASC'
  searchString?: string;      // Busca unificada
  shelterId?: string;         // UUID do abrigo (filtro opcional)
}
```

### PagelaFiltersDto

```typescript
interface PagelaFiltersDto {
  shelteredId?: string;       // UUID do abrigado (filtro opcional)
  searchString?: string;      // Busca unificada
}
```

### PaginationQueryDto (usado em Pagelas)

```typescript
interface PaginationQueryDto {
  page?: number;              // Padrão: 1
  limit?: number;             // Padrão: 20 (máximo: 200)
}
```

---

## 💡 Dicas de Implementação

### 1. Construção de URLs

Use `URLSearchParams` para construir as query strings de forma segura:

```typescript
// Exemplo: Listar Abrigos
const params = new URLSearchParams({
  page: '1',
  limit: '5',
  sort: 'name',
  order: 'ASC',
});

if (searchString) {
  params.append('searchString', searchString);
}

const url = `/shelters?${params.toString()}`;
```

### 2. Paginação

Todos os endpoints retornam informações de paginação. Use essas informações para criar controles de paginação:

```typescript
// Exemplo de resposta
const response = {
  items: [...],
  total: 50,      // Total de itens
  page: 1,        // Página atual
  limit: 10       // Itens por página
};

// Calcular total de páginas
const totalPages = Math.ceil(response.total / response.limit);

// Verificar se há próxima página
const hasNextPage = response.page < totalPages;

// Verificar se há página anterior
const hasPreviousPage = response.page > 1;
```

### 3. Busca Unificada

O parâmetro `searchString` busca em múltiplos campos simultaneamente. Isso significa que:

- ✅ Uma única busca pode encontrar resultados em diferentes campos
- ✅ Não é necessário especificar qual campo buscar
- ✅ A busca é case-insensitive (não diferencia maiúsculas/minúsculas)
- ✅ A busca é parcial (usa `LIKE`, então "São" encontra "São Paulo")

**Exemplo:**
```typescript
// Buscar "São Paulo" encontrará:
// - Abrigos com nome contendo "São Paulo"
// - Abrigos na cidade "São Paulo"
// - Abrigos no estado "SP" (se buscar por "SP")
// - Professores ou líderes com nome contendo "São Paulo"
```

### 4. Filtros Adicionais

Alguns endpoints têm filtros específicos que podem ser combinados com `searchString`:

- **Sheltered**: `shelterId` - Filtra abrigados de um abrigo específico
- **Pagelas**: `shelteredId` - Filtra pagelas de um abrigado específico

**Exemplo:**
```typescript
// Buscar abrigados do abrigo X com nome "Maria"
const params = new URLSearchParams({
  page: '1',
  limit: '20',
  shelterId: '99a5cf39-10be-41c1-8db3-729cb0181039',
  searchString: 'Maria',
});
```

### 5. Tratamento de Erros

Todos os endpoints podem retornar os seguintes erros:

- **400 Bad Request**: Parâmetros inválidos (ex: `page` menor que 1, `limit` inválido)
- **401 Unauthorized**: Token ausente ou inválido
- **403 Forbidden**: Sem permissão para acessar o recurso
- **422 Unprocessable Entity**: Erro de validação (ex: UUID inválido)

**Exemplo de tratamento:**
```typescript
try {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Redirecionar para login
      redirectToLogin();
    } else if (response.status === 403) {
      // Mostrar mensagem de acesso negado
      showError('Você não tem permissão para acessar este recurso');
    } else {
      // Outros erros
      const error = await response.json();
      showError(error.message || 'Erro ao buscar dados');
    }
    return;
  }

  const data = await response.json();
  // Processar dados...
} catch (error) {
  showError('Erro de conexão');
}
```

### 6. Performance

Para melhorar a performance:

- ✅ Use `limit` adequado (não muito alto)
- ✅ Implemente debounce na busca (aguardar usuário parar de digitar)
- ✅ Cache resultados quando apropriado
- ✅ Use paginação ao invés de carregar todos os itens

**Exemplo de debounce:**
```typescript
let searchTimeout: NodeJS.Timeout;

function handleSearchChange(value: string) {
  clearTimeout(searchTimeout);
  
  searchTimeout = setTimeout(() => {
    fetchData(value);
  }, 500); // Aguardar 500ms após parar de digitar
}
```

### 7. Ordenação

Todos os endpoints suportam ordenação. Use os valores permitidos:

- **Shelters**: `name`, `createdAt`, `updatedAt`, `city`, `state`
- **Sheltered**: `name`, `birthDate`, `joinedAt`, `createdAt`, `updatedAt`
- **Pagelas**: Ordenação fixa por `year DESC`, `visit DESC`, `sheltered.name ASC`

**Exemplo:**
```typescript
// Ordenar abrigos por cidade, ordem decrescente
const params = new URLSearchParams({
  page: '1',
  limit: '10',
  sort: 'city',
  order: 'DESC',
});
```

---

## ⚠️ Observações Importantes

1. **Paginação**: Todos os endpoints usam paginação baseada em offset (`skip` e `take`). O `page` começa em 1.

2. **Limites**: 
   - **Shelters**: `limit` mínimo 1, sem máximo definido (recomendado: até 100)
   - **Sheltered**: `limit` mínimo 1, sem máximo definido (recomendado: até 100)
   - **Pagelas**: `limit` mínimo 1, máximo 200

3. **Busca**: O `searchString` é opcional. Se não fornecido, retorna todos os itens (respeitando paginação e filtros).

4. **Filtros Combinados**: Filtros adicionais (`shelterId`, `shelteredId`) podem ser combinados com `searchString`. Ambos são aplicados simultaneamente (AND).

5. **Case-Insensitive**: Todas as buscas são case-insensitive, então "MARIA" e "maria" retornam os mesmos resultados.

6. **Busca Parcial**: A busca usa `LIKE`, então "São" encontra "São Paulo", "São José", etc.

---

**Última atualização:** 2024-12-06

