# ADR — Mídia privada (antecedentes criminais) com URL assinada

**Status:** implementado na API (2026-11-19). **Falta a política do bucket (infra, passo manual — abaixo).**

## Problema
O PDF de antecedente criminal era gravado no mesmo bucket das demais mídias e a API devolvia o endereço permanente do
objeto. Quem tivesse o link lia o documento para sempre, mesmo depois de perder acesso ao sistema.

## Decisão
1. **Objetos privados.** Documento sensível é gravado em `<env>/private/<entidade>/<ownerId>/<uuid>.<ext>`
   (`buildStorageKey({ private: true })`). Hoje só os PDFs de antecedentes criminais usam isso.
2. **Leitura por URL assinada de curta duração.** A API nunca devolve o endereço do objeto privado: devolve uma URL
   assinada (SigV4) que vale **5 minutos** por padrão (`PRIVATE_MEDIA_URL_TTL_SECONDS`, limitado a 1–15 min), gerada a
   cada leitura (`PrivateMediaUrlService`). O banco guarda o endereço do objeto (sem assinatura), que sozinho não abre nada.
3. **A tela busca uma URL nova ao abrir o PDF**, porque a da lista pode ter vencido com a página aberta.
4. **Quem pode ler** continua sendo decidido pela API (admin/líder, flag `CRIMINAL_RECORDS`): a URL só é emitida para
   quem passou pelos guards.

## Passo de infra (você)
O código sozinho não impede leitura anônima: isso depende da **política do bucket**. Se hoje há uma regra que libera
`s3:GetObject` público em todo o bucket, ela precisa **excluir** o prefixo privado. Exemplo (ajuste o nome do bucket e
o prefixo de cada ambiente):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadExceptPrivate",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "NotResource": [
        "arn:aws:s3:::SEU-BUCKET/*/private/*"
      ]
    }
  ]
}
```

(`NotResource` com `Effect: Allow` libera tudo MENOS o prefixo privado. Se o bucket usa ACL pública por objeto, o
código já não define ACL: confirme que o bloqueio de acesso público do bucket não é desligado para `*/private/*`.)

**Como conferir depois de aplicar:** pegue o endereço do objeto (a URL assinada sem a parte `?X-Amz-...`) e abra no
navegador anônimo: tem que dar **403 AccessDenied**. A URL assinada completa tem que abrir o PDF.

## O que não foi feito (decisão: só arquivos novos)
- **Arquivos antigos** continuam no caminho público (`<env>/AtendenteEstadual/...`) e a API os devolve como antes
  (`PrivateMediaUrlService` só assina chaves privadas). Migrá-los exige janela, backup e invalidar os links antigos;
  fica como tarefa separada.
- **Auditoria da leitura** do PDF continua sendo a automática de toda requisição (`core/audit`).

## Testes
- Jest: chave privada, TTL, assinatura só para objeto privado, cópia sem alterar a entidade, upload privado nos serviços.
- E2E (API ao vivo, LocalStack): a resposta traz URL assinada (≤ 15 min), o objeto está em `/private/`, o banco guarda
  o endereço sem assinatura e a URL assinada baixa um `%PDF`.
- Não há teste automático de "anônimo recebe 403": depende da política do bucket (acima), que o LocalStack local não aplica.
