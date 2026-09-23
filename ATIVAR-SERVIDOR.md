# Ativar o servidor uma vez — sem VPN

Esta etapa ainda não foi executada. O projeto está preparado, mas precisa de uma conta de hospedagem para publicar o servidor. Ninguém precisa alugar servidor para começar a testar se o plano gratuito abaixo estiver disponível para sua conta.

## Opção preparada: Render Free

1. Crie um repositório no GitHub e envie o conteúdo da pasta `entre-amigos`, incluindo `package.json`, `package-lock.json`, `app` e `render.yaml`. Não envie `node_modules` ou `dist`.
2. Entre em https://dashboard.render.com com sua própria conta.
3. Escolha **New > Web Service** e conecte o repositório.
4. Use runtime **Node** e plano **Free**. Não escolha um plano pago para este teste.
5. Se a raiz do repositório já contém `package.json`, deixe Root Directory vazio. Se você enviou a pasta inteira, use `entre-amigos` como Root Directory.
6. Build Command: `npm ci --omit=dev --ignore-scripts`
7. Start Command: `npm run server`
8. Configure Health Check Path como `/health`. Use uma única instância: salas ficam na memória desse processo. A porta é obtida automaticamente da variável PORT do provedor.
9. Publique e aguarde o serviço ficar ativo. Copie a URL HTTPS real que o Render apresentar.
10. Abra essa URL seguida de `/health` no navegador. A resposta deve conter `"ok":true`.
11. Cole a URL HTTPS no app, na seção **Configurar servidor**, e crie a sala.

O arquivo `render.yaml` também permite criar o serviço pela opção Blueprint, caso o projeto esteja na raiz do repositório. Ele declara o plano free. Não foi feita publicação neste ambiente.

## Amigos não precisam fazer essa configuração

O convite completo contém o endereço. Ou, antes de gerar o instalador, preencha `app/app-config.json`:

```json
{
  "serverUrl": "https://URL-REAL-DO-SEU-SERVICO"
}
```

Substitua pela URL real. O valor acima é um exemplo, não um serviço disponível. Gere o instalador depois de editar; todos usarão esse endereço por padrão. O campo de configuração permite trocá-lo posteriormente.

## O que é gratuito e o que permanece pendente

A documentação do Render informa plano gratuito com limites e suspensão por inatividade. Uma conexão WebSocket nova pode acordar o serviço; a primeira conexão pode demorar. O app aguarda até dois minutos. Durante uma sessão conectada, envia mensagens periódicas de presença. O provedor pode reiniciar o serviço e encerrar salas. Confira termos e quotas da conta; este projeto não contrata serviços nem promete disponibilidade contínua.

A hospedagem acima serve apenas para sinalização. Ela NÃO substitui TURN. Teste primeiro em dois PCs de redes diferentes. Se ambos entrarem na sala, mas áudio/vídeo falharem, a conexão de mídia pode exigir TURN. O app aceita URL, usuário e senha de um TURN em Conexão avançada antes de entrar na sala. Essas credenciais ficam na sessão e não são gravadas no projeto.

Sem publicar o servidor não existe ainda uma experiência de abrir o app e usar pela internet. Sem testes reais e TURN não é possível garantir funcionamento em todas as redes.

## Fontes consultadas

- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/websocket
- https://render.com/docs/free
- https://render.com/changelog/free-web-services-now-remain-active-while-receiving-websocket-messages
