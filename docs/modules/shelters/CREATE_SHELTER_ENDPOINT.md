# 📝 Endpoint: Criar Abrigo (Shelter)

## **POST** `/shelters`

Cria um novo abrigo no sistema com suas equipes, endereço, imagem e rota associada.

---

## 🔐 Autenticação e Permissões

**Autenticação:** Obrigatória (Bearer Token JWT)

**Permissões:**
- ✅ **Admin** - Pode criar abrigos
- ❌ **Leader** - **NÃO** pode criar abrigos
- ❌ **Teacher** - **NÃO** pode criar abrigos

---

## 📋 Descrição

Este endpoint permite criar um novo abrigo com as seguintes funcionalidades:

1. **Criação do abrigo** com nome, descrição e endereço
2. **Criação automática de equipes** baseado em `teamsQuantity`
3. **Vinculação de líderes e professores** às equipes (opcional)
4. **Upload de imagem** do abrigo (opcional)
5. **Criação automática de rota** para o abrigo

### ⚠️ Comportamento Importante

- O sistema **sempre cria** `teamsQuantity` equipes numeradas de 1 até `teamsQuantity`
- Se o array `teams` for fornecido, os dados (líderes/professores) serão vinculados às equipes correspondentes
- Se `teams` não for fornecido, as equipes serão criadas vazias (sem líderes/professores)
- Uma **rota** é criada automaticamente para o abrigo com o path gerado a partir do nome
- A imagem (se fornecida) é usada na rota criada

---

## 📤 Formatos de Requisição

O endpoint aceita **dois formatos** de requisição:

### 1. **JSON Puro** (Content-Type: `application/json`)

Envie o body diretamente como JSON.

### 2. **Form-Data** (Content-Type: `multipart/form-data`)

Use este formato quando precisar fazer upload de arquivos. O JSON deve vir no campo `shelterData` como string.

---

## 📦 Estrutura do Request Body

### Campos Obrigatórios

| Campo | Tipo | Validação | Descrição |
|-------|------|-----------|-----------|
| `name` | string | 2-255 caracteres | Nome do abrigo |
| `teamsQuantity` | number | Mínimo: 1 | Quantidade de equipes a serem criadas |
| `address` | object | - | Objeto de endereço completo |

### Campos Opcionais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `description` | string | Descrição do abrigo |
| `teams` | array | Array de equipes com líderes/professores |
| `mediaItem` | object | Configuração para upload de imagem |

---

## 🏗️ Estruturas Detalhadas

### `address` (Obrigatório)

```typescript
{
  street: string;        // Rua (obrigatório)
  number?: string;       // Número (opcional)
  district: string;      // Bairro (obrigatório)
  city: string;          // Cidade (obrigatório)
  state: string;         // Estado (obrigatório)
  postalCode: string;    // CEP (obrigatório)
  complement?: string;   // Complemento (opcional)
}
```

### `teams` (Opcional)

Array de objetos que define líderes e professores para equipes específicas:

```typescript
[
  {
    numberTeam: number;              // Número da equipe (1 até teamsQuantity)
    description?: string;             // Descrição da equipe (opcional)
    leaderProfileIds?: string[];      // Array de UUIDs de líderes (opcional)
    teacherProfileIds?: string[];     // Array de UUIDs de professores (opcional)
  }
]
```

**Regras:**
- `numberTeam` deve estar entre `1` e `teamsQuantity`
- Não pode haver duplicatas de `numberTeam`
- Se uma equipe não for especificada no array, será criada vazia

### `mediaItem` (Opcional)

Configuração para upload de imagem do abrigo:

```typescript
{
  uploadType?: "upload" | "link";    // Tipo de upload
  isLocalFile?: boolean;              // Se é arquivo local (true) ou URL externa (false)
  fieldKey?: string;                  // Nome do campo no form-data (quando uploadType = "upload")
  url?: string;                       // URL da imagem (quando uploadType = "link")
  title?: string;                     // Título da imagem (opcional)
  description?: string;               // Descrição da imagem (opcional)
}
```

**Modos de Upload:**

1. **Upload de arquivo local** (`uploadType: "upload"`):
   - `isLocalFile: true`
   - `fieldKey`: Nome do campo no form-data que contém o arquivo
   - Arquivo deve ser enviado via form-data

2. **Link externo** (`uploadType: "link"`):
   - `isLocalFile: false` ou omitido
   - `url`: URL completa da imagem
   - Não requer form-data

---

## 📝 Exemplos de Requisição

### Exemplo 1: JSON Puro (Sem imagem, sem equipes)

```http
POST /shelters
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Abrigo Central",
  "description": "Abrigo dedicado ao cuidado de crianças e adolescentes",
  "teamsQuantity": 3,
  "address": {
    "street": "Rua das Flores",
    "number": "123",
    "district": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01234-567",
    "complement": "Apto 45"
  }
}
```

