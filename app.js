'use strict';
const $ = id => document.getElementById(id);
const tabs = document.querySelectorAll('.tab');
function tab(name){tabs.forEach(b=>{const active=b.dataset.tab===name;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===name));document.querySelector('.tabs').scrollIntoView({behavior:'smooth',block:'start'});}
tabs.forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
$('start-scan').onclick=()=>{tab('vision');$('photo').click()};$('start-quest').onclick=()=>tab('quest');
let imageURL=null;
$('photo').addEventListener('change',()=>{const file=$('photo').files?.[0];if(!file)return;if(imageURL)URL.revokeObjectURL(imageURL);imageURL=URL.createObjectURL(file);$('preview').src=imageURL;$('preview').hidden=false;$('scan-state').textContent=`Ready: ${file.name}`;$('analyze').disabled=false;$('ask-athena').disabled=false;});
function speak(text){if(!('speechSynthesis' in window)){alert('Speech output is unavailable in this browser.');return;}window.speechSynthesis.cancel();const msg=new SpeechSynthesisUtterance(text.slice(0,4500));msg.lang='en-US';msg.rate=.92;window.speechSynthesis.speak(msg)}
$('read-aloud').onclick=()=>speak($('recognized').value);$('stop-voice').onclick=()=>window.speechSynthesis?.cancel();$('say-it').onclick=()=>speak($('say-text').value);$('copy-text').onclick=async()=>{try{await navigator.clipboard.writeText($('recognized').value);$('scan-state').textContent='Text copied';}catch{$('scan-state').textContent='Select the text to copy it manually.'}};
$('recognized').addEventListener('input',()=>{$('read-aloud').disabled=!$('recognized').value.trim()});
function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('OCR library could not load. Check your internet connection.'));document.head.appendChild(script)})}
$('analyze').onclick=async()=>{const file=$('photo').files?.[0];if(!file)return;const button=$('analyze');$('recognized').value='';$('read-aloud').disabled=true;button.disabled=true;$('ocr-progress').hidden=false;$('ocr-bar').style.width='0%';$('scan-state').textContent='Preparing on-device text recognition…';try{if(!window.Tesseract)await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');const worker=await Tesseract.createWorker('eng',1,{logger:m=>{if(m.status)$('scan-state').textContent=m.status+(typeof m.progress==='number'?` · ${Math.round(m.progress*100)}%`:'');if(typeof m.progress==='number')$('ocr-bar').style.width=`${Math.round(m.progress*100)}%`;}});try{const result=await worker.recognize(file);const text=result.data.text.trim();$('recognized').value=text;$('read-aloud').disabled=!text;$('scan-state').textContent=text?'Text recognized. Review it below before using.':'No readable text detected. Try a clearer, well-lit image.';}finally{await worker.terminate()}}catch(e){$('scan-state').textContent='OCR unavailable: '+e.message+'. You can still type or paste text below.';}finally{button.disabled=false;$('ocr-progress').hidden=true;}};
// Captions: Web Speech Recognition is not available on every iPhone/browser.
let recognition=null,transcript='';const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
$('listen').onclick=()=>{if(!SpeechRecognition){$('hearing-state').textContent='Live speech recognition is not supported in this browser. Use the iPhone keyboard microphone to dictate into the message box instead.';return;}try{recognition=new SpeechRecognition();recognition.continuous=true;recognition.interimResults=true;recognition.lang='en-US';recognition.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const words=e.results[i][0].transcript;if(e.results[i].isFinal)transcript+=words+' ';else interim+=words;}$('caption-output').textContent=transcript+interim;};recognition.onerror=e=>$('hearing-state').textContent='Captions error: '+e.error;recognition.onend=()=>{$('hearing-state').textContent='Captions stopped';};recognition.start();$('hearing-state').textContent='Listening (browser speech service may process audio remotely)';}catch(e){$('hearing-state').textContent='Could not start captions: '+e.message;}};
$('stop-listen').onclick=()=>{recognition?.stop();recognition=null;};$('caption-quest').onclick=()=>{$('quest-input').value=$('caption-output').textContent;tab('quest')};
const KEY='echo-odyssey-quest-v1';let quest={title:'',steps:[],done:[]};try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.steps)&&Array.isArray(saved.done))quest=saved;}catch{}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(quest))}catch{}}
function renderQuest(){$('quest-title').value=quest.title;$('quest-count').textContent=`${quest.done.filter(Boolean).length} / ${quest.steps.length} complete`;const list=$('quest-list');list.replaceChildren();if(!quest.steps.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Your journey will appear here.';list.append(empty);return;}quest.steps.forEach((step,i)=>{const row=document.createElement('div');row.className='step';const cb=document.createElement('input');cb.type='checkbox';cb.id='step-'+i;cb.checked=!!quest.done[i];const label=document.createElement('label');label.htmlFor=cb.id;label.textContent=step;cb.onchange=()=>{quest.done[i]=cb.checked;persist();renderQuest()};row.append(cb,label);list.append(row)})}
function extractSteps(raw){const lines=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean);let steps=lines.filter(x=>/^([\d]+[.)]|[-•*]|step\s+\d+[:.)])/i.test(x)).map(x=>x.replace(/^([\d]+[.)]|[-•*]|step\s+\d+[:.)])\s*/i,''));if(!steps.length){steps=lines.filter(x=>/\b(bring|complete|submit|register|attend|arrive|check|fill|sign|send|prepare|visit|contact|upload|remember|meet|pay)\b/i.test(x));}if(!steps.length){steps=lines.slice(0,4).map(x=>'Review: '+x);}return steps.slice(0,12).map(x=>x.slice(0,240))}
$('build-quest').onclick=()=>{const raw=$('quest-input').value.trim();if(!raw){alert('Add some instructions or a goal first.');return;}quest={title:$('quest-title').value.trim()||'My Odyssey',steps:extractSteps(raw),done:[]};persist();renderQuest()};$('clear-quest').onclick=()=>{if(!confirm('Clear your saved journey?'))return;quest={title:'',steps:[],done:[]};$('quest-input').value='';persist();renderQuest()};$('make-quest').onclick=()=>{const txt=$('recognized').value.trim();if(!txt){alert('Add or scan some text first.');return;}$('quest-input').value=txt;tab('quest')};renderQuest();

