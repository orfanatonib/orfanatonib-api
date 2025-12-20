# 📋 Endpoint: GET /sheltered/simple

## 📌 Visão Geral

O endpoint `GET /sheltered/simple` retorna uma lista paginada de abrigados em formato simplificado, com suporte a filtros de busca e paginação.

## 🔐 Autenticação

Este endpoint requer autenticação via JWT. O token deve ser enviado no header `Authorization`:

```
Authorization: Bearer <token>
```

## 🎯 Permissões

- **Admin**: Acesso a todos os abrigados
- **Leader**: Acesso apenas aos abrigados dos abrigos onde o líder está vinculado a pelo menos uma equipe
- **Teacher**: Acesso apenas aos abrigados dos abrigos onde o professor está vinculado a uma equipe

## 📥 Request

### URL

```
GET /sheltered/simple
```

### Query Parameters

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `page` | number | Não | `1` | Número da página (mínimo: 1) |
| `limit` | number | Não | `20` | Quantidade de itens por página (mínimo: 1) |
| `searchString` | string | Não | - | Busca unificada que filtra por:<br>- Nome do abrigo<br>- Nome do responsável<br>- Telefone do responsável |
| `acceptedJesus` | string | Não | `all` | Filtro de decisão de aceitar Jesus:<br>- `accepted` - Retorna apenas abrigados que aceitaram Jesus<br>- `not_accepted` - Retorna apenas abrigados que não aceitaram<br>- `all` - Retorna todos (padrão) |
| `active` | string | Não | `all` | Filtro de status ativo:<br>- `active` - Retorna apenas abrigados ativos<br>- `inactive` - Retorna apenas abrigados inativos<br>- `all` - Retorna todos (padrão) |

### Exemplos de Request

#### Buscar todos os abrigados (primeira página)

```http
GET /sheltered/simple?page=1&limit=20
Authorization: Bearer <token>
```

#### Buscar com filtro de busca

```http
GET /sheltered/simple?page=1&limit=20&searchString=Maria
Authorization: Bearer <token>
```

#### Buscar por telefone do responsável

```http
GET /sheltered/simple?searchString=+5511999999999
Authorization: Bearer <token>
```

#### Buscar por nome do abrigo

```http
GET /sheltered/simple?searchString=Associação Brasília
Authorization: Bearer <token>
```

#### Buscar apenas abrigados que aceitaram Jesus

```http
GET /sheltered/simple?acceptedJesus=accepted&page=1&limit=20
Authorization: Bearer <token>
```

#### Buscar apenas abrigados que não aceitaram Jesus

```http
GET /sheltered/simple?acceptedJesus=not_accepted
Authorization: Bearer <token>
```

#### Combinar filtros: busca por nome e aceitou Jesus

```http
GET /sheltered/simple?searchString=Maria&acceptedJesus=accepted&page=1
Authorization: Bearer <token>
```

## 📤 Response

### Estrutura da Resposta

```typescript
{
  data: ShelteredListItemDto[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
```

### ShelteredListItemDto

```typescript
{
  id: string;                    // UUID do abrigado
  name: string;                  // Nome do abrigado
  guardianName?: string | null;  // Nome do responsável
  gender: string;                // Gênero (M ou F)
  guardianPhone?: string | null; // Telefone do responsável
  shelterId?: string | null;     // UUID do abrigo (se vinculado)
  active: boolean;               // Status ativo/inativo
  acceptedChrists?: AcceptedChristShortDto[]; // Lista de decisões de Cristo aceitas
}
```

### AcceptedChristShortDto

```typescript
{
  id: string;           // UUID da decisão
  decision: string;     // Decisão tomada
  createdAt: string;    // Data de criação (ISO 8601)
  updatedAt: string;    // Data de atualização (ISO 8601)
}
```

