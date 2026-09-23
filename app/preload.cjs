const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop',{sources:()=>ipcRenderer.invoke('sources'),choose:id=>ipcRenderer.invoke('choose',id),copy:text=>ipcRenderer.invoke('copy',text),config:()=>ipcRenderer.invoke('config')});
