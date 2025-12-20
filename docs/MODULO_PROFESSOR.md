# 📚 Módulo Professor - Guia Completo para Frontend

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

O módulo de **Professor** gerencia os perfis de professores do sistema. Cada professor está vinculado a um usuário e pode estar associado a uma equipe (team), que por sua vez está vinculada a um abrigo (shelter).

### 🎯 Conceitos Principais

- **Professor (Teacher)**: Educador que pertence a uma equipe
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
│  TEACHER    │ (Perfil do Professor)
│   PROFILE   │
└──────┬──────┘
       │
       │ N:1 (ManyToOne) - nullable
       │
       ▼
┌─────────────┐
│    TEAM     │ (Equipe)
│  (Equipe)   │
└──────┬──────┘
       │
       │ N:1 (ManyToOne)
       │
       ▼
┌─────────────┐
│   SHELTER   │ (Abrigo)
│  (Abrigo)   │
└─────────────┘
```

**Fluxo de Relacionamento:**
```
Professor → Equipe → Abrigo
```

### 📌 Regras Importantes

1. **Relacionamento com Equipe:**
   - ⭐ **Um professor pode pertencer a apenas 1 equipe** (ou nenhuma) - ManyToOne
   - ⭐ **Um professor NÃO pode estar em múltiplas equipes** ou múltiplos abrigos
   - Uma equipe pode ter **múltiplos professores**
   - Uma equipe pertence a **1 abrigo**
   - Um abrigo pode ter **múltiplas equipes**
   - A equipe é identificada por um **número** (1, 2, 3, 4...), não por um nome descritivo
   - O campo `numberTeam` é do tipo **number** (não string)

2. **Relacionamento com Abrigo:**
   - **Professores NÃO têm relacionamento direto com abrigos**, apenas através de equipes
   - ⭐ **Um professor pode estar em apenas 1 abrigo** (através de sua única equipe)
   - Para vincular um professor a um abrigo, você deve vinculá-lo a uma equipe do abrigo

3. **Vinculação:**
   - ⭐ Se o professor já estiver vinculado a outra equipe, será **automaticamente removido** da equipe anterior e movido para a nova
   - Se a equipe não existir, será criada automaticamente
   - ⚠️ **Importante:** Ao vincular um professor a uma nova equipe, ele perde o vínculo com a equipe anterior

---

## 📊 Estrutura de Dados

### Tipo: TeacherResponseDto

```typescript
interface TeacherResponseDto {
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
  shelter?: {                // Abrigo (através da equipe)
    id: string;
    name: string;
    team: {                  // Equipe à qual o professor pertence (dentro do abrigo)
      id: string;
      numberTeam: number;    // Número da equipe: 1, 2, 3, 4... (tipo number)
      description?: string;
    } | null;
    leader?: {               // Líder da equipe
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
    } | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Estrutura de Relacionamento na Resposta:**
```
Professor
  └── shelter (Abrigo)
        └── team (Equipe à qual o professor pertence)
        └── leader (Líder da equipe)
```

### Tipo: TeacherSimpleListDto

```typescript
interface TeacherSimpleListDto {
  teacherProfileId: string;  // UUID do perfil
  name: string;              // Nome do usuário (ou email se não tiver nome)
  vinculado: boolean;        // Se está vinculado a uma equipe/abrigo
}
```

---

## 🔌 Endpoints Disponíveis

### 1. Listar Professores (Paginado)

**Endpoint:** `GET /teacher-profiles`

**Descrição:** Lista professores com paginação e filtros.

**Autenticação:** Requerida (Bearer Token)

**Permissões:** Apenas administradores e líderes (professores não podem acessar)

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `page` | number | Não | Número da página (padrão: 1) |
| `limit` | number | Não | Itens por página (padrão: 12, máximo: 100) |
| `teacherSearchString` | string | Não | Busca por nome, email ou telefone do professor |
| `shelterSearchString` | string | Não | Busca por dados do abrigo (nome, endereço) |
| `hasShelter` | boolean | Não | Filtrar por professores vinculados a abrigos (true/false) |
| `teamId` | string | Não | Filtrar por ID da equipe específica |
| `teamName` | string | Não | Filtrar por número da equipe (busca parcial) |
| `hasTeam` | boolean | Não | Filtrar por professores vinculados a equipes (true/false) |
| `sort` | string | Não | Campo para ordenação (`updatedAt`, `createdAt`, `name`, padrão: `updatedAt`) |
| `order` | string | Não | Ordem (`asc` ou `desc`, padrão: `desc`) |

**Resposta:** `PageDto<TeacherResponseDto>`

**Exemplo:**
```http
GET /teacher-profiles?page=1&limit=10&teacherSearchString=maria&hasShelter=true
Authorization: Bearer {token}
```

**Exemplo de Resposta:**
```json
{
  "items": [
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
      },
      "shelter": {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "name": "Abrigo Esperança",
        "team": {
          "id": "990e8400-e29b-41d4-a716-446655440001",
          "numberTeam": 1,
          "description": "Equipe Matutina"
        },
        "leader": {
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
          }
        }
      },
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

### 2. Listar Professores (Simples)

**Endpoint:** `GET /teacher-profiles/simple`

**Descrição:** Lista todos os professores de forma simplificada (apenas ID, nome e status de vinculação).

**Autenticação:** Requerida (Bearer Token)

**Permissões:** Apenas administradores e líderes

**Resposta:** `TeacherSimpleListDto[]`

**Exemplo:**
```http
GET /teacher-profiles/simple
Authorization: Bearer {token}
```

**Exemplo de Resposta:**
```json
[
  {
    "teacherProfileId": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Maria Santos",
    "vinculado": true
  },
  {
    "teacherProfileId": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Pedro Oliveira",
    "vinculado": false
  }
]
```

---

### 3. Buscar Professor por ID

**Endpoint:** `GET /teacher-profiles/:id`

**Descrição:** Busca um professor específico por seu ID.

**Autenticação:** Requerida (Bearer Token)

**Permissões:** Apenas administradores e líderes

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `id` | string (UUID) | Sim | UUID do perfil do professor |

**Resposta:** `TeacherResponseDto`

**Exemplo:**
```http
GET /teacher-profiles/660e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {token}
```

**Exemplo de Resposta:**
```json
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
  },
  "shelter": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "name": "Abrigo Esperança",
    "team": {
      "id": "990e8400-e29b-41d4-a716-446655440001",
      "numberTeam": 1,
      "description": "Equipe Matutina"
    },
    "leader": {
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
      }
    }
  },
  "createdAt": "2024-11-29T10:00:00.000Z",
  "updatedAt": "2024-11-29T10:00:00.000Z"
}
```

---

### 4. Vincular Professor a Equipe de um Abrigo ⭐

**Endpoint:** `PUT /teacher-profiles/:teacherId`

**Descrição:** Vincula o professor a uma equipe de um abrigo. Se já estiver vinculado a outra equipe, move para a nova. Se a equipe não existir, cria automaticamente.

**Autenticação:** Requerida (Bearer Token)

**Permissões:** Apenas administradores e líderes

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `teacherId` | string (UUID) | Sim | UUID do perfil do professor |

**Body:** `ManageTeacherTeamDto`

```typescript
{
  shelterId: string;    // UUID do abrigo (obrigatório)
  numberTeam: number;   // Número da equipe: 1, 2, 3, 4... (obrigatório, mínimo: 1)
}
```

**Comportamento:**
- ✅ Busca a equipe com o `numberTeam` especificado no abrigo
- ✅ Se a equipe não existir, cria uma nova equipe automaticamente
- ⭐ Se o professor já estiver vinculado a outra equipe, **remove automaticamente** da equipe anterior e vincula à nova
- ✅ Se o professor não estiver vinculado, apenas vincula à equipe
- ⚠️ **Importante:** Um professor só pode estar em 1 equipe por vez - ao vincular a uma nova, perde o vínculo com a anterior

**Resposta:** `TeacherResponseDto`

**Exemplo:**
```http
PUT /teacher-profiles/660e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {token}
Content-Type: application/json

