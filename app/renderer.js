'use strict';
const $=id=>document.getElementById(id);
let socket=null,myId=null,presenter=null,screenStream=null,micStream=null,iceServers=[],members=[],serverAddress='',heartbeat=null,claimResolve=null,connecting=false,sharing=false;
const peers=new Map();
const status=text=>{$('status').textContent=text;};
const send=m=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(m));};
const safe=fn=>async(...args)=>{try{await fn(...args);}catch(e){status(e.message||String(e));}};
function tracks(){return [micStream?.getAudioTracks()[0]||null,screenStream?.getVideoTracks()[0]||null,screenStream?.getAudioTracks()[0]||null];}
function refreshScreen(){
 const p=peers.get(presenter);const stream=presenter===myId?screenStream:p?.screen;
 $('screen').muted=presenter===myId;
 if($('screen').srcObject!==stream)$('screen').srcObject=stream||null;
 const visible=!!stream?.getVideoTracks().length;
 $('empty').hidden=visible;$('live').hidden=!visible;
 $('share').disabled=sharing||!!(presenter&&presenter!==myId);
 $('share').textContent=screenStream?'Parar transmissão':'Compartilhar tela';
 if(visible)$('screen').play().catch(()=>status('Clique no vídeo para iniciar a reprodução.'));
}
function drawMembers(){
 $('members').replaceChildren();$('count').textContent=`${members.length}/5`;
 for(const m of members){const li=document.createElement('li');li.textContent=m.name+(m.id===myId?' (você)':'');const small=document.createElement('small');small.textContent=m.id===presenter?'Transmitindo':m.id===myId?'Conectado':peers.get(m.id)?.pc.connectionState||'Conectando';li.append(small);$('members').append(li);}
}
async function syncTracks(){const list=tracks();await Promise.all([...peers.values()].flatMap(p=>p.pc.getTransceivers().map((t,i)=>t.sender.replaceTrack(list[i]))));}
function makePeer(id,initiator){
 if(peers.has(id))return peers.get(id);
 const pc=new RTCPeerConnection({iceServers});
 const p={pc,screen:new MediaStream(),audio:document.createElement('audio'),pending:[],queue:Promise.resolve()};
 p.audio.autoplay=true;document.body.append(p.audio);peers.set(id,p);
 if(initiator){for(const kind of ['audio','video','audio'])pc.addTransceiver(kind,{direction:'sendrecv'});}
 pc.onicecandidate=e=>{if(e.candidate)send({type:'signal',to:id,data:{candidate:e.candidate.toJSON()}});};
 pc.ontrack=e=>{
  const index=pc.getTransceivers().indexOf(e.transceiver);
  if(index===0){p.audio.srcObject=new MediaStream([e.track]);p.audio.play().catch(()=>status('Ative a reprodução de áudio clicando na janela.'));}
  else{p.screen.addTrack(e.track);refreshScreen();}
 };
 pc.onconnectionstatechange=()=>{drawMembers();if(pc.connectionState==='failed')status('Falha na conexão com um amigo. Confira o servidor TURN; saia e entre novamente.');};
 return p;
}
async function offer(id){const p=makePeer(id,true);await Promise.all(p.pc.getTransceivers().map((t,i)=>t.sender.replaceTrack(tracks()[i])));await p.pc.setLocalDescription(await p.pc.createOffer());send({type:'signal',to:id,data:{description:p.pc.localDescription}});}
async function signal(id,data){
 const p=makePeer(id,false);
 p.queue=p.queue.then(async()=>{
  if(data.description){
   await p.pc.setRemoteDescription(data.description);
   while(p.pending.length)await p.pc.addIceCandidate(p.pending.shift());
   if(data.description.type==='offer'){
    for(const t of p.pc.getTransceivers())t.direction='sendrecv';
    await Promise.all(p.pc.getTransceivers().map((t,i)=>t.sender.replaceTrack(tracks()[i])));
    await p.pc.setLocalDescription(await p.pc.createAnswer());send({type:'signal',to:id,data:{description:p.pc.localDescription}});
   }
  }else if(data.candidate){if(p.pc.remoteDescription)await p.pc.addIceCandidate(data.candidate);else p.pending.push(data.candidate);}
 }).catch(e=>status('Erro de conexão: '+e.message));
 return p.queue;
}
function removePeer(id){const p=peers.get(id);if(!p)return;p.pc.close();p.audio.srcObject=null;p.audio.remove();peers.delete(id);}
function reset(){
 clearInterval(heartbeat);heartbeat=null;
 claimResolve?.(false);claimResolve=null;
 for(const s of [screenStream,micStream])s?.getTracks().forEach(t=>t.stop());screenStream=null;micStream=null;
 for(const id of [...peers.keys()])removePeer(id);
 myId=null;presenter=null;members=[];connecting=false;sharing=false;
 $('screen').srcObject=null;$('lobby').hidden=false;$('room').hidden=true;$('picker').close();$('mic').textContent='Ativar microfone';
 for(const id of ['join','remoteCreate'])$(id).disabled=false;
}
async function connect(mode,address){
 if(connecting||socket)return;address=Connection.normalizeAddress(address);
 if(!$('name').value.trim())throw Error('Preencha seu nome.');
 iceServers=[{urls:'stun:stun.l.google.com:19302'}];
 if($('turn').value.trim()){if(!/^turns?:/.test($('turn').value.trim()))throw Error('Endereço TURN inválido.');iceServers.push({urls:$('turn').value.trim(),username:$('turnUser').value,credential:$('turnPass').value});}
 connecting=true;for(const id of ['join','remoteCreate'])$(id).disabled=true;
 serverAddress=address;localStorage.setItem('serverUrl',address);$('address').value=address;status('Conectando… Um servidor gratuito adormecido pode levar até 2 minutos para iniciar.');
 const ws=new WebSocket(address);socket=ws;
 const timeout=setTimeout(()=>{if(!myId){status('Tempo esgotado. Verifique se o servidor foi ativado e tente novamente.');ws.close();}},120000);
 ws.onopen=()=>{send({type:mode,name:$('name').value,code:$('code').value});heartbeat=setInterval(()=>send({type:'ping'}),25000);};
 ws.onmessage=safe(async e=>{
  const m=JSON.parse(e.data);
  if(m.type==='welcome'){
   clearTimeout(timeout);connecting=false;myId=m.id;presenter=m.presenter;
   $('lobby').hidden=true;$('room').hidden=false;$('roomCode').textContent=m.code;
   $('hostInfo').textContent='Sala online · sem VPN';
   status('Sala conectada. Ative o microfone quando quiser.');
   for(const p of m.peers)await offer(p.id);
  }else if(m.type==='state'){members=m.members;presenter=m.presenter;drawMembers();refreshScreen();}
  else if(m.type==='signal')await signal(m.from,m.data);
  else if(m.type==='left'){removePeer(m.id);refreshScreen();}
  else if(m.type==='claim'){claimResolve?.(m.ok);claimResolve=null;}
  else if(m.type==='error'){status(m.message);if(!myId)ws.close();}
 });
 ws.onerror=()=>status('Não foi possível conectar. Verifique o endereço, a rede e a permissão no firewall.');
 ws.onclose=()=>{clearTimeout(timeout);if(socket===ws){const joined=!!myId;socket=null;reset();if(joined)status('O servidor desconectou. Entre novamente; se ele reiniciou, crie outra sala.');}};
}
async function stopShare(){
 const old=screenStream;screenStream=null;old?.getTracks().forEach(t=>t.stop());
 try{await syncTracks();}finally{send({type:'release'});refreshScreen();}
}
async function startShare(id){
 $('picker').close();if(!myId)return;
 sharing=true;refreshScreen();
 let captured=null;
 try{
  const accepted=await new Promise(resolve=>{const timer=setTimeout(()=>{if(claimResolve===finish)claimResolve=null;resolve(false);},5000);const finish=ok=>{clearTimeout(timer);resolve(ok);};claimResolve=finish;send({type:'claim'});});
  if(!accepted)throw Error('A transmissão está ocupada ou a conexão foi interrompida.');
  await window.desktop.choose(id);
  const height=Number($('quality').value);
  captured=await navigator.mediaDevices.getDisplayMedia({video:{height:{ideal:height,max:height},width:{ideal:Math.round(height*16/9),max:Math.round(height*16/9)},frameRate:{ideal:30,max:30}},audio:{restrictOwnAudio:true},systemAudio:'include'});
  if(!myId){captured.getTracks().forEach(t=>t.stop());return;}
  screenStream=captured;
  screenStream.getVideoTracks()[0].onended=()=>safe(stopShare)();
  await syncTracks();
  status(screenStream.getAudioTracks().length?'Tela e áudio do sistema em transmissão.':'Tela em transmissão, mas o Windows não forneceu áudio. Confira o dispositivo de saída.');
 }catch(e){captured?.getTracks().forEach(t=>t.stop());screenStream=null;await syncTracks().catch(()=>{});send({type:'release'});throw e;}
 finally{sharing=false;refreshScreen();}
}
$('join').onclick=safe(()=>{const invite=Connection.parseInvite($('code').value,$('address').value);$('code').value=invite.code;$('address').value=invite.address;return connect('join',invite.address);});
$('remoteCreate').onclick=safe(()=>connect('create',$('address').value.trim()));
$('leave').onclick=()=>{const old=socket;socket=null;old?.close();reset();status('Você saiu da sala.');};
$('share').onclick=safe(async()=>{
 if(screenStream)return stopShare();
 const sources=await window.desktop.sources();$('sources').replaceChildren();
 if(!sources.length)throw Error('Nenhuma tela ou janela disponível.');
 for(const source of sources){const button=document.createElement('button'),img=document.createElement('img'),label=document.createElement('span');img.src=source.thumbnail;img.alt='';label.textContent=source.name;button.append(img,label);button.onclick=safe(()=>startShare(source.id));$('sources').append(button);}
 $('picker').showModal();
});
$('cancel').onclick=()=>$('picker').close();
$('mic').onclick=safe(async()=>{
 $('mic').disabled=true;
 try{
  if(!micStream){const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});if(!myId){stream.getTracks().forEach(t=>t.stop());return;}micStream=stream;await syncTracks();}
  else micStream.getAudioTracks().forEach(t=>t.enabled=!t.enabled);
  $('mic').textContent=micStream.getAudioTracks()[0].enabled?'Silenciar microfone':'Ativar microfone';
 }finally{$('mic').disabled=false;}
});
$('volume').oninput=()=>$('screen').volume=Number($('volume').value);$('screen').volume=.8;
$('copy').onclick=safe(async()=>{
 await window.desktop.copy(Connection.invite(serverAddress,$('roomCode').textContent));
 status('Convite copiado. Seu amigo pode colá-lo no campo Código da sala.');
});
window.desktop.config().then(config=>{
 $('address').value=localStorage.getItem('serverUrl')||config.serverUrl||'';
 $('settings').open=!$('address').value;
 if($('address').value)$('setupNote').textContent='Servidor configurado. Você já pode criar ou entrar em uma sala.';
}).catch(()=>status('Não foi possível ler a configuração. Informe o endereço do servidor.'));
window.addEventListener('beforeunload',()=>{socket?.close();for(const s of [screenStream,micStream])s?.getTracks().forEach(t=>t.stop());});
