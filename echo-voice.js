'use strict';
(() => {
 const $=id=>document.getElementById(id);
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 const toggle=$('echo-voice-toggle'),status=$('echo-voice-status'),input=$('echo-voice-input');
 let recognizer=null, listening=false;
 const report=t=>{status.textContent=t};
 const stopVoice=()=>{if('speechSynthesis' in window)window.speechSynthesis.cancel()};
 function speakText(t){
   stopVoice();
   if(!('speechSynthesis' in window)){report(t+' (Speech output unavailable.)');return}
   const u=new SpeechSynthesisUtterance(t.slice(0,5000));
   u.lang='en-US';u.rate=Number($('speech-speed')?.value||.9);
   window.speechSynthesis.speak(u);
 }
 function navigate(name){const b=document.querySelector('.tab[data-tab="'+name+'"]');if(b)b.click()}
 function run(raw){
   const cmd=raw.toLowerCase().replace(/[.,!?]/g,'').trim();
   if(!cmd){report('Please say or type a command.');return}
   report('You said: '+raw);
   if(/^(stop|stop speaking|be quiet|silence|stop voice)$/.test(cmd)){stopVoice();report('Voice stopped.');return}
   let answer='';
   const mail=window.EchoMailVoice;
   if(/\b(read this email|read selected email|read current email|read message)\b/.test(cmd)){
     navigate('mail');answer=mail?.readSelected()||'Mail is still loading.';
   }else if(/\b(read|list|check|show)\b.*\b(email|emails|inbox|mail)\b/.test(cmd)){
     navigate('mail');answer=mail?.readInbox()||'Mail is still loading.';
   }else if(/\b(next email|next message)\b/.test(cmd)){
     navigate('mail');answer=mail?.select(1)||'Mail is still loading.';
   }else if(/\b(previous email|previous message|last email)\b/.test(cmd)){
     navigate('mail');answer=mail?.select(-1)||'Mail is still loading.';
   }else if(/\b(make this a quest|create quest from email|turn this into a quest)\b/.test(cmd)){
     answer=mail?.makeQuest()||'Mail is still loading.';
   }else if(/\b(sample inbox|demo inbox)\b/.test(cmd)){
     navigate('mail');answer=mail?.openSample()||'Mail is still loading.';
   }else if(/\b(vision|camera|scan)\b/.test(cmd)){navigate('vision');answer='Vision opened. Choose a photo to read.'}
   else if(/\b(hearing|captions)\b/.test(cmd)){navigate('hearing');answer='Hearing opened. Tap Start captions if supported.'}
   else if(/\b(quest|quests|checklist)\b/.test(cmd)){navigate('quest');answer='Your quests are open.'}
   else if(/\b(daily|briefing)\b/.test(cmd)){navigate('daily');answer='Daily briefing opened.'}
   else if(/\b(independence|guide)\b/.test(cmd)){navigate('independence');answer='Independence Mode opened.'}
   else if(/\b(settings|accessibility)\b/.test(cmd)){navigate('settings');answer='Accessibility settings opened.'}
   else answer='I did not recognize that command. Try read my emails, next email, open vision, or open my quests.';
   report(answer);speakText(answer);
 }
 function setListening(on){listening=on;toggle.textContent=on?'■ Stop listening':'🎙 Talk to ECHO';toggle.setAttribute('aria-pressed',String(on))}
 toggle.onclick=()=>{
   if(listening){recognizer?.stop();setListening(false);return}
   if(!Speech){report('Microphone speech recognition is not available in this browser. Type a command below or use your keyboard microphone.');return}
   try{
     recognizer=new Speech();recognizer.lang='en-US';recognizer.continuous=false;recognizer.interimResults=false;
     recognizer.onresult=e=>{const t=e.results[0][0].transcript;input.value=t;run(t)};
     recognizer.onerror=e=>report('Microphone error: '+e.error+'. You can type a command instead.');
     recognizer.onend=()=>setListening(false);
     recognizer.start();setListening(true);report('Listening for one command… Your browser may process speech online.');
   }catch(e){setListening(false);report('Cannot start microphone: '+e.message)}
 };
 $('echo-voice-send').onclick=()=>run(input.value);
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run(input.value)}});
 $('echo-voice-stop').onclick=()=>{recognizer?.stop();setListening(false);stopVoice();report('Voice stopped.')};
})();