### Exemplo 2: JSON Puro (Com equipes, sem imagem)

```http
POST /shelters
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Abrigo Jardins",
  "description": "Abrigo localizado no bairro dos Jardins",
  "teamsQuantity": 2,
  "address": {
    "street": "Rua das Palmeiras",
    "number": "456",
    "district": "Jardins",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01234-890"
  },
  "teams": [
    {
      "numberTeam": 1,
      "description": "Equipe principal",
      "leaderProfileIds": ["123e4567-e89b-12d3-a456-426614174000"],
      "teacherProfileIds": [
        "987fcdeb-51a2-43d7-b456-426614174000",
        "456e7890-e12b-34c5-d678-901234567890"
      ]
    },
    {
      "numberTeam": 2,
      "description": "Equipe secundária",
      "leaderProfileIds": ["111e2222-e33b-44d5-a666-777888999000"]
    }
  ]
}
```

### Exemplo 3: Form-Data (Com upload de imagem)

```http
POST /shelters
Content-Type: multipart/form-data
Authorization: Bearer {token}

shelterData: {
  "name": "Abrigo Norte",
  "description": "Abrigo na região norte",
  "teamsQuantity": 2,
  "address": {
    "street": "Avenida Norte",
    "number": "789",
    "district": "Norte",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01234-111"
  },
  "mediaItem": {
    "uploadType": "upload",
    "isLocalFile": true,
    "fieldKey": "image",
    "title": "Foto do Abrigo Norte",
    "description": "Imagem principal do abrigo"
  }
}

image: [arquivo binário]
```

### Exemplo 4: JSON Puro (Com imagem via URL)

```http
POST /shelters
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Abrigo Sul",
  "teamsQuantity": 1,
  "address": {
    "street": "Rua Sul",
    "district": "Sul",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01234-222"
  },
  "mediaItem": {
    "uploadType": "link",
    "isLocalFile": false,
    "url": "https://example.com/images/shelter-sul.jpg",
    "title": "Foto do Abrigo Sul"
  }
}
```

---

## 📥 Estrutura da Resposta

