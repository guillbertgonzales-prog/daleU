(()=>{
 const file=document.getElementById('welcomeMusicFile'),volume=document.getElementById('welcomeMusicVolume'),enabled=document.getElementById('welcomeMusicEnabled'),status=document.getElementById('welcomeMusicStatus'),preview=document.getElementById('welcomeMusicPreview'),remove=document.getElementById('welcomeMusicRemove'),intro=document.getElementById('photoIntro'),button=document.getElementById('introMusicButton');
 if(!file||!intro||!button)return;
 const audio=new Audio();audio.loop=true;let objectUrl='',music=null,db=null,waiting=false,userPaused=false;
 const mainButton=document.createElement('button');
 mainButton.type='button';mainButton.className='music-page-button';mainButton.hidden=true;
 document.querySelector('.header-actions')?.prepend(mainButton);
 const settingsKey='daleu-musica-ajustes-v1';let settings={enabled:true,volume:.35};
 try{settings={...settings,...JSON.parse(localStorage.getItem(settingsKey)||'{}')}}catch{}
 const storedVolume=Number(settings.volume);settings.volume=Number.isFinite(storedVolume)?Math.max(0,Math.min(1,storedVolume)):.35;
 volume.value=Math.round(settings.volume*100);enabled.checked=!!settings.enabled;audio.volume=settings.volume;
 function saveSettings(){try{localStorage.setItem(settingsKey,JSON.stringify(settings))}catch{status.textContent='No se pudo guardar la configuración.'}}
 function update(){
  const available=!!music&&!!settings.enabled,playing=!audio.paused;
  button.hidden=!available;mainButton.hidden=!available;
  button.textContent=playing?'🔇 Silenciar música':'🔊 Activar música';
  button.setAttribute('aria-pressed',String(playing));
  mainButton.innerHTML=playing?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 9l4 6m0-6-4 6"/></svg>';
  mainButton.setAttribute('aria-label',playing?'Pausar música':'Activar música');
  mainButton.title=playing?'Pausar música':'Activar música';
  preview.disabled=!music;remove.disabled=!music;
 }
 async function playMusic(){
  if(!music||!settings.enabled||userPaused)return;
  try{await audio.play();waiting=false;update()}
  catch{waiting=true;status.textContent='Toca la pantalla o el botón de música para comenzar.';update()}
 }
 function useMusic(value){
  audio.pause();if(objectUrl)URL.revokeObjectURL(objectUrl);
  music=value;objectUrl=value?URL.createObjectURL(value.blob):'';
  if(value)audio.src=objectUrl;else audio.removeAttribute('src');
  status.textContent=value?'Música guardada: '+value.name:'Aún no has elegido música.';
  userPaused=false;waiting=!!value&&!!settings.enabled;update();if(waiting)playMusic();
 }
 function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('daleu-musica',1);req.onupgradeneeded=()=>req.result.createObjectStore('audio');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
 function operation(mode,action){return new Promise((resolve,reject)=>{const tx=db.transaction('audio',mode),store=tx.objectStore('audio');let result;try{result=action(store)}catch(e){reject(e);return}tx.oncomplete=()=>resolve(result.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
 async function togglePlay(){
  if(!music){status.textContent='Primero elige un archivo de audio en Administración.';return}
  if(!audio.paused){userPaused=true;waiting=false;audio.pause();update();return}
  userPaused=false;
  try{await audio.play();waiting=false;update()}catch{waiting=true;status.textContent='Toca el botón nuevamente para reproducir la música.';update()}
 }
 button.onclick=togglePlay;mainButton.onclick=togglePlay;preview.onclick=togglePlay;
 audio.addEventListener('pause',update);audio.addEventListener('play',update);
 document.addEventListener('pointerdown',event=>{
  if(!waiting||!settings.enabled||userPaused||!music)return;
  if(event.target.closest('#introMusicButton,.music-page-button,#welcomeMusicPreview,#welcomeMusicEnabled,#welcomeMusicRemove'))return;
  playMusic();
 },true);
 enabled.onchange=()=>{settings.enabled=enabled.checked;saveSettings();userPaused=false;if(!settings.enabled){waiting=false;audio.pause()}else if(music){waiting=true;playMusic()}update()};
 volume.oninput=()=>{settings.volume=Number(volume.value)/100;audio.volume=settings.volume;saveSettings()};
 file.onchange=async()=>{let chosen=file.files[0];if(!chosen)return;if(chosen.size>15*1024*1024){status.textContent='El audio debe pesar como máximo 15 MB.';file.value='';return}if(!db){status.textContent='Este navegador no permite guardar el audio.';file.value='';return}try{let item={name:chosen.name,blob:chosen};await operation('readwrite',store=>store.put(item,'welcome'));useMusic(item)}catch{status.textContent='No se pudo guardar el audio. Revisa el espacio disponible.'}file.value=''};
 remove.onclick=async()=>{if(!db)return;try{await operation('readwrite',store=>store.delete('welcome'));waiting=false;useMusic(null)}catch{status.textContent='No se pudo eliminar la música.'}};
 openDB().then(async value=>{db=value;useMusic(await operation('readonly',store=>store.get('welcome'))||null)}).catch(()=>{status.textContent='No se pudo abrir el almacenamiento de música en este navegador.';update()});update();
})();