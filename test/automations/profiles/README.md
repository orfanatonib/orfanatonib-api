# Automação de Perfis (Profiles)

Este diretório contém scripts de automação para criar e testar perfis de usuários em massa.

## 📋 Scripts Disponíveis

### 1. `profiles-complete-automation.js`

Script completo para criar perfis (PersonalData + UserPreferences) para todos os usuários existentes no sistema.

**Funcionalidades:**
- ✅ Busca todos os usuários do sistema
- ✅ Tenta fazer login como cada usuário usando senhas comuns
- ✅ Cria dados de perfil aleatórios (PersonalData e UserPreferences)
- ✅ Testa CRUD básico de perfis
- ✅ Verifica quantos perfis foram criados
- ✅ Exibe relatório detalhado

**Como executar:**
```bash
node test/automations/profiles/profiles-complete-automation.js
```

### 2. `profiles-bulk-create-automation.js`

Script alternativo que usa a classe base `AutomationBase` para criar perfis.

**Como executar:**
```bash
node test/automations/profiles/profiles-bulk-create-automation.js
```

## 🔐 Autenticação

Os scripts tentam fazer login como cada usuário usando senhas comuns:
- `Abc@123`
- `password123`
- `Edu@27032016`

**Importante:** Apenas usuários com uma dessas senhas terão perfis criados. Se um usuário tiver senha diferente, ele será pulado.

## 📊 Dados Gerados

### PersonalData
- **birthDate**: Data de nascimento aleatória (18-80 anos)
- **gaLeaderName**: Nome de líder de GA aleatório
- **gaLeaderContact**: Telefone formatado aleatório

### UserPreferences
- **loveLanguages**: 1-2 linguagens do amor aleatórias
- **temperaments**: Temperamento aleatório
- **favoriteColor**: Cor favorita aleatória
- **favoriteFood**: Comida favorita aleatória
- **favoriteMusic**: Estilo musical aleatório
- **whatMakesYouSmile**: Atividade que traz felicidade
- **skillsAndTalents**: 1-3 habilidades/talentos aleatórios

## 📖 Exemplos de Dados

### Linguagens do Amor
- Palavras de afirmação
- Tempo de qualidade
- Presentes
- Atos de serviço
- Toque físico

### Temperamentos
- Sanguíneo
- Colérico
- Melancólico
- Fleumático
- Combinações (ex: Sanguíneo Colérico)

### Cores Favoritas
- Azul, Verde, Vermelho, Amarelo, Roxo, Rosa, Laranja, etc.

### Comidas Favoritas
- Pizza, Lasanha, Feijoada, Churrasco, Sushi, Peixe, Frango, etc.

### Estilos Musicais
- Louvores, Gospel, MPB, Rock, Pop, Sertanejo, Jazz, Clássica, etc.

### O que faz sorrir
- Momentos com a família
- Ver crianças felizes
- Servir ao próximo
- Ler a Bíblia
- Estar na presença de Deus
- etc.

### Habilidades e Talentos
- Ensino e educação
- Música e canto
- Arte e pintura
- Culinária
- Esportes
- Liderança
- Comunicação
- Organização
- Tecnologia
- etc.

## ⚙️ Configuração

As configurações são herdadas de `test/automations/shared/config.js`:

```javascript
{
  BASE_URL: 'http://localhost:3000',
  ADMIN_CREDENTIALS: {
    email: 'superuser@orfanatonib.com',
    password: 'Edu@27032016'
  }
}
```

## 📝 Saída Esperada

```
🎯 AUTOMAÇÃO COMPLETA - MÓDULO PROFILES
=====================================
📋 Funcionalidades:
   1. Criação em massa de perfis
   2. CRUD de Profiles
   3. Verificação de perfis
=====================================

🔐 Fazendo login como admin...
✅ Login realizado com sucesso!

📋 Testando CRUD de Profiles...
  🔸 Teste 1: Criar perfil
    ✅ Perfil criado com sucesso
  🔸 Teste 2: Buscar perfil próprio (GET /profiles/me)
    ✅ Perfil próprio encontrado
  🔸 Teste 3: Atualizar perfil
    ✅ Perfil atualizado com sucesso

🚀 Iniciando criação em massa de perfis...

📊 Buscando todos os usuários...
✅ 150 usuários encontrados

📝 Criando perfis para 150 usuários...

[1/150] Processando João Silva...
  ✅ Perfil criado para João Silva (joao.silva@example.com)

[2/150] Processando Maria Santos...
  ℹ️  Perfil já existe para maria.santos@example.com

[3/150] Processando Pedro Costa...
  ✅ Perfil criado para Pedro Costa (pedro.costa@example.com)

...

📊 RESUMO DA CRIAÇÃO EM MASSA:
=====================================
✅ Perfis criados com sucesso: 85
❌ Erros/Perfis já existentes: 65
📊 Total de usuários processados: 150

🔍 Verificando perfis criados...
✅ Total de perfis no sistema: 125

🎉 AUTOMAÇÃO CONCLUÍDA!
=====================================

✅ Automação finalizada com sucesso!
```

## 🚨 Notas Importantes

1. **Senhas**: Os scripts tentam fazer login com senhas comuns. Se o usuário tiver uma senha diferente, o perfil não será criado.

2. **Duplicatas**: Se um perfil já existe para um usuário, o script não tentará criar novamente.

3. **Performance**: Um delay de 200ms é adicionado entre cada criação para não sobrecarregar o servidor.

4. **Permissões**: O script usa autenticação JWT para criar perfis em nome de cada usuário.

5. **Validação**: Todos os dados gerados são válidos e seguem as regras de negócio do sistema.

## 🔧 Personalização

Para customizar os dados gerados, edite as arrays em `generateProfileData()`:
- `loveLanguages`
- `temperaments`
- `colors`
- `foods`
- `musics`
- `smiles`
- `talents`
- `gaLeaderNames`

## 🐛 Troubleshooting

**Problema**: "Não foi possível fazer login como [email]"
- **Solução**: Adicione a senha do usuário na array `commonPasswords`

**Problema**: "Erro ao criar perfil"
- **Solução**: Verifique se o endpoint `/profiles` está funcionando corretamente

**Problema**: "Nenhum usuário encontrado"
- **Solução**: Verifique se existem usuários no sistema usando `GET /users`
