(()=>{
 for(const notice of [document.getElementById('dailyNotice'),document.getElementById('pendingAlert')]){
  if(!notice)continue;
  let start=null,dismissing=false;
  function clearStyle(){notice.classList.remove('notice-dragging','notice-dismiss');notice.style.removeProperty('transform');notice.style.removeProperty('opacity')}
  notice.addEventListener('pointerdown',event=>{
   if(notice.hidden||dismissing||event.button!==0)return;
   start={id:event.pointerId,x:event.clientX,y:event.clientY,active:false};
  });
  notice.addEventListener('pointermove',event=>{
   if(!start||event.pointerId!==start.id)return;
   const dx=event.clientX-start.x,dy=event.clientY-start.y;
   if(!start.active&&dy < -8&&Math.abs(dy)>Math.abs(dx)*1.2){
    start.active=true;notice.classList.add('notice-dragging');
    try{notice.setPointerCapture(event.pointerId)}catch{}
   }
   if(!start.active)return;
   const distance=Math.min(0,dy);
   notice.style.transform='translateY('+distance+'px)';
   notice.style.opacity=String(Math.max(.25,1+distance/160));
  });
  function finish(event,cancelled){
   if(!start||event.pointerId!==start.id)return;
   const dy=event.clientY-start.y,active=start.active;start=null;
   if(!active){clearStyle();return}
   if(!cancelled&&dy<=-45){
    dismissing=true;notice.classList.add('notice-dismiss');
    notice.style.transform='translateY(-140%)';notice.style.opacity='0';
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(()=>{notice.hidden=true;clearStyle();dismissing=false},reduced?0:180);
   }else clearStyle();
  }
  notice.addEventListener('pointerup',event=>finish(event,false));
  notice.addEventListener('pointercancel',event=>finish(event,true));
  new MutationObserver(()=>{if(notice.hidden&&!dismissing){start=null;clearStyle()}}).observe(notice,{attributes:true,attributeFilter:['hidden']});
 }
})();