(()=>{
 const file=document.getElementById('welcomeMusicFile'),volume=document.getElementById('welcomeMusicVolume'),enabled=document.getElementById('welcomeMusicEnabled'),status=document.getElementById('welcomeMusicStatus'),preview=document.getElementById('welcomeMusicPreview'),remove=document.getElementById('welcomeMusicRemove'),intro=document.getElementById('photoIntro'),button=document.getElementById('introMusicButton');
 if(!file||!intro)return;
 const audio=new Audio();audio.loop=true;let objectUrl='',music=null,db=null;
 const settingsKey='daleu-musica-ajustes-v1';let settings={enabled:true,volume:.35};
 try{settings={...settings,...JSON.parse(localStorage.getItem(settingsKey)||'{}')}}catch{}
 settings.volume=Math.max(0,Math.min(1,Number(settings.volume)||0));volume.value=Math.round(settings.volume*100);enabled.checked=!!settings.enabled;audio.volume=settings.volume;
 function saveSettings(){try{localStorage.setItem(settingsKey,JSON.stringify(settings))}catch{status.textContent='No se pudo guardar la configuración.'}}
 function update(){button.hidden=!music||!enabled.checked;button.textContent=audio.paused?'🔊 Activar música':'🔇 Silenciar música';button.setAttribute('aria-pressed',String(!audio.paused));preview.disabled=!music;remove.disabled=!music}
 function useMusic(value){if(objectUrl)URL.revokeObjectURL(objectUrl);music=value;objectUrl=value?URL.createObjectURL(value.blob):'';audio.pause();audio.src=objectUrl;status.textContent=value?'Música guardada: '+value.name:'Aún no has elegido música.';update()}
 function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('daleu-musica',1);req.onupgradeneeded=()=>req.result.createObjectStore('audio');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
 function operation(mode,action){return new Promise((resolve,reject)=>{const tx=db.transaction('audio',mode),store=tx.objectStore('audio');let result;try{result=action(store)}catch(e){reject(e);return}tx.oncomplete=()=>resolve(result.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
 async function togglePlay(){if(!music){status.textContent='Primero elige un archivo de audio en Administración.';return}if(!audio.paused){audio.pause();update();return}try{await audio.play();update()}catch{status.textContent='Toca el botón nuevamente para reproducir la música.';update()}}
 button.onclick=togglePlay;preview.onclick=togglePlay;audio.addEventListener('pause',update);audio.addEventListener('play',update);
 enabled.onchange=()=>{settings.enabled=enabled.checked;saveSettings();if(!settings.enabled)audio.pause();update()};
 volume.oninput=()=>{settings.volume=Number(volume.value)/100;audio.volume=settings.volume;saveSettings()};
 file.onchange=async()=>{let chosen=file.files[0];if(!chosen)return;if(chosen.size>15*1024*1024){status.textContent='El audio debe pesar como máximo 15 MB.';file.value='';return}if(!db){status.textContent='Este navegador no permite guardar el audio.';file.value='';return}try{let item={name:chosen.name,blob:chosen};await operation('readwrite',store=>store.put(item,'welcome'));useMusic(item)}catch{status.textContent='No se pudo guardar el audio. Revisa el espacio disponible.'}file.value=''};
 remove.onclick=async()=>{if(!db)return;try{await operation('readwrite',store=>store.delete('welcome'));useMusic(null)}catch{status.textContent='No se pudo eliminar la música.'}};
 new MutationObserver(()=>{if(intro.hidden&&!audio.paused){audio.pause();audio.currentTime=0;update()}}).observe(intro,{attributes:true,attributeFilter:['hidden']});
 openDB().then(async value=>{db=value;useMusic(await operation('readonly',store=>store.get('welcome'))||null)}).catch(()=>{status.textContent='No se pudo abrir el almacenamiento de música en este navegador.';update()});update();
})();