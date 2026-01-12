# Leader Profiles API - Endpoints Completos

## Visão Geral
A API de Perfis de Líderes permite gerenciar líderes e suas associações com equipes e abrigos. Cada líder pode estar vinculado a múltiplas equipes de múltiplos abrigos simultaneamente.

## Autenticação
Todos os endpoints requerem autenticação JWT. Apenas usuários com roles `admin` ou `leader` têm acesso.

---

## 1. Listagem Paginada de Líderes

### GET /leader-profiles
Retorna uma lista paginada de todos os perfis de líderes com filtros avançados.

### Parâmetros de Query
```typescript
{
  page?: number;        // Página atual (padrão: 1)
  limit?: number;       // Itens por página (padrão: 12)
  sort?: string;        // Campo para ordenação: 'name', 'createdAt', 'updatedAt' (padrão: 'updatedAt')
  order?: string;       // Ordem: 'asc' ou 'desc' (padrão: 'desc')

  // Filtros de busca
  leaderSearchString?: string;  // Busca por nome, email ou telefone do líder
  shelterSearchString?: string; // Busca por nome ou endereço do abrigo

  // Filtros específicos
  hasShelter?: boolean;         // true: só líderes com abrigo, false: só sem abrigo
  teamId?: string;             // Filtrar por ID específico da equipe
  teamName?: string;           // Filtrar por número da equipe
  hasTeam?: boolean;           // true: só líderes com equipe, false: só sem equipe
}
```

### Exemplos de Uso

#### Listagem básica
```bash
GET /leader-profiles?page=1&limit=10&sort=name&order=asc
```

#### Buscar líderes por nome
```bash
GET /leader-profiles?leaderSearchString=João&page=1&limit=20
```

#### Buscar líderes de um abrigo específico
```bash
GET /leader-profiles?shelterSearchString=Abrigo Central
```

#### Líderes sem abrigo
```bash
GET /leader-profiles?hasShelter=false
```

#### Líderes de uma equipe específica
```bash
GET /leader-profiles?teamId=uuid-da-equipe
```

### Resposta
```json
{
  "items": [
    {
      "id": "uuid-líder",
      "active": true,
      "user": {
        "id": "uuid-user",
        "name": "Nome do Líder",
        "email": "lider@email.com",
        "phone": "11999999999",
        "active": true,
        "completed": true,
        "commonUser": false
      },
      "shelters": [
        {
          "id": "uuid-abrigo-1",
          "name": "Abrigo Central",
          "teams": [
            {
              "id": "uuid-equipe-1",
              "numberTeam": 1,
              "description": "Equipe de Atividades"
            },
            {
              "id": "uuid-equipe-2",
              "numberTeam": 2,
              "description": "Equipe de Ensino"
            }
          ],
          "members": [
            {
              "id": "uuid-member-1",
              "active": true,
              "user": {
                "id": "uuid-user-member",
                "name": "Nome do Professor",
                "email": "professor@email.com",
                "phone": "11888888888"
              }
            }
          ]
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10
}
```

---

## 2. Listagem Simples de Líderes

### GET /leader-profiles/simple
Retorna uma lista simples de todos os líderes sem paginação, ideal para dropdowns e seleções.

### Resposta
```json
[
  {
    "leaderProfileId": "uuid-líder",
    "user": {
      "id": "uuid-user",
      "name": "Nome do Líder"
    },
    "vinculado": true,
    "shelters": [
      {
        "id": "uuid-abrigo",
        "name": "Nome do Abrigo",
        "teams": [
          {
            "id": "uuid-equipe-1",
            "numberTeam": 1,
            "description": "Equipe A"
          },
          {
            "id": "uuid-equipe-2",
            "numberTeam": 2,
            "description": "Equipe B"
          }
        ]
      }
    ]
  }
]
```

---

## 3. Detalhes de um Líder

### GET /leader-profiles/:leaderId
Retorna informações completas de um líder específico.

### Resposta
Mesma estrutura do item na listagem paginada, mas com dados mais detalhados.

---

## 4. Edição de Líder (Vinculação a Equipes)

### PUT /leader-profiles/:leaderId
Vincula um líder a múltiplas equipes de múltiplos abrigos. **IMPORTANTE:** O líder é automaticamente desvinculado de todas as equipes atuais antes de ser vinculado às novas.

### Payload
Envie diretamente um array de objetos com abrigo e equipes:

```json
[
  {
    "shelterId": "uuid-abrigo-1",
    "teams": [1, 2, 3]
  },
  {
    "shelterId": "uuid-abrigo-2",
    "teams": [1]
  }
]
```

**Nota:** O payload deve ser enviado diretamente como array, não dentro de um objeto com propriedade `assignments`.