{
  "shelterId": "770e8400-e29b-41d4-a716-446655440000",
  "numberTeam": 1
}
```

---

## 💻 DTOs de Entrada e Saída

Esta seção documenta **todos** os DTOs utilizados no módulo de Professor, incluindo DTOs internos e de paginação.

### DTOs de Entrada (Request)

#### ManageTeacherTeamDto
```typescript
interface ManageTeacherTeamDto {
  shelterId: string;    // UUID do abrigo (obrigatório)
  numberTeam: number;   // Número da equipe: 1, 2, 3, 4... (obrigatório, mínimo: 1)
}
```

**⚠️ IMPORTANTE:**
- `shelterId` e `numberTeam` são **obrigatórios**
- `numberTeam` é do tipo **number** (não string)
- Se a equipe não existir, será criada automaticamente
- Se o professor já estiver em outra equipe, será movido automaticamente

#### TeacherProfilesQueryDto (Query Parameters)
```typescript
interface TeacherProfilesQueryDto {
  // 🔍 FILTROS DE BUSCA
  
  // Busca pelos dados do professor: nome, email ou telefone
  teacherSearchString?: string;
  
  // Busca por todos os campos do abrigo (nome, endereço, etc.)
  shelterSearchString?: string;
  
  // Se está vinculado a algum abrigo ou não
  // true = apenas professores vinculados a abrigos
  // false = apenas professores não vinculados
  hasShelter?: boolean;
  