// Free Athena: use browser-based OCR, never upload photos to an AI service.
let athenaAnswer = '';
function summarizeText(text, question) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'I could not find readable printed words in this photo. Try brighter lighting, a closer picture, or type the text into the editable text box.';
  const snippets = clean.length > 850 ? clean.slice(0, 850) + '…' : clean;
  const dates = clean.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?\b|\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/gi) || [];
  const links = clean.match(/(?:https?:\/\/|www\.)[^\s,;]+/gi) || [];
  const lines = ['I found these printed words:', snippets];
  if (dates.length) lines.push('Possible dates: ' + [...new Set(dates)].slice(0, 4).join(', ') + '.');
  if (links.length) lines.push('Possible web addresses: ' + [...new Set(links)].slice(0, 3).join(', ') + '.');
  if (/\b(register|sign up|rsvp|apply)\b/i.test(clean)) lines.push('Possible next step: check whether you need to register or apply.');
  else if (/\b(deadline|due|submit)\b/i.test(clean)) lines.push('Possible next step: check the deadline and submission instructions.');
  else if (/\b(warning|caution|danger)\b/i.test(clean)) lines.push('This may contain a warning. Check the original text carefully and do not rely on OCR for safety decisions.');
  else lines.push('Next step: review the recognized text below and create a quest if you want a checklist.');
  if (question.trim()) lines.push('Your question: ' + question.trim() + '. I can read printed text and highlight basic next steps, but cannot reason about the entire photo like a cloud vision model.');
  lines.push('Please verify the words against the original photo.');
  return lines.join('\n\n');
}
$('ask-athena').onclick = async () => {
  const file = $('photo').files?.[0]; if (!file) return;
  const btn = $('ask-athena'); btn.disabled = true;
  $('athena-answer').textContent = 'Athena is reading printed text on your device…';
  try {
    // Reuse the existing OCR button's working implementation.
    await $('analyze').onclick();
    const text = $('recognized').value.trim();
    athenaAnswer = summarizeText(text, $('vision-question').value);
    $('athena-answer').textContent = athenaAnswer;
    $('speak-answer').disabled = false;
    $('answer-quest').disabled = !text;
  } catch (err) {
    $('athena-answer').textContent = 'Could not read photo: ' + err.message;
  } finally { btn.disabled = false; }
};
$('speak-answer').onclick = () => speak(athenaAnswer);
$('answer-quest').onclick = () => { $('quest-input').value = $('recognized').value; tab('quest'); };