### Sucesso (201 Created)

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Abrigo Central",
  "description": "Abrigo dedicado ao cuidado de crianças e adolescentes",
  "teamsQuantity": 3,
  "address": {
    "id": "456e7890-e12b-34c5-d678-901234567890",
    "street": "Rua das Flores",
    "number": "123",
    "district": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01234-567",
    "complement": "Apto 45",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "teams": [
    {
      "id": "789e0123-e45b-67c8-d901-234567890123",
      "numberTeam": 1,
      "description": "Equipe principal",
      "leaders": [
        {
          "id": "leader-profile-id",
          "active": true,
          "user": {
            "id": "user-id",
            "name": "João Silva",
            "email": "joao@email.com",
            "phone": "+5511999999999",
            "active": true,
            "completed": true,
            "commonUser": false
          }
        }
      ],
      "teachers": [
        {
          "id": "teacher-profile-id",
          "active": true,
          "user": {
            "id": "user-id-2",
            "name": "Maria Santos",
            "email": "maria@email.com",
            "phone": "+5511888888888",
            "active": true,
            "completed": true,
            "commonUser": false
          }
        }
      ]
    },
    {
      "id": "012e3456-e78b-90c1-d234-567890123456",
      "numberTeam": 2,
      "description": null,
      "leaders": [],
      "teachers": []
    },
    {
      "id": "345e6789-e01b-23c4-d567-890123456789",
      "numberTeam": 3,
      "description": null,
      "leaders": [],
      "teachers": []
    }
  ],
  "leaders": [
    {
      "id": "leader-profile-id",
      "active": true,
      "user": {
        "id": "user-id",
        "name": "João Silva",
        "email": "joao@email.com",
        "phone": "+5511999999999",
        "active": true,
        "completed": true,
        "commonUser": false
      }
    }
  ],
  "teachers": [
    {
      "id": "teacher-profile-id",
      "active": true,
      "user": {
        "id": "user-id-2",
        "name": "Maria Santos",
        "email": "maria@email.com",
        "phone": "+5511888888888",
        "active": true,
        "completed": true,
        "commonUser": false
      }
    }
  ],
  "mediaItem": {
    "id": "media-item-id",
    "title": "Foto do Abrigo Central",
    "description": "Imagem principal do abrigo",
    "mediaType": "IMAGE",
    "uploadType": "UPLOAD",
    "url": "https://s3.amazonaws.com/bucket/path/to/image.jpg",
    "isLocalFile": true,
    "originalName": "shelter-image.jpg",
    "size": 1024000,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Campos da Resposta

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string (UUID) | ID único do abrigo |
| `name` | string | Nome do abrigo |
| `description` | string \| null | Descrição do abrigo |
| `teamsQuantity` | number | Quantidade de equipes |
| `address` | object | Endereço completo do abrigo |
| `teams` | array | Array de equipes com líderes e professores |
| `leaders` | array | Array agregado de todos os líderes de todas as equipes |
| `teachers` | array | Array agregado de todos os professores de todas as equipes |
| `mediaItem` | object \| null | Imagem do abrigo (se fornecida) |
| `createdAt` | string (ISO 8601) | Data de criação |
| `updatedAt` | string (ISO 8601) | Data de última atualização |

---

## ❌ Códigos de Erro

### 400 Bad Request

**Campos obrigatórios ausentes:**
```json
{
  "statusCode": 400,
  "message": [
    {
      "property": "name",
      "constraints": {
        "isString": "name deve ser uma string",
        "length": "name deve ter entre 2 e 255 caracteres"
      }
    }
  ],
  "error": "Bad Request"
}
```

**Validação de equipes:**
```json
{
  "statusCode": 400,
  "message": "numberTeam 5 deve estar entre 1 e 3",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "Duplicata: equipe 2 já foi definida",
  "error": "Bad Request"
}
```

**Professor em múltiplas equipes:**
```json
{
  "statusCode": 400,
  "message": "Professor com ID abc-123 não pode estar em múltiplas equipes. Um professor só pode pertencer a uma equipe.",
  "error": "Bad Request"
}
```

**Arquivo não encontrado (upload):**
```json
{
  "statusCode": 400,
  "message": "Arquivo não encontrado para upload",
  "error": "Bad Request"
}
```

**URL ou arquivo ausente:**
```json
{
  "statusCode": 400,
  "message": "URL ou arquivo é necessário para media item",
  "error": "Bad Request"
}
```

### 401 Unauthorized

**Token ausente ou inválido:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden

**Usuário sem permissão (Teacher):**
```json
{
  "statusCode": 403,
  "message": "Acesso negado",
  "error": "Forbidden"
}
```

### 500 Internal Server Error

**Erro interno do servidor:**
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## ⚠️ Validações e Regras de Negócio

### Validações de Campos

1. **`name`**:
   - ✅ Obrigatório
   - ✅ String
   - ✅ Entre 2 e 255 caracteres

2. **`teamsQuantity`**:
   - ✅ Obrigatório
   - ✅ Número inteiro
   - ✅ Mínimo: 1

3. **`address`**:
   - ✅ Obrigatório
   - ✅ Objeto válido com campos obrigatórios

4. **`teams`** (se fornecido):
   - ✅ Array de objetos
   - ✅ Cada `numberTeam` deve estar entre 1 e `teamsQuantity`
   - ✅ Não pode haver duplicatas de `numberTeam`
   - ✅ `leaderProfileIds` e `teacherProfileIds` devem ser arrays de UUIDs válidos

5. **`mediaItem`** (se fornecido):
   - ✅ Se `uploadType = "upload"`: `fieldKey` e arquivo são obrigatórios
   - ✅ Se `uploadType = "link"`: `url` é obrigatória

### Regras de Negócio

1. **Criação de Equipes**:
   - O sistema **sempre cria** `teamsQuantity` equipes
   - Equipes são numeradas de `1` até `teamsQuantity`
   - Se `teams` não for fornecido, todas as equipes são criadas vazias

2. **Vinculação de Membros**:
   - Líderes e professores são vinculados às equipes através do array `teams`
   - IDs de líderes e professores devem existir no sistema
   
3. **Regras de Professores**:
   - ⚠️ **Um professor só pode estar em UMA equipe** (ou nenhuma)
   - ⚠️ **Um professor NÃO pode estar em múltiplas equipes** simultaneamente
   - Se você tentar atribuir o mesmo professor a múltiplas equipes, será retornado erro 400
   - Se um professor já estiver em outra equipe e for atribuído a uma nova, será movido automaticamente (apenas em atualizações, não na criação)

4. **Regras de Líderes**:
   - ✅ **Um líder pode estar em VÁRIAS equipes** simultaneamente
   - ✅ Um líder pode ser atribuído a múltiplas equipes no mesmo abrigo ou em abrigos diferentes

5. **Regras de Equipes**:
   - ✅ **Uma equipe pode ter VÁRIOS líderes**
   - ✅ **Uma equipe pode ter VÁRIOS professores**
   - Uma equipe pode ter zero ou mais líderes e zero ou mais professores

3. **Rota Automática**:
   - Uma rota é criada automaticamente para o abrigo
   - O path é gerado a partir do nome do abrigo (ex: `abrigo_abrigo-central`)
   - O subtítulo é gerado a partir do endereço: `"Cidade - Estado, Bairro Número"`
   - A imagem (se fornecida) é usada na rota

4. **Transação**:
   - Toda a criação é feita em uma transação
   - Se qualquer parte falhar, tudo é revertido (rollback)

---

## 🔍 Notas Importantes

1. **Form-Data vs JSON**:
   - Use **form-data** quando precisar fazer upload de arquivos
   - Use **JSON puro** quando não houver upload de arquivos
   - No form-data, o JSON deve vir no campo `shelterData` como string

2. **Equipes**:
   - O sistema **sempre cria** todas as equipes definidas em `teamsQuantity`
   - Você pode vincular líderes/professores apenas a algumas equipes
   - Equipes não especificadas no array `teams` serão criadas vazias

3. **Imagem**:
   - A imagem é opcional
   - Se fornecida, será usada na rota criada automaticamente
   - Suporta upload local ou URL externa

4. **Rota**:
   - A rota é criada automaticamente
   - O path é único e gerado a partir do nome
   - A rota é sempre pública (`public: true`)

5. **Mídia**:
   - A criação de mídia é feita dentro da transação
   - Se a criação do abrigo falhar, a mídia também será revertida (rollback)
   - A imagem é usada na rota criada automaticamente

---

## 📚 Exemplos Completos

### Exemplo Completo: Criar Abrigo com Tudo

```http
POST /shelters
Content-Type: multipart/form-data
Authorization: Bearer {token}

shelterData: {
  "name": "Abrigo Esperança",
  "description": "Abrigo dedicado ao cuidado e educação de crianças e adolescentes em situação de vulnerabilidade social",
  "teamsQuantity": 4,
  "address": {
    "street": "Avenida da Esperança",
    "number": "1000",
    "district": "Vila Nova",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01234-567",
    "complement": "Prédio A, 2º andar"
  },
  "teams": [
    {
      "numberTeam": 1,
      "description": "Equipe matutina - Crianças de 6 a 10 anos",
      "leaderProfileIds": ["leader-uuid-1"],
      "teacherProfileIds": ["teacher-uuid-1", "teacher-uuid-2"]
    },
    {
      "numberTeam": 2,
      "description": "Equipe vespertina - Crianças de 11 a 14 anos",
      "leaderProfileIds": ["leader-uuid-2"],
      "teacherProfileIds": ["teacher-uuid-3"]
    },
    {
      "numberTeam": 3,
      "description": "Equipe noturna - Adolescentes de 15 a 17 anos",
      "leaderProfileIds": ["leader-uuid-3"]
    }
  ],
  "mediaItem": {
    "uploadType": "upload",
    "isLocalFile": true,
    "fieldKey": "shelterImage",
    "title": "Foto Principal do Abrigo Esperança",
    "description": "Imagem da fachada do abrigo"
  }
}

shelterImage: [arquivo binário - imagem.jpg]
```

**Resposta:**
```json
{
  "id": "shelter-uuid",
  "name": "Abrigo Esperança",
  "description": "Abrigo dedicado ao cuidado e educação de crianças e adolescentes em situação de vulnerabilidade social",
  "teamsQuantity": 4,
  "address": { /* ... */ },
  "teams": [
    {
      "id": "team-1-uuid",
      "numberTeam": 1,
      "description": "Equipe matutina - Crianças de 6 a 10 anos",
      "leaders": [ /* ... */ ],
      "teachers": [ /* ... */ ]
    },
    {
      "id": "team-2-uuid",
      "numberTeam": 2,
      "description": "Equipe vespertina - Crianças de 11 a 14 anos",
      "leaders": [ /* ... */ ],
      "teachers": [ /* ... */ ]
    },
    {
      "id": "team-3-uuid",
      "numberTeam": 3,
      "description": "Equipe noturna - Adolescentes de 15 a 17 anos",
      "leaders": [ /* ... */ ],
      "teachers": []
    },
    {
      "id": "team-4-uuid",
      "numberTeam": 4,
      "description": null,
      "leaders": [],
      "teachers": []
    }
  ],
  "leaders": [ /* todos os líderes agregados */ ],
  "teachers": [ /* todos os professores agregados */ ],
  "mediaItem": { /* ... */ },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔗 Relacionamentos

Este endpoint cria automaticamente:

1. **ShelterEntity** - O abrigo principal
2. **AddressEntity** - Endereço do abrigo
3. **TeamEntity[]** - Equipes do abrigo (quantidade = `teamsQuantity`)
4. **RouteEntity** - Rota pública para o abrigo
5. **MediaItemEntity** - Imagem do abrigo (se fornecida)
6. **Relacionamentos** - Ligações entre equipes, líderes e professores

---

## 📖 Referências

- [Documentação Completa de Shelters](./Shelters_API_Documentation.md)
- [Documentação de Equipes (Teams)](../../teams/README.md)
- [Documentação de Rotas](../../route/README.md)
- [Documentação de Media Items](../../share/media/README.md)

---

**Última atualização:** 2024-01-01
