const { WebSocketServer } = require('ws');
const http = require('node:http');
const { randomBytes, randomUUID } = require('node:crypto');
function startServer(port = 47831, host = '0.0.0.0') {
 return new Promise((resolve, reject) => {
 const httpServer = http.createServer((req,res)=>{
  if(req.url==='/' || req.url==='/health') {res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({service:'entre-amigos',ok:true,version:'0.2.0'}));}
  else {res.writeHead(404);res.end();}
 });
 const wss = new WebSocketServer({ server:httpServer, maxPayload:65536 });
 httpServer.on('error',reject);
 const rooms = new Map();
 const send = (s,m) => { if (s.readyState === 1) s.send(JSON.stringify(m)); };
 const broadcast = (r,m) => { for (const s of r.members.values()) send(s,m); };
 const state = r => broadcast(r,{type:'state',members:[...r.members.values()].map(s=>({id:s.id,name:s.nick})),presenter:r.presenter});
 wss.on('error',reject);
 wss.on('connection',s=>{
  if(wss.clients.size>500){s.close(1013,'Servidor cheio');return;}
  s.id=randomUUID(); s.alive=true; s.on('pong',()=>s.alive=true);
  let count=0, start=Date.now();
  s.on('message',raw=>{
   if(Date.now()-start>1000){start=Date.now();count=0;} if(++count>150) return s.close(1008,'Limite');
   let m;try{m=JSON.parse(raw);}catch{return;}
   if(!m || typeof m!=='object')return;
   const fail=message=>send(s,{type:'error',message});
   if(m.type==='create'||m.type==='join'){
    if(s.room)return fail('Você já está em uma sala.');
    let code=String(m.code||'').toUpperCase().trim(),r;
    if(m.type==='create'){
     if(rooms.size>=100)return fail('Servidor cheio.');
     do{code=randomBytes(5).toString('hex').toUpperCase();}while(rooms.has(code));
     r={members:new Map(),presenter:null};rooms.set(code,r);
    }else r=rooms.get(code);
    if(!r)return fail('Sala não encontrada.');
    if(r.members.size>=5)return fail('Sala cheia: máximo de 5 pessoas.');
    s.nick=String(m.name||'Amigo').trim().slice(0,32)||'Amigo';
    const peers=[...r.members.values()].map(p=>({id:p.id,name:p.nick}));
    s.room=code;r.members.set(s.id,s);
    send(s,{type:'welcome',id:s.id,code,peers,presenter:r.presenter});state(r);return;
   }
   if(m.type==='ping'){send(s,{type:'pong'});return;}
   const r=rooms.get(s.room);if(!r)return;
   if(m.type==='signal'){
    const target=r.members.get(m.to);
    if(target&&m.data&&JSON.stringify(m.data).length<60000)send(target,{type:'signal',from:s.id,data:m.data});
   }else if(m.type==='claim'){
    if(r.presenter&&r.presenter!==s.id)send(s,{type:'claim',ok:false});
    else{r.presenter=s.id;send(s,{type:'claim',ok:true});state(r);}
   }else if(m.type==='release'&&r.presenter===s.id){r.presenter=null;state(r);}
  });
  s.on('error',()=>{});
  s.on('close',()=>{const r=rooms.get(s.room);if(!r)return;r.members.delete(s.id);if(r.presenter===s.id)r.presenter=null;broadcast(r,{type:'left',id:s.id});if(!r.members.size)rooms.delete(s.room);else state(r);});
 });
 const timer=setInterval(()=>{for(const s of wss.clients){if(!s.alive)s.terminate();else{s.alive=false;s.ping();}}},15000);timer.unref();
 wss.on('close',()=>clearInterval(timer));
 httpServer.listen(port,host,()=>resolve({port:httpServer.address().port,close:()=>new Promise(done=>{for(const s of wss.clients)s.terminate();wss.close(()=>httpServer.close(done));})}));
 });
}
module.exports={startServer};
if(require.main===module)startServer(Number(process.env.PORT)||47831).then(s=>{console.log('Servidor na porta '+s.port);process.once('SIGTERM',async()=>{await s.close();process.exit(0);});}).catch(e=>{console.error(e.message);process.exit(1);});
