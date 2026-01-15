# Integration API Documentation

## Visão Geral

O módulo **Integration** gerencia informações sobre integrações de pessoas no GA (Grupos de Afinidade). Permite criar, listar, atualizar e deletar registros de integrações, incluindo upload de imagens via relacionamento polimórfico com `MediaItem`.

---

## Arquitetura

O módulo segue uma arquitetura modular com separação de responsabilidades:

### Services

**`IntegrationService`** (Principal)

- Orquestra operações básicas: criar, listar, buscar
- Delega operações complexas para services especializados

**`UpdateIntegrationService`**

- Responsável por toda lógica de atualização
- Gerencia upload/substituição de imagens no S3
- **Segurança S3:** Deleta arquivo antigo antes de fazer upload do novo
- Suporta upload de arquivo e link externo

**`DeleteIntegrationService`**

- Responsável por toda lógica de deleção
- **Segurança S3:** Remove todas as mídias associadas do bucket antes de deletar o registro
- Previne arquivos órfãos no S3

### Gerenciamento de Mídia

O módulo utiliza `MediaItemProcessor` para:

- Criar relacionamentos polimórficos entre Integration e MediaItem
- Fazer upload/download de arquivos no S3
- Deletar arquivos do S3 de forma segura
- Garantir consistência entre banco de dados e bucket

**Fluxo de Atualização:**

1. Busca mídia existente
2. Se houver arquivo antigo no S3, deleta primeiro
3. Faz upload do novo arquivo
4. Atualiza registro no banco de dados

**Fluxo de Deleção:**

1. Busca todas as mídias associadas
2. Deleta arquivos do S3
3. Remove registros de mídia do banco
4. Deleta a integração

---

## Autenticação e Permissões

**Todos os endpoints requerem:**

- ✅ **Autenticação JWT** (`JwtAuthGuard`)
- ✅ **Permissão de Admin ou Leader** (`AdminOrLeaderRoleGuard`)

**Headers obrigatórios:**

