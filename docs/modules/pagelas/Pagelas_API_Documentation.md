# 📋 MÓDULO PAGELAS - DOCUMENTAÇÃO COMPLETA

## 🎯 Visão Geral

O módulo **Pagelas** é responsável pelo controle de presença e atividades dos sheltered (crianças abrigadas) nas aulas e atividades do orfanato. Cada pagela representa o registro semanal de um sheltered, incluindo presença, participação em meditação, recitação de versículos e observações do professor.

## 🏗️ Arquitetura

### **Entidade Principal:**
- **PagelaEntity**: Registro semanal de atividades de um sheltered

### **Relacionamentos:**
- **ManyToOne** com `ShelteredEntity` (obrigatório)
- **ManyToOne** com `TeacherProfileEntity` (obrigatório)

### **Constraint Única:**
- **UQ_pagela_sheltered_year_visit**: Garante que cada sheltered tenha apenas uma pagela por visita/ano

## 📊 Estrutura de Dados

### **PagelaEntity:**
```typescript
{
  id: string;                    // UUID único
  visit: number;                 // Número da visita
  year: number;                  // Ano (2000-9999)
  referenceDate: string;          // Data de referência (ISO date)
  present: boolean;              // Se o sheltered esteve presente
  notes?: string;               // Observações do professor (opcional)
  sheltered: ShelteredEntity;   // Relacionamento obrigatório
  teacher: TeacherProfileEntity; // Relacionamento obrigatório
  createdAt: Date;              // Data de criação
  updatedAt: Date;              // Data de atualização
}
```

## 🔗 Endpoints da API

### **1. POST /pagelas**
**Criar nova pagela**

**Body:**
```json
{
  "shelteredId": "uuid-sheltered",
  "teacherProfileId": "uuid-teacher", // obrigatório
  "referenceDate": "2025-01-15",
  "visit": 3,
  "year": 2025,
  "present": true,
  "notes": "Participou ativamente da aula"
}
```

**Resposta (201):**
```json
{
  "id": "uuid-pagela",
  "createdAt": "2025-09-27T21:00:00.000Z",
  "updatedAt": "2025-09-27T21:00:00.000Z",
  "shelteredId": "uuid-sheltered",
  "teacherProfileId": "uuid-teacher",
  "referenceDate": "2025-01-15",
  "year": 2025,
  "visit": 3,
  "present": true,
  "notes": "Participou ativamente da aula"
}
```

### **2. GET /pagelas**
**Listar pagelas (formato simples)**

**Query Parameters:**
- `shelteredId`: Filtrar por sheltered específico
- `year`: Filtrar por ano
- `visit`: Filtrar por visita
- `present`: Filtrar por presença (true/false)
- `visit`: Filtrar por visita
- `searchString`: Busca por texto nas notas

**Exemplo:**
```
GET /pagelas?shelteredId=uuid-sheltered&year=2025&present=true
```

### **3. GET /pagelas/paginated**
**Listar pagelas com paginação**

**Query Parameters:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 20, máx: 200)
- `shelteredId` (opcional): UUID do sheltered
- `year` (opcional): Ano (2000-9999)
- `visit` (opcional): Número da visita
- `present` (opcional): Presença (true/false)
- `searchString` (opcional): Busca por texto nas notas

**Exemplos:**
- `GET /pagelas/paginated?page=1&limit=10`
- `GET /pagelas/paginated?page=1&limit=5&year=2025&present=true`

**Resposta:**
```json
{
  "items": [PagelaResponseDto],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

### **4. GET /pagelas/:id**
**Buscar pagela por ID**

**Resposta (200):**
```json
{
  "id": "uuid-pagela",
  "createdAt": "2025-09-27T21:00:00.000Z",
  "updatedAt": "2025-09-27T21:00:00.000Z",
  "shelteredId": "uuid-sheltered",
  "teacherProfileId": "uuid-teacher",
  "referenceDate": "2025-01-15",
  "year": 2025,
  "visit": 3,
  "present": true,
  "notes": "Participou ativamente da aula"
}
```

### **5. PATCH /pagelas/:id**
**Atualizar pagela**

**Body (todos os campos opcionais):**
```json
{
  "teacherProfileId": "uuid-teacher",
  "referenceDate": "2025-01-16",
  "visit": 3,
  "year": 2025,
  "present": false,
  "notes": "Atualizada pela automação"
}
```

### **6. DELETE /pagelas/:id**
**Deletar pagela**

**Resposta (200):** Sem conteúdo

## 🔍 Filtros e Busca

### **Filtros Disponíveis:**

| Filtro | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| `shelteredId` | UUID | Filtrar por sheltered específico | `?shelteredId=uuid` |
| `year` | Number | Filtrar por ano | `?year=2025` |
| `week` | Number | Filtrar por semana (1-53) | `?week=3` |
| `present` | Boolean | Filtrar por presença | `?present=true` |
| `didMeditation` | Boolean | Filtrar por meditação | `?didMeditation=true` |
| `recitedVerse` | Boolean | Filtrar por versículo | `?recitedVerse=false` |
| `searchString` | String | Busca nas notas | `?searchString=participou` |

### **Exemplos de Filtros Combinados:**

```bash
# Pagelas de um sheltered específico em 2025
GET /pagelas?shelteredId=uuid-sheltered&year=2025

