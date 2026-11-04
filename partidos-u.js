(()=>{
  const box=document.getElementById('matchWidget');
  if(!box)return;
  const next=box.querySelector('[data-match-next]');
  const last=box.querySelector('[data-match-last]');
  const note=box.querySelector('[data-match-note]');
  const refresh=box.querySelector('[data-match-refresh]');
  let loading=false,loaded=false;
  const base='https://www.thesportsdb.com/api/v1/json/123/';
  function dateText(e){
    const iso=e.strTimestamp;
    if(!iso)return 'Fecha por confirmar';
    const d=new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso)?iso:iso+'Z');
    if(Number.isNaN(d.getTime()))return 'Fecha y hora por confirmar';
    const date=new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',dateStyle:'medium'}).format(d);
    const time=new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',hour:'numeric',minute:'2-digit',hour12:true}).format(d);
    return date+' · '+time+' (hora de Perú)';
  }
  function createLine(label,event,isLast){
    const section=document.createElement('div');
    section.className='match-result';
    const heading=document.createElement('strong');heading.textContent=label;section.append(heading);
    const teams=document.createElement('div');teams.className='match-scoreboard';
    function team(name,badge,id){
      const side=document.createElement('div');side.className='match-team';
      const crest=document.createElement('span');crest.className='match-crest';
      const img=document.createElement('img');img.alt='';img.loading='lazy';
      let safe='';try{const url=new URL(badge);if(url.protocol==='https:'&&url.hostname==='r2.thesportsdb.com')safe=url.href}catch{}
      img.src=String(id)==='138329'?'u.png':safe;
      img.onerror=()=>{img.remove();crest.textContent=(name||'?').trim().charAt(0).toUpperCase()};
      if(img.getAttribute('src'))crest.append(img);else crest.textContent=(name||'?').trim().charAt(0).toUpperCase();
      const text=document.createElement('span');text.className='match-team-name';text.textContent=name||'Equipo por confirmar';
      side.append(crest,text);return side;
    }
    const score=document.createElement('div');score.className='match-score';
    score.textContent=isLast&&event.intHomeScore!=null&&event.intAwayScore!=null?event.intHomeScore+' – '+event.intAwayScore:'VS';
    teams.append(team(event.strHomeTeam,event.strHomeTeamBadge,event.idHomeTeam),score,team(event.strAwayTeam,event.strAwayTeamBadge,event.idAwayTeam));
    section.append(teams);
    const detail=document.createElement('small');
    const status=String(event.strStatus||'').toUpperCase();
    if(['PST','POSTPONED','CANC','CANCELLED'].includes(status)||event.strPostponed==='yes')detail.textContent='Aplazado o sujeto a cambios · confirma en la web oficial';
    else detail.textContent=dateText(event)+(isLast?' · resultado reportado':'');
    section.append(detail);
    if(/^\d+$/.test(String(event.idEvent||''))){
      const link=document.createElement('a');link.className='match-stats-link';
      link.href='https://www.thesportsdb.com/event/'+event.idEvent;
      link.target='_blank';link.rel='noopener noreferrer';
      link.textContent='Ver detalles y estadísticas ↗';
      link.setAttribute('aria-label','Ver detalles y estadísticas de '+(event.strEvent||'este partido')+' en TheSportsDB');
      section.append(link);
    }
    if(event.strHomeTeam&&event.strAwayTeam){
      const google=document.createElement('a');
      google.className='match-stats-link match-google-link';
      const query=[event.strHomeTeam,'vs',event.strAwayTeam,event.dateEvent||'','partido estadísticas'].join(' ');
      google.href='https://www.google.com/search?'+new URLSearchParams({q:query}).toString();
      google.target='_blank';google.rel='noopener noreferrer';
      google.textContent='🔎 Ver en Google ↗';
      google.setAttribute('aria-label','Buscar '+event.strHomeTeam+' contra '+event.strAwayTeam+' en Google');
      section.append(google);
    }
    return section;
  }
  async function get(path){
    const response=await fetch(base+path+'?id=138329',{cache:'no-store'});
    if(!response.ok)throw new Error('Fuente no disponible');
    return response.json();
  }
  async function load(){
    if(loading)return;loading=true;refresh.disabled=true;
    note.textContent='Consultando partidos…';
    const result=await Promise.allSettled([get('eventsnext.php'),get('eventslast.php')]);
    const upcoming=result[0].status==='fulfilled'?(result[0].value.events||[])[0]:null;
    const recent=result[1].status==='fulfilled'?(result[1].value.results||result[1].value.events||[])[0]:null;
    next.replaceChildren();last.replaceChildren();
    if(upcoming)next.append(createLine('PRÓXIMO PARTIDO COMO LOCAL',upcoming,false));
    else next.textContent='No hay próximo partido como local disponible.';
    if(recent&&recent.intHomeScore!=null&&recent.intAwayScore!=null)last.append(createLine('ÚLTIMO RESULTADO COMO LOCAL',recent,true));
    else last.textContent='No hay resultado reciente como local disponible.';
    note.textContent=result.every(x=>x.status==='rejected')?'No se pudieron cargar los datos. Revisa el calendario oficial.':'Fuente: TheSportsDB · Los datos pueden cambiar; confirma en la web oficial.';
    loaded=result.some(x=>x.status==='fulfilled');loading=false;refresh.disabled=false;
  }
  box.addEventListener('toggle',()=>{if(box.open&&!loaded)load()});
  refresh.addEventListener('click',load);
})();