# Documentação: Endpoint de Imagem de Perfil (Upload)

**Endpoint**: `PATCH /profile/image`
**Autenticação**: Requer Token JWT (`Bearer Token`)
**Content-Type**: `multipart/form-data`

## 📌 Objetivo

Este endpoint permite atualizar a foto de perfil do usuário logado enviando um arquivo de imagem.

---

## 🛠️ Como Usar (Multipart Upload)

Para enviar a imagem, você deve fazer uma requisição `multipart/form-data`.

### Campos do Formulário (FormData)

- `file`: (Binário/File) O arquivo da imagem real. **Obrigatório**.
- `imageData`: (Opcional) Metadados adicionais, se necessário.

### Exemplo de Código (JavaScript / Frontend)

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]); // O arquivo selecionado pelo usuário

// Opcional: Adicionar metadados
// formData.append('imageData', JSON.stringify({ title: 'Minha Foto' }));

const response = await fetch('http://localhost:3000/profile/image', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    // NÃO defina 'Content-Type' manualmente aqui, o navegador faz isso sozinho para multipart
  },
  body: formData
});
```

### Exemplo de Requisição (Curl)

```bash
curl --request PATCH \
  --url http://localhost:3000/profile/image \
  --header 'Authorization: Bearer <SEU_TOKEN>' \
  --header 'Content-Type: multipart/form-data' \
  --form 'file=@/caminho/para/foto.jpg'
```

---

## ⚙️ Regras do Sistema

1. **Limpeza Automática**: Se você já tinha uma foto antiga salva, ela será **deletada automaticamente** do servidor para economizar espaço ao salvar a nova.
2. **Validação**:
    - O sistema aceita apenas arquivos de imagem (validado pelo mimetype `image/*`).
    - Se enviar um arquivo inválido, retornará erro `400`.

## 📄 Exemplo de Resposta (Sucesso)

O endpoint retorna os dados atualizados do usuário.

```json
{
  "id": "uuid-do-usuario",
  "name": "Diego Seven",
  "mediaItems": [
    {
      "id": "uuid-da-midia",
      "url": "https://bucket-s3.aws.com/caminho/nova-foto.jpg",
      "mediaType": "IMAGE",
      "uploadType": "UPLOAD",
      "isLocalFile": true
    }
  ]
}
```
