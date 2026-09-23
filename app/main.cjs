const {app,BrowserWindow,ipcMain,desktopCapturer,session,clipboard}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
let win,selection;
const page=pathToFileURL(path.join(__dirname,'index.html')).href;
const valid=e=>e.sender===win?.webContents&&e.senderFrame?.url===page;
app.whenReady().then(()=>{
 session.defaultSession.setPermissionRequestHandler((wc,p,cb)=>cb(wc===win?.webContents&&wc.getURL()===page&&['media','display-capture'].includes(p)));
 session.defaultSession.setPermissionCheckHandler((wc,p)=>wc===win?.webContents&&wc.getURL()===page&&['media','display-capture'].includes(p));
 session.defaultSession.setDisplayMediaRequestHandler(async(req,cb)=>{
  try{if(req.frame.url!==page||!selection)return cb({});const chosen=selection;selection=null;const sources=await desktopCapturer.getSources({types:['screen','window']});const video=sources.find(s=>s.id===chosen);if(!video)return cb({});cb({video,audio:'loopback'});}catch{cb({});}
 });
 ipcMain.handle('copy',(e,text)=>{if(!valid(e)||typeof text!=='string'||text.length>4096)throw Error('Convite inválido');clipboard.writeText(text);});
 ipcMain.handle('config',e=>{if(!valid(e))throw Error('Origem inválida');return require('./app-config.json');});
 ipcMain.handle('sources',async e=>{if(!valid(e))throw Error('Origem inválida');return (await desktopCapturer.getSources({types:['screen','window'],thumbnailSize:{width:240,height:135}})).map(s=>({id:s.id,name:s.name,thumbnail:s.thumbnail.toDataURL()}));});
 ipcMain.handle('choose',(e,id)=>{if(!valid(e)||typeof id!=='string')throw Error('Origem inválida');selection=id;});
 win=new BrowserWindow({width:1160,height:820,minWidth:850,minHeight:680,backgroundColor:'#10131b',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.loadFile(path.join(__dirname,'index.html'));
});
app.on('window-all-closed',()=>app.quit());
