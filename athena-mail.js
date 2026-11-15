/* ECHO Athena Mail: browser-only OAuth PKCE, read-only email, no paid AI. */
'use strict';
(()=>{
const el=id=>document.getElementById(id);
const storeKey='echo-athena-settings-v1';
let token=null,provider=null,messages=[],selected=null,demo=false,accountEmail=null,sessionVersion=0,replyRecognizer=null,sending=false;
const sample=[
{id:'sample-1',from:'Community Wellness Center <hello@example.org>',subject:'Appointment confirmation',date:'November 20, 2026',body:'Hello! Your appointment is November 20, 2026 at 10:30 AM. Please bring your identification and appointment confirmation. If you have questions, call 555-0100.'},
{id:'sample-2',from:'Career Center <careers@example.org>',subject:'Interview preparation',date:'November 16, 2026',body:'Your interview is on November 18 at 2:00 PM. Please bring your resume and arrive 10 minutes early. Reply to confirm your attendance.'},
{id:'sample-3',from:'Unverified sender <notice@unknown-example.net>',subject:'URGENT: Verify your account',date:'November 14, 2026',body:'ACT NOW! Your account will be suspended immediately. Click https://account-verify.example.net and enter your password and one-time code to avoid a penalty.'}
];
function status(t){el('auth-state').textContent=t;const n=el('echo-login-status');if(n&&!accountEmail)n.textContent=t}
// OAuth client ID is configured once by the app developer in echo-config.js.
function clientId(){return String(window.ECHO_CONFIG?.googleClientId||'').trim()}
function accountLabel(){
 const node=el('mail-account');
 if(node)node.textContent=accountEmail?'Signed in as '+accountEmail:'Not signed in';
 const banner=el('echo-account-banner-text');
 if(banner)banner.textContent=accountEmail?'Signed in with Google: '+accountEmail:'Not connected to Google — open Athena Mail to sign in';
 const wrapper=el('echo-account-banner');
 if(wrapper)wrapper.classList.toggle('echo-account-connected',Boolean(accountEmail));
 const gate=el('echo-login-gate');
 if(gate){gate.hidden=Boolean(accountEmail);document.body.classList.toggle('echo-login-required',!accountEmail)}
 const gateStatus=el('echo-login-status');
 if(gateStatus&&accountEmail)gateStatus.textContent='Connected as '+accountEmail;
}
function clearInbox(){messages=[];selected=null;renderList();el('mail-from').textContent='No message selected.';el('mail-subject').textContent='';el('mail-date').textContent='';el('mail-body').textContent='Choose a message to read.';el('mail-details').textContent='Dates, contact information, and possible requests appear here.';el('mail-guardian').textContent='ECHO can highlight common warning signs, but cannot certify an email as safe.';el('mail-draft').value='';el('daily-text').textContent='Your daily briefing appears here after you generate it.'}
function disconnect(revoke=true){try{replyRecognizer?.abort();replyRecognizer=null}catch{};if('speechSynthesis' in window)speechSynthesis.cancel();const old=token;sessionVersion++;token=null;provider=null;accountEmail=null;demo=false;clearInbox();accountLabel();if(revoke&&old&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(old,()=>{})}
// Google's browser token client is designed for browser-only apps. No client secret.
let googleClient=null;
function loadGoogleIdentity(){
 if(window.google?.accounts?.oauth2)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://accounts.google.com/gsi/client';script.async=true;
  script.onload=()=>window.google?.accounts?.oauth2?resolve():reject(new Error('Google sign-in could not initialize.'));
  script.onerror=()=>reject(new Error('Google sign-in script could not load. Check your internet connection.'));
  document.head.appendChild(script);
 });
}
async function connectGoogle(){
 if(!window.isSecureContext){status('Google sign-in requires HTTPS or localhost.');return}
 const id=clientId();
 if(!id||!/^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i.test(id)){status('Google sign-in is not configured yet. The developer must add the public Google OAuth Client ID to echo-config.js.');return}
 status('Opening Google sign-in…');
 try{
  await loadGoogleIdentity();
  googleClient=google.accounts.oauth2.initTokenClient({
   client_id:id,
   scope:'https://www.googleapis.com/auth/gmail.readonly',
   callback:async response=>{
    if(response.error||!response.access_token){status('Google sign-in was not completed: '+(response.error_description||response.error||'No access token returned'));return}
    disconnect();token=response.access_token;provider='google';demo=false;
    const currentSession=++sessionVersion;
    status('Checking connected Gmail account…');
    try{
      const profile=await request('https://gmail.googleapis.com/gmail/v1/users/me/profile');
      if(currentSession!==sessionVersion)return;
      accountEmail=profile.emailAddress||null;accountLabel();
      status('Connected'+(accountEmail?' as '+accountEmail:'')+'. Read-only Gmail access.');
      await refresh();
    }catch(e){if(currentSession===sessionVersion){disconnect();status('Unable to confirm Gmail account: '+e.message)}}
   },
   error_callback:error=>status('Google sign-in did not finish: '+(error.type||'Popup closed or blocked'))
  });
  googleClient.requestAccessToken({prompt:'consent'});
 }catch(e){status('Could not start Gmail sign-in: '+e.message)}
}
async function request(url){const r=await fetch(url,{headers:{Authorization:'Bearer '+token}});if(!r.ok){if(r.status===401){disconnect(false);status('Session expired. Please reconnect.')}throw Error('Email provider returned HTTP '+r.status)}return r.json()}
function decode64(s){if(!s)return '';const bin=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)))}
function textHTML(s){const doc=new DOMParser().parseFromString(s||'','text/html');doc.querySelectorAll('script,style,iframe,form,svg').forEach(n=>n.remove());return doc.body.textContent?.trim()||''}
function gmailBody(payload){if(!payload)return '';if(payload.mimeType==='text/plain'&&payload.body?.data)return decode64(payload.body.data);for(const part of payload.parts||[]){const result=gmailBody(part);if(result)return result}if(payload.body?.data)return payload.mimeType==='text/html'?textHTML(decode64(payload.body.data)):decode64(payload.body.data);return ''}
async function refresh(){
 if(!token){if(demo){renderList();return}status('Continue with Google first, or try the sample inbox.');return}
 const activeSession=sessionVersion;
 status('Loading recent messages…');
 try{
 if(provider==='google'){
 const data=await request('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15');
 const items=await Promise.all((data.messages||[]).map(async m=>{try{
 const d=await request('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(m.id)+'?format=full');
 const header=n=>(d.payload?.headers||[]).find(h=>h.name.toLowerCase()===n)?.value||'';
 return {id:m.id,from:header('from'),subject:header('subject')||'(No subject)',date:header('date'),body:gmailBody(d.payload)||d.snippet||''}
 }catch{return null}}));if(activeSession!==sessionVersion)return;messages=items.filter(Boolean);
 }else{
 const data=await request('https://graph.microsoft.com/v1.0/me/messages?$top=15&$orderby=receivedDateTime%20desc&$select=id,subject,from,receivedDateTime,body');
 messages=(data.value||[]).map(m=>({id:m.id,from:m.from?.emailAddress?.name+' <'+m.from?.emailAddress?.address+'>',subject:m.subject||'(No subject)',date:m.receivedDateTime,body:m.body?.contentType==='html'?textHTML(m.body.content):m.body?.content||''}));
 }
 if(activeSession!==sessionVersion)return;
 selected=null;renderList();status('Loaded '+messages.length+' recent messages'+(accountEmail?' for '+accountEmail:'')+'. Messages are not stored permanently.');
 }catch(e){if(activeSession===sessionVersion)status('Unable to load inbox: '+e.message)}
}
function renderList(){
 const root=el('mail-list');root.replaceChildren();el('mail-count').textContent='('+messages.length+')';
 if(!messages.length){root.textContent='No messages loaded.';return}
 messages.forEach((m,i)=>{const b=document.createElement('button');b.type='button';b.className='mail-item';b.setAttribute('aria-label','Open email: '+m.subject);b.textContent=m.subject+' — '+m.from;b.onclick=()=>choose(i);root.append(b)})
}
function details(text){
 const patterns=[
 ['Dates',/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?\b/gi],
 ['Times',/\b(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:am|pm)\b/gi],
 ['Email addresses',/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi],
 ['Phone numbers',/\b(?:\+?\d{1,2}[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b/g],
 ['Web links',/https?:\/\/[^\s<>"]+/gi]];
 const root=el('mail-details');root.replaceChildren();let any=false;
 patterns.forEach(([label,re])=>{const matches=[...new Set(text.match(re)||[])].slice(0,5);if(!matches.length)return;any=true;const d=document.createElement('div');d.className='detail-card';const h=document.createElement('strong');h.textContent=label;const p=document.createElement('p');p.textContent=matches.join(' • ');d.append(h,p);root.append(d)});
 if(!any)root.textContent='No structured details detected. Review the full message.';
}
function guardian(m){
 const t=(m.subject+' '+m.body).toLowerCase();const flags=[];
 if(/password|one.time code|verification code|security code/.test(t))flags.push('Asks about credentials or verification codes');
 if(/urgent|act now|immediately|suspended|last chance/.test(t))flags.push('Uses urgency or pressure');
 if(/gift card|wire transfer|crypto|pay a fee/.test(t))flags.push('Mentions an unusual payment method');
 if(/https?:\/\//.test(t))flags.push('Contains a link: inspect the destination independently before opening');
 el('mail-guardian').textContent=flags.length?'Possible warning signs (not proof of a scam): '+flags.join('; ')+'. Verify using a trusted contact method.':'No common warning phrases detected. This does NOT mean the email is safe.';
}
function choose(i){
 selected=messages[i];el('mail-from').textContent='From: '+selected.from;el('mail-subject').textContent=selected.subject;el('mail-date').textContent=selected.date;el('mail-body').textContent=selected.body||'(No readable body found)';details(selected.body);guardian(selected);
}
function currentText(){return selected?`From ${selected.from}. Subject ${selected.subject}. ${selected.body}`:''}
function say(text){if(!text){status('Choose an email first.');return}if(!('speechSynthesis' in window)){status('Speech is not supported in this browser.');return}speechSynthesis.cancel();const utter=new SpeechSynthesisUtterance(text.slice(0,12000));utter.rate=Number(el('speech-speed').value);utter.lang='en-US';speechSynthesis.speak(utter)}
function questFromMail(){
 if(!selected){status('Select an email first.');return}
 el('guide-source').value=selected.subject+'\n'+selected.body;
 el('guide-title').value='Follow up: '+selected.subject.slice(0,70);
 tab('independence');if(typeof guideShow==='function')guideShow(1);
}
function briefing(){
 const count=messages.length,remaining=quest.steps.length-quest.done.filter(Boolean).length;
 const upcoming=messages.filter(m=>/\b(appointment|interview|deadline|meeting|due)\b/i.test(m.subject+' '+m.body));
 const intro=`Athena Daily. You have ${count} ${demo?'sample ':''}emails loaded and ${remaining} unfinished quest steps.`;
 const items=upcoming.length?'Messages to review: '+upcoming.slice(0,4).map(m=>m.subject).join('; ')+'.':'No appointment or deadline keywords found in loaded messages.';
 const result=intro+' '+items+' Please verify all dates and details in the original messages.';
 el('daily-text').textContent=result;return result;
}
function loadPrefs(){try{return JSON.parse(localStorage.getItem(storeKey))||{}}catch{return {}}}
function applyPrefs(){const p=loadPrefs();el('speech-speed').value=p.speed||'0.9';el('speed-label').textContent=el('speech-speed').value+'×';['large-text','high-contrast','reduce-motion'].forEach(id=>{el(id).checked=!!p[id];document.body.classList.toggle(id,!!p[id])});el('emergency-name').value=p.emergencyName||'';el('emergency-notes').value=p.emergencyNotes||''}
function savePrefs(){const p={speed:el('speech-speed').value};['large-text','high-contrast','reduce-motion'].forEach(id=>p[id]=el(id).checked);const old=loadPrefs();p.emergencyName=old.emergencyName||'';p.emergencyNotes=old.emergencyNotes||'';localStorage.setItem(storeKey,JSON.stringify(p));applyPrefs()}
window.EchoMailVoice = {
  count: () => messages.length,
  readInbox: () => {
    if (!messages.length) return 'Your inbox is empty. Connect Gmail or try the sample inbox.';
    return `You have ${messages.length} messages. ` + messages.slice(0, 10).map((m,i)=>`Message ${i+1}: ${m.subject}.`).join(' ');
  },
  select: (offset) => {
    if (!messages.length) return 'No messages loaded. Connect Gmail or try the sample inbox.';
    const current=selected ? messages.findIndex(m=>m.id===selected.id) : -1;
    const next=Math.max(0,Math.min(messages.length-1,current+offset));
    choose(next);
    return `Message ${next+1} of ${messages.length}. ${currentText()}`;
  },
  readSelected: () => selected ? currentText() : 'Select an email first, or say next email.',
  makeQuest: () => { if (!selected) return 'Select an email first.'; questFromMail(); return 'Your email is ready in Independence Mode. Review the steps before saving.'; },
  openSample: () => {el('demo-mail').click();return 'Sample inbox loaded.';}
};
function parseReplyAddress(from){
 const m=String(from||'').match(/<([^<>\s]+@[^<>\s]+)>/);
 const address=m?m[1]:String(from||'').trim();
 return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)?address:null;
}
function encodeMime(text){
 const bytes=new TextEncoder().encode(text);
 let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function replyMime(to,subject,body){
 const safeSubject=String(subject||'').replace(/[\r\n]/g,' ').slice(0,250);
 const safeTo=String(to).replace(/[\r\n]/g,'');
 // UTF-8 RFC 2047 encoded subject prevents non-ASCII header corruption.
 const subjectBytes=new TextEncoder().encode('Re: '+safeSubject.replace(/^Re:\s*/i,''));
 let binary='';for(const byte of subjectBytes)binary+=String.fromCharCode(byte);
 const encodedSubject='=?UTF-8?B?'+btoa(binary)+'?=';
 return encodeMime('To: '+safeTo+'\r\nSubject: '+encodedSubject+'\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n'+encodeMime(body).replace(/-/g,'+').replace(/_/g,'/') .padEnd(Math.ceil(encodeMime(body).length/4)*4,'=')+'\r\n');
}
function requestSendToken(){
 return new Promise((resolve,reject)=>{
  if(!window.google?.accounts?.oauth2){reject(Error('Google sign-in is not loaded.'));return}
  const c=google.accounts.oauth2.initTokenClient({client_id:clientId(),scope:'https://www.googleapis.com/auth/gmail.send',callback:r=>r?.access_token?resolve(r.access_token):reject(Error(r?.error_description||r?.error||'Permission not granted')),error_callback:e=>reject(Error(e?.type||'Google popup closed'))});
  c.requestAccessToken({prompt:'consent'});
 });
}
async function sendReply(){
 if(sending)return;
 if(!token||provider!=='google'||!accountEmail||!selected||demo){status('Connect Gmail and choose a message before sending.');return}
 const body=el('mail-draft').value.trim(),to=parseReplyAddress(selected.from);
 if(!to){status('Could not identify the sender address. Copy the draft and reply in Gmail instead.');return}
 if(!body){status('Write or dictate your reply first.');return}
 const subject=selected.subject;
 if(!confirm('Send this reply from '+accountEmail+' to '+to+'?\n\nSubject: Re: '+subject+'\n\n'+body.slice(0,1200)+(body.length>1200?'…':'')))return;
 const currentSession=sessionVersion;
 sending=true;el('mail-send-reply').disabled=true;
 status('Requesting permission to send this one reply…');
 try{
  const sendToken=await requestSendToken();
  if(currentSession!==sessionVersion){google.accounts.oauth2.revoke(sendToken,()=>{});return}
  const raw=replyMime(to,subject,body);
  const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+sendToken,'Content-Type':'application/json'},body:JSON.stringify({raw})});
  google.accounts.oauth2.revoke(sendToken,()=>{});
  if(currentSession!==sessionVersion)return;
  if(!r.ok)throw Error('Gmail returned HTTP '+r.status+'. Check Gmail API permissions and OAuth scope.');
  el('mail-draft').value='';status('Reply sent to '+to+'.');
 }catch(e){if(currentSession===sessionVersion)status('Reply was not sent: '+e.message)}
 finally{sending=false;el('mail-send-reply').disabled=false}
}
function dictateReply(){
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Speech){status('Speech dictation is unavailable here. Use the keyboard microphone or type your reply.');return}
 try{replyRecognizer?.abort()}catch{}
 replyRecognizer=new Speech();replyRecognizer.lang='en-US';replyRecognizer.interimResults=false;replyRecognizer.continuous=false;
 replyRecognizer.onresult=e=>{const words=Array.from(e.results).map(r=>r[0].transcript).join(' ').trim();const box=el('mail-draft');box.value+=(box.value.trim()?' ':'')+words;status('Dictation added. Review your reply before sending.');};
 replyRecognizer.onerror=e=>status('Dictation error: '+e.error+'. You can still type your reply.');
 replyRecognizer.onend=()=>{replyRecognizer=null};
 try{replyRecognizer.start();status('Listening for reply dictation…')}catch(e){status('Could not start dictation: '+e.message)}
}
function init(){
 const gateButton=el('echo-login-google');
 if(gateButton)gateButton.addEventListener('click',connectGoogle);
 const accountLink=el('echo-account-mail-link');
 if(accountLink)accountLink.addEventListener('click',()=>{const tab=document.querySelector('.tab[data-tab="mail"]');if(tab)tab.click();});
 accountLabel();

 accountLabel();
 el('connect-google').onclick=connectGoogle;
 el('demo-mail').onclick=()=>{disconnect();demo=true;messages=sample.map(x=>({...x}));selected=null;renderList();status('Sample inbox loaded. These are fictional emails, not your real account.')};
 el('mail-refresh').onclick=refresh;
 el('mail-signout').onclick=()=>{disconnect();status('Signed out. Previous Gmail messages and reply drafts cleared. Device-only quests and settings are not account-specific.')};
 el('mail-speak').onclick=()=>say(currentText());
 el('mail-stop').onclick=()=>speechSynthesis?.cancel();
 el('mail-pause').onclick=()=>{if(!('speechSynthesis' in window))return;if(speechSynthesis.paused)speechSynthesis.resume();else speechSynthesis.pause()};
 el('mail-quest').onclick=questFromMail;
 el('mail-reply').onclick=()=>{if(!selected){status('Choose an email first.');return}el('mail-draft').value='Hello,\n\nThank you for your email about "'+selected.subject+'".\n\nBest regards';el('mail-draft').focus()};
 el('mail-dictate').onclick=dictateReply;
 el('mail-stop-dictate').onclick=()=>{replyRecognizer?.stop();status('Dictation stopped.')};
 el('mail-send-reply').onclick=sendReply;
 el('mail-copy-reply').onclick=async()=>{try{await navigator.clipboard.writeText(el('mail-draft').value);status('Reply copied. Paste into your email provider to send.')}catch{status('Could not copy. Select the draft manually.')}};
 el('daily-generate').onclick=briefing;el('daily-speak').onclick=()=>say(briefing());el('daily-stop').onclick=()=>speechSynthesis?.cancel();
 applyPrefs();el('speech-speed').oninput=savePrefs;['large-text','high-contrast','reduce-motion'].forEach(id=>el(id).onchange=savePrefs);
 el('settings-test').onclick=()=>say('Welcome to ECHO Odyssey. Your journey is yours to lead.');
 el('emergency-save').onclick=()=>{const p=loadPrefs();p.emergencyName=el('emergency-name').value;p.emergencyNotes=el('emergency-notes').value;localStorage.setItem(storeKey,JSON.stringify(p));el('emergency-state').textContent='Card saved in this browser only.'};
 el('emergency-clear').onclick=()=>{el('emergency-name').value='';el('emergency-notes').value='';el('emergency-save').click();el('emergency-state').textContent='Card deleted from this browser.'};
 el('emergency-speak').onclick=()=>say(el('emergency-name').value+'. '+el('emergency-notes').value);
 handleCallback();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
