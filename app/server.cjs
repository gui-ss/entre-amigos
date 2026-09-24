'use strict';
const {WebSocketServer}=require('ws');
const http=require('node:http');
const {randomBytes,randomUUID}=require('node:crypto');
function startServer(port=47831,host='0.0.0.0',options={}){
 const grace=options.graceMs??90000;
 return new Promise((resolve,reject)=>{
  const rooms=new Map();let closing=false;
  const httpServer=http.createServer((req,res)=>{res.writeHead(req.url==='/'||req.url==='/health'?200:404,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(req.url==='/'||req.url==='/health'?{service:'lobby',ok:true,version:'0.4.0',protocol:2}:{error:'Not found'}));});
  const wss=new WebSocketServer({server:httpServer,maxPayload:65536});
  const send=(s,m)=>{if(s?.readyState===1)s.send(JSON.stringify(m));};
  const publicMember=p=>({id:p.id,name:p.name,online:!!p.socket});
  const broadcast=(r,m)=>{for(const p of r.members.values())send(p.socket,m);};
  const state=r=>broadcast(r,{type:'state',members:[...r.members.values()].map(publicMember),presenter:r.presenter,owner:r.owner,locked:r.locked});
  function remove(code,id){const r=rooms.get(code),p=r?.members.get(id);if(!p)return;clearTimeout(p.timer);r.members.delete(id);if(r.presenter===id)r.presenter=null;if(r.owner===id)r.owner=[...r.members.values()].find(x=>x.socket)?.id||r.members.keys().next().value||null;broadcast(r,{type:'left',id});if(!r.members.size)rooms.delete(code);else state(r);}
  function disconnect(s,explicit=false){const r=rooms.get(s.room),p=r?.members.get(s.id);if(!p||p.socket!==s)return;p.socket=null;if(explicit||!p.resumable||closing)return remove(s.room,s.id);if(r.presenter===s.id)r.presenter=null;broadcast(r,{type:'left',id:s.id});state(r);p.timer=setTimeout(()=>remove(s.room,s.id),grace);p.timer.unref();}
  wss.on('connection',s=>{
   if(wss.clients.size>500){s.close(1013,'Servidor cheio');return;}
   s.alive=true;s.on('pong',()=>s.alive=true);let count=0,start=Date.now();
   const fail=(code,message)=>send(s,{type:'error',code,message});
   s.on('message',raw=>{
    if(Date.now()-start>1000){start=Date.now();count=0;}if(++count>150)return s.close(1008,'Limite');
    let m;try{m=JSON.parse(raw);}catch{return;}if(!m||typeof m!=='object'||Array.isArray(m))return;
    if(m.type==='ping'){send(s,{type:'pong'});return;}
    if(['create','join','resume'].includes(m.type)){
     if(s.room)return fail('ALREADY_JOINED','Você já está em uma sala.');
     let code=String(m.code||'').trim().toUpperCase(),r,p;
     if(m.type==='create'){
      if(rooms.size>=100)return fail('SERVER_FULL','Servidor cheio. Tente mais tarde.');
      do{code=randomBytes(5).toString('hex').toUpperCase();}while(rooms.has(code));
      r={members:new Map(),presenter:null,owner:null,locked:false};rooms.set(code,r);
     }else r=rooms.get(code);
     if(!r)return fail('ROOM_NOT_FOUND','Sala não encontrada. O servidor pode ter reiniciado; crie uma nova sala.');
     if(m.type==='resume'){
      if(typeof m.token!=='string'||m.token.length!==64)return fail('SESSION_EXPIRED','A sessão expirou. Entre novamente pelo convite.');
      p=[...r.members.values()].find(x=>x.token===m.token);
      if(!p)return fail('SESSION_EXPIRED','A sessão expirou. Entre novamente pelo convite.');
      clearTimeout(p.timer);const old=p.socket;p.socket=null;old?.close(4001,'Sessão retomada');
      broadcast(r,{type:'left',id:p.id});
     }else{
      if(r.locked)return fail('ROOM_LOCKED','Esta sala está com novas entradas bloqueadas. Peça ao anfitrião para desbloquear.');
      if(r.members.size>=5)return fail('ROOM_FULL','Sala cheia: máximo de 5 pessoas.');
      p={id:randomUUID(),name:String(m.name||'Amigo').trim().slice(0,32)||'Amigo',token:randomBytes(32).toString('hex'),resumable:m.protocol===2,socket:null};
      r.members.set(p.id,p);if(!r.owner)r.owner=p.id;
     }
     const peers=[...r.members.values()].filter(x=>x.id!==p.id&&x.socket).map(publicMember);
     p.socket=s;s.id=p.id;s.room=code;
     send(s,{type:'welcome',id:p.id,code,peers,presenter:r.presenter,owner:r.owner,locked:r.locked,token:p.resumable?p.token:undefined,protocol:2,graceMs:grace});state(r);return;
    }
    const r=rooms.get(s.room);if(!r||r.members.get(s.id)?.socket!==s)return;
    if(m.type==='leave'){disconnect(s,true);s.room=null;s.close(1000);return;}
    if(m.type==='signal'){
     const target=r.members.get(m.to);if(target&&m.data&&typeof m.data==='object'&&JSON.stringify(m.data).length<60000)send(target.socket,{type:'signal',from:s.id,data:m.data});
    }else if(m.type==='claim'){
     if(r.presenter&&r.presenter!==s.id)send(s,{type:'claim',ok:false});else{r.presenter=s.id;send(s,{type:'claim',ok:true});state(r);}
    }else if(m.type==='release'&&r.presenter===s.id){r.presenter=null;state(r);}
    else if(m.type==='lock'){
     if(r.owner!==s.id)return fail('HOST_ONLY','Somente o anfitrião pode controlar a sala.');
     if(typeof m.locked==='boolean'){r.locked=m.locked;state(r);}
    }else if(m.type==='kick'){
     if(r.owner!==s.id)return fail('HOST_ONLY','Somente o anfitrião pode remover participantes.');
     const target=r.members.get(m.id);if(!target||m.id===s.id)return fail('INVALID_MEMBER','Selecione outro participante.');
     const sock=target.socket;send(sock,{type:'kicked',message:'Você foi removido da sala pelo anfitrião.'});remove(s.room,m.id);if(sock){sock.room=null;sock.close(4003,'Removido');}
    }
   });
   s.on('error',()=>{});s.on('close',()=>disconnect(s));
  });
  const timer=setInterval(()=>{for(const s of wss.clients){if(!s.alive)s.terminate();else{s.alive=false;s.ping();}}},15000);timer.unref();
  httpServer.on('error',reject);wss.on('error',reject);wss.on('close',()=>clearInterval(timer));
  httpServer.listen(port,host,()=>resolve({port:httpServer.address().port,close:()=>new Promise(done=>{closing=true;for(const r of rooms.values())for(const p of r.members.values())clearTimeout(p.timer);for(const s of wss.clients)s.terminate();wss.close(()=>httpServer.close(done));})}));
 });
}
module.exports={startServer};
if(require.main===module)startServer(Number(process.env.PORT)||47831).then(s=>{console.log('Lobby: servidor na porta '+s.port);process.once('SIGTERM',async()=>{await s.close();process.exit(0);});}).catch(e=>{console.error(e.message);process.exit(1);});