### Exemplos

#### Vincular líder a equipes 1, 2 e 3 de um abrigo
```json
PUT /leader-profiles/uuid-líder
[
  {
    "shelterId": "uuid-abrigo-1",
    "teams": [1, 2, 3]
  }
]
```

#### Vincular líder a equipes de diferentes abrigos
```json
PUT /leader-profiles/uuid-líder
[
  {
    "shelterId": "uuid-abrigo-central",
    "teams": [1, 2]
  },
  {
    "shelterId": "uuid-abrigo-filho",
    "teams": [1]
  }
]
```

#### Desvincular líder de todos os abrigos
```json
PUT /leader-profiles/uuid-líder
[]
```

### Comportamento
1. **Remove automaticamente** o líder de todas as equipes atuais
2. **Cria equipes** se elas não existirem no abrigo
3. **Vincula** o líder às equipes especificadas
4. **Retorna** os dados atualizados do líder

---

## 5. Meus Abrigos (Para Líderes Logados)

### GET /leader-profiles/my-shelters
Retorna todos os abrigos do líder logado, com todas as equipes e status de participação.

### Resposta
```json
[
  {
    "id": "uuid-abrigo",
    "name": "Nome do Abrigo",
    "description": "Descrição do abrigo",
    "active": true,
    "teams": [
      {
        "id": "uuid-equipe-1",
        "numberTeam": 1,
        "description": "Equipe A",
        "isLeader": true,  // true se o líder logado está nesta equipe
        "leaders": [
          {
            "id": "uuid-líder-1",
            "name": "Nome Líder 1",
            "email": "lider1@email.com"
          }
        ],
        "members": [
          {
            "id": "uuid-member-1",
            "name": "Nome Professor",
            "email": "professor@email.com"
          }
        ]
      }
    ]
  }
]
```

---

## 6. Endpoints Auxiliares

### Listagem Simples de Abrigos

#### GET /shelters/simple
Retorna lista simples de abrigos com suas equipes básicas.

```json
[
  {
    "id": "uuid-abrigo",
    "name": "Nome do Abrigo",
    "teams": [
      {
        "id": "uuid-equipe-1",
        "numberTeam": 1,
        "description": "Equipe 1"
      },
      {
        "id": "uuid-equipe-2",
        "numberTeam": 2,
        "description": "Equipe 2"
      }
    ]
  }
]
```

### Listagem Completa de Equipes

#### GET /teams
Retorna todas as equipes com seus abrigos e membros (líderes e professores).

```json
[
  {
    "id": "uuid-equipe",
    "numberTeam": 1,
    "description": "Equipe A",
    "shelterId": "uuid-abrigo",
    "leaders": [
      {
        "id": "uuid-líder",
        "name": "Nome Líder",
        "email": "lider@email.com",
        "phone": "11999999999"
      }
    ],
    "members": [
      {
        "id": "uuid-member",
        "name": "Nome Professor",
        "email": "professor@email.com",
        "phone": "11888888888"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Equipes por Abrigo

#### GET /teams/by-shelter/:shelterId
Retorna todas as equipes de um abrigo específico.

```bash
GET /teams/by-shelter/uuid-abrigo-específico
```

---

## Códigos de Status HTTP

- `200` - Sucesso
- `400` - Dados inválidos
- `401` - Não autenticado
- `403` - Acesso negado (role insuficiente)
- `404` - Recurso não encontrado

## Notas Importantes

1. **Vinculação Exclusiva**: Cada edição (PUT) redefine completamente as vinculações do líder
2. **Criação Automática**: Equipes são criadas automaticamente se não existirem
3. **Validação de Acesso**: Apenas admins e líderes podem gerenciar vinculações
4. **Múltiplas Associações**: Um líder pode estar em várias equipes de vários abrigos simultaneamente
5. **Dados Completos**: Todas as listagens retornam abrigos e equipes associadas

## Exemplos Práticos

### Cenário 1: Novo Líder
```bash
# 1. Buscar abrigo e equipes disponíveis
GET /shelters/simple

# 2. Vincular líder às equipes 1 e 2 do abrigo X
PUT /leader-profiles/uuid-líder
[
  {
    "shelterId": "uuid-abrigo-x",
    "teams": [1, 2]
  }
]
```

### Cenário 2: Reorganização
```bash
# Mover líder para equipes diferentes
PUT /leader-profiles/uuid-líder
[
  {
    "shelterId": "uuid-abrigo-novo",
    "teams": [1, 3, 5]
  }
]
```

### Cenário 3: Desvinculação Total
```bash
# Remover líder de todos os abrigos
PUT /leader-profiles/uuid-líder
[]
```