# Sheltered presentes que fizeram meditação
GET /pagelas?present=true&didMeditation=true

# Busca por texto nas notas
GET /pagelas?searchString=participou

# Pagelas da semana 3 de 2025
GET /pagelas?year=2025&week=3
```

## ⚠️ Validações e Regras de Negócio

### **Validações de Entrada:**

#### **CreatePagelaDto:**
- `shelteredId`: UUID obrigatório
- `teacherProfileId`: UUID opcional
- `referenceDate`: Data válida obrigatória
- `week`: Número inteiro entre 1 e 53
- `year`: Número inteiro entre 2000 e 9999 (opcional, calculado automaticamente)
- `present`: Boolean obrigatório
- `didMeditation`: Boolean obrigatório
- `recitedVerse`: Boolean obrigatório
- `notes`: String opcional (máximo 500 caracteres)

#### **UpdatePagelaDto:**
- Todos os campos são opcionais
- Mesmas validações do CreatePagelaDto quando presentes

### **Regras de Negócio:**

1. **Unicidade**: Cada sheltered pode ter apenas uma pagela por semana/ano
2. **Referência Temporal**: `referenceDate` deve estar dentro da semana especificada
3. **Relacionamentos**: 
   - `sheltered` é obrigatório e deve existir
   - `teacher` é opcional, mas se fornecido deve existir
4. **Cascade Delete**: Se sheltered for removido, suas pagelas são removidas
5. **SET NULL**: Se teacher for removido, a referência é definida como null

## 🚨 Cenários de Erro

### **400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Já existe Pagela para este abrigado nesta semana/ano",
  "error": "Bad Request"
}
```

### **404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Pagela não encontrada",
  "error": "Not Found"
}
```

```json
{
  "statusCode": 404,
  "message": "Sheltered não encontrado",
  "error": "Not Found"
}
```

```json
{
  "statusCode": 404,
  "message": "TeacherProfile não encontrado",
  "error": "Not Found"
}
```

### **422 Unprocessable Entity:**
```json
{
  "statusCode": 422,
  "message": [
    "week must not be greater than 53",
    "year must not be less than 2000",
    "referenceDate must be a valid ISO 8601 date string"
  ],
  "error": "Unprocessable Entity"
}
```

## 🔧 Utilitários

### **week.util.ts:**
- `getISOWeekYear(date)`: Calcula ano e semana ISO de uma data
- Usado para calcular automaticamente o ano quando não fornecido

## 📈 Casos de Uso

### **1. Controle Semanal de Presença:**
```bash
# Criar pagela para sheltered na semana 3 de 2025
POST /pagelas
{
  "shelteredId": "uuid-sheltered",
  "referenceDate": "2025-01-15",
  "visit": 3,
  "year": 2025,
  "present": true,
  "notes": "Participou ativamente da aula"
}
```

### **2. Relatório de Presença por Sheltered:**
```bash
# Todas as pagelas de um sheltered em 2025
GET /pagelas?shelteredId=uuid-sheltered&year=2025
```

### **3. Relatório de Atividades:**
```bash
# Sheltered que participaram da meditação na semana 3
GET /pagelas?week=3&didMeditation=true
```

### **4. Busca por Observações:**
```bash
# Pagelas com observações específicas
GET /pagelas?searchString=participou
```

## 🎯 Integração com Outros Módulos

### **Módulo Sheltered:**
- **Relacionamento**: OneToMany (sheltered → pagelas)
- **Cascade**: DELETE em sheltered remove todas as pagelas
- **Validação**: shelteredId deve existir

### **Módulo Teacher Profiles:**
- **Relacionamento**: OneToMany (teacher → pagelas)
- **Cascade**: SET NULL em teacher remove referência
- **Validação**: teacherProfileId deve existir se fornecido

## 📋 Automação e Testes

### **Arquivos de Automação:**
- `automations/pagelas/test-pagelas-complete-automation.js`
- `automations/pagelas/create-pagelas-data-automation.js`

### **Collection Postman:**
- `docs/collections/Pagelas_API_Collection.postman_collection.json`

### **Cenários Testados:**
- ✅ CRUD completo
- ✅ Filtros individuais e combinados
- ✅ Paginação
- ✅ Validações de entrada
- ✅ Cenários de erro
- ✅ Relacionamentos
- ✅ Constraints de unicidade

## 🚀 Próximos Passos

1. **Relatórios Avançados**: Implementar endpoints para relatórios consolidados
2. **Estatísticas**: Adicionar métricas de presença e participação
3. **Exportação**: Permitir exportação de dados para Excel/PDF
4. **Notificações**: Alertas para sheltered com baixa frequência
5. **Dashboard**: Interface para visualização de dados consolidados

---

**Módulo**: Pagelas  
**Versão**: 1.0.0  
**Status**: ✅ **IMPLEMENTADO E TESTADO**  
**Cobertura**: ✅ **100% DOS ENDPOINTS VALIDADOS**
