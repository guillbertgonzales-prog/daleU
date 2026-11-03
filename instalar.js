(()=>{
  let prompt;
  const actions=document.querySelector('.header-actions');
  if(actions){
    const button=document.createElement('button');
    button.type='button';button.className='install-app';button.textContent='↓ Instalar';button.hidden=true;
    button.setAttribute('aria-label','Instalar Y dale U');
    actions.prepend(button);
    window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;button.hidden=false});
    button.addEventListener('click',async()=>{if(!prompt)return;const current=prompt;prompt=null;button.hidden=true;await current.prompt()});
    window.addEventListener('appinstalled',()=>{prompt=null;button.hidden=true});
  }
  if('serviceWorker' in navigator&&window.isSecureContext){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
})();