### Exemplo de Response (200 OK)

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "João Silva",
      "guardianName": "Maria Silva",
      "gender": "M",
      "guardianPhone": "+5511999999999",
      "shelterId": "660e8400-e29b-41d4-a716-446655440001",
      "active": true,
      "acceptedChrists": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "decision": "Sim",
          "createdAt": "2025-01-15T10:30:00.000Z",
          "updatedAt": "2025-01-15T10:30:00.000Z"
        }
      ]
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "name": "Ana Santos",
      "guardianName": null,
      "gender": "F",
      "guardianPhone": null,
      "shelterId": null,
      "active": true,
      "acceptedChrists": []
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 2,
    "totalPages": 1
  }
}
```

## 🔍 Filtro de Busca (searchString)

O parâmetro `searchString` realiza uma busca unificada nos seguintes campos:

1. **Nome do Abrigo** (`shelter.name`): Busca case-insensitive no nome do abrigo vinculado ao abrigado
2. **Nome do Responsável** (`guardianName`): Busca case-insensitive no nome do responsável
3. **Telefone do Responsável** (`guardianPhone`): Busca exata (case-sensitive) no telefone do responsável

### Comportamento

- A busca é realizada com operador `LIKE`, permitindo busca parcial
- A busca no nome do abrigo e nome do responsável é **case-insensitive** (não diferencia maiúsculas/minúsculas)
- A busca no telefone é **case-sensitive**
- Se o abrigado não tiver abrigo vinculado, o nome do abrigo não será considerado na busca
- Se o abrigado não tiver responsável, os campos `guardianName` e `guardianPhone` não serão considerados na busca

### Exemplos de Uso do Filtro

#### Buscar por nome do responsável
```
GET /sheltered/simple?searchString=Maria
```
Retorna abrigados cujo responsável tenha "Maria" no nome.

#### Buscar por telefone
```
GET /sheltered/simple?searchString=+5511999999999
```
Retorna abrigados cujo telefone do responsável contenha "+5511999999999".

#### Buscar por nome do abrigo
```
GET /sheltered/simple?searchString=Associação
```
Retorna abrigados vinculados a abrigos cujo nome contenha "Associação".

## ✝️ Filtro: Aceitou Jesus (acceptedJesus)

O parâmetro `acceptedJesus` filtra os abrigados baseado em suas decisões de aceitar Jesus.

### Valores Possíveis

- **`accepted`**: Retorna apenas abrigados que têm pelo menos uma decisão de aceitar Jesus
  - Considera decisões com valor `ACCEPTED` ou `RECONCILED`
  - Um abrigado pode ter múltiplas decisões, mas precisa ter pelo menos uma com esses valores
  
- **`not_accepted`**: Retorna apenas abrigados que **não** aceitaram Jesus
  - Inclui abrigados que não têm nenhuma decisão registrada
  - Inclui abrigados que têm decisões, mas todas são `null`
  - Exclui abrigados que têm pelo menos uma decisão `ACCEPTED` ou `RECONCILED`
  
- **`all`** (padrão): Retorna todos os abrigados, independente da decisão
  - Este é o valor padrão se o parâmetro não for fornecido
  - Não aplica nenhum filtro relacionado a decisões

### Comportamento

- O filtro verifica a existência de registros na tabela `accepted_christs` vinculados ao abrigado
- Uma decisão é considerada "aceitou" se o campo `decision` for `ACCEPTED` ou `RECONCILED`
- Um abrigado pode ter múltiplas decisões ao longo do tempo
- O filtro `accepted` retorna o abrigado se ele tiver **pelo menos uma** decisão válida
- O filtro `not_accepted` retorna o abrigado se ele **não tiver nenhuma** decisão válida

### Exemplos de Uso

#### Buscar apenas quem aceitou Jesus
```
GET /sheltered/simple?acceptedJesus=accepted
```
Retorna apenas abrigados que têm pelo menos uma decisão de aceitar Jesus.

#### Buscar apenas quem não aceitou
```
GET /sheltered/simple?acceptedJesus=not_accepted
```
Retorna apenas abrigados que não têm nenhuma decisão válida de aceitar Jesus.

#### Combinar com busca por nome
```
GET /sheltered/simple?searchString=João&acceptedJesus=accepted
```
Retorna abrigados cujo nome contenha "João" e que aceitaram Jesus.

#### Combinar com paginação
```
GET /sheltered/simple?acceptedJesus=accepted&page=1&limit=10
```
Retorna a primeira página (10 itens) de abrigados que aceitaram Jesus.

## ✅ Filtro: Status Ativo (active)

O parâmetro `active` filtra os abrigados baseado em seu status ativo/inativo.

### Valores Possíveis

- **`active`**: Retorna apenas abrigados com `active = true`
- **`inactive`**: Retorna apenas abrigados com `active = false`
- **`all`** (padrão): Retorna todos os abrigados, independente do status

### Comportamento

- O campo `active` é um booleano que indica se o abrigado está ativo no sistema
- Por padrão, novos abrigados são criados com `active = true`
- Abrigados inativos podem ser filtrados ou ocultados em listagens

### Exemplos de Uso

#### Buscar apenas abrigados ativos
```
GET /sheltered/simple?active=active
```
Retorna apenas abrigados com status ativo.

#### Buscar apenas abrigados inativos
```
GET /sheltered/simple?active=inactive
```
Retorna apenas abrigados com status inativo.

#### Combinar com outros filtros
```
GET /sheltered/simple?active=active&acceptedJesus=accepted
```
Retorna apenas abrigados ativos que aceitaram Jesus.

## 📄 Paginação

### Parâmetros

- **page**: Número da página (começa em 1)
- **limit**: Quantidade de itens por página (mínimo: 1)

### Metadados de Paginação

A resposta inclui metadados de paginação no objeto `meta`:

- `page`: Página atual
- `limit`: Limite de itens por página
- `totalItems`: Total de itens encontrados
- `totalPages`: Total de páginas disponíveis

### Exemplo de Navegação

```http
# Primeira página (20 itens)
GET /sheltered/simple?page=1&limit=20

