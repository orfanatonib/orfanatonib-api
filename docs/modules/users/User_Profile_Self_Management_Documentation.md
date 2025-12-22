# 👤 User Profile Self-Management - Documentação Completa

## 🎯 Visão Geral

Esta documentação descreve os endpoints disponíveis para que **o próprio usuário** gerencie seu perfil pessoal, sem necessidade de permissões de administrador. Todos os endpoints estão disponíveis em `/profile` e requerem apenas autenticação JWT válida.

### 🔑 Características Principais

- ✅ **Sem necessidade de admin**: Apenas autenticação JWT necessária
- ✅ **Segurança**: Usuário só pode alterar seus próprios dados
- ✅ **Validação de senha**: Alteração de senha requer senha atual
- ✅ **Validação de email**: Impede duplicação de emails
- ✅ **Imagem de perfil**: Upload e atualização de foto de perfil

### 🔐 Autenticação

Todos os endpoints requerem:
- **Autenticação**: JWT Token válido no header `Authorization`
- **Auto-detecção**: O ID do usuário é extraído automaticamente do token JWT
- **Sem Admin**: Não requer permissões de administrador

**Headers Obrigatórios:**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json (ou multipart/form-data para uploads)
```

---

## 📋 Endpoints Disponíveis

### 1. **PATCH /profile** - Atualizar Perfil Próprio

Atualiza as informações básicas do perfil do usuário autenticado.

#### Campos Editáveis

- ✅ `name` (string): Nome completo do usuário
- ✅ `email` (string): Email do usuário (verifica duplicação)
- ✅ `phone` (string): Telefone do usuário
- ❌ `password`: **NÃO pode ser alterado aqui** - use `/profile/password`
- ❌ `role`: **NÃO pode ser alterado** - apenas admin pode alterar
- ❌ `active`: **NÃO pode ser alterado** - apenas admin pode alterar
- ❌ `completed`: **NÃO pode ser alterado** - apenas admin pode alterar

#### Request

**Método:** `PATCH`  
**URL:** `/profile`  
**Content-Type:** `application/json`

#### Body (JSON)

```json
{
  "name": "João Silva Atualizado",
  "email": "joao.novo@example.com",
  "phone": "+5511999999999"
}
```

**Todos os campos são opcionais.** Você pode enviar apenas os campos que deseja atualizar.

#### Exemplo de Request (cURL)

```bash
curl -X PATCH \
  'https://api.example.com/profile' \
  -H 'Authorization: Bearer seu_token_jwt' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "João Silva",
    "phone": "+5511888888888"
  }'
