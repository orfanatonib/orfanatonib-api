# Módulo de Materiais de Visita

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Mudança de Nomenclatura: Week → Visit](#mudança-de-nomenclatura-week--visit)
3. [Endpoints](#endpoints)
4. [DTOs de Entrada](#dtos-de-entrada)
5. [DTOs de Saída](#dtos-de-saída)
6. [Enums e Tipos](#enums-e-tipos)
7. [Exemplos de Requisições](#exemplos-de-requisições)
8. [Códigos de Erro](#códigos-de-erro)

---

## Visão Geral

O módulo de **Materiais de Visita** gerencia páginas de conteúdo bíblico organizadas por testamento (Antigo ou Novo Testamento). Cada página pode conter vídeos, documentos, imagens e áudios relacionados ao material de visita.

**Base URL:** `/visit-material-pages`

**Autenticação:** Todos os endpoints requerem autenticação JWT. Endpoints de criação, atualização e remoção requerem permissão de administrador.

---

## Mudança de Nomenclatura: Week → Visit

### ⚠️ IMPORTANTE: Mudança de Terminologia

O módulo foi **renomeado de "Week Material" para "Visit Material"**. Esta mudança reflete uma atualização conceitual importante:

- **Antes:** `week-material-pages` → Material da Semana
- **Agora:** `visit-material-pages` → Material de Visita

### Mudanças nos Endpoints

| Endpoint Antigo | Endpoint Novo | Status |
|----------------|---------------|--------|
| `GET /week-material-pages/current-week` | `GET /visit-material-pages/current-material` | ✅ Atualizado |
| `POST /week-material-pages/current-week/:id` | `POST /visit-material-pages/current-material/:id` | ✅ Atualizado |

### Mudanças nos DTOs

- **Entidade:** `WeekMaterialsPageEntity` → `VisitMaterialsPageEntity`
- **DTOs:** `CreateWeekMaterialDto` → `CreateVisitMaterialsPageDto`
- **Response:** `WeekMaterialResponseDTO` → `VisitMaterialsPageResponseDTO`

### Campo `currentWeek`

⚠️ **Nota Importante:** O campo `currentWeek` (boolean) ainda existe no DTO de resposta e na entidade, mas os endpoints foram renomeados para usar `current-material` em vez de `current-week`. Este campo indica se a página é o material atual de visita.

---

## Endpoints

### 1. Criar Página de Material de Visita

**POST** `/visit-material-pages`

**Autenticação:** ✅ JWT + Admin

**Content-Type:** `multipart/form-data`

**Body (Form Data):**
- `visitMaterialsPageData` (string, JSON): Dados da página em formato JSON
- Arquivos opcionais para upload de mídia

**Resposta:** `VisitMaterialsPageResponseDTO`

---

### 2. Atualizar Página de Material de Visita

**PATCH** `/visit-material-pages/:id`

**Autenticação:** ✅ JWT + Admin

**Parâmetros:**
- `id` (string, UUID): ID da página a ser atualizada

**Content-Type:** `multipart/form-data`

**Body (Form Data):**
- `visitMaterialsPageData` (string, JSON): Dados atualizados da página em formato JSON
- Arquivos opcionais para upload de mídia

**Resposta:** `VisitMaterialsPageResponseDTO`

---

### 3. Remover Página de Material de Visita

**DELETE** `/visit-material-pages/:id`

**Autenticação:** ✅ JWT + Admin

**Parâmetros:**
- `id` (string, UUID): ID da página a ser removida

**Resposta:** `204 No Content`

---

### 4. Listar Todas as Páginas

**GET** `/visit-material-pages`

**Autenticação:** ✅ JWT

**Resposta:** `VisitMaterialsPageResponseDTO[]`

---

### 5. Buscar Página por ID

**GET** `/visit-material-pages/:id`

**Autenticação:** ✅ JWT

**Parâmetros:**
- `id` (string, UUID): ID da página

**Resposta:** `VisitMaterialsPageResponseDTO`

---

### 6. Obter Material Atual de Visita

**GET** `/visit-material-pages/current-material`

**Autenticação:** ✅ JWT

**Resposta:** `VisitMaterialsPageResponseDTO | null`

**Descrição:** Retorna a página marcada como material atual (`currentWeek: true`). Se não houver material atual, retorna `null`.

---

### 7. Definir Material Atual de Visita

**POST** `/visit-material-pages/current-material/:id`

**Autenticação:** ✅ JWT + Admin

**Parâmetros:**
- `id` (string, UUID): ID da página a ser definida como material atual

**Resposta:** `VisitMaterialsPageResponseDTO`

**Descrição:** Define a página especificada como material atual. Automaticamente desmarca outras páginas como atuais.

---

## DTOs de Entrada

### CreateVisitMaterialsPageDto

DTO para criação de uma nova página de material de visita.

```typescript
{
  pageTitle: string;                    // Obrigatório - Título da página
  pageSubtitle: string;                 // Obrigatório - Subtítulo da página
  testament?: TestamentType;            // Opcional - Tipo de testamento (padrão: OLD_TESTAMENT)
  pageDescription: string;              // Obrigatório - Descrição da página
  videos?: MediaItemDto[];              // Opcional - Array de vídeos
  documents?: MediaItemDto[];           // Opcional - Array de documentos
  images?: MediaItemDto[];              // Opcional - Array de imagens
  audios?: MediaItemDto[];              // Opcional - Array de áudios
}
```

**Validações:**
- `pageTitle`: String obrigatória
- `pageSubtitle`: String obrigatória
- `testament`: Enum `TestamentType` (opcional, padrão: `OLD_TESTAMENT`)
- `pageDescription`: String obrigatória
- Arrays de mídia: Opcionais, mas se fornecidos, devem seguir a estrutura de `MediaItemDto`

---

### UpdateVisitMaterialsPageDto

DTO para atualização de uma página existente.

```typescript
{
  id: string;                           // Obrigatório - ID da página (UUID)
  pageTitle: string;                    // Obrigatório - Título da página
  pageSubtitle: string;                 // Obrigatório - Subtítulo da página
  testament?: TestamentType;            // Opcional - Tipo de testamento
  pageDescription: string;              // Obrigatório - Descrição da página
  currentWeek: boolean;                 // Obrigatório - Se é o material atual
  videos?: MediaItemDto[];              // Opcional - Array de vídeos
  documents?: MediaItemDto[];           // Opcional - Array de documentos
  images?: MediaItemDto[];              // Opcional - Array de imagens
  audios?: MediaItemDto[];              // Opcional - Array de áudios
}
```

**Validações:**
- `id`: String UUID obrigatória
- `pageTitle`: String obrigatória
- `pageSubtitle`: String obrigatória
- `testament`: Enum `TestamentType` (opcional)
- `pageDescription`: String obrigatória
- `currentWeek`: Boolean obrigatório
- Arrays de mídia: Opcionais, mas se fornecidos, devem seguir a estrutura de `MediaItemDto`

---

### MediaItemDto

DTO para itens de mídia (vídeos, documentos, imagens, áudios).

```typescript
{
  id?: string;                          // Opcional - ID do item (para atualização)
  title?: string;                       // Opcional - Título do item
  description?: string;                 // Opcional - Descrição do item
  uploadType: UploadType;               // Obrigatório - Tipo de upload ('link' | 'upload')
  mediaType: MediaType;                 // Obrigatório - Tipo de mídia ('video' | 'document' | 'image' | 'audio')
  isLocalFile: boolean;                 // Obrigatório - Se é arquivo local ou link externo
  url?: string;                         // Opcional - URL do item (obrigatório se uploadType = 'link')
  platformType?: PlatformType;          // Opcional - Plataforma (youtube, googledrive, etc.)
  originalName?: string;                // Opcional - Nome original do arquivo
  fieldKey?: string;                    // Opcional - Chave do campo para upload (obrigatório se uploadType = 'upload')
  size?: number;                        // Opcional - Tamanho do arquivo em bytes
  fileField?: string;                   // Opcional - Campo do arquivo
}
```

**Validações:**
- `uploadType`: Enum obrigatório (`'link'` ou `'upload'`)
- `mediaType`: Enum obrigatório (`'video'`, `'document'`, `'image'` ou `'audio'`)
- `isLocalFile`: Boolean obrigatório
- Se `uploadType = 'link'`: `url` é obrigatório
- Se `uploadType = 'upload'`: `fieldKey` é obrigatório e deve corresponder ao nome do campo no form-data

**Regras de Negócio:**
- Para **links externos**: `uploadType = 'link'`, `isLocalFile = false`, fornecer `url`
- Para **uploads de arquivo**: `uploadType = 'upload'`, `isLocalFile = true`, fornecer `fieldKey` que corresponde ao nome do campo no form-data
- `platformType` é usado principalmente para links externos (ex: YouTube, Google Drive)

---

## DTOs de Saída

### VisitMaterialsPageResponseDTO

DTO de resposta completo para uma página de material de visita.

```typescript
{
  id: string;                           // ID único da página (UUID)
  title: string;                        // Título da página
  subtitle: string;                     // Subtítulo da página
  testament: TestamentType;             // Tipo de testamento ('OLD_TESTAMENT' | 'NEW_TESTAMENT')
  description: string;                  // Descrição da página
  currentWeek: boolean;                 // Se é o material atual de visita
  route: VisitRouteResponseDTO;         // Informações da rota
  videos: VisitMediaItemResponseDTO[];  // Array de vídeos
  documents: VisitMediaItemResponseDTO[]; // Array de documentos
  images: VisitMediaItemResponseDTO[];  // Array de imagens
  audios: VisitMediaItemResponseDTO[];  // Array de áudios
  createdAt: Date;                      // Data de criação (ISO 8601)
  updatedAt: Date;                      // Data de atualização (ISO 8601)
}
```

---

### VisitRouteResponseDTO

DTO de resposta para informações da rota.

```typescript
{
  id: string;                           // ID único da rota (UUID)
  path: string;                         // Caminho da rota (ex: 'materiais_visita_genesis_a_criacao')
  title: string;                        // Título da rota
  subtitle: string;                     // Subtítulo da rota
  description: string;                  // Descrição da rota
  type: RouteType;                      // Tipo de rota ('page' | 'doc' | 'image' | 'other')
  public: boolean;                      // Se a rota é pública
}
```

---

### VisitMediaItemResponseDTO

DTO de resposta para itens de mídia.

```typescript
{
  id: string;                           // ID único do item (UUID)
  title: string;                        // Título do item
  description: string;                  // Descrição do item
  uploadType: UploadType;               // Tipo de upload ('link' | 'upload')
  mediaType: MediaType;                 // Tipo de mídia ('video' | 'document' | 'image' | 'audio')
  platformType?: PlatformType;          // Plataforma (se aplicável)
  url: string;                          // URL do item
  isLocalFile?: boolean;                // Se é arquivo local
  size?: number;                        // Tamanho do arquivo em bytes
  originalName?: string;                // Nome original do arquivo
}
```

---

## Enums e Tipos

### TestamentType

Enum para tipo de testamento.

```typescript
enum TestamentType {
  OLD_TESTAMENT = 'OLD_TESTAMENT',      // Antigo Testamento
  NEW_TESTAMENT = 'NEW_TESTAMENT',      // Novo Testamento
}
```

**Valores:**
- `'OLD_TESTAMENT'`: Antigo Testamento (padrão)
- `'NEW_TESTAMENT'`: Novo Testamento

---

### UploadType

Enum para tipo de upload.

```typescript
enum UploadType {
  LINK = 'link',                        // Link externo
  UPLOAD = 'upload',                    // Upload de arquivo
}
```

**Valores:**
- `'link'`: Link externo (YouTube, Google Drive, etc.)
- `'upload'`: Upload de arquivo local

---

### MediaType

Enum para tipo de mídia.

```typescript
enum MediaType {
  VIDEO = 'video',                      // Vídeo
  DOCUMENT = 'document',                // Documento
  IMAGE = 'image',                      // Imagem
  AUDIO = 'audio',                      // Áudio
}
```

**Valores:**
- `'video'`: Vídeo
- `'document'`: Documento (PDF, DOC, etc.)
- `'image'`: Imagem (JPG, PNG, etc.)
- `'audio'`: Áudio (MP3, WAV, etc.)

---

### PlatformType

Enum para plataforma de mídia externa.

```typescript
enum PlatformType {
  YOUTUBE = 'youtube',                  // YouTube
  GOOGLE_DRIVE = 'googledrive',         // Google Drive
  ONEDRIVE = 'onedrive',                // OneDrive
  DROPBOX = 'dropbox',                  // Dropbox
  ANY = 'ANY',                          // Qualquer outra plataforma
}
```

**Valores:**
- `'youtube'`: YouTube
- `'googledrive'`: Google Drive
- `'onedrive'`: OneDrive
- `'dropbox'`: Dropbox
- `'ANY'`: Qualquer outra plataforma

---

### RouteType

Enum para tipo de rota.

```typescript
enum RouteType {
  PAGE = 'page',                        // Página
  DOC = 'doc',                          // Documento
  IMAGE = 'image',                      // Imagem
  OTHER = 'other',                      // Outro
}
```

**Valores:**
- `'page'`: Página (usado para materiais de visita)
- `'doc'`: Documento
- `'image'`: Imagem
- `'other'`: Outro

---

## Exemplos de Requisições

### 1. Criar Página de Material de Visita

**Request:**
```http
POST /visit-material-pages
Content-Type: multipart/form-data
Authorization: Bearer {token}

visitMaterialsPageData: {
  "pageTitle": "Gênesis - A Criação",
  "pageSubtitle": "O início de todas as coisas",
  "testament": "OLD_TESTAMENT",
  "pageDescription": "Estudo sobre o livro de Gênesis e a criação do mundo",
  "videos": [
    {
      "title": "Vídeo sobre Gênesis",
      "description": "Explicação sobre a criação",
      "uploadType": "link",
      "mediaType": "video",
      "isLocalFile": false,
      "url": "https://www.youtube.com/watch?v=example",
      "platformType": "youtube"
    }
  ],
  "documents": [
    {
      "title": "Estudo em PDF",
      "description": "Material de estudo",
      "uploadType": "link",
      "mediaType": "document",
      "isLocalFile": false,
      "url": "https://example.com/estudo.pdf"
    }
  ],
  "images": [
    {
      "title": "Ilustração",
      "description": "Imagem ilustrativa",
      "uploadType": "upload",
      "mediaType": "image",
      "isLocalFile": true,
      "fieldKey": "image1"
    }
  ],
  "audios": []
}

image1: [arquivo binário]
```

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Gênesis - A Criação",
  "subtitle": "O início de todas as coisas",
  "testament": "OLD_TESTAMENT",
  "description": "Estudo sobre o livro de Gênesis e a criação do mundo",
  "currentWeek": false,
  "route": {
    "id": "route-id-123",
    "path": "materiais_visita_genesis_a_criacao",
    "title": "Gênesis - A Criação",
    "subtitle": "O início de todas as coisas",
    "description": "Estudo sobre o livro de Gênesis e a criação do mundo",
    "type": "page",
    "public": true
  },
  "videos": [
    {
      "id": "video-id-123",
      "title": "Vídeo sobre Gênesis",
      "description": "Explicação sobre a criação",
      "uploadType": "link",
      "mediaType": "video",
      "platformType": "youtube",
      "url": "https://www.youtube.com/watch?v=example",
      "isLocalFile": false
    }
  ],
  "documents": [
    {
      "id": "doc-id-123",
      "title": "Estudo em PDF",
      "description": "Material de estudo",
      "uploadType": "link",
      "mediaType": "document",
      "url": "https://example.com/estudo.pdf",
      "isLocalFile": false
    }
  ],
  "images": [
    {
      "id": "image-id-123",
      "title": "Ilustração",
      "description": "Imagem ilustrativa",
      "uploadType": "upload",
      "mediaType": "image",
      "url": "https://s3.amazonaws.com/bucket/image.jpg",
      "isLocalFile": true,
      "size": 1024000,
      "originalName": "ilustracao.jpg"
    }
  ],
  "audios": [],
  "createdAt": "2025-12-08T10:00:00.000Z",
  "updatedAt": "2025-12-08T10:00:00.000Z"
}
```

---

### 2. Atualizar Página de Material de Visita

**Request:**
```http
PATCH /visit-material-pages/123e4567-e89b-12d3-a456-426614174000
Content-Type: multipart/form-data
Authorization: Bearer {token}

visitMaterialsPageData: {
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "pageTitle": "Gênesis - A Criação (Atualizado)",
  "pageSubtitle": "O início de todas as coisas",
  "testament": "OLD_TESTAMENT",
  "pageDescription": "Estudo atualizado sobre o livro de Gênesis",
  "currentWeek": true,
  "videos": [
    {
      "id": "video-id-123",
      "title": "Vídeo atualizado",
      "description": "Nova explicação",
      "uploadType": "link",
      "mediaType": "video",
      "isLocalFile": false,
      "url": "https://www.youtube.com/watch?v=new-example",
      "platformType": "youtube"
    },
    {
      "title": "Novo vídeo",
      "description": "Adicionando novo vídeo",
      "uploadType": "link",
      "mediaType": "video",
      "isLocalFile": false,
      "url": "https://www.youtube.com/watch?v=another",
      "platformType": "youtube"
    }
  ],
  "documents": [],
  "images": [],
  "audios": []
}
```

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Gênesis - A Criação (Atualizado)",
  "subtitle": "O início de todas as coisas",
  "testament": "OLD_TESTAMENT",
  "description": "Estudo atualizado sobre o livro de Gênesis",
  "currentWeek": true,
  "route": {
    "id": "route-id-123",
    "path": "materiais_visita_genesis_a_criacao_atualizado",
    "title": "Gênesis - A Criação (Atualizado)",
    "subtitle": "O início de todas as coisas",
    "description": "Estudo atualizado sobre o livro de Gênesis",
    "type": "page",
    "public": true
  },
  "videos": [
    {
      "id": "video-id-123",
      "title": "Vídeo atualizado",
      "description": "Nova explicação",
      "uploadType": "link",
      "mediaType": "video",
      "platformType": "youtube",
      "url": "https://www.youtube.com/watch?v=new-example",
      "isLocalFile": false
    },
    {
      "id": "video-id-456",
      "title": "Novo vídeo",
      "description": "Adicionando novo vídeo",
      "uploadType": "link",
      "mediaType": "video",
      "platformType": "youtube",
      "url": "https://www.youtube.com/watch?v=another",
      "isLocalFile": false
    }
  ],
  "documents": [],
  "images": [],
  "audios": [],
  "createdAt": "2025-12-08T10:00:00.000Z",
  "updatedAt": "2025-12-08T11:00:00.000Z"
}
```

---

### 3. Listar Todas as Páginas

**Request:**
```http
GET /visit-material-pages
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Gênesis - A Criação",
    "subtitle": "O início de todas as coisas",
    "testament": "OLD_TESTAMENT",
    "description": "Estudo sobre o livro de Gênesis",
    "currentWeek": true,
    "route": { ... },
    "videos": [ ... ],
    "documents": [ ... ],
    "images": [ ... ],
    "audios": [ ... ],
    "createdAt": "2025-12-08T10:00:00.000Z",
    "updatedAt": "2025-12-08T10:00:00.000Z"
  },
  {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "title": "Mateus - O Evangelho do Reino",
    "subtitle": "O evangelho segundo Mateus",
    "testament": "NEW_TESTAMENT",
    "description": "Estudo sobre o evangelho de Mateus",
    "currentWeek": false,
    "route": { ... },
    "videos": [ ... ],
    "documents": [ ... ],
    "images": [ ... ],
    "audios": [ ... ],
    "createdAt": "2025-12-08T11:00:00.000Z",
    "updatedAt": "2025-12-08T11:00:00.000Z"
  }
]
```

---

### 4. Buscar Página por ID

**Request:**
```http
GET /visit-material-pages/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Gênesis - A Criação",
  "subtitle": "O início de todas as coisas",
  "testament": "OLD_TESTAMENT",
  "description": "Estudo sobre o livro de Gênesis",
  "currentWeek": true,
  "route": { ... },
  "videos": [ ... ],
  "documents": [ ... ],
  "images": [ ... ],
  "audios": [ ... ],
  "createdAt": "2025-12-08T10:00:00.000Z",
  "updatedAt": "2025-12-08T10:00:00.000Z"
}
```

---

### 5. Obter Material Atual de Visita

**Request:**
```http
GET /visit-material-pages/current-material
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Gênesis - A Criação",
  "subtitle": "O início de todas as coisas",
  "testament": "OLD_TESTAMENT",
  "description": "Estudo sobre o livro de Gênesis",
  "currentWeek": true,
  "route": { ... },
  "videos": [ ... ],
  "documents": [ ... ],
  "images": [ ... ],
  "audios": [ ... ],
  "createdAt": "2025-12-08T10:00:00.000Z",
  "updatedAt": "2025-12-08T10:00:00.000Z"
}
```

**Response (200 OK) - Sem material atual:**
```json
null
```

---

### 6. Definir Material Atual de Visita

**Request:**
```http
POST /visit-material-pages/current-material/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Gênesis - A Criação",
  "subtitle": "O início de todas as coisas",
  "testament": "OLD_TESTAMENT",
  "description": "Estudo sobre o livro de Gênesis",
  "currentWeek": true,
  "route": { ... },
  "videos": [ ... ],
  "documents": [ ... ],
  "images": [ ... ],
  "audios": [ ... ],
  "createdAt": "2025-12-08T10:00:00.000Z",
  "updatedAt": "2025-12-08T11:00:00.000Z"
}
```

---

### 7. Remover Página de Material de Visita

**Request:**
```http
DELETE /visit-material-pages/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer {token}
```

**Response (204 No Content):**
```
(sem corpo de resposta)
```

---

## Códigos de Erro

### 400 Bad Request

**Causas:**
- `visitMaterialsPageData` não fornecido
- Dados inválidos no DTO
- Validação de campos falhou
- Arquivo ausente quando `fieldKey` é fornecido

**Exemplo:**
```json
{
  "message": "visitMaterialsPageData é obrigatório.",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### 401 Unauthorized

**Causas:**
- Token JWT ausente ou inválido
- Token expirado

**Exemplo:**
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

---

### 403 Forbidden

**Causas:**
- Usuário não tem permissão de administrador
- Tentativa de acessar endpoint restrito

**Exemplo:**
```json
{
  "message": "Forbidden resource",
  "error": "Forbidden",
  "statusCode": 403
}
```

---

### 404 Not Found

**Causas:**
- Página não encontrada (ID inválido)
- Material atual não encontrado

**Exemplo:**
```json
{
  "message": "Página de materiais não encontrada",
  "error": "Not Found",
  "statusCode": 404
}
```

---

### 500 Internal Server Error

**Causas:**
- Erro interno do servidor
- Falha ao processar upload
- Erro de banco de dados

**Exemplo:**
```json
{
  "message": "Erro ao criar a página de materiais: [detalhes do erro]",
  "error": "Internal Server Error",
  "statusCode": 500
}
```

---

## Notas Importantes

### Upload de Arquivos

1. **Formato:** Use `multipart/form-data` para requisições com arquivos
2. **Campo JSON:** O campo `visitMaterialsPageData` deve ser uma string JSON
3. **Field Keys:** Quando usar `uploadType: 'upload'`, o `fieldKey` deve corresponder ao nome do campo no form-data
4. **Tamanho:** Verifique os limites de tamanho de arquivo configurados no servidor

### Atualização de Mídia

- **Adicionar novo item:** Envie o item sem `id`
- **Atualizar item existente:** Inclua o `id` do item
- **Remover item:** Não inclua o item no array

### Material Atual

- Apenas uma página pode ser marcada como `currentWeek: true` por vez
- Ao definir uma nova página como atual, a anterior é automaticamente desmarcada
- Use o endpoint `POST /visit-material-pages/current-material/:id` para definir o material atual

### Paths de Rota

- Os paths são gerados automaticamente a partir do título
- Se houver duplicatas, o sistema adiciona sufixos numéricos (ex: `_2`, `_3`)
- Paths são gerados em formato slug (minúsculas, sem acentos, espaços substituídos por `_`)

---

## Resumo das Mudanças: Week → Visit

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Módulo** | `week-material-pages` | `visit-material-pages` |
| **Endpoint atual** | `/current-week` | `/current-material` |
| **Entidade** | `WeekMaterialsPageEntity` | `VisitMaterialsPageEntity` |
| **DTOs** | `CreateWeekMaterialDto` | `CreateVisitMaterialsPageDto` |
| **Campo** | `currentWeek` (mantido) | `currentWeek` (mantido) |

⚠️ **Importante:** O campo `currentWeek` ainda existe no banco de dados e nos DTOs, mas os endpoints foram renomeados para refletir a nova nomenclatura "visit" em vez de "week".

---

**Última atualização:** 08/12/2025

