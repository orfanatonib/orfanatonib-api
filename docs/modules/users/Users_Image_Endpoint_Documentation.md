# 🖼️ Users Image Endpoint - Documentação Completa

## 🎯 Visão Geral

O endpoint **PATCH /users/:id/image** permite registrar ou atualizar a imagem de perfil de um usuário. Este endpoint suporta upload de arquivos de imagem ou uso de URLs externas, seguindo o padrão polimórfico de MediaItem do sistema.

### 🔑 Características Principais

- ✅ **Upload de Arquivo**: Suporta upload direto de imagens (form-data)
- ✅ **URL Externa**: Permite uso de URLs externas para imagens (JSON)
- ✅ **Validação de Tipo**: **Apenas imagens são permitidas no modo upload de arquivo**
- ✅ **Atualização Inteligente**: Atualiza imagem existente ou cria nova se não existir
- ✅ **Limpeza Automática**: Remove automaticamente arquivos antigos do S3 ao atualizar
- ✅ **Relacionamento Polimórfico**: Usa MediaItem com `targetType: 'UserEntity'`

### ⚠️ Regra Importante

**Apenas arquivos de imagem são aceitos no modo upload de arquivo.** O sistema valida o MIME type do arquivo e aceita apenas tipos que começam com `image/` (ex: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, etc.).

## 📋 Endpoint

### **PATCH /users/:id/image** - Registrar/Atualizar Imagem do Usuário

Registra ou atualiza a imagem de perfil de um usuário. Suporta dois modos de operação:

1. **Upload de Arquivo** (form-data): Upload direto de uma imagem
2. **URL Externa** (JSON): Uso de uma URL externa para a imagem

---

## 📤 Modo 1: Upload de Arquivo (Form-Data)

### Request

**Método:** `PATCH`  
**URL:** `/users/:id/image`  
**Content-Type:** `multipart/form-data`  
**Authorization:** `Bearer <jwt_token>` (obrigatório - apenas admin)

### Parâmetros de URL

- `id` (UUID, obrigatório): ID do usuário

### Body (Form-Data)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `imageData` | string (JSON) | Opcional* | Dados da imagem em formato JSON string |
| `file` | File | Opcional* | Arquivo de imagem (ou use `fieldKey` para nome customizado) |

\* É necessário enviar `imageData` OU campos diretos (`title`, `url`, etc.). Para upload de arquivo, é necessário enviar o arquivo.

### Estrutura do `imageData` (quando usado):

```json
{
  "title": "Foto do Usuário",
  "description": "Imagem de perfil do usuário",
  "uploadType": "UPLOAD",
  "isLocalFile": true,
  "fieldKey": "file"
}
```

**Campos do imageData:**

- `title` (string, opcional): Título da imagem (padrão: "Foto do Usuário")
- `description` (string, opcional): Descrição da imagem (padrão: "Imagem de perfil do usuário")
- `uploadType` (enum, opcional): Tipo de upload (`UPLOAD` ou `LINK`) - padrão: `UPLOAD` se houver arquivo
- `isLocalFile` (boolean, opcional): Indica se é arquivo local (padrão: `true` se houver arquivo)
- `fieldKey` (string, opcional): Nome do campo do arquivo no form-data (padrão: `"file"`)

### Exemplo de Request (cURL)

```bash
curl -X PATCH \
  'https://api.example.com/users/123e4567-e89b-12d3-a456-426614174000/image' \
  -H 'Authorization: Bearer seu_token_jwt' \
  -F 'imageData={"title":"Minha Foto","description":"Foto de perfil"}' \
  -F 'file=@/caminho/para/imagem.jpg'
```

### Exemplo de Request (JavaScript/Fetch)

```javascript
const formData = new FormData();
formData.append('imageData', JSON.stringify({
  title: 'Minha Foto',
  description: 'Foto de perfil',
  uploadType: 'UPLOAD',
  isLocalFile: true
}));
formData.append('file', fileInput.files[0]);

fetch('/users/123e4567-e89b-12d3-a456-426614174000/image', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer seu_token_jwt'
  },
  body: formData
});
```

### Exemplo de Request (com fieldKey customizado)

```bash
curl -X PATCH \
  'https://api.example.com/users/123e4567-e89b-12d3-a456-426614174000/image' \
  -H 'Authorization: Bearer seu_token_jwt' \
  -F 'imageData={"fieldKey":"avatar"}' \
  -F 'avatar=@/caminho/para/imagem.png'
```

