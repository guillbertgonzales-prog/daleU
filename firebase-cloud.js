import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getFirestore, doc, getDocFromServer, runTransaction, onSnapshot } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

window.cloudModuleLoaded=true;
const config={apiKey:'AIzaSyAQFCIG4dFoVnkfcJefdEtNGZW_iN_I5XI',authDomain:'dale-u-ahorro.firebaseapp.com',projectId:'dale-u-ahorro',storageBucket:'dale-u-ahorro.firebasestorage.app',messagingSenderId:'712288429342',appId:'1:712288429342:web:dd05da44a7de981c40150f'};
const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();
const el=id=>document.getElementById(id),ownerKey='mi-ahorro-cloud-owner-v1',revisionKey='mi-ahorro-cloud-revision-v1';
let current=null,revision=0,enabled=false,timer=null,busy=false,dirty=false,conflictRemote=null,unsubscribe=null,pendingRemote=null;
function status(message){const display=el('cloudStatus');display.textContent=current?.email?message+' · '+current.email:message;display.title=current?.email?'Cuenta conectada: '+current.email:''}
function gate(message,{signin=false,retry=false,conflict=false}={}){el('cloudGate').hidden=false;el('cloudMessage').textContent=message;el('cloudSignIn').hidden=!signin;el('cloudRetry').hidden=!retry;el('cloudConflict').hidden=!conflict}
function validate(g){return g&&typeof g==='object'&&Array.isArray(g.entries)&&g.entries.length>0&&g.entries.length<=100&&g.entries.some(e=>e.id===g.active)&&new Set(g.entries.map(e=>e.id)).size===g.entries.length&&g.entries.every(e=>e&&typeof e.id==='string'&&e.data&&Array.isArray(e.data.items)&&Array.isArray(e.data.withdrawals)&&e.data.items.every(x=>x&&typeof x.id==='string'&&Number.isFinite(x.amount)&&x.amount>0&&typeof x.date==='string')&&e.data.withdrawals.every(w=>w&&typeof w.id==='string'&&Number.isFinite(w.amount)&&w.amount>0&&Number.isFinite(w.at)&&Number.isFinite(w.due)&&Array.isArray(w.payments)&&w.payments.every(p=>Number.isFinite(p.amount)&&p.amount>0&&Number.isFinite(p.at)))&&(!e.data.goal||(typeof e.data.goal.name==='string'&&Number.isFinite(e.data.goal.target)&&e.data.goal.target>0)))}
function hasData(g){return g.entries.some(e=>e.data.goal||e.data.items.length||e.data.withdrawals.length)}
function localSnapshot(){const g=window.cloudGetGoals();if(!validate(g))throw Error('invalid-local');return g}
function remoteRef(){return doc(db,'users',current.uid)}
function openApp(){el('cloudGate').hidden=true;el('cloudConflict').hidden=true;el('cloudRetry').hidden=true;status('☁️ Sincronizado')}
function applyPendingRemote(){
  if(!pendingRemote||!current||!enabled||busy)return;
  if(document.body.classList.contains('admin-open')||document.body.classList.contains('mobile-form-open')){status('☁️ Actualización pendiente');return}
  const incoming=pendingRemote;pendingRemote=null;
  if(incoming.revision<=revision)return;
  if(dirty){
    if(JSON.stringify(localSnapshot())===JSON.stringify(incoming.payload)){revision=incoming.revision;dirty=false;localStorage.setItem(revisionKey,String(revision));status('☁️ Sincronizado');return}
    revision=incoming.revision;conflictRemote=incoming.payload;enabled=false;
    gate('Los datos cambiaron en otro dispositivo mientras tenías cambios pendientes. Elige qué copia conservar.',{conflict:true});status('⚠️ Revisión necesaria');return;
  }
  window.cloudSetGoals(incoming.payload);revision=incoming.revision;
  localStorage.setItem(ownerKey,current.uid);localStorage.setItem(revisionKey,String(revision));status('☁️ Sincronizado');
}
function startListener(){
  if(unsubscribe)unsubscribe();
  const uid=current.uid;pendingRemote=null;
  unsubscribe=onSnapshot(remoteRef(),{includeMetadataChanges:true},snap=>{
    if(!current||current.uid!==uid||!snap.exists()||snap.metadata.fromCache||snap.metadata.hasPendingWrites)return;
    try{
      const cloud=snap.data();
      if(typeof cloud.payload!=='string'||!Number.isSafeInteger(cloud.revision))throw Error('invalid-cloud');
      const payload=JSON.parse(cloud.payload);if(!validate(payload))throw Error('invalid-cloud');
      if(cloud.revision<=revision)return;
      if(!pendingRemote||cloud.revision>pendingRemote.revision)pendingRemote={revision:cloud.revision,payload};
      applyPendingRemote();
    }catch(error){console.error('No se pudo actualizar desde la nube',error.message);status('⚠️ No se pudo sincronizar')}
  },error=>{console.error('Sincronización en vivo',error.code||error.message);status('⚠️ Sin conexión en vivo')});
}
new MutationObserver(()=>applyPendingRemote()).observe(document.body,{attributes:true,attributeFilter:['class']});
async function loadAccount(){if(!current)return;enabled=false;gate('Consultando tus datos en la nube…');try{let snap=await getDocFromServer(remoteRef()),local=localSnapshot(),owner=localStorage.getItem(ownerKey);if(owner&&owner!==current.uid){gate('Este navegador contiene datos de otra cuenta. Ingresa con la cuenta anterior para conservarlos.',{signin:true});await signOut(auth);return}if(snap.exists()){const cloud=snap.data();if(typeof cloud.payload!=='string'||!Number.isSafeInteger(cloud.revision))throw Error('invalid-cloud');let remote=JSON.parse(cloud.payload);if(!validate(remote))throw Error('invalid-cloud');revision=cloud.revision;let same=JSON.stringify(local)===JSON.stringify(remote);if(!same&&hasData(local)){conflictRemote=remote;gate('Hay dos copias de tus metas. No se ha reemplazado ninguna.',{conflict:true});return}window.cloudSetGoals(remote);localStorage.setItem(ownerKey,current.uid);localStorage.setItem(revisionKey,String(revision));enabled=true;openApp();startListener()}else{revision=0;localStorage.setItem(ownerKey,current.uid);enabled=true;dirty=true;openApp();startListener();await flush()}}catch(error){console.error('No se pudo consultar la nube',error.code||error.message);gate('No se pudo conectar con Firebase. Revisa tu internet y vuelve a intentar.',{retry:true});status('☁️ Sin conexión')}}
async function flush(force=false){if(!current||!enabled||busy||!dirty)return;busy=true;let uid=current.uid,snapshot;try{snapshot=localSnapshot();let payload=JSON.stringify(snapshot);if(new TextEncoder().encode(payload).length>900000)throw Error('too-large');status('☁️ Guardando…');let ref=remoteRef(),expected=revision;let next=await runTransaction(db,async tx=>{let existing=await tx.get(ref),actual=existing.exists()?existing.data().revision:0;if(actual!==expected)throw Error('cloud-conflict');tx.set(ref,{payload,revision:actual+1,updatedAt:Date.now()});return actual+1});if(!current||current.uid!==uid)return;revision=next;localStorage.setItem(revisionKey,String(next));dirty=JSON.stringify(window.cloudGetGoals())!==payload;status(dirty?'☁️ Guardando…':'☁️ Guardado');}catch(error){if(error.message==='cloud-conflict'){enabled=false;try{let latest=await getDocFromServer(remoteRef());let x=latest.data(),remote=JSON.parse(x.payload);if(!validate(remote))throw Error('invalid-cloud');revision=x.revision;conflictRemote=remote;gate('Los datos cambiaron en otro dispositivo. Elige qué copia conservar.',{conflict:true});status('⚠️ Revisión necesaria')}catch{gate('No se pudo revisar la copia de la nube. Tus cambios siguen en este navegador.',{retry:true})}}else{status('⚠️ Sin guardar en la nube');el('cloudRetry').hidden=false;el('cloudRetry').textContent='Reintentar guardado';el('cloudGate').hidden=false;el('cloudMessage').textContent=error.message==='too-large'?'Tus datos superan el tamaño permitido. Descarga una copia y revisa tus registros.':'No se pudo guardar. Tus cambios siguen en este navegador; revisa tu conexión.'}}finally{busy=false;applyPendingRemote();if(dirty&&enabled&&el('cloudGate').hidden){clearTimeout(timer);timer=setTimeout(flush,700)}}}
window.cloudScheduleSave=()=>{dirty=true;if(enabled){clearTimeout(timer);timer=setTimeout(flush,700)}};
el('cloudSignIn').onclick=async()=>{try{el('cloudSignIn').disabled=true;await signInWithPopup(auth,provider)}catch(error){gate('No se pudo iniciar sesión con Google. Comprueba el navegador e inténtalo de nuevo.',{signin:true})}finally{el('cloudSignIn').disabled=false}};
el('cloudRetry').onclick=()=>{el('cloudRetry').textContent='Reintentar conexión';if(enabled&&dirty){el('cloudGate').hidden=true;flush()}else loadAccount()};
el('cloudUseRemote').onclick=()=>{if(!conflictRemote||!confirm('Se reemplazarán los datos de este navegador por la copia de la nube. ¿Continuar?'))return;window.cloudSetGoals(conflictRemote);localStorage.setItem(ownerKey,current.uid);localStorage.setItem(revisionKey,String(revision));conflictRemote=null;dirty=false;enabled=true;openApp();startListener()};
el('cloudUseLocal').onclick=()=>{if(!confirm('Se reemplazará la copia de la nube por los datos de este navegador. ¿Continuar?'))return;localStorage.setItem(ownerKey,current.uid);conflictRemote=null;enabled=true;dirty=true;openApp();startListener();flush()};
el('cloudSignOut').onclick=async()=>{if(dirty||busy){alert('Hay cambios pendientes de guardar. Espera a que termine la sincronización.');return}await signOut(auth)};
onAuthStateChanged(auth,user=>{if(unsubscribe){unsubscribe();unsubscribe=null}pendingRemote=null;current=user;enabled=false;clearTimeout(timer);if(!user){status('☁️ Sesión cerrada');gate('Ingresa con Google para guardar tus metas y movimientos. Las fotos se mantienen en este dispositivo.',{signin:true});return}loadAccount()});