```http
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Criar Integração

**`POST /integrations`**

Cria uma nova integração com upload opcional de imagem.

#### Request

**Content-Type:** `multipart/form-data`

**Body (form-data):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `integrationData` | JSON string | ✅ | Dados da integração (ver estrutura abaixo) |
| `file` | File | ❌ | Arquivo de imagem (JPEG, PNG, etc.) |

**Estrutura do `integrationData` (JSON):**

```json
{
  "name": "João Silva",
  "phone": "(11) 98765-4321",
  "gaLeader": "Maria Santos",
  "baptized": true,
  "churchYears": 5,
  "previousMinistry": "Louvor",
  "integrationYear": 2024,
  "images": [
    {
      "title": "Foto do João",
      "description": "Foto de perfil",
      "url": "https://example.com/photo.jpg"
    },
    {
      "title": "Documento João",
      "description": "Documento de identidade",
      "url": "https://example.com/document.jpg"
    }
  ]
}
```

**DTO de Entrada:** `CreateIntegrationDto`

| Campo | Tipo | Obrigatório | Validação | Descrição |
|-------|------|-------------|-----------|-----------|
| `name` | `string` | ❌ | - | Nome da pessoa |
| `phone` | `string` | ❌ | - | Telefone de contato |
| `gaLeader` | `string` | ❌ | - | Nome do líder de GA |
| `baptized` | `boolean` | ❌ | - | Se a pessoa é batizada |
| `churchYears` | `number` | ❌ | `@IsInt()` | Anos de igreja (inteiro) |
| `previousMinistry` | `string` | ❌ | - | Ministério anterior |
| `integrationYear` | `number` | ❌ | `@IsInt()` | Ano da integração (inteiro) |
| `images` | `MediaItemDto[]` | ❌ | - | Array de metadados das imagens (opcional) |
| `images[].title` | `string` | ❌ | - | Título da imagem |
| `images[].description` | `string` | ❌ | - | Descrição da imagem |

> **Nota:** Todos os campos são opcionais, permitindo flexibilidade no cadastro.

#### Response

**Status:** `201 Created`

**Body:** `IntegrationResponseDto`

```json
{
  "id": "uuid-v4",
  "name": "João Silva",
  "phone": "(11) 98765-4321",
  "gaLeader": "Maria Santos",
  "baptized": true,
  "churchYears": 5,
  "previousMinistry": "Louvor",
  "integrationYear": 2024,
  "images": [{
    "id": "uuid-v4",
    "title": "Foto do João",
    "description": "Foto de perfil",
    "url": "https://s3.amazonaws.com/bucket/path/to/image.jpg",
    "uploadType": "upload",
    "mediaType": "image",
    "isLocalFile": true,
    "originalName": "joao.jpg",
    "size": 245678
  }],
  "createdAt": "2024-01-14T22:00:00.000Z",
  "updatedAt": "2024-01-14T22:00:00.000Z"
}
```

**Possíveis Erros:**

| Status | Descrição |
|--------|-----------|
| `400` | Dados inválidos ou campo `integrationData` ausente |
| `401` | Token inválido ou ausente |
| `403` | Usuário não tem permissão (não é Admin nem Leader) |
| `500` | Erro ao fazer upload da imagem no S3 |

---

### 2. Listar Integrações (Paginado)

**`GET /integrations`**

Lista todas as integrações com paginação e filtros opcionais.

#### Request

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Default | Descrição |
|-----------|------|-------------|---------|-----------|
| `page` | `number` | ❌ | `1` | Número da página (mínimo: 1) |
| `limit` | `number` | ❌ | `10` | Itens por página (mínimo: 1) |
| `search` | `string` | ❌ | - | Busca por nome (case-insensitive, parcial) |
| `integrationYear` | `number` | ❌ | - | Filtrar por ano de integração |

**Exemplo:**

```
GET /integrations?page=1&limit=20&search=João&integrationYear=2024
```

**DTO de Entrada:** `QueryIntegrationDto`

#### Response

**Status:** `200 OK`

**Body:** `PaginatedResponseDto<IntegrationResponseDto>`

```json
{
  "data": [
    {
      "id": "uuid-v4",
      "name": "João Silva",
      "phone": "(11) 98765-4321",
      "gaLeader": "Maria Santos",
      "baptized": true,
      "churchYears": 5,
      "previousMinistry": "Louvor",
      "integrationYear": 2024,
      "image": {
        "id": "uuid-v4",
        "title": "Foto do João",
        "description": "Foto de perfil",
        "url": "https://s3.amazonaws.com/bucket/path/to/image.jpg",
        "uploadType": "upload",
        "mediaType": "image",
        "isLocalFile": true,
        "originalName": "joao.jpg",
        "size": 245678
      },
      "createdAt": "2024-01-14T22:00:00.000Z",
      "updatedAt": "2024-01-14T22:00:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

**Campos da Resposta Paginada:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `data` | `IntegrationResponseDto[]` | Array de integrações |
| `total` | `number` | Total de registros encontrados |
| `page` | `number` | Página atual |
| `limit` | `number` | Itens por página |
| `totalPages` | `number` | Total de páginas |

---

### 3. Listar Integrações (Simples)

**`GET /integrations/simple`**

Lista todas as integrações sem paginação. Útil para dropdowns e seleções.

#### Request

Sem parâmetros.

#### Response

**Status:** `200 OK`

**Body:** `IntegrationResponseDto[]`

```json
[
  {
    "id": "uuid-v4",
    "name": "João Silva",
    "phone": "(11) 98765-4321",
    "gaLeader": "Maria Santos",
    "baptized": true,
    "churchYears": 5,
    "previousMinistry": "Louvor",
    "integrationYear": 2024,
    "image": {
      "id": "uuid-v4",
      "title": "Foto do João",
      "description": "Foto de perfil",
      "url": "https://s3.amazonaws.com/bucket/path/to/image.jpg",
      "uploadType": "upload",
      "mediaType": "image",
      "isLocalFile": true
    },
    "createdAt": "2024-01-14T22:00:00.000Z",
    "updatedAt": "2024-01-14T22:00:00.000Z"
  }
]
```

> **Nota:** Retorna todos os registros ordenados por nome (ASC).

---

### 4. Buscar Integração por ID

**`GET /integrations/:id`**

Busca uma integração específica pelo ID.

#### Request

**Path Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | `UUID` | ID da integração |

**Exemplo:**

```
GET /integrations/550e8400-e29b-41d4-a716-446655440000
```

#### Response

**Status:** `200 OK`

**Body:** `IntegrationResponseDto`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "João Silva",
  "phone": "(11) 98765-4321",
  "gaLeader": "Maria Santos",
  "baptized": true,
  "churchYears": 5,
  "previousMinistry": "Louvor",
  "integrationYear": 2024,
  "images": [{
    "id": "uuid-v4",
    "title": "Foto do João",
    "description": "Foto de perfil",
    "url": "https://s3.amazonaws.com/bucket/path/to/image.jpg",
    "uploadType": "upload",
    "mediaType": "image",
    "isLocalFile": true,
    "originalName": "joao.jpg",
    "size": 245678
  }],
  "createdAt": "2024-01-14T22:00:00.000Z",
  "updatedAt": "2024-01-14T22:00:00.000Z"
}
```

**Possíveis Erros:**

| Status | Descrição |
|--------|-----------|
| `400` | ID inválido (não é UUID) |
| `404` | Integração não encontrada |

---

### 5. Atualizar Integração

**`PUT /integrations/:id`**

Atualiza uma integração existente. Permite atualizar dados e/ou substituir a imagem.

#### Request

**Path Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | `UUID` | ID da integração |

**Content-Type:** `multipart/form-data`

**Body (form-data):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `integrationData` | JSON string | ✅ | Dados da integração (ver estrutura abaixo) |
| `file` | File | ❌ | Novo arquivo de imagem (substitui o anterior) |

**Estrutura do `integrationData` (JSON):**

```json
{
  "name": "João Silva Atualizado",
  "phone": "(11) 91234-5678",
  "baptized": true,
  "churchYears": 6,
  "previousMinistry": "Intercessão",
  "integrationYear": 2023,
  "images": [
    {
      "title": "Nova foto João",
      "description": "Foto atualizada",
      "url": "https://example.com/new-photo.jpg"
    }
  ]
}
```

**DTO de Entrada:** `UpdateIntegrationDto`

| Campo | Tipo | Obrigatório | Validação | Descrição |
|-------|------|-------------|-----------|-----------|
| `name` | `string` | ❌ | - | Nome da pessoa |
| `phone` | `string` | ❌ | - | Telefone de contato |
| `gaLeader` | `string` | ❌ | - | Nome do líder de GA |
| `baptized` | `boolean` | ❌ | - | Se a pessoa é batizada |
| `churchYears` | `number` | ❌ | `@IsInt()` | Anos de igreja (inteiro) |
| `previousMinistry` | `string` | ❌ | - | Ministério anterior |
| `integrationYear` | `number` | ❌ | `@IsInt()` | Ano da integração (inteiro) |
| `images` | `MediaItemDto[]` | ❌ | - | Array de metadados das imagens (opcional) |
| `images[].id` | `string` | ❌ | - | ID da imagem existente |
| `images[].title` | `string` | ❌ | - | Título da imagem |
| `images[].description` | `string` | ❌ | - | Descrição da imagem |

> **Nota:** Apenas os campos enviados serão atualizados (partial update).

> **Importante:** Se um novo arquivo for enviado, a imagem anterior será **deletada do S3** e substituída.

#### Response

**Status:** `200 OK`

**Body:** `IntegrationResponseDto`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "João Silva Atualizado",
  "phone": "(11) 91234-5678",
  "gaLeader": "Maria Santos",
  "baptized": true,
  "churchYears": 6,
  "previousMinistry": "Intercessão",
  "integrationYear": 2023,
  "image": {
    "id": "uuid-v4",
    "title": "Nova foto",
    "description": "Foto atualizada",
    "url": "https://s3.amazonaws.com/bucket/path/to/new-image.jpg",
    "uploadType": "upload",
    "mediaType": "image",
    "isLocalFile": true,
    "originalName": "nova-foto.jpg",
    "size": 312456
  },
  "createdAt": "2024-01-14T22:00:00.000Z",
  "updatedAt": "2024-01-14T22:30:00.000Z"
}
```

**Possíveis Erros:**

| Status | Descrição |
|--------|-----------|
| `400` | Dados inválidos ou campo `integrationData` ausente |
| `404` | Integração não encontrada |
| `500` | Erro ao fazer upload/delete da imagem no S3 |

---

### 6. Deletar Integração

**`DELETE /integrations/:id`**

Deleta uma integração e sua imagem associada (se existir).

#### Request

**Path Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | `UUID` | ID da integração |

**Exemplo:**

```
DELETE /integrations/550e8400-e29b-41d4-a716-446655440000
```

#### Response

**Status:** `200 OK`

**Body:** Vazio

> **Importante:** A imagem associada será **deletada permanentemente do S3**.

**Possíveis Erros:**

| Status | Descrição |
|--------|-----------|
| `400` | ID inválido (não é UUID) |
| `404` | Integração não encontrada |
| `500` | Erro ao deletar imagem do S3 |

---

## DTOs Completos

### IntegrationResponseDto

Estrutura de resposta padrão para uma integração.

```typescript
{
  id: string;                    // UUID da integração
  name?: string;                 // Nome da pessoa
  phone?: string;                // Telefone
  gaLeader?: string;             // Líder de GA
  baptized?: boolean;            // Se é batizado
  churchYears?: number;          // Anos de igreja
  previousMinistry?: string;     // Ministério anterior
  integrationYear?: number;      // Ano da integração
  images?: {                     // Array de imagens (vazio se não houver)
    id: string;
    title: string;
    description: string;
    url: string;
    uploadType: string;          // "upload" ou "link"
    mediaType: string;           // "image"
    isLocalFile: boolean;
    platformType?: string;
    originalName?: string;
    size?: number;               // Tamanho em bytes
  }[];
  createdAt: Date;               // Data de criação
  updatedAt: Date;               // Data de atualização
}
```

---

## Exemplos de Uso

### Exemplo 1: Criar integração com imagem

```bash
curl -X POST http://localhost:3000/integrations \
  -H "Authorization: Bearer <token>" \
  -F 'integrationData={
    "name": "Maria Oliveira",
    "phone": "(21) 99876-5432",
    "gaLeader": "Pedro Costa",
    "baptized": false,
    "churchYears": 2,
    "previousMinistry": "Dança",
    "integrationYear": 2024,
    "images": [
      {
        "title": "Foto Maria",
        "description": "Foto de perfil"
      }
    ]
  }' \
  -F 'file=@/path/to/photo.jpg'
```

### Exemplo 2: Listar com filtros

```bash
curl -X GET "http://localhost:3000/integrations?page=1&limit=10&search=Maria&integrationYear=2024" \
  -H "Authorization: Bearer <token>"
```

### Exemplo 3: Atualizar apenas alguns campos

```bash
curl -X PUT http://localhost:3000/integrations/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <token>" \
  -F 'integrationData={
    "baptized": true,
    "churchYears": 3
  }'
```

### Exemplo 4: Buscar listagem simples

```bash
curl -X GET http://localhost:3000/integrations/simple \
  -H "Authorization: Bearer <token>"
```

---

## Relacionamento Polimórfico

A integração usa relacionamento polimórfico com `MediaItemEntity`:

- **targetType:** `"Integration"`
- **targetId:** ID da integração
- **mediaType:** `"IMAGE"`

Isso permite que a mesma tabela `media_items` armazene imagens de diferentes entidades (Integration, Event, Document, etc.).

---

## Banco de Dados

### Tabela: `integrations`

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | UUID | ❌ | Primary Key |
| `name` | VARCHAR | ✅ | Nome da pessoa |
| `phone` | VARCHAR | ✅ | Telefone |
| `gaLeader` | VARCHAR | ✅ | Líder de GA |
| `baptized` | BOOLEAN | ✅ | Se é batizado |
| `churchYears` | INT | ✅ | Anos de igreja |
| `previousMinistry` | VARCHAR | ✅ | Ministério anterior |
| `integrationYear` | INT | ✅ | Ano da integração |
| `createdAt` | TIMESTAMP | ❌ | Data de criação |
| `updatedAt` | TIMESTAMP | ❌ | Data de atualização |

### Tabela: `media_items` (relacionamento)

Armazena as imagens associadas às integrações com `targetType = 'Integration'`.

---

## Notas Importantes

1. **Todos os campos são opcionais** - Permite flexibilidade no cadastro
2. **Upload de imagem via S3** - Armazenamento seguro e escalável
3. **Deleção em cascata** - Ao deletar uma integração, a imagem é removida do S3
4. **Busca case-insensitive** - O parâmetro `search` busca por nome sem diferenciar maiúsculas/minúsculas
5. **Paginação eficiente** - Use `limit` adequado para evitar sobrecarga
6. **Validação automática** - DTOs validados com `class-validator`
7. **Logging completo** - Todas as operações são logadas para auditoria

---

## Segurança

- ✅ Autenticação JWT obrigatória
- ✅ Apenas Admin e Leader podem acessar
- ✅ Validação de UUIDs nos parâmetros
- ✅ Sanitização de inputs
- ✅ Upload seguro para S3 com validação de tipo de arquivo

---

## Suporte

Para dúvidas ou problemas, consulte os logs da aplicação ou entre em contato com a equipe de desenvolvimento.

