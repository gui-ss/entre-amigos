# Entre Amigos 0.2 — conexão pela internet, sem VPN

Projeto para Windows 10/11 de 64 bits: até 5 pessoas, uma tela transmitida por vez, som do PC e microfone de todos. Sem cadastro ou senha no aplicativo.

## Estado da entrega

O pacote contém o projeto e scripts para rodar/gerar instalador. NÃO contém um EXE compilado. O servidor online AINDA NÃO FOI PUBLICADO; nenhum endereço fictício foi colocado no app. A ativação inicial é descrita em `ATIVAR-SERVIDOR.md`. Sem ela, o app abre, mas não cria salas pela internet.

Não é preciso instalar VPN. Apenas quem administra o servidor precisa de conta no serviço de hospedagem; os amigos usam o aplicativo sem conta.

## Abrir no Windows

1. Extraia todo o ZIP em uma pasta.
2. Instale Node.js LTS (22.12 ou superior; sugerido 24): https://nodejs.org
3. Abra `INICIAR.cmd`. A primeira execução baixa as dependências.
4. Após ativar o servidor, cole sua URL HTTPS em **Configurar servidor**. O endereço será salvo neste PC.
5. Digite seu nome e clique em **Criar sala online**.
6. Use **Copiar convite**. O amigo cola o convite inteiro em **Código da sala ou convite completo** e clica em **Entrar na sala**. O convite já inclui o servidor.

Quem recebeu o mesmo instalador configurado pode usar somente o código de 10 caracteres. Quem possui o convite e consegue alcançar o servidor pode entrar; não há senha, conforme solicitado.

## Transmissão e voz

- Escolha 720p ou 1080p e clique em Compartilhar tela. A qualidade se aplica à próxima transmissão.
- Escolha uma tela ou janela. O som capturado é do sistema, mesmo ao selecionar apenas uma janela.
- O app solicita que a captura exclua seu próprio áudio para evitar retorno das vozes. Isso ainda precisa ser validado no Windows e dispositivo de áudio de vocês.
- Microfone inicia desligado. Ative-o quando quiser e use fones.
- Volume da tela controla a transmissão recebida; as vozes usam reprodução separada.
- Pare a transmissão para outro participante assumir. Sair libera suas capturas.
- Agora as salas ficam no servidor online: o primeiro participante pode sair sem derrubar os outros. Reiniciar o servidor apaga as salas; nesse caso, crie outra.

## Gerar o instalador

Depois de configurar `app/app-config.json` conforme o guia, execute `GERAR-INSTALADOR.cmd` no Windows. Ele deve produzir `dist/Entre Amigos Setup 0.2.0.exe`. Os amigos que receberem o instalador não precisam de Node.js. Não há certificado de assinatura digital incluído.

## Limites e verificação

O servidor organiza as salas. Tela e áudio usam WebRTC entre os PCs; o servidor de salas não retransmite o vídeo. Algumas redes bloqueiam a conexão direta: nesse caso é necessário configurar TURN em cada app, usando o painel Conexão avançada. Não há TURN hospedado ou credenciais incluídas. Um servidor TURN pode ter custo de tráfego. Sem TURN, não é possível garantir conexão em todas as redes.

Para quatro espectadores, o transmissor envia quatro cópias da mídia: comece em 720p. DRM pode impedir captura. Sem gravação, reconexão automática ou atualizador. Depois de uma queda, entre novamente.

Testes automatizados: `npm test` cobre limite de 5, controle de transmissor, isolamento, saída, mensagens inválidas, convites, validação de URL e endpoint de saúde. Verificação de sintaxe realizada. Interface, captura real, WebRTC em redes distintas e instalador Windows ainda precisam de validação. O ambiente desta entrega não tinha Windows ou navegador de teste disponível.

Referências: https://www.electronjs.org/docs/latest/api/desktop-capturer e https://webrtc.org/getting-started/turn-server