---

## 🌐 Modo 2: URL Externa (JSON)

### Request

**Método:** `PATCH`  
**URL:** `/users/:id/image`  
**Content-Type:** `application/json`  
**Authorization:** `Bearer <jwt_token>` (obrigatório - apenas admin)

### Parâmetros de URL

- `id` (UUID, obrigatório): ID do usuário

### Body (JSON)

```json
{
  "title": "Foto do Usuário",
  "description": "Imagem de perfil do usuário",
  "uploadType": "LINK",
  "url": "https://exemplo.com/imagem.jpg",
  "isLocalFile": false
}
```

**Campos:**

- `title` (string, opcional): Título da imagem (padrão: "Foto do Usuário")
- `description` (string, opcional): Descrição da imagem (padrão: "Imagem de perfil do usuário")
- `uploadType` (enum, obrigatório): Tipo de upload (`UPLOAD` ou `LINK`) - use `LINK` para URLs
- `url` (string, obrigatório): URL externa da imagem
- `isLocalFile` (boolean, opcional): Deve ser `false` para URLs externas

### Exemplo de Request (cURL)

```bash
curl -X PATCH \
  'https://api.example.com/users/123e4567-e89b-12d3-a456-426614174000/image' \
  -H 'Authorization: Bearer seu_token_jwt' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Foto de Perfil",
    "description": "Foto profissional",
    "uploadType": "LINK",
    "url": "https://cdn.exemplo.com/imagens/perfil.jpg",
    "isLocalFile": false
  }'
```

### Exemplo de Request (JavaScript/Fetch)

```javascript
fetch('/users/123e4567-e89b-12d3-a456-426614174000/image', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer seu_token_jwt',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Foto de Perfil',
    description: 'Foto profissional',
    uploadType: 'LINK',
    url: 'https://cdn.exemplo.com/imagens/perfil.jpg',
    isLocalFile: false
  })
});
```

---

## 📥 Response

### Response 200 OK

Retorna a entidade `UserEntity` atualizada:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "+5511999999999",
  "role": "teacher",
  "active": true,
  "completed": true,
  "commonUser": true,
  "createdAt": "2025-09-27T21:00:00.000Z",
  "updatedAt": "2025-10-01T15:30:00.000Z"
}
```

**Nota:** A imagem não aparece diretamente na resposta do usuário, mas está associada através do MediaItem com `targetType: 'UserEntity'` e `targetId: <user_id>`. Para recuperar a imagem, consulte a entidade `MediaItem` correspondente.

---

## ⚠️ Validações e Regras

### Validação de Arquivo (Modo Upload)

- ✅ **Tipo MIME**: Apenas arquivos com MIME type começando com `image/` são aceitos
  - Aceitos: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`, etc.
  - Rejeitados: `application/pdf`, `video/mp4`, `text/plain`, etc.
- ✅ **Arquivo obrigatório**: Para `uploadType: UPLOAD`, o arquivo deve ser enviado
- ✅ **FieldKey**: Se especificado no `imageData`, o arquivo deve ter o mesmo nome de campo

### Validação de URL (Modo Link)

- ✅ **URL obrigatória**: Para `uploadType: LINK`, a URL é obrigatória
- ✅ **isLocalFile**: Deve ser `false` quando usar URL externa

### Validações Gerais

- ✅ **Usuário existe**: O ID do usuário deve existir na base de dados
- ✅ **Autenticação**: Token JWT válido obrigatório
- ✅ **Autorização**: Apenas usuários com role `admin` podem usar este endpoint
- ✅ **Dados obrigatórios**: É necessário enviar `imageData` OU campos diretos (`title`, `url`, etc.)

---

## 🔄 Comportamento do Endpoint

### Se o usuário já possui uma imagem:

1. Busca a imagem existente associada ao usuário
2. Se for upload de arquivo:
   - Valida que o arquivo é uma imagem
   - Remove o arquivo antigo do S3 (se for arquivo local)
   - Faz upload do novo arquivo
   - Atualiza o MediaItem existente
3. Se for URL externa:
   - Remove o arquivo antigo do S3 (se existir e for arquivo local)
   - Atualiza o MediaItem existente com a nova URL

