# 👥 Módulo Líder - Guia Completo para Frontend

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Estrutura de Dados](#-estrutura-de-dados)
3. [Endpoints Detalhados](#-endpoints-detalhados)
4. [DTOs de Entrada e Saída](#-dtos-de-entrada-e-saída)
5. [Dicas de Implementação](#-dicas-de-implementação)
6. [Fluxos de Trabalho Comuns](#-fluxos-de-trabalho-comuns)
7. [Regras e Validações](#-regras-e-validações)

---

## 📋 Visão Geral

O módulo de **Líder** gerencia os perfis de líderes do sistema. Cada líder está vinculado a um usuário e pode estar associado a **múltiplas equipes** (teams), que por sua vez estão vinculadas a abrigos (shelters). Um líder pode estar em equipes do mesmo abrigo ou de abrigos diferentes.

### 🎯 Conceitos Principais

- **Líder (Leader)**: Coordenador que pode pertencer a múltiplas equipes
- **Equipe (Team)**: Grupo de trabalho dentro de um abrigo, identificado por um **número** (1, 2, 3, 4...)
- **Abrigo (Shelter)**: Unidade física que abriga pessoas
- **Usuário (User)**: Conta de acesso ao sistema

### 🏗️ Estrutura de Relacionamentos

```
┌─────────────┐
│    USER     │ (Usuário)
│  (Usuário)  │
└──────┬──────┘
       │
       │ 1:1 (OneToOne)
       │
       ▼
┌─────────────┐
│   LEADER    │ (Perfil do Líder)
│   PROFILE   │
└──────┬──────┘
       │
       │ N:N (ManyToMany) - pode estar em múltiplas equipes
       │
       ├──────────────┬──────────────┐
       │              │              │
       ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│    TEAM     │  │    TEAM     │  │    TEAM     │
│  (Equipe)   │  │  (Equipe)   │  │  (Equipe)   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       │ N:1            │ N:1            │ N:1
       │                │                │
       ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   SHELTER   │  │   SHELTER   │  │   SHELTER   │
│  (Abrigo)   │  │  (Abrigo)   │  │  (Abrigo)   │
└─────────────┘  └─────────────┘  └─────────────┘
```

**Fluxo de Relacionamento:**
```
Líder → Múltiplas Equipes → Múltiplos Abrigos
```

**Exemplo:**
- Líder 1 → Equipe 1 (Abrigo 1) + Equipe 2 (Abrigo 1) + Equipe 1 (Abrigo 2)
- Líder 2 → Equipe 1 (Abrigo 1) + Equipe 2 (Abrigo 1)

### 📌 Regras Importantes

1. **Relacionamento com Equipes:**
   - ⭐ **Um líder pode pertencer a MÚLTIPLAS equipes** (ManyToMany)
   - Um líder pode estar em equipes do **mesmo abrigo** ou de **abrigos diferentes**
   - Uma equipe pode ter **múltiplos líderes**
   - Uma equipe pertence a **1 abrigo**
   - Um abrigo pode ter **múltiplas equipes**
   - A equipe é identificada por um **número** (1, 2, 3, 4...), não por um nome descritivo
   - O campo `numberTeam` é do tipo **number** (não string)

2. **Relacionamento com Abrigos:**
   - **Líderes NÃO têm relacionamento direto com abrigos**, apenas através de equipes
   - Um líder pode estar vinculado a **múltiplos abrigos** através de diferentes equipes
   - Para vincular um líder a um abrigo, você deve vinculá-lo a uma equipe do abrigo

3. **Vinculação:**
   - ⭐ Ao vincular um líder a uma equipe, ele é **adicionado** à equipe **sem remover** de outras equipes
   - Se a equipe não existir, será criada automaticamente
   - Um líder pode estar simultaneamente em várias equipes

---

## 📊 Estrutura de Dados

### Tipo: LeaderResponseDto

```typescript
interface LeaderResponseDto {
  id: string;                // UUID do perfil
  active: boolean;           // Status ativo/inativo
  user: {                    // Dados do usuário
    id: string;
    name: string;
    email: string;
    phone: string;
    active: boolean;
    completed: boolean;
    commonUser: boolean;
  };
  shelters: {                // ⭐ Array de abrigos (através das equipes)
    id: string;
    name: string;
    teams: {                 // Array de equipes do líder neste abrigo
      id: string;
      numberTeam: number;    // Número da equipe: 1, 2, 3, 4... (tipo number)
      description?: string;
    }[];
    members: {              // Professores de todas as equipes do líder neste abrigo
      id: string;
      active: boolean;
      user: {
        id: string;
        name: string;
        email: string;
        phone: string;
        active: boolean;
        completed: boolean;
        commonUser: boolean;
      };
    }[];
  }[];                       // ⭐ Array vazio se não estiver vinculado a nenhuma equipe
  createdAt: Date;
  updatedAt: Date;
}
```

**Estrutura de Relacionamento na Resposta:**
```
Líder
  └── shelters[] (Array de Abrigos)
        ├── Abrigo 1
        │     ├── teams[] (Equipes do líder neste abrigo)
        │     └── members[] (Professores das equipes)
        ├── Abrigo 2
        │     ├── teams[] (Equipes do líder neste abrigo)
        │     └── members[] (Professores das equipes)
        └── ...
```

**Nota:** Os abrigos são agrupados automaticamente. Se um líder está em múltiplas equipes do mesmo abrigo, todas as equipes aparecem dentro do mesmo objeto de abrigo.

### Tipo: LeaderSimpleListDto

```typescript
interface LeaderSimpleListDto {
  leaderProfileId: string;  // UUID do perfil
  name: string;              // Nome do usuário (ou email se não tiver nome)
  vinculado: boolean;        // Se está vinculado a uma equipe/abrigo
}
```

---

## 🔌 Endpoints Disponíveis

### 1. Listar Líderes (Paginado)

**Endpoint:** `GET /leader-profiles`

**Descrição:** Lista líderes com paginação e filtros.

**Autenticação:** Requerida (Bearer Token)

**Permissões:** Apenas administradores e líderes (professores não podem acessar)

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `page` | number | Não | Número da página (padrão: 1) |
| `limit` | number | Não | Itens por página (padrão: 12, máximo: 100) |
| `leaderSearchString` | string | Não | Busca por nome, email ou telefone do líder |
| `shelterSearchString` | string | Não | Busca por dados do abrigo (nome, endereço) |
| `hasShelter` | boolean | Não | Filtrar por líderes vinculados a abrigos (true/false) |
| `teamId` | string | Não | Filtrar por ID da equipe específica |
| `teamName` | string | Não | Filtrar por número da equipe (busca parcial) |
| `hasTeam` | boolean | Não | Filtrar por líderes vinculados a equipes (true/false) |
| `sort` | string | Não | Campo para ordenação (`updatedAt`, `createdAt`, `name`, padrão: `updatedAt`) |
| `order` | string | Não | Ordem (`asc` ou `desc`, padrão: `desc`) |

**Resposta:** `PageDto<LeaderResponseDto>`

**Exemplo:**
```http
GET /leader-profiles?page=1&limit=10&leaderSearchString=joao&hasShelter=true
Authorization: Bearer {token}
```

**Exemplo de Resposta:**
```json
{
  "items": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440001",
      "active": true,
      "user": {
        "id": "bb0e8400-e29b-41d4-a716-446655440001",
        "name": "João Silva",
        "email": "joao@example.com",
        "phone": "(11) 91234-5678",
        "active": true,
        "completed": true,
        "commonUser": false
      },
      "shelters": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440000",
          "name": "Abrigo Esperança",
          "teams": [
            {
              "id": "990e8400-e29b-41d4-a716-446655440001",
              "numberTeam": 1,
              "description": "Equipe Matutina"
            },
            {
              "id": "990e8400-e29b-41d4-a716-446655440002",
              "numberTeam": 2,
              "description": "Equipe Vespertina"
            }
          ],
          "members": [
            {
              "id": "660e8400-e29b-41d4-a716-446655440000",
              "active": true,
              "user": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Maria Santos",
                "email": "maria@example.com",
                "phone": "(11) 98765-4321",
                "active": true,
                "completed": true,
                "commonUser": false
              }
            }
          ]
        },
        {
          "id": "880e8400-e29b-41d4-a716-446655440000",
          "name": "Abrigo Nova Esperança",
          "teams": [
            {
              "id": "aa0e8400-e29b-41d4-a716-446655440001",
              "numberTeam": 1,
              "description": "Equipe Principal"
            }
          ],
          "members": []
        }
      ],
      "createdAt": "2024-11-29T10:00:00.000Z",
      "updatedAt": "2024-11-29T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

---

### 2. Listar Líderes (Simples)

**Endpoint:** `GET /leader-profiles/simple`

**Descrição:** Lista todos os líderes de forma simplificada (apenas ID, nome e status de vinculação).

**Autenticação:** Requerida (Bearer Token)

**Permissões:** Apenas administradores e líderes

**Resposta:** `LeaderSimpleListDto[]`

**Exemplo:**
```http
GET /leader-profiles/simple
Authorization: Bearer {token}
```

**Exemplo de Resposta:**
```json
[
  {
    "leaderProfileId": "aa0e8400-e29b-41d4-a716-446655440001",
    "name": "João Silva",
    "vinculado": true
  },
  {
    "leaderProfileId": "aa0e8400-e29b-41d4-a716-446655440002",
    "name": "Pedro Oliveira",
    "vinculado": false
  }
]
```

---

### 3. Buscar Líder por ID

**Endpoint:** `GET /leader-profiles/:id`

**Descrição:** Busca um líder específico por seu ID.

**Autenticação:** Requerida (Bearer Token)

**Permissões:** Apenas administradores e líderes

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `id` | string (UUID) | Sim | UUID do perfil do líder |

**Resposta:** `LeaderResponseDto`

**Exemplo:**
```http
GET /leader-profiles/aa0e8400-e29b-41d4-a716-446655440001
Authorization: Bearer {token}
```

**Exemplo de Resposta:**
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440001",
  "active": true,
  "user": {
    "id": "bb0e8400-e29b-41d4-a716-446655440001",
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "(11) 91234-5678",
    "active": true,
    "completed": true,
    "commonUser": false
  },
  "shelters": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "name": "Abrigo Esperança",
      "teams": [
        {
          "id": "990e8400-e29b-41d4-a716-446655440001",
          "numberTeam": 1,
          "description": "Equipe Matutina"
        },
        {
          "id": "990e8400-e29b-41d4-a716-446655440002",
          "numberTeam": 2,
          "description": "Equipe Vespertina"
        }
      ],
      "members": [
        {
          "id": "660e8400-e29b-41d4-a716-446655440000",
          "active": true,
          "user": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "Maria Santos",
            "email": "maria@example.com",
            "phone": "(11) 98765-4321",
            "active": true,
            "completed": true,
            "commonUser": false
          }
        }
      ]
    }
  ],
  "createdAt": "2024-11-29T10:00:00.000Z",
  "updatedAt": "2024-11-29T10:00:00.000Z"
}
```

---

### 4. Vincular Líder a Equipe de um Abrigo ⭐

**Endpoint:** `PUT /leader-profiles/:leaderId`

**Descrição:** Vincula o líder a uma equipe de um abrigo. ⭐ **O líder é adicionado à equipe sem remover de outras equipes**. Se a equipe não existir, cria automaticamente.

**Autenticação:** Requerida (Bearer Token)

**Permissões:** Apenas administradores e líderes

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `leaderId` | string (UUID) | Sim | UUID do perfil do líder |

**Body:** `ManageLeaderTeamDto`

```typescript
{
  shelterId: string;    // UUID do abrigo (obrigatório)
  numberTeam: number;   // Número da equipe: 1, 2, 3, 4... (obrigatório, mínimo: 1)
}
```

**Comportamento:**
- ✅ Busca a equipe com o `numberTeam` especificado no abrigo
- ✅ Se a equipe não existir, cria uma nova equipe automaticamente
- ⭐ **O líder é adicionado à equipe sem remover de outras equipes** (pode estar em múltiplas equipes simultaneamente)
- ✅ Se o líder já estiver na equipe especificada, não faz nada (idempotente)

**Resposta:** `LeaderResponseDto`

**Exemplo:**
```http
PUT /leader-profiles/aa0e8400-e29b-41d4-a716-446655440001
Authorization: Bearer {token}
Content-Type: application/json

{
  "shelterId": "770e8400-e29b-41d4-a716-446655440000",
  "numberTeam": 1
}
```

---

## 💻 DTOs de Entrada e Saída

Esta seção documenta **todos** os DTOs utilizados no módulo de Líder, incluindo DTOs internos e de paginação.

### DTOs de Entrada (Request)

#### ManageLeaderTeamDto
```typescript
interface ManageLeaderTeamDto {
  shelterId: string;    // UUID do abrigo (obrigatório)
  numberTeam: number;   // Número da equipe: 1, 2, 3, 4... (obrigatório, mínimo: 1)
}
```

**⚠️ IMPORTANTE:**
- `shelterId` e `numberTeam` são **obrigatórios**
- `numberTeam` é do tipo **number** (não string)
- Se a equipe não existir, será criada automaticamente
- Se o líder já estiver em outra equipe, será movido automaticamente

#### LeaderProfilesQueryDto (Query Parameters)
```typescript
interface LeaderProfilesQueryDto {
  // 🔍 FILTROS DE BUSCA
  
  // Busca pelos dados do líder: nome, email ou telefone
  leaderSearchString?: string;
  
  // Busca por todos os campos do abrigo (nome, endereço, etc.)
  shelterSearchString?: string;
  
  // Se está vinculado a algum abrigo ou não
  // true = apenas líderes vinculados a abrigos
  // false = apenas líderes não vinculados
  hasShelter?: boolean;
  
  // 🔍 FILTROS DE EQUIPE
  
  // Filtrar por ID da equipe específica (UUID)
  teamId?: string;
  
  // Filtrar por número da equipe (busca parcial)
  // Ex: "1" retorna equipes com numberTeam = 1
  teamName?: string;
  
  // Se está vinculado a alguma equipe ou não
  // true = apenas líderes vinculados a equipes
  // false = apenas líderes não vinculados
  hasTeam?: boolean;
  
  // 📄 PAGINAÇÃO
  
  // Número da página (padrão: 1, mínimo: 1)
  page?: number;
  
  // Itens por página (padrão: 12, mínimo: 1, máximo: 100)
  limit?: number;
  
  // 🔄 ORDENAÇÃO
  
  // Campo para ordenação
  // 'updatedAt' = data de atualização (padrão)
  // 'createdAt' = data de criação
  // 'name' = nome do líder
  sort?: 'updatedAt' | 'createdAt' | 'name';
  
  // Direção da ordenação
  // 'desc' = decrescente (padrão)
  // 'asc' = crescente
  order?: 'asc' | 'desc';
}
```

**Notas sobre Filtros:**
- Todos os filtros são opcionais
- `hasShelter` e `hasTeam` aceitam valores booleanos: `true`, `false`, `1`, `0`, `yes`, `no`, `y`, `n`
- `leaderSearchString` e `shelterSearchString` fazem busca parcial (LIKE)
- `teamName` faz busca parcial no número da equipe
- `page` e `limit` são convertidos automaticamente para números

### DTOs de Saída (Response)

#### PageDto<T> (Resposta Paginada)
```typescript
interface PageDto<T> {
  items: T[];        // Array de itens da página atual
  total: number;     // Total de itens encontrados (todas as páginas)
  page: number;      // Número da página atual
  limit: number;     // Quantidade de itens por página
}
```

**Exemplo de Uso:**
```typescript
// Resposta do GET /leader-profiles?page=1&limit=10
const response: PageDto<LeaderResponseDto> = {
  items: [
    // ... array de LeaderResponseDto
  ],
  total: 25,    // Total de 25 líderes encontrados
  page: 1,      // Página atual: 1
  limit: 10     // 10 itens por página
};

// Calcular total de páginas
const totalPages = Math.ceil(response.total / response.limit); // 3 páginas
```

#### LeaderSimpleListDto
```typescript
interface LeaderSimpleListDto {
  leaderProfileId: string;  // UUID do perfil do líder
  name: string;              // Nome do usuário (ou email se não tiver nome, ou "—" se não tiver nenhum)
  vinculado: boolean;        // Se está vinculado a uma equipe/abrigo
}
```

**Notas:**
- Usado no endpoint `GET /leader-profiles/simple`
- Campo `name` retorna o nome do usuário, ou email se não tiver nome, ou "—" se não tiver nenhum
- Campo `vinculado` indica se o líder tem uma equipe associada (e consequentemente um abrigo)

#### LeaderResponseDto (Resposta Completa)
```typescript
interface LeaderResponseDto {
  id: string;                // UUID do perfil do líder
  active: boolean;           // Status ativo/inativo do perfil
  user: UserMiniDto;         // Dados do usuário associado
  shelters: ShelterMiniWithCoordinatorDto[];  // ⭐ Array de abrigos (através das equipes)
  createdAt: Date;           // Data de criação
  updatedAt: Date;           // Data de última atualização
}
```

**Estrutura do `shelters`:**
- ⭐ É um **array** de abrigos (pode estar em múltiplos abrigos)
- Cada abrigo contém:
  - `id` e `name` do abrigo
  - `teams` (array de equipes do líder neste abrigo) com `id`, `numberTeam` e `description`
  - `members` (array de professores de todas as equipes do líder neste abrigo)
- Quando o líder não está vinculado a nenhuma equipe, `shelters` é um array vazio `[]`
- Os abrigos são agrupados automaticamente: se o líder está em múltiplas equipes do mesmo abrigo, todas aparecem no mesmo objeto

#### UserMiniDto (DTO Interno)
```typescript
interface UserMiniDto {
  id: string;                // UUID do usuário
  name: string;              // Nome completo
  email: string;             // Email
  phone: string;             // Telefone
  active: boolean;           // Status ativo/inativo
  completed: boolean;        // Se o cadastro está completo
  commonUser: boolean;       // Se é usuário comum
}
```

#### TeamMiniDto (DTO Interno)
```typescript
interface TeamMiniDto {
  id: string;                // UUID da equipe
  numberTeam: number;        // Número da equipe: 1, 2, 3, 4... (tipo number)
  description?: string;      // Descrição da equipe (opcional)
}
```

#### ShelterMiniWithCoordinatorDto (DTO Interno)
```typescript
interface ShelterMiniWithCoordinatorDto {
  id: string;                // UUID do abrigo
  name: string;              // Nome do abrigo
  teams: TeamMiniDto[];      // ⭐ Array de equipes do líder neste abrigo
  members: MemberMiniDto[];  // Professores de todas as equipes do líder neste abrigo
}
```

**Nota:** A estrutura mostra `shelters[].teams[]`, indicando que o líder pode estar em múltiplas equipes do mesmo abrigo, refletindo o relacionamento ManyToMany: Líder → Múltiplas Equipes → Abrigos.

#### MemberMiniDto (DTO Interno)
```typescript
interface MemberMiniDto {
  id: string;                // UUID do perfil do professor
  active: boolean;           // Status ativo/inativo
  user: UserMiniDto;         // Dados do usuário
}
```

#### LeaderMiniDto (DTO Interno - usado em outros módulos)
```typescript
interface LeaderMiniDto {
  id: string;                // UUID do perfil do líder
  active: boolean;           // Status ativo/inativo
  user: UserMiniDto;         // Dados do usuário
}
```


---

## 💡 Dicas de Implementação

### 1. Listar Líderes
- **DTO de Entrada:** `LeaderProfilesQueryDto` (query parameters)
- **DTO de Saída:** `PageDto<LeaderResponseDto>`
- **Dica:** Use `URLSearchParams` para construir a query string. Todos os parâmetros são opcionais.

### 2. Listar Líderes (Simples)
- **DTO de Entrada:** Nenhum (apenas autenticação)
- **DTO de Saída:** `LeaderSimpleListDto[]`
- **Dica:** Use este endpoint para listas de seleção (selects, comboboxes) onde você só precisa do ID e nome.

### 3. Buscar Líder por ID
- **DTO de Entrada:** `id` (path parameter - UUID)
- **DTO de Saída:** `LeaderResponseDto`
- **Dica:** O campo `shelters` será um array vazio `[]` se o líder não estiver vinculado a nenhuma equipe/abrigo.

### 4. Vincular Líder a Equipe
- **DTO de Entrada:** `ManageLeaderTeamDto` (obrigatório: `shelterId` e `numberTeam`)
- **DTO de Saída:** `LeaderResponseDto`
- **Dicas:**
  - ⭐ Antes de vincular, busque `GET /shelters/:shelterId/teams-quantity` para validar que `numberTeam` não exceda a quantidade total
  - Se a equipe não existir, será criada automaticamente
  - ⭐ **O líder é adicionado à equipe sem remover de outras equipes** (pode estar em múltiplas equipes simultaneamente)

### Validações Importantes
- `shelterId` e `numberTeam` são obrigatórios
- `numberTeam` deve ser um número maior que 0
- `numberTeam` não deve exceder o `teamsQuantity` do abrigo (valide antes de enviar)
- ⭐ **O líder NÃO é removido de outras equipes** - ele pode estar em múltiplas equipes simultaneamente

### Tratamento de Erros
- **400:** Dados inválidos - verifique os campos obrigatórios
- **401:** Não autenticado - redirecione para login
- **403:** Sem permissão - apenas admins e líderes podem gerenciar líderes
- **404:** Líder não encontrado
- **422:** Erro de validação - exiba os erros retornados no campo `errors`

---

## 🔄 Fluxos de Trabalho Comuns

### Fluxo 1: Vincular Líder a Equipe de um Abrigo
1. ⭐ Busque a quantidade de equipes: `GET /shelters/:shelterId/teams-quantity`
2. Use `PUT /leader-profiles/:leaderId` com `{ shelterId: "...", numberTeam: 1 }`
3. Valide que `numberTeam` não exceda o `teamsQuantity` do abrigo
4. Se a equipe não existir, será criada automaticamente
5. ⭐ **O líder é adicionado à equipe sem remover de outras equipes**

### Fluxo 2: Adicionar Líder a Múltiplas Equipes
1. Use `PUT /leader-profiles/:leaderId` com `{ shelterId: "...", numberTeam: 1 }` (primeira equipe)
2. Use `PUT /leader-profiles/:leaderId` com `{ shelterId: "...", numberTeam: 2 }` (segunda equipe do mesmo abrigo)
3. Use `PUT /leader-profiles/:leaderId` com `{ shelterId: "...", numberTeam: 1 }` (equipe de outro abrigo)
4. ⭐ O líder agora está em 3 equipes diferentes (2 do primeiro abrigo, 1 do segundo)

### Fluxo 3: Verificar Status de Vinculação
1. Use `GET /leader-profiles/:id`
2. Verifique o campo `shelters`:
   - Se `shelters` for um array vazio `[]`, o líder não está vinculado a nenhuma equipe
   - Se `shelters` tiver elementos, o líder está vinculado através de equipes
   - Cada elemento do array representa um abrigo, com suas equipes e professores
3. Para obter detalhes completos, busque o abrigo: `GET /shelters/:shelterId`

---

## ⚠️ Regras e Validações

1. **Múltiplas equipes por líder:**
   - ⭐ **Um líder pode pertencer a MÚLTIPLAS equipes** (ManyToMany)
   - Um líder pode estar em equipes do **mesmo abrigo** ou de **abrigos diferentes**
   - Ao adicionar um líder a uma nova equipe, ele **NÃO é removido** de outras equipes
   - **Não há relacionamento direto** entre líder e abrigo - sempre através de equipes

2. **Criação de equipe:**
   - Ao vincular um líder a um abrigo sem equipe correspondente, uma nova equipe será criada automaticamente
   - A equipe é identificada por um **número** (1, 2, 3, 4...), não por um nome descritivo
   - O campo `numberTeam` é do tipo **number** (não string)

3. **Permissões:**
   - Professores não podem acessar a listagem de outros líderes
   - Apenas administradores e líderes podem gerenciar líderes

4. **Validações:**
   - O `shelterId` deve existir antes de vincular
   - O `numberTeam` deve ser um número maior que 0
   - O `numberTeam` não deve exceder o `teamsQuantity` do abrigo (valide antes de enviar)

5. **Comportamento ao adicionar:**
   - ⭐ Ao adicionar um líder a uma equipe, ele é **adicionado** sem remover de outras equipes
   - Um líder pode estar simultaneamente em várias equipes
   - Se o líder já estiver na equipe especificada, a operação é idempotente (não faz nada)

---

## 🔗 Relacionamentos

### Com Abrigos
- ⭐ Líderes estão vinculados a abrigos **através de equipes** (ManyToMany)
- Um líder pode estar vinculado a **múltiplos abrigos** através de diferentes equipes
- Um abrigo pode ter múltiplas equipes
- Cada equipe pode ter múltiplos líderes

### Com Equipes
- ⭐ **Um líder pode estar em MÚLTIPLAS equipes** (ManyToMany)
- Um líder pode estar em equipes do mesmo abrigo ou de abrigos diferentes
- Exemplo: Líder 1 → Equipe 1 (Abrigo 1) + Equipe 2 (Abrigo 1) + Equipe 1 (Abrigo 2)

### Com Professores
- Líderes e professores podem estar na mesma equipe
- Um líder pode ver os professores de todas as suas equipes na resposta (`shelters[].members`)

### Com Usuários
- Cada perfil de líder está vinculado a **1 usuário**
- O usuário deve existir antes de criar o perfil
- O perfil é criado automaticamente quando um usuário é marcado como líder

---

**Última atualização:** 2024-12-06

**Mudanças recentes:**
- ⭐ **Atualizado:** Líderes agora podem estar em **múltiplas equipes** (ManyToMany)
- ⭐ **Atualizado:** `LeaderResponseDto` agora retorna `shelters` (array) ao invés de `shelter` (singular)
- ⭐ **Atualizado:** Ao vincular líder a equipe, ele é adicionado sem remover de outras equipes

