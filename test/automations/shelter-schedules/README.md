# Automação de Shelter Schedules

Esta automação cria registros de `ShelterSchedule` (agendamento de visitas e reuniões) para todos os times cadastrados no sistema.

## Funcionalidades

- ✅ Cria múltiplos schedules para cada time
- ✅ Distribui visitas ao longo do ano
- ✅ Define datas de reunião e visita automaticamente
- ✅ Gera conteúdo de lições variadas
- ✅ Evita duplicação de números de visita
- ✅ Testa CRUD completo de schedules

## Como Executar

### Execução Individual

```bash
node test/automations/shelter-schedules/shelter-schedules-complete-automation.js
```

### Execução Integrada

```bash
./test/automations/run-schedules-and-attendance.sh
```

## Pré-requisitos

- API rodando e acessível (usa `API_URL` ou `http://localhost:3000` por padrão)
- Times cadastrados no sistema (a automação falha se não houver)
- Usuário admin configurado em `test/automations/shared/config.js` (login falho aborta a execução)

## Configuração

Por padrão, a automação cria **12 schedules por time** (visitas mensais). Você pode ajustar editando o arquivo:

```javascript
// Linha ~243
await createSchedulesForAllTeams(12); // Altere o número aqui
```

## Estrutura dos Schedules Criados

Cada schedule contém:

- `teamId`: ID do time
- `visitNumber`: Número sequencial da visita (1-12)
- `visitDate`: Data da visita (sábado)
- `meetingDate`: Data da reunião (segunda-feira antes da visita)
- `lessonContent`: Lição com tema educativo
- `observation`: Observações opcionais
- `meetingRoom`: Sala da reunião

## Temas de Lições

As lições seguem temas educativos:

1. Amor e Bondade
2. Respeito ao Próximo
3. Honestidade e Verdade
4. Gratidão
5. Paciência e Perseverança
6. Perdão
7. Humildade
8. Coragem
9. Responsabilidade
10. Solidariedade
11. Fé e Esperança
12. Paz Interior

## Saída Esperada

```
🎯 AUTOMAÇÃO COMPLETA - MÓDULO SHELTER SCHEDULE
📊 Obtendo dados necessários para os testes...
🎯 X teams encontrados
📅 Y schedules encontrados
🚀 Criando schedules para TODOS os times
📋 Schedules por time: 12
Time 1: Z schedules existentes
...
✅ Criação de schedules concluída!
📊 Schedules criados: N
⏭️  Schedules já existentes (pulados): M
❌ Erros: 0
🎉 AUTOMAÇÃO CONCLUÍDA COM SUCESSO!
```

## Próximos Passos

Após criar os schedules, execute a automação de attendance para registrar presenças:

```bash
node test/automations/attendance/attendance-complete-automation.js
```

Ou use o script integrado que executa ambas em sequência.