# Segunda página (20 itens)
GET /sheltered/simple?page=2&limit=20

# Primeira página (10 itens)
GET /sheltered/simple?page=1&limit=10
```

## 🔒 Filtros de Acesso por Role

### Admin
- Acesso a **todos** os abrigados do sistema
- Não há restrições de abrigo

### Leader
- Acesso apenas aos abrigados dos abrigos onde o líder está vinculado a **pelo menos uma equipe**
- O filtro é aplicado automaticamente baseado no JWT do usuário logado

### Teacher
- Acesso apenas aos abrigados dos abrigos onde o professor está vinculado a **uma equipe**
- O filtro é aplicado automaticamente baseado no JWT do usuário logado

## ⚠️ Erros

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
Token JWT ausente ou inválido.

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["page must be an integer number", "limit must be an integer number"],
  "error": "Bad Request"
}
```
Parâmetros de query inválidos (ex: `page` ou `limit` não são números inteiros ou são menores que 1).

## 📝 Notas Importantes

1. **Ordenação**: Os resultados são ordenados por:
   - Primeiro: Status ativo (ativos primeiro, depois inativos)
   - Depois: Nome do abrigado em ordem alfabética crescente (A-Z)

2. **Campos Opcionais**: 
   - `guardianName` e `guardianPhone` podem ser `null` se o abrigado não tiver responsável cadastrado
   - `shelterId` pode ser `null` se o abrigado não estiver vinculado a nenhum abrigo
   - `acceptedChrists` será um array vazio `[]` se o abrigado não tiver decisões de Cristo aceitas

3. **Performance**: 
   - O filtro `searchString` utiliza índices do banco de dados quando disponíveis
   - Para grandes volumes de dados, recomenda-se usar paginação com `limit` adequado