### Se o usuário não possui uma imagem:

1. Cria um novo MediaItem associado ao usuário
2. Se for upload de arquivo:
   - Valida que o arquivo é uma imagem
   - Faz upload do arquivo para o S3
   - Salva o MediaItem com os dados da imagem
3. Se for URL externa:
   - Salva o MediaItem com a URL fornecida

---

## 🔐 Autenticação e Autorização

### Requisitos de Acesso

- **Autenticação**: JWT Token obrigatório
- **Autorização**: Apenas usuários com role `admin`
- **Guards**: `JwtAuthGuard` + `AdminRoleGuard`

### Headers Obrigatórios

```http
Authorization: Bearer <jwt_token>
```

Para form-data, o Content-Type será automaticamente definido como `multipart/form-data`.  
Para JSON, use:

```http
Content-Type: application/json
```

---

## 📊 Estrutura de Dados

### MediaItemEntity (Armazenamento Interno)

A imagem é armazenada como um `MediaItemEntity` com a seguinte estrutura:

```typescript
{
  id: string;                    // UUID único
  title: string;                 // Título da imagem
  description: string;           // Descrição
  mediaType: 'image';            // Sempre 'image' para este endpoint
  uploadType: 'upload' | 'link'; // Tipo de upload
  url: string;                   // URL da imagem (S3 ou externa)
  isLocalFile: boolean;          // true se foi upload, false se é URL
  originalName?: string;         // Nome original do arquivo (apenas upload)
  size?: number;                 // Tamanho do arquivo em bytes (apenas upload)
  targetId: string;              // ID do usuário
  targetType: 'UserEntity';      // Sempre 'UserEntity' para este endpoint
  createdAt: Date;               // Data de criação
  updatedAt: Date;               // Data de atualização
}
```

### UploadType Enum

```typescript
enum UploadType {
  UPLOAD = 'upload',  // Upload de arquivo
  LINK = 'link'       // URL externa
}
```

### MediaType Enum

```typescript
enum MediaType {
  IMAGE = 'image',      // Sempre usado neste endpoint
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio'
}
```

---

## ⚠️ Tratamento de Erros

### 400 - Bad Request

#### Arquivo não é uma imagem (Upload)

```json
{
  "statusCode": 400,
  "message": "Tipo de arquivo inválido. Apenas imagens são permitidas. Tipo recebido: application/pdf",
  "error": "Bad Request"
}
```

#### Arquivo não encontrado

```json
{
  "statusCode": 400,
  "message": "Arquivo não encontrado para upload. FieldKey: file, Arquivos disponíveis: avatar",
  "error": "Bad Request"
}
```

#### Dados obrigatórios ausentes

```json
{
  "statusCode": 400,
  "message": "imageData é obrigatório ou envie campos diretos (title, url, etc.)",
  "error": "Bad Request"
}
```

#### URL ou arquivo obrigatório

```json
{
  "statusCode": 400,
  "message": "URL ou arquivo é obrigatório",
  "error": "Bad Request"
}
```

### 401 - Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 - Forbidden

```json
{
  "statusCode": 403,
  "message": "Access denied",
  "error": "Forbidden"
}
```

### 404 - Not Found

```json
{
  "statusCode": 404,
  "message": "UserEntity not found",
  "error": "Not Found"
}
```

---

## 🔍 Exemplos de Uso

### Exemplo 1: Upload de Imagem Simples

```bash
# Usando cURL
curl -X PATCH \
  'https://api.example.com/users/123e4567-e89b-12d3-a456-426614174000/image' \
  -H 'Authorization: Bearer seu_token_jwt' \
  -F 'file=@foto.jpg'
```

### Exemplo 2: Upload com Metadados

```bash
curl -X PATCH \
  'https://api.example.com/users/123e4567-e89b-12d3-a456-426614174000/image' \
  -H 'Authorization: Bearer seu_token_jwt' \
  -F 'imageData={"title":"Foto Perfil","description":"Foto profissional de João"}' \
  -F 'file=@foto_perfil.png'
```

### Exemplo 3: Usar URL Externa

```bash
curl -X PATCH \
  'https://api.example.com/users/123e4567-e89b-12d3-a456-426614174000/image' \
  -H 'Authorization: Bearer seu_token_jwt' \
  -H 'Content-Type: application/json' \
  -d '{
    "uploadType": "LINK",
    "url": "https://exemplo.com/fotos/joao.jpg"
  }'
```