// ATHENA INDEPENDENCE MODE — deterministic, on-device text assistance.
let guideStage = 1;
let guideSteps = [];
const guideSample = `UTA Student Success Workshop\nDate: November 21, 2026\nTime: 2:00 PM\nLocation: University Center, Room 210\nRegister by November 19, 2026 at https://example.org/workshop\nBring your student ID. Contact support@example.org for questions.`;
function guideShow(stage) {
  guideStage = stage;
  for (let n=1;n<=4;n++) $('guide-stage-'+n).hidden = n!==stage;
  $('guide-stage-label').textContent = `Step ${stage} of 4 · ${['Gather','Discover','Plan','Begin'][stage-1]}`;
  $('guide-track-fill').style.width = `${stage*25}%`;
  $('independence').scrollIntoView({behavior:'smooth',block:'start'});
}
function uniqueMatches(text, regex, max=6) { return [...new Set(text.match(regex)||[])].slice(0,max); }
function guideDetails(text) {
  const items = [
    ['Possible dates', uniqueMatches(text,/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?\b|\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b/gi)],
    ['Possible times', uniqueMatches(text,/\b(?:1[0-2]|0?[1-9]):[0-5]\d\s*(?:am|pm)\b|\b(?:1[0-2]|[1-9])\s*(?:am|pm)\b/gi)],
    ['Email addresses', uniqueMatches(text,/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)],
    ['Web addresses', uniqueMatches(text,/(?:https?:\/\/|www\.)[^\s<>"']+/gi)],
    ['Phone numbers', uniqueMatches(text,/(?:\+1[\s.-]?)?(?:\(\d{3}\)|\b\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g)]
  ];
  const root=$('guide-details');root.replaceChildren();
  for(const [name,values] of items){const card=document.createElement('div');card.className='detail-card';const head=document.createElement('strong');head.textContent=name;card.append(head);const body=document.createElement('p');body.textContent=values.length?values.join(' · '):'Not detected';card.append(body);root.append(card);}
}
function guideSuggest(text) {
  const found=[];
  const add=(condition,step)=>{if(condition&&!found.includes(step))found.push(step)};
  add(/\b(register|rsvp|sign up|enroll)\b/i.test(text),'Check registration instructions and register if needed');
  add(/\b(apply|application)\b/i.test(text),'Review the application requirements');
  add(/\b(deadline|due|by\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))\b/i.test(text),'Confirm the deadline and add a reminder');
  add(/\b(bring|document|identification|\bID\b)\b/i.test(text),'Check what to bring and prepare it');
  add(/\b(pay|payment|fee|invoice)\b/i.test(text),'Verify any payment request with the official source before paying');
  add(/\b(attend|appointment|workshop|meeting|event|location|room)\b/i.test(text),'Confirm the location and time');
  add(/\b(submit|upload|send|return|sign)\b/i.test(text),'Review any required forms or submissions');
  add(/\b(contact|email|call|questions)\b/i.test(text),'Contact the organizer if you need clarification');
  add(true,'Review the original text for accuracy');
  add(true,'Decide on the next action that works for me');
  return found.slice(0,10);
}
function guideRenderSuggestions(){
 const root=$('guide-suggestions');root.replaceChildren();
 guideSteps.forEach((step,i)=>{
  const line=document.createElement('div');line.className='guide-suggestion';
  const input=document.createElement('input');input.type='text';input.value=step;input.maxLength=220;input.setAttribute('aria-label',`Edit suggested step ${i+1}`);
  input.oninput=()=>{guideSteps[i]=input.value};
  const remove=document.createElement('button');remove.className='outline';remove.textContent='Remove';remove.setAttribute('aria-label',`Remove step ${i+1}`);remove.onclick=()=>{guideSteps.splice(i,1);guideRenderSuggestions()};
  line.append(input,remove);root.append(line);
 });
}
$('guide-import').onclick=()=>{$('guide-source').value=$('recognized').value.trim()||$('quest-input').value.trim();if(!$('guide-source').value)$('guide-source').focus()};
$('guide-demo').onclick=()=>{$('guide-source').value=guideSample};
$('guide-next-1').onclick=()=>{const text=$('guide-source').value.trim();if(!text){alert('Please paste, type, or import some words first.');return;}guideDetails(text);guideShow(2)};
$('guide-back-2').onclick=()=>guideShow(1);
$('guide-next-2').onclick=()=>{guideSteps=guideSuggest($('guide-source').value);const note=$('guide-notes').value.trim();if(note)guideSteps.unshift(note.slice(0,220));guideRenderSuggestions();guideShow(3)};
$('guide-back-3').onclick=()=>guideShow(2);
$('guide-add-step').onclick=()=>{const value=$('guide-extra').value.trim();if(!value)return;guideSteps.push(value);$('guide-extra').value='';guideRenderSuggestions()};
$('guide-next-3').onclick=()=>{guideSteps=guideSteps.map(x=>x.trim()).filter(Boolean);if(!guideSteps.length){alert('Add at least one step to continue.');return;}const root=$('guide-review');root.replaceChildren();guideSteps.forEach((step,i)=>{const line=document.createElement('p');line.textContent=`${i+1}. ${step}`;root.append(line)});guideShow(4)};
$('guide-back-4').onclick=()=>{guideRenderSuggestions();guideShow(3)};
$('guide-speak').onclick=()=>speak(guideSteps.map((s,i)=>`Step ${i+1}. ${s}`).join('. '));
$('guide-save').onclick=()=>{quest={title:$('guide-title').value.trim()||'My Independence Odyssey',steps:guideSteps.slice(),done:guideSteps.map(()=>false)};persist();renderQuest();$('guide-message').textContent='Journey saved on this device. Opening your quest.';tab('quest')};
// Provide a direct entry to the guide from recognized words.
const guideEntry=document.createElement('button');guideEntry.className='outline';guideEntry.textContent='✧ Start Independence Mode';guideEntry.onclick=()=>{$('guide-source').value=$('recognized').value.trim();tab('independence');guideShow(1)};
$('make-quest').parentElement.prepend(guideEntry);