```

#### Exemplo de Request (JavaScript/Fetch)

```javascript
fetch('/profile', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '+5511999999999'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

#### Response 200 OK

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

#### Validações

- ✅ **Nome**: Mínimo de 2 caracteres
- ✅ **Email**: Deve ser um email válido e único no sistema
- ✅ **Telefone**: String válida
- ✅ **Email duplicado**: Se tentar usar um email já em uso por outro usuário, retorna erro 400

---

### 2. **PATCH /profile/password** - Alterar Senha

Altera a senha do usuário autenticado. **Requer a senha atual** para validação de segurança.

#### Request

**Método:** `PATCH`  
**URL:** `/profile/password`  
**Content-Type:** `application/json`

#### Body (JSON)

```json
{
  "currentPassword": "senha_atual_123",
  "newPassword": "nova_senha_456"
}
```

**Campos obrigatórios:**
- `currentPassword` (string): Senha atual do usuário
- `newPassword` (string): Nova senha (mínimo 6 caracteres)

#### Exemplo de Request (cURL)

```bash
curl -X PATCH \
  'https://api.example.com/profile/password' \
  -H 'Authorization: Bearer seu_token_jwt' \
  -H 'Content-Type: application/json' \
  -d '{
    "currentPassword": "minha_senha_123",
    "newPassword": "nova_senha_segura_456"
  }'
```

#### Exemplo de Request (JavaScript/Fetch)

```javascript
fetch('/profile/password', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    currentPassword: 'senha_atual',
    newPassword: 'nova_senha_segura'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

#### Response 200 OK

```json
{
  "message": "Senha alterada com sucesso"
}
```

#### Validações

- ✅ **Senha atual obrigatória**: Deve fornecer a senha atual
- ✅ **Senha atual correta**: Deve ser a senha atual do usuário
- ✅ **Nova senha**: Mínimo de 6 caracteres
- ✅ **Nova senha diferente**: A nova senha deve ser diferente da atual
- ✅ **Hash seguro**: A nova senha é armazenada com hash bcrypt

#### ⚠️ Erros Possíveis

**401 - Senha atual incorreta:**
```json
{
  "statusCode": 401,
  "message": "Senha atual incorreta",
  "error": "Unauthorized"
}
```

**400 - Nova senha igual à atual:**
```json
{
  "statusCode": 400,
  "message": "A nova senha deve ser diferente da senha atual",
  "error": "Bad Request"
}
```

**400 - Nova senha muito curta:**
```json
{
  "statusCode": 400,
  "message": ["A nova senha deve ter pelo menos 6 caracteres"],
  "error": "Bad Request"
}
```

---

### 3. **PATCH /profile/image** - Atualizar Imagem de Perfil

Atualiza a imagem de perfil do usuário autenticado. Suporta upload de arquivo ou URL externa.

> 📖 **Documentação completa**: Veja [Users_Image_Endpoint_Documentation.md](./Users_Image_Endpoint_Documentation.md) para detalhes completos sobre este endpoint.

#### Request

**Método:** `PATCH`  
**URL:** `/profile/image`  
**Content-Type:** `multipart/form-data` (upload) ou `application/json` (URL)

#### Opção 1: Upload de Arquivo (Form-Data)

```bash
curl -X PATCH \
  'https://api.example.com/profile/image' \
  -H 'Authorization: Bearer seu_token_jwt' \
  -F 'imageData={"title":"Minha Foto","description":"Foto de perfil"}' \
  -F 'file=@/caminho/para/imagem.jpg'
```

#### Opção 2: URL Externa (JSON)

```bash
curl -X PATCH \
  'https://api.example.com/profile/image' \
  -H 'Authorization: Bearer seu_token_jwt' \
  -H 'Content-Type: application/json' \
  -d '{
    "uploadType": "LINK",
    "url": "https://exemplo.com/foto.jpg"
  }'
