# Infraestrutura API - Orfanato NIB

Infraestrutura completa: Certificado SSL (ACM), EC2, Application Load Balancer e DNS.

## 📋 Visão Geral

Esta pasta contém toda a infraestrutura da API:

- **ACM Stack** (`acm/stack.yaml`) - Certificado SSL
- **EC2 Stack** (`stack.yaml`) - Instâncias EC2, ALB, DNS

**Importante:** Use o script unificado `deploy-infrastructure.sh` que faz deploy das duas stacks na ordem correta.

## 🚀 Deploy Rápido (100% Automático)

```bash
# Deploy completo com auto-descoberta de recursos AWS
bash deploy-infrastructure.sh [domínio]

# Exemplo
bash deploy-infrastructure.sh orfanatonib.com
```

O script automaticamente:

1. 🔍 **Descobre** todos os recursos AWS (VPC, Subnets, Hosted Zone, AMI, etc.)
2. 📝 **Atualiza** arquivos de parâmetros dinamicamente
3. 🔐 **Cria/Valida** certificado SSL (ACM)
4. 🚀 **Deploy** da infraestrutura EC2 + ALB
5. 🌐 **Configura** DNS automaticamente

**Nenhuma configuração manual necessária!** O script detecta automaticamente todos os recursos na sua conta AWS.

## 📂 Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `deploy-infrastructure.sh` | **Script principal** - Deploy completo com auto-descoberta |
| `deploy-complete.sh` | Deploy da aplicação (build + push + deploy Docker) |
| `acm-stack.yaml` | Template CloudFormation para certificado SSL |
| `acm-params.json` | Parâmetros ACM (gerado automaticamente) |
| `ec2-stack.yaml` | Template CloudFormation para EC2 + ALB |
| `ec2-params.json` | Parâmetros EC2 (gerado automaticamente) |
| `*.example.json` | Exemplos de parâmetros (apenas referência) |

## 🔗 Pré-requisitos

### Único requisito obrigatório

- ✅ **Hosted Zone no Route53** para seu domínio

### Tudo o resto é descoberto automaticamente

- ✅ VPC (padrão ou primeira disponível)
- ✅ Subnets públicas (mínimo 2 em AZs diferentes)
- ✅ AMI mais recente do Amazon Linux 2023
- ✅ Key Pair SSH disponível
- ✅ Região AWS (do AWS CLI)
- ✅ Certificado SSL (cria se não existir)

### Recursos criados automaticamente pela stack

- ✅ Security Groups
- ✅ IAM Role/Instance Profile
- ✅ Application Load Balancer + Target Groups
- ✅ Registros DNS (staging-api e api)

## 📊 Ordem de Deploy Completa

```bash
# 1. Stacks independentes (em paralelo, se desejar)
cd ../../s3 && bash deploy.sh
cd ../../rds && bash deploy.sh
cd ../../ses && bash deploy.sh
cd ../../ecr && bash deploy.sh

# 2. Infraestrutura (ACM + EC2)
cd ../../infrastructure
bash deploy-infrastructure.sh

# 3. Aplicação
bash deploy-complete.sh staging   # ou production
```

## 🏗️ Recursos Criados

### Stack ACM (orfanato-nib-acm)

- Certificado SSL para `*.orfanatonib.com`
- Validação DNS automática

### Stack EC2 (orfanato-nib-ec2)

- 2 instâncias EC2 (staging + production)
- Application Load Balancer (ALB)
- 2 Target Groups (staging + production)
- HTTP Listener (redirect para HTTPS)
- HTTPS Listener (com regras por host)
- Security Groups (ALB + EC2)
- IAM Role + Instance Profile
- 2 registros DNS Route53:
  - `staging-api.orfanatonib.com`
  - `api.orfanatonib.com`

## 🔧 Comandos Úteis

