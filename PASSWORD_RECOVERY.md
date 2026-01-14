# Documentação: Recuperação de Senha

O fluxo de recuperação de senha consiste em 3 etapas principais:

1. **Solicitação**: O usuário informa o email e recebe um link.
2. **Validação**: O Frontend verifica se o token do link é válido.
3. **Confirmação**: O usuário define a nova senha.

---

## 1. Solicitar Recuperação (Esqueci Minha Senha)

O usuário informa o email. O sistema verifica se o usuário existe e se o email está verificado na AWS SES.

- **Endpoint**: `POST /auth/forgot-password`
- **Body**:

    ```json
    {
      "email": "usuario@exemplo.com"
    }
    ```

- **Comportamento e Respostas**:

    **Caso 1: Email verificado (Sucesso)**
    Envia email de recuperação com link.

    ```json
    {
      "status": "RESET_LINK_SENT",
      "message": "Se o email existir, as instruções foram enviadas."
    }
    ```

    **Caso 2: Email NÃO verificado na AWS**
    Envia email de verificação da AWS (não de senha).

    ```json
    {
      "status": "VERIFICATION_EMAIL_SENT",
      "message": "Seu email ainda não foi verificado na AWS..."
    }
    ```

---

## 2. Validar Token (Ao abrir o link)

Quando o usuário clica no link, o Frontend deve chamar este endpoint para verificar se o token ainda é válido antes de mostrar o formulário de senha.

- **Endpoint**: `GET /auth/reset-password/validate?token={TOKEN}`
- **Query Params**:
  - `token`: O token recebido na URL.
- **Resposta Sucesso (200)**:

    ```json
    {
      "valid": true,
      "email": "usuario@exemplo.com"
    }
    ```

- **Resposta Erro (400)**: Token inválido ou expirado.

---

## 3. Redefinir Senha (Confirmar)

Envia o token e a nova senha para efetivar a troca.

- **Endpoint**: `POST /auth/reset-password`
- **Body**:

    ```json
    {
      "token": "token-recebido-no-email",
      "newPassword": "nova-senha-segura"
    }
    ```

- **Comportamento**:
  - Atualiza a senha do usuário.
  - Deleta o token (não pode ser usado novamente).
  - Envia email de confirmação avisando que a senha foi alterada.

---

## Variáveis de Ambiente (Links)

O link enviado por email depende da variável `ENVIRONMENT`:

| ENVIRONMENT | Base URL |
| :--- | :--- |
| `local` (padrão) | `http://localhost:5173` |
| `staging` | `https://staging.orfanatonib.com` |
| `prod` / `production` | `https://www.orfanatonib.com` |

**Formato do Link**: `{BASE_URL}/recuperar-senha/{TOKEN}`