  // 🔍 FILTROS DE EQUIPE
  
  // Filtrar por ID da equipe específica (UUID)
  teamId?: string;
  
  // Filtrar por número da equipe (busca parcial)
  // Ex: "1" retorna equipes com numberTeam = 1
  teamName?: string;
  
  // Se está vinculado a alguma equipe ou não
  // true = apenas professores vinculados a equipes
  // false = apenas professores não vinculados
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
  // 'name' = nome do professor
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
- `teacherSearchString` e `shelterSearchString` fazem busca parcial (LIKE)
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
// Resposta do GET /teacher-profiles?page=1&limit=10
const response: PageDto<TeacherResponseDto> = {
  items: [
    // ... array de TeacherResponseDto
  ],
  total: 25,    // Total de 25 professores encontrados
  page: 1,      // Página atual: 1
  limit: 10     // 10 itens por página
};

// Calcular total de páginas
const totalPages = Math.ceil(response.total / response.limit); // 3 páginas
```

#### TeacherSimpleListDto
```typescript
interface TeacherSimpleListDto {
  teacherProfileId: string;  // UUID do perfil do professor
  name: string;              // Nome do usuário (ou email se não tiver nome, ou "—" se não tiver nenhum)
  vinculado: boolean;        // Se está vinculado a uma equipe/abrigo
}
```

**Notas:**
- Usado no endpoint `GET /teacher-profiles/simple`
- Campo `name` retorna o nome do usuário, ou email se não tiver nome, ou "—" se não tiver nenhum
- Campo `vinculado` indica se o professor tem uma equipe associada (e consequentemente um abrigo)

#### TeacherResponseDto (Resposta Completa)
```typescript
interface TeacherResponseDto {
  id: string;                // UUID do perfil do professor
  active: boolean;           // Status ativo/inativo do perfil
  user: UserMiniDto;         // Dados do usuário associado
  shelter?: ShelterMiniWithCoordinatorDto | null;  // Abrigo (através da equipe) ou null
  createdAt: Date;           // Data de criação
  updatedAt: Date;           // Data de última atualização
}
```

**Estrutura do `shelter`:**
- Quando o professor está vinculado a uma equipe, o `shelter` contém:
  - `id` e `name` do abrigo
  - `team` (equipe à qual o professor pertence) com `id`, `numberTeam` e `description`
  - `leader` (líder da equipe, se houver)
- Quando o professor não está vinculado, `shelter` é `null`

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
  team: TeamMiniDto | null;  // Equipe à qual o professor pertence (dentro do abrigo)
  leader?: CoordinatorMiniDto | null;  // Líder da equipe ou null
}
```

**Nota:** A estrutura mostra `shelter.team`, indicando que a equipe está dentro do abrigo, refletindo o relacionamento: Professor → Equipe → Abrigo.

#### CoordinatorMiniDto (DTO Interno)
```typescript
interface CoordinatorMiniDto {
  id: string;                // UUID do perfil do líder
  active: boolean;           // Status ativo/inativo
  user: UserMiniDto;         // Dados do usuário líder
}
```

#### TeacherMiniDto (DTO Interno - usado em outros módulos)
```typescript
interface TeacherMiniDto {
  id: string;                // UUID do perfil do professor
  active: boolean;           // Status ativo/inativo
  user: UserMiniDto;         // Dados do usuário
}
```


---

## 💡 Dicas de Implementação

### 1. Listar Professores
- **DTO de Entrada:** `TeacherProfilesQueryDto` (query parameters)
- **DTO de Saída:** `PageDto<TeacherResponseDto>`
- **Dica:** Use `URLSearchParams` para construir a query string. Todos os parâmetros são opcionais.

### 2. Listar Professores (Simples)
- **DTO de Entrada:** Nenhum (apenas autenticação)
- **DTO de Saída:** `TeacherSimpleListDto[]`
- **Dica:** Use este endpoint para listas de seleção (selects, comboboxes) onde você só precisa do ID e nome.

### 3. Buscar Professor por ID
- **DTO de Entrada:** `id` (path parameter - UUID)
- **DTO de Saída:** `TeacherResponseDto`
- **Dica:** O campo `shelter` será `null` se o professor não estiver vinculado a uma equipe/abrigo.

### 4. Vincular Professor a Equipe
- **DTO de Entrada:** `ManageTeacherTeamDto` (obrigatório: `shelterId` e `numberTeam`)
- **DTO de Saída:** `TeacherResponseDto`
- **Dicas:**
  - ⭐ Antes de vincular, busque `GET /shelters/:shelterId/teams-quantity` para validar que `numberTeam` não exceda a quantidade total
  - Se a equipe não existir, será criada automaticamente
  - Se o professor já estiver em outra equipe, será movido automaticamente para a nova

### Validações Importantes
- `shelterId` e `numberTeam` são obrigatórios
- `numberTeam` deve ser um número maior que 0
- `numberTeam` não deve exceder o `teamsQuantity` do abrigo (valide antes de enviar)
- O professor será automaticamente removido da equipe anterior ao ser adicionado a uma nova

### Tratamento de Erros
- **400:** Dados inválidos - verifique os campos obrigatórios
- **401:** Não autenticado - redirecione para login
- **403:** Sem permissão - apenas admins e líderes podem gerenciar professores
- **404:** Professor não encontrado
- **422:** Erro de validação - exiba os erros retornados no campo `errors`

---

## 🔄 Fluxos de Trabalho Comuns

### Fluxo 1: Vincular Professor a Equipe de um Abrigo
1. ⭐ Busque a quantidade de equipes: `GET /shelters/:shelterId/teams-quantity`
2. Use `PUT /teacher-profiles/:teacherId` com `{ shelterId: "...", numberTeam: 1 }`
3. Valide que `numberTeam` não exceda o `teamsQuantity` do abrigo
4. Se a equipe não existir, será criada automaticamente
5. Se o professor já estiver em outra equipe, será movido automaticamente

### Fluxo 2: Mover Professor entre Equipes
1. Use `PUT /teacher-profiles/:teacherId` com `{ shelterId: "...", numberTeam: 2 }` (nova equipe)
2. O sistema remove automaticamente da equipe anterior e adiciona à nova

### Fluxo 3: Verificar Status de Vinculação
1. Use `GET /teacher-profiles/:id`
2. Verifique o campo `shelter`:
   - Se `shelter` for `null`, o professor não está vinculado
   - Se `shelter` tiver dados, o professor está vinculado através de uma equipe
3. Para obter detalhes da equipe, busque o abrigo completo: `GET /shelters/:shelterId`

---

## ⚠️ Regras e Validações

1. **Um professor por equipe:**
   - ⭐ **Um professor pode pertencer a apenas 1 equipe** (ou nenhuma) - ManyToOne
   - ⭐ **Um professor NÃO pode estar em múltiplas equipes** ou múltiplos abrigos simultaneamente
   - Se você adicionar um professor a uma nova equipe, ele será **automaticamente removido** da equipe anterior
   - **Não há relacionamento direto** entre professor e abrigo - sempre através de equipe
   - ⚠️ **Diferente de líderes:** Enquanto líderes podem estar em múltiplas equipes, professores só podem estar em 1 equipe

2. **Criação de equipe:**
   - Ao vincular um professor a um abrigo sem equipe correspondente, uma nova equipe será criada automaticamente
   - A equipe é identificada por um **número** (1, 2, 3, 4...), não por um nome descritivo
   - O campo `numberTeam` é do tipo **number** (não string)

3. **Permissões:**
   - Professores não podem acessar a listagem de outros professores
   - Apenas administradores e líderes podem gerenciar professores

4. **Validações:**
   - O `shelterId` deve existir antes de vincular
   - O `numberTeam` deve ser um número maior que 0
   - O `numberTeam` não deve exceder o `teamsQuantity` do abrigo (valide antes de enviar)

5. **Comportamento ao mover:**
   - Ao mover um professor de uma equipe para outra, ele é automaticamente removido da equipe anterior
   - Não é necessário fazer duas chamadas (remover + adicionar) - uma única chamada resolve

---

## 🔗 Relacionamentos

### Com Abrigos
- Professores estão vinculados a abrigos **através de equipes**
- ⭐ **Um professor pode estar em apenas 1 abrigo** (através de sua única equipe)
- Um abrigo pode ter múltiplas equipes
- Cada equipe pode ter múltiplos professores

### Com Líderes
- Professores e líderes podem estar na mesma equipe
- ⭐ **Diferente de professores:** Líderes podem estar em múltiplas equipes, professores apenas em 1
- Um professor pode ver os líderes de sua equipe na resposta (`shelter.leader`)

### Com Usuários
- Cada perfil de professor está vinculado a **1 usuário**
- O usuário deve existir antes de criar o perfil
- O perfil é criado automaticamente quando um usuário é marcado como professor

---

**Última atualização:** 2024-12-06

**Nota importante:**
- ⭐ **Professores continuam ManyToOne:** Um professor pode estar em apenas 1 equipe de 1 abrigo
- ⚠️ **Diferente de líderes:** Enquanto líderes podem estar em múltiplas equipes (ManyToMany), professores só podem estar em 1 equipe