4. **Case Sensitivity**:
   - Busca em nomes (abrigo e responsável): **case-insensitive**
   - Busca em telefone: **case-sensitive**

## 🔧 Endpoint: PATCH /sheltered/:id/status

Endpoint para atualizar o status ativo/inativo de um abrigado.

### Request

```http
PATCH /sheltered/:id/status
Authorization: Bearer <token>
Content-Type: application/json
```

### Body

```json
{
  "active": true
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `active` | boolean | Sim | Status ativo (`true`) ou inativo (`false`) |

### Response (200 OK)

Retorna o abrigado atualizado com todos os detalhes:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "João Silva",
  "birthDate": "2010-05-15",
  "guardianName": "Maria Silva",
  "gender": "M",
  "guardianPhone": "+5511999999999",
  "joinedAt": "2024-01-10",
  "active": true,
  "shelter": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Associação Brasília"
  },
  "address": { ... },
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-15T14:30:00.000Z"
}
```

### Exemplo de Uso

#### Ativar abrigado
```bash
curl -X PATCH "http://localhost:3000/sheltered/550e8400-e29b-41d4-a716-446655440000/status" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"active": true}'
```

#### Desativar abrigado
```bash
curl -X PATCH "http://localhost:3000/sheltered/550e8400-e29b-41d4-a716-446655440000/status" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"active": false}'
```

### Permissões

- **Admin**: Pode atualizar status de qualquer abrigado
- **Leader**: Pode atualizar status apenas de abrigados dos abrigos onde está vinculado
- **Teacher**: Pode atualizar status apenas de abrigados dos abrigos onde está vinculado

## 🔗 Endpoints Relacionados

- `GET /sheltered` - Lista completa de abrigados com mais detalhes e filtros avançados
- `GET /sheltered/:id` - Detalhes completos de um abrigado específico
- `POST /sheltered` - Criar novo abrigado
- `PUT /sheltered/:id` - Atualizar abrigado (inclui campo `active`)
- `PATCH /sheltered/:id/status` - Atualizar apenas o status ativo/inativo
- `DELETE /sheltered/:id` - Remover abrigado

## 📚 Exemplos Completos

### Exemplo 1: Buscar abrigados com paginação

```bash
curl -X GET "http://localhost:3000/sheltered/simple?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

### Exemplo 2: Buscar por nome do responsável

```bash
curl -X GET "http://localhost:3000/sheltered/simple?searchString=Silva&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

### Exemplo 3: Buscar por telefone

```bash
curl -X GET "http://localhost:3000/sheltered/simple?searchString=+5511" \
  -H "Authorization: Bearer <token>"
```

### Exemplo 4: Buscar por nome do abrigo

```bash
curl -X GET "http://localhost:3000/sheltered/simple?searchString=Brasília&page=1" \
  -H "Authorization: Bearer <token>"
```

### Exemplo 5: Buscar apenas quem aceitou Jesus

```bash
curl -X GET "http://localhost:3000/sheltered/simple?acceptedJesus=accepted&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

### Exemplo 6: Buscar apenas quem não aceitou Jesus

```bash
curl -X GET "http://localhost:3000/sheltered/simple?acceptedJesus=not_accepted" \
  -H "Authorization: Bearer <token>"
```

### Exemplo 7: Combinar filtros (busca + aceitou Jesus)

```bash
curl -X GET "http://localhost:3000/sheltered/simple?searchString=Maria&acceptedJesus=accepted&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

### Exemplo 8: Filtrar apenas abrigados ativos

```bash
curl -X GET "http://localhost:3000/sheltered/simple?active=active&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

### Exemplo 9: Combinar todos os filtros

```bash
curl -X GET "http://localhost:3000/sheltered/simple?searchString=João&acceptedJesus=accepted&active=active&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

### Exemplo 10: Atualizar status de abrigado

```bash
curl -X PATCH "http://localhost:3000/sheltered/550e8400-e29b-41d4-a716-446655440000/status" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"active": false}'
```