### Exemplo 4: JavaScript/TypeScript

```typescript
// Upload de arquivo
async function uploadUserImage(userId: string, imageFile: File) {
  const formData = new FormData();
  formData.append('imageData', JSON.stringify({
    title: 'Foto de Perfil',
    description: 'Upload via API',
    uploadType: 'UPLOAD',
    isLocalFile: true
  }));
  formData.append('file', imageFile);

  const response = await fetch(`/users/${userId}/image`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${getToken()}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

// Usar URL externa
async function setUserImageUrl(userId: string, imageUrl: string) {
  const response = await fetch(`/users/${userId}/image`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uploadType: 'LINK',
      url: imageUrl,
      isLocalFile: false
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}
```

---

## 🧪 Casos de Teste

### ✅ Cenários Válidos

1. **Upload de imagem JPEG**: Deve aceitar e fazer upload
2. **Upload de imagem PNG**: Deve aceitar e fazer upload
3. **Upload de imagem GIF**: Deve aceitar e fazer upload
4. **Upload de imagem WebP**: Deve aceitar e fazer upload
5. **URL externa válida**: Deve aceitar e salvar a URL
6. **Atualização de imagem existente**: Deve substituir a imagem antiga
7. **Criação de nova imagem**: Deve criar novo MediaItem

### ❌ Cenários Inválidos

1. **Upload de PDF**: Deve rejeitar com erro 400
2. **Upload de vídeo**: Deve rejeitar com erro 400
3. **Upload sem arquivo**: Deve rejeitar com erro 400
4. **URL sem uploadType LINK**: Deve rejeitar com erro 400
5. **Usuário inexistente**: Deve retornar erro 404
6. **Sem autenticação**: Deve retornar erro 401
7. **Usuário sem permissão admin**: Deve retornar erro 403

---

## 🔧 Limpeza Automática

### Comportamento de Limpeza

Quando uma imagem é atualizada e a imagem antiga era um arquivo local (upload):

1. O sistema tenta deletar o arquivo antigo do S3
2. Se a deleção falhar, um warning é logado, mas a operação continua
3. O novo arquivo ou URL é salvo normalmente

**Nota:** Isso evita acúmulo de arquivos órfãos no S3.

---

## 📈 Performance e Limitações

### Limitações

- **Tamanho máximo de arquivo**: Limitado pela configuração do servidor (padrão NestJS)
- **Tipos de imagem aceitos**: Apenas arquivos com MIME type `image/*`
- **Formato de URL**: Deve ser uma URL válida e acessível

### Recomendações

- **Otimização de imagens**: Recomenda-se otimizar imagens antes do upload
- **Tamanho recomendado**: Imagens de perfil devem ter no máximo 2MB
- **Resolução recomendada**: 500x500px ou similar para imagens de perfil
- **Formatos recomendados**: JPEG ou PNG para melhor compatibilidade

---

## 🔗 Relacionamento com Outros Endpoints

### Para recuperar a imagem do usuário:

Você pode consultar a entidade `MediaItem` usando:

```
GET /media-items?targetId=<user_id>&targetType=UserEntity
```

Ou através do relacionamento polimórfico do MediaItem:

```typescript
// Exemplo de consulta
const userImage = await mediaItemRepository.findOne({
  where: {
    targetId: userId,
    targetType: 'UserEntity',
    mediaType: 'image'
  }
});
```

---

## 📝 Notas Importantes

1. **Validação de Tipo**: Este endpoint **sempre valida** que arquivos enviados são imagens. Não é possível fazer upload de outros tipos de arquivo.

2. **Relacionamento Polimórfico**: A imagem é armazenada usando o padrão polimórfico do sistema, com `targetType: 'UserEntity'` e `targetId` sendo o ID do usuário.

3. **Um por Usuário**: O sistema assume que há apenas uma imagem por usuário. Se já existir uma imagem, ela será atualizada.

4. **S3 Storage**: Arquivos enviados são armazenados no AWS S3. A URL retornada é a URL pública do S3.

5. **Segurança**: Apenas administradores podem modificar imagens de usuários. Isso garante controle total sobre as imagens do sistema.

---

**Users Image Endpoint - Sistema de Orfanato** 🖼️