```bash
# Verificar status das stacks
aws cloudformation describe-stacks \
  --stack-name orfanato-nib-acm \
  --profile orfanato-aws

aws cloudformation describe-stacks \
  --stack-name orfanato-nib-ec2 \
  --profile orfanato-aws

# Ver outputs
aws cloudformation describe-stacks \
  --stack-name orfanato-nib-ec2 \
  --profile orfanato-aws \
  --query 'Stacks[0].Outputs'

# Deletar stacks (ordem inversa)
aws cloudformation delete-stack \
  --stack-name orfanato-nib-ec2 \
  --profile orfanato-aws

aws cloudformation delete-stack \
  --stack-name orfanato-nib-acm \
  --profile orfanato-aws
```

## ⚠️ Notas Importantes

1. **Auto-descoberta**: Todos os recursos AWS são detectados automaticamente
2. **params.json**: Arquivos são gerados automaticamente - não precisam ser versionados
3. **Certificado SSL**: Criado e validado automaticamente se não existir
4. **DNS**: A validação do certificado pode levar alguns minutos
5. **Ambientes**: A stack é única mas cria recursos para staging E production
6. **Deploy da app**: Usar `deploy-complete.sh` após criar a infraestrutura

### 🔧 Recursos Detectados Automaticamente

O script descobre automaticamente:

- VPC padrão ou primeira disponível
- Subnets públicas (mínimo 2 em AZs diferentes)
- Hosted Zone no Route53 para seu domínio
- AMI mais recente do Amazon Linux 2023
- Key Pair SSH disponível
- Região AWS configurada no AWS CLI
- Certificado SSL existente (ou cria novo)

## 🛡️ Robustez e Confiabilidade

O script `deploy-infrastructure.sh` foi construído para ser extremamente robusto e nunca ficar preso em "limbo":

### Detecção de Stack Travada

- ✅ Detecta quando uma operação CloudFormation não progride
- ✅ Timeout automático após 5 minutos sem mudança de status
- ✅ Exibe logs de erro detalhados quando operações falham

### Retry Automático

- ✅ Retry com backoff para operações de deleção (até 3 tentativas)
- ✅ Retry para chamadas de API que falham temporariamente
- ✅ Validação de certificado com detecção de travamento

### Validação de Parâmetros

- ✅ Valida JSON após geração dos arquivos de parâmetros
- ✅ Verifica valores críticos (VPC, Subnets, Certificate ARN, etc.)
- ✅ Exit imediato se algum valor crítico estiver vazio

### Estados de Exit

- `0` - Sucesso
- `1` - Erro fatal (operação falhou)
- `2` - ROLLBACK_COMPLETE detectado (recria automaticamente)
- `3` - Stack travada (timeout sem progresso)

### Recuperação Automática

- ✅ Detecta ROLLBACK_COMPLETE e recria automaticamente
- ✅ Aguarda operações em progresso antes de deletar
- ✅ Limpa e recria stacks em estados inválidos

## 🆘 Troubleshooting

### Erro: "Certificate not validated"

- Aguarde alguns minutos para validação DNS
- Verifique se o Hosted Zone está correto
- O script detecta automaticamente se o certificado está travado (>5min)

### Erro: "Subnet not in VPC"

- Confirme que SubnetStaging e SubnetProd pertencem à VpcId
- Valores são descobertos automaticamente, mas verifique sua VPC

### Erro: "No updates to be performed"

- Normal - significa que a stack já está atualizada
- Nenhuma ação necessária

### Stack em ROLLBACK_COMPLETE

- ✅ **Recuperação automática!** O script detecta e recria automaticamente
- Verifique os logs de erro se a recriação falhar:

  ```bash
  aws cloudformation describe-stack-events --stack-name orfanato-nib-ec2
  ```

### Stack Travada (Timeout)

- O script detecta automaticamente após 5 minutos sem progresso
- Exibe mensagem clara com código de exit 3
- Verifique o console AWS CloudFormation para detalhes

### Valores de Auto-descoberta Incorretos

- Se VPC, Subnets ou outros valores estiverem incorretos:
  - Verifique sua configuração AWS
  - O script sempre pega recursos da região configurada no AWS CLI
  - Certifique-se que sua conta tem os recursos necessários