```

#### Validações Especiais

- ✅ **Apenas imagens**: No modo upload, apenas arquivos com MIME type `image/*` são aceitos
- ✅ **Formatos aceitos**: JPEG, PNG, GIF, WebP, SVG, etc.
- ✅ **Rejeição automática**: PDFs, vídeos e outros tipos são rejeitados

#### Response 200 OK

Retorna a entidade `UserEntity` atualizada (mesma estrutura do endpoint `/profile`).

---

## 📊 Comparação de Endpoints

### Endpoints Admin vs Endpoints Próprios

| Funcionalidade | Endpoint Admin | Endpoint Próprio | Diferenças |
|----------------|----------------|------------------|------------|
| **Atualizar Perfil** | `PUT /users/:id` | `PATCH /profile` | Próprio: apenas name, email, phone |
| **Alterar Senha** | `PUT /users/:id` (com password) | `PATCH /profile/password` | Próprio: requer senha atual |
| **Atualizar Imagem** | `PATCH /users/:id/image` | `PATCH /profile/image` | Mesmo comportamento |
| **Alterar Role** | ✅ Permitido | ❌ Não permitido | Apenas admin |
| **Ativar/Desativar** | ✅ Permitido | ❌ Não permitido | Apenas admin |
| **Alterar completed** | ✅ Permitido | ❌ Não permitido | Apenas admin |

### Campos Editáveis

#### ✅ Usuário pode editar (via `/profile`):

- `name`: Nome completo
- `email`: Email (com validação de unicidade)
- `phone`: Telefone

#### ❌ Usuário NÃO pode editar:

- `password`: Use `/profile/password` (com senha atual)
- `role`: Apenas admin pode alterar
- `active`: Apenas admin pode alterar
- `completed`: Apenas admin pode alterar
- `commonUser`: Apenas admin pode alterar

---

## ⚠️ Tratamento de Erros

### 400 - Bad Request

#### Email já em uso

```json
{
  "statusCode": 400,
  "message": "Este email já está em uso por outro usuário",
  "error": "Bad Request"
}
```

#### Validação de campos

```json
{
  "statusCode": 400,
  "message": [
    "O nome deve ter pelo menos 2 caracteres",
    "O email deve ser um endereço de email válido"
  ],
  "error": "Bad Request"
}
```

#### Nova senha muito curta

```json
{
  "statusCode": 400,
  "message": ["A nova senha deve ter pelo menos 6 caracteres"],
  "error": "Bad Request"
}
```

#### Nova senha igual à atual

```json
{
  "statusCode": 400,
  "message": "A nova senha deve ser diferente da senha atual",
  "error": "Bad Request"
}
```

### 401 - Unauthorized

#### Token inválido ou ausente

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

#### Senha atual incorreta

```json
{
  "statusCode": 401,
  "message": "Senha atual incorreta",
  "error": "Unauthorized"
}
```

### 404 - Not Found

#### Usuário não encontrado (raro - geralmente indica problema no token)

```json
{
  "statusCode": 404,
  "message": "Usuário não encontrado",
  "error": "Not Found"
}
```

---

## 🔒 Segurança

### Proteções Implementadas

1. **Autenticação Obrigatória**: Todos os endpoints requerem JWT válido
2. **Auto-detecção de Usuário**: ID extraído do token - impossível alterar dados de outro usuário
3. **Validação de Senha Atual**: Alteração de senha requer conhecimento da senha atual
4. **Hash de Senha**: Novas senhas são armazenadas com bcrypt (salt rounds: 10)
5. **Validação de Email**: Impede duplicação de emails no sistema
6. **Validação de Tipo de Arquivo**: Apenas imagens são aceitas no upload
7. **Sem Permissões Admin**: Usuário não pode elevar privilégios ou alterar roles

### Boas Práticas

- ✅ Sempre use HTTPS em produção
- ✅ Tokens JWT devem ter expiração adequada
- ✅ Implemente rate limiting para evitar abuso
- ✅ Logue tentativas de alteração de senha
- ✅ Considere 2FA para alterações críticas (futuro)

---

## 📝 Exemplos Completos de Uso

### Exemplo 1: Atualizar Nome e Telefone

```javascript
// Atualizar apenas nome e telefone
const updateProfile = async () => {
  const response = await fetch('/profile', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'João Silva',
      phone: '+5511999999999'
    })
  });

  if (response.ok) {
    const user = await response.json();
    console.log('Perfil atualizado:', user);
  } else {
    const error = await response.json();
    console.error('Erro:', error);
  }
};
```

### Exemplo 2: Alterar Email

```javascript
// Atualizar email (verifica duplicação automaticamente)
const updateEmail = async (newEmail) => {
  const response = await fetch('/profile', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: newEmail
    })
  });

  if (response.ok) {
    const user = await response.json();
    console.log('Email atualizado:', user.email);
  } else {
    const error = await response.json();
    if (error.message.includes('já está em uso')) {
      alert('Este email já está sendo usado por outro usuário');
    }
  }
};
```

### Exemplo 3: Alterar Senha

```javascript
// Alterar senha com validação
const changePassword = async (currentPassword, newPassword) => {
  const response = await fetch('/profile/password', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      currentPassword: currentPassword,
      newPassword: newPassword
    })
  });

  if (response.ok) {
    const result = await response.json();
    alert('Senha alterada com sucesso!');
    // Opcional: fazer logout e pedir novo login
    // logout();
  } else {
    const error = await response.json();
    if (error.statusCode === 401) {
      alert('Senha atual incorreta');
    } else {
      alert(`Erro: ${error.message}`);
    }
  }
};
```

### Exemplo 4: Upload de Imagem de Perfil

```javascript
// Upload de imagem de perfil
const uploadProfileImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('imageData', JSON.stringify({
    title: 'Foto de Perfil',
    description: 'Minha foto pessoal',
    uploadType: 'UPLOAD',
    isLocalFile: true
  }));
  formData.append('file', imageFile);

  const response = await fetch('/profile/image', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`
      // Não definir Content-Type - o browser faz isso automaticamente para FormData
    },
    body: formData
  });

  if (response.ok) {
    const user = await response.json();
    console.log('Imagem atualizada:', user);
  } else {
    const error = await response.json();
    if (error.message.includes('imagens são permitidas')) {
      alert('Por favor, envie apenas arquivos de imagem');
    }
  }
};
```

### Exemplo 5: Fluxo Completo de Atualização de Perfil

```javascript
// Componente React/Next.js exemplo
const ProfileSettings = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const updateProfile = async () => {
    try {
      const response = await fetch('/profile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Perfil atualizado com sucesso!');
      } else {
        const error = await response.json();
        alert(`Erro: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      alert('Preencha ambos os campos de senha');
      return;
    }

    try {
      const response = await fetch('/profile/password', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (response.ok) {
        alert('Senha alterada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        const error = await response.json();
        alert(`Erro: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
    }
  };

  return (
    <div>
      <h2>Configurações de Perfil</h2>
      
      {/* Formulário de perfil */}
      <div>
        <input
          type="text"
          placeholder="Nome"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
        />
        <input
          type="tel"
          placeholder="Telefone"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
        />
        <button onClick={updateProfile}>Atualizar Perfil</button>
      </div>

      {/* Formulário de senha */}
      <div>
        <h3>Alterar Senha</h3>
        <input
          type="password"
          placeholder="Senha Atual"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="Nova Senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button onClick={changePassword}>Alterar Senha</button>
      </div>
    </div>
  );
};
```

---

## 🧪 Casos de Teste

### ✅ Cenários Válidos

1. **Atualizar nome**: Deve atualizar apenas o nome
2. **Atualizar email**: Deve atualizar email se não estiver em uso
3. **Atualizar telefone**: Deve atualizar telefone
4. **Alterar senha com senha correta**: Deve alterar a senha
5. **Upload de imagem válida**: Deve fazer upload e salvar
6. **URL externa de imagem**: Deve salvar a URL

### ❌ Cenários Inválidos

1. **Email duplicado**: Deve retornar erro 400
2. **Senha atual incorreta**: Deve retornar erro 401
3. **Nova senha igual à atual**: Deve retornar erro 400
4. **Nova senha muito curta**: Deve retornar erro 400
5. **Upload de arquivo não-imagem**: Deve rejeitar
6. **Token inválido**: Deve retornar erro 401
7. **Tentativa de alterar role**: Endpoint não existe/permite

---

## 📈 Fluxo de Dados

### Fluxo de Atualização de Perfil

```
1. Cliente → PATCH /profile
2. Sistema extrai userId do JWT token
3. Valida dados (nome, email, telefone)
4. Verifica se email está em uso (se alterado)
5. Atualiza banco de dados
6. Retorna UserEntity atualizado
```

### Fluxo de Alteração de Senha

```
1. Cliente → PATCH /profile/password
2. Sistema extrai userId do JWT token
3. Busca usuário no banco
4. Compara senha atual com hash armazenado
5. Valida nova senha (mínimo 6 caracteres)
6. Verifica se nova senha é diferente da atual
7. Gera hash da nova senha (bcrypt)
8. Atualiza senha no banco
9. Retorna mensagem de sucesso
```

---

## 🔗 Endpoints Relacionados

- **Admin Endpoints**: Ver [Users_API_Documentation.md](./Users_API_Documentation.md)
- **Imagem de Perfil**: Ver [Users_Image_Endpoint_Documentation.md](./Users_Image_Endpoint_Documentation.md)
- **Autenticação**: Ver [Auth_API_Documentation.md](../auth/Auth_API_Documentation.md)

---

**User Profile Self-Management - Sistema de Orfanato** 👤

