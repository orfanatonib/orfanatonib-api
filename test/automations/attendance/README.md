# Automação de Attendance (Pagelas)

Esta automação cria registros de presença/falta (attendance) para todos os `ShelterSchedule` existentes, simulando o lançamento de pagelas pelos líderes.

## Funcionalidades

- ✅ Cria registros de presença para todos os schedules
- ✅ Registra presença para todos os membros de cada time
- ✅ Simula taxa de presença realista (85% por padrão)
- ✅ Gera razões de ausência variadas
- ✅ Testa CRUD de attendance
- ✅ Testa sistema de pendências
- ✅ Testa listagens de membros e schedules

## Como Executar

### Execução Individual

**IMPORTANTE:** Execute ANTES a automação de shelter-schedules!

```bash
# 1. Criar schedules primeiro
node test/automations/shelter-schedules/shelter-schedules-complete-automation.js

# 2. Depois criar attendances
node test/automations/attendance/attendance-complete-automation.js
```

### Execução Integrada (Recomendado)

```bash
./test/automations/run-schedules-and-attendance.sh
```

Este script executa automaticamente ambas as automações na ordem correta.

## Pré-requisitos

- ✅ API rodando e acessível em `API_URL` (ou `http://localhost:3000`)
- ✅ Shelter Schedules criados (execute a automação anterior; se não houver, a automação falha)
- ✅ Times com membros (líderes e professores) — times sem membros são pulados e reportados
- ✅ Usuário admin configurado (login falho aborta a execução)

## Configuração

Por padrão, a automação usa **85% de taxa de presença**. Você pode ajustar editando o arquivo:

```javascript
// Linha ~232
await createAttendancesForAllSchedules(0.85); // 0.85 = 85% de presença
```

## Estrutura dos Attendances Criados

Cada attendance contém:

- `memberId`: ID do membro (líder ou professor)
- `scheduleId`: ID do schedule (visita/reunião)
- `type`: 'present' ou 'absent'
- `comment`: Razão da ausência (opcional)

## Razões de Ausência

Quando um membro é marcado como ausente, uma das seguintes razões pode ser atribuída:

- Motivo de saúde
- Compromisso familiar
- Viagem
- Trabalho
- Não informado
- (sem comentário)

## Fluxo da Automação

1. **Obtenção de Dados**
   - Busca todos os times
   - Busca todos os schedules

2. **Agrupamento**
   - Agrupa schedules por time
   - Obtém membros de cada time

3. **Registro de Presença**
   - Para cada schedule:
     - Cria lista de presença/falta para todos os membros
     - Registra em lote (pagela) via API
     - 85% de presença, 15% de ausência

4. **Testes**
   - Testa CRUD de attendance
   - Testa pendências (líder e membro)
   - Testa listagens
   - Testa estatísticas

## Saída Esperada

```
🎯 AUTOMAÇÃO COMPLETA - MÓDULO ATTENDANCE
📊 Obtendo dados necessários para os testes...
🎯 X teams encontrados
📅 Y schedules encontrados
📊 Schedules agrupados em Z times
🚀 Criando registros de presença para TODOS os schedules
📋 Taxa de presença: 85%
Time 1: N membros, M schedules
✓ Time 1, Visita 1: 5 presenças registradas
...
✅ Criação de attendances concluída!
📊 Registros de presença criados: N
👥 Total de membros processados: M
🎉 AUTOMAÇÃO CONCLUÍDA COM SUCESSO!
```

## Endpoints Testados

### Registro
- `POST /attendance/register/team` - Registro em lote (pagela)

### Pendências
- `GET /attendance/pending/leader?teamId=xxx` - Pendências do líder
- `GET /attendance/pending/member` - Pendências do membro

### Listagens
- `GET /attendance/team/:teamId/members` - Membros do time
- `GET /attendance/team/:teamId/schedules` - Schedules do time

## Verificação de Pendências

A automação também testa o sistema de pendências:

- **Pendências do Líder:** Eventos sem lançamento de pagela
- **Pendências do Membro:** Eventos sem registro individual

Isso ajuda a validar que o sistema de alertas está funcionando corretamente.

## Troubleshooting

### "Nenhum schedule encontrado"

Execute primeiro a automação de shelter-schedules:

```bash
node test/automations/shelter-schedules/shelter-schedules-complete-automation.js
```

### "Nenhum membro encontrado no time"

Verifique se os times têm líderes e professores cadastrados.

### Erro ao registrar presença

Verifique se:
- O schedule existe
- O time tem membros
- As datas do schedule são válidas (meetingDate ou visitDate)
