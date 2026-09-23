(function(root){
 'use strict';
 function normalizeAddress(raw){
  if(!String(raw||'').trim())throw Error('Falta ativar o servidor online. Veja ATIVAR-SERVIDOR.md e preencha o endereço em Configurar servidor.');
  let u;try{u=new URL(String(raw).trim());}catch{throw Error('Endereço inválido. Cole a URL HTTPS do servidor.');}
  if(u.protocol==='https:')u.protocol='wss:';
  if(u.protocol==='http:')u.protocol='ws:';
  const local=['localhost','127.0.0.1','[::1]'].includes(u.hostname);
  if(u.protocol!=='wss:'&&!(u.protocol==='ws:'&&local))throw Error('Use HTTPS ou WSS para conectar pela internet.');
  if(u.username||u.password||u.hash)throw Error('Endereço do servidor inválido.');
  return u.href;
 }
 function parseInvite(raw,address){
  const value=String(raw||'').trim();
  if(value.startsWith('EA2|')){const parts=value.split('|');if(parts.length!==3)throw Error('Convite incompleto.');address=parts[1];raw=parts[2];}
  const code=String(raw||'').trim().toUpperCase();
  if(!/^[A-F0-9]{10}$/.test(code))throw Error('Cole o convite completo ou o código de 10 caracteres.');
  return {address:normalizeAddress(address),code};
 }
 function invite(address,code){const checked=parseInvite(code,address);return `EA2|${checked.address}|${checked.code}`;}
 const api={normalizeAddress,parseInvite,invite};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Connection=api;
})(typeof window!=='undefined'?window:globalThis);
