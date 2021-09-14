# Express-zapapi

> Documentação para mostrar sobre todas as rotas e possibilidades do sistema.

## Constantes

#### token = "4D83A1B9A15FE8C3498F998E954DB"

#### SITEPOST = "http://localhost:3000/"

## Rotas

| Rota | Método | Requisitos | Descrição |
|------|--------|------------|-----------|
| `/rotas` | GET | `token` | Exibi todas as rotas da api |
| `/sessions` | GET | `token` | Exibi todas as sesões iniciadas |
| `/:slug/autenticacao` | GET | `slug`, `idEmpresa` | Autenticação para iniciar uma nova conexão |
| `/:slug/qrcode` | GET | `slug` | Retorna o qrcode |
| `/:slug/me` | GET | `slug` | Tudo sobre o whatsapp em sincronizado |
| `/:slug/sair` | GET | `slug`, `token` | Sair e deletar cliente |
| `/:slug/restart` | GET | `slug`, `token` | Reinicia uma sessão |
| `/:slug/conexao` | GET | `slug` | Checando a conexão |
| `/:slug/conversas` | GET | `slug` | Retorna todas as conversas |
| `/:slug/conversascommsgs` | GET | `slug` | Retorna todas as conversas com algumas mensagens |
| `/:slug/todoscontatos` | GET | `slug` | Retorna todos os contatos |
| `/:slug/novocontatovalidar` | GET | `slug`, `numero` | Valida se um número é válido e retorna o correto |
| `/:slug/novocontato` | GET | `slug`, `numero`, `msg` | Inicia uma conversar com um novo contato |
| `/:slug/chatonline` | GET | `slug`, `numero` | Verifica se o chat de conversa está online |
| `/:slug/status` | GET | `slug`, `numero` | Retorna o status de um contato |
| `/:slug/fixarchat` | GET | `slug`, `numero`, `option` | Fixa ou desfixa uma conversa |
| `/:slug/visualizar` | GET | `slug`, `numero` | Enviar que esta conversa foi visualizada |
| `/:slug/marcarnlido` | GET | `slug`, `numero` | Marcar conversa como não visto |
| `/:slug/foto` | GET | `slug`, `numero`, `tipo` | Retorna a url da foto de um perfil |
| `/:slug/mensagens` | GET | `slug`, `numero` | Retorna conversa e as ultimas mensagens |
| `/:slug/mensagensgroup` | GET | `slug`, `numero` | Retorna conversa e as ultimas mensagens group |
| `/:slug/carregarmaismensagens` | GET | `slug`, `numero`, `tipo` | Retorna mensagens de uma conversa e mais um pouco |
| `/:slug/todasmensagens` | GET | `slug`, `numero` | Todas as mensagens de uma conversa |
| `/:slug/enviarmsg` | GET | `slug`, `numero`, `msg` | Envia mensagem de texto |
| `/:slug/encaminharmsg` | GET | `slug`, `numero`, `msgid` | Encaminha uma mensagem para algum contato |
| `/:slug/enviarcontato` | GET | `slug`, `numero`, `contato` | Envia um contato para alguém |
| `/:slug/desfile` | POST | `slug`, `body` | Descriptografa uma mensagem do tipo mídia |
| `/:slug/enviarimagem` | POST | `slug`, `doc` | Envia uma mensagem de uma imagem |
| `/:slug/enviardoc` | POST | `slug`, `doc` | Envia uma mensagem de um documento |
| `/:slug/enviaraudio` | POST | `slug`, `numero` | Envia uma mensagem como um audio do wpp |
