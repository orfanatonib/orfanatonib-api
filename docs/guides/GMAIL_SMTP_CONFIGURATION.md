# Gmail SMTP Configuration

O backend envia e-mails exclusivamente pelo SMTP do Gmail, usando Nodemailer.
A integração com AWS SES foi removida; a AWS permanece apenas para os recursos
que utilizam S3.

## Credenciais obrigatórias

Configure as variáveis abaixo em cada ambiente de execução, sem adicionar os
valores reais ao repositório:

```dotenv
GMAIL_SMTP_USER=conta-remetente@gmail.com
GMAIL_SMTP_APP_PASSWORD=senha_de_app_com_16_caracteres
EMAIL_FROM_NAME=Orfanatos NIB
```

- `GMAIL_SMTP_USER`: endereço completo da conta Gmail ou Google Workspace.
- `GMAIL_SMTP_APP_PASSWORD`: senha de app da conta, nunca a senha normal.
- `EMAIL_FROM_NAME`: nome público opcional; o padrão é `Orfanatos NIB`.

O provider conecta em `smtp.gmail.com:465` com TLS desde o início. A conta
precisa ter a verificação em duas etapas ativa para gerar uma senha de app. As
instruções oficiais estão na documentação de
[senhas de app do Google](https://support.google.com/accounts/answer/2461835)
e de
[configuração SMTP do Google Workspace](https://support.google.com/a/answer/176600).

## Comportamento

- O remetente real é sempre `GMAIL_SMTP_USER`.
- Destinatários não precisam ser previamente cadastrados ou verificados.
- Falhas SMTP transitórias são repetidas até três vezes.
- Falhas definitivas são convertidas para o erro padronizado `PROCESS` com HTTP
  500 quando alcançam uma requisição.
- Logs não incluem destinatários, credenciais ou conteúdo das mensagens.

## Implantação

Este repositório contém somente os nomes e exemplos das variáveis. A alteração
das credenciais em ambientes locais, staging ou produção deve ser feita de modo
separado e autorizado. Depois de configurar o ambiente, reinicie a API para que
o transporter seja criado com as novas credenciais.
