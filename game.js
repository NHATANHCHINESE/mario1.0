'use strict';
(() => {
const $ = s => document.querySelector(s);
const words = [
 [['你好','nǐ hǎo','Xin chào'],['我','wǒ','Tôi'],['你','nǐ','Bạn'],['好','hǎo','Tốt'],['是','shì','Là'],['不','bù','Không'],['谢谢','xiè xie','Cảm ơn'],['再见','zài jiàn','Tạm biệt'],['老师','lǎo shī','Giáo viên'],['学生','xué sheng','Học sinh'],['朋友','péng you','Bạn bè'],['中国','Zhōng guó','Trung Quốc']],
 [['家','jiā','Nhà'],['妈妈','mā ma','Mẹ'],['爸爸','bà ba','Bố'],['人','rén','Người'],['书','shū','Sách'],['学校','xué xiào','Trường học'],['学习','xué xí','Học tập'],['今天','jīn tiān','Hôm nay'],['明天','míng tiān','Ngày mai'],['喜欢','xǐ huan','Thích'],['看','kàn','Nhìn / xem'],['猫','māo','Con mèo']],
 [['水','shuǐ','Nước'],['茶','chá','Trà'],['米饭','mǐ fàn','Cơm'],['苹果','píng guǒ','Táo'],['吃','chī','Ăn'],['喝','hē','Uống'],['买','mǎi','Mua'],['钱','qián','Tiền'],['多少','duō shao','Bao nhiêu'],['商店','shāng diàn','Cửa hàng'],['水果','shuǐ guǒ','Trái cây'],['漂亮','piào liang','Đẹp']]
];
const levels = [{name:'Đồng cỏ chào hỏi',sky:'#b8dfdb',skyTop:'#91cdd1',hill:'#8db78e',hill2:'#afd0a2',ground:'#af8053',grass:'#6f9a4c'},{name:'Thị trấn nhỏ',sky:'#f2d8ad',skyTop:'#e7c6a4',hill:'#b3b075',hill2:'#d0c59a',ground:'#b58257',grass:'#939354'},{name:'Chợ đêm đèn lồng',sky:'#586e8b',skyTop:'#384f73',hill:'#627c7d',hill2:'#788b98',ground:'#776458',grass:'#86956c'}];
levels.push({...levels[0],name:'Từ vựng của tôi'});
words.push([]);
const normalize = s => s.toLowerCase().replace(/ü|ǖ|ǘ|ǚ|ǜ|u:/g,'v').normalize('NFD').replace(/[\u0300-\u036f\s1-5'’]/g,'');
let saved={mastered:[],best:0,sound:true};
try{Object.assign(saved,JSON.parse(localStorage.getItem('hanzi-quest-v1')||'{}'));if(!Array.isArray(saved.mastered))saved.mastered=[];}catch{}
// Saved deck edits are data only; ignore invalid entries from older storage.
if(Array.isArray(saved.decks))saved.decks.slice(0,4).forEach((deck,i)=>{if(Array.isArray(deck))words[i]=deck.filter(w=>Array.isArray(w)&&w.length===3&&w.every(v=>typeof v==='string'&&v.trim())&&/\p{Script=Han}/u.test(w[0])&&/^[a-zv]+$/.test(normalize(w[1]))).map(w=>w.map(v=>v.trim()));});
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allTerms=()=>new Set(words.flat().map(w=>w[0]));
const knownCount=()=>saved.mastered.filter(w=>allTerms().has(w)).length;
const persist=()=>{try{localStorage.setItem('hanzi-quest-v1',JSON.stringify(saved));}catch{}};
let level=0,index=0,score=0,coins=0,combo=0,correct=0,attempts=0,lives=3,status='ready',resumeStatus='playing',jump=0,camera=0,camStart=0,camTarget=0,remaining=20,elapsed=0,missed=new Set(),hinted=false,particles=[],popup='',popupTime=0,runStart=0;
let audioCtx,voiceList=[],speechAvailable='speechSynthesis' in window;
const canvas=$('#game'),ctx=canvas.getContext('2d'),input=$('#typingInput'),overlay=$('#overlay'),modal=$('#modal');
ctx.imageSmoothingEnabled=false;
const word=()=>words[level][Math.min(index,words[level].length-1)]||['—','','Chưa có từ vựng'];
function beep(type){if(!saved.sound)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume().catch(()=>{});const t=audioCtx.currentTime;const notes=type==='win'?[523,659,784,1046]:type==='error'?[180,125]:[660,880];notes.forEach((f,i)=>{let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='square';o.frequency.value=f;g.gain.setValueAtTime(.025,t+i*.085);g.gain.exponentialRampToValueAtTime(.001,t+i*.085+.13);o.connect(g);g.connect(audioCtx.destination);o.start(t+i*.085);o.stop(t+i*.085+.15);});}catch{}}
// Original looping chiptune: square lead, triangle bass, arpeggios and light percussion.
// Web Audio is unlocked only by a game-start or sound-toggle gesture.
let musicTimer=null,musicBus=null,musicStep=0,musicTime=0;
const musicNodes=new Set();
const melody=[76,0,79,81,79,76,72,74,76,79,84,83,81,79,76,0,74,0,77,79,77,74,71,72,74,77,81,79,77,76,74,0,72,76,79,84,83,79,76,79,81,84,86,84,81,79,76,0,77,81,84,86,84,81,77,74,79,0,76,74,72,0,79,0];
const roots=[48,45,50,43,48,45,53,43],eighth=60/140/2;
function musicTone(note,time,duration,type,volume){
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(440*Math.pow(2,(note-69)/12),time);
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.006);
  gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  osc.connect(gain);gain.connect(musicBus);musicNodes.add(osc);
  osc.onended=()=>{musicNodes.delete(osc);osc.disconnect();gain.disconnect();};
  osc.start(time);osc.stop(time+duration+.015);
}
function musicTick(){
  if(!audioCtx||!musicBus)return;
  while(musicTime<audioCtx.currentTime+.12){
    const step=musicStep%64,root=roots[Math.floor(step/8)];
    if(melody[step])musicTone(melody[step],musicTime,eighth*.82,'square',.065);
    if(step%2===0)musicTone(root+(step%8===4?7:0),musicTime,eighth*1.6,'triangle',.13);
    if(step%2===1)musicTone(root+24+[0,4,7,12][Math.floor(step/2)%4],musicTime,eighth*.4,'triangle',.045);
    if(step%4===0)musicTone(35,musicTime,.065,'sine',.12);
    if(step%4===2)musicTone(88,musicTime,.025,'triangle',.035);
    musicStep++;musicTime+=eighth;
  }
}
function startMusic(){
  if(musicTimer!==null||!saved.sound||document.hidden||!['playing','jumping'].includes(status))return;
  try{
    audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
    audioCtx.resume().catch(()=>{});musicBus=audioCtx.createGain();musicBus.gain.value=.3;musicBus.connect(audioCtx.destination);
    musicStep=0;musicTime=audioCtx.currentTime+.04;musicTick();musicTimer=setInterval(musicTick,50);
  }catch{stopMusic();}
}
function stopMusic(){
  if(musicTimer!==null){clearInterval(musicTimer);musicTimer=null;}
  if(audioCtx&&musicBus){const bus=musicBus;bus.gain.cancelScheduledValues(audioCtx.currentTime);bus.gain.setTargetAtTime(0,audioCtx.currentTime,.008);for(const node of musicNodes){try{node.stop(audioCtx.currentTime+.035);}catch{}}musicNodes.clear();setTimeout(()=>bus.disconnect(),100);musicBus=null;}
}
window.addEventListener('pagehide',stopMusic);
function voices(){voiceList=speechSynthesis.getVoices();}
if(speechAvailable){voices();speechSynthesis.addEventListener('voiceschanged',voices);}
function speak(text,manual=false){if(!speechAvailable||(!saved.sound&&!manual))return false;const v=voiceList.find(v=>/zh[-_]CN/i.test(v.lang))||voiceList.find(v=>/^zh/i.test(v.lang));if(!v){if(manual)feedback('Thiết bị chưa có giọng tiếng Trung. Bạn vẫn có thể luyện bằng pinyin.','sound-note');return false;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=v.lang;u.voice=v;u.rate=.8;u.onerror=()=>{if(manual)feedback('Chưa phát được giọng đọc. Hãy kiểm tra giọng tiếng Trung trên thiết bị.','sound-note');};speechSynthesis.speak(u);return true;}
function feedback(text,cls=''){const f=$('#feedback');f.textContent=text;f.className=cls;}
function updateSettings(){$('#soundBtn').textContent=saved.sound?'♫':'♩';$('#soundBtn').setAttribute('aria-label',saved.sound?'Tắt nhạc và âm thanh':'Bật nhạc và âm thanh');$('#soundBtn').setAttribute('aria-pressed',String(saved.sound));$('#menuRecord').textContent=saved.best?'Kỷ lục của bạn: '+saved.best+' điểm':'Mỗi từ mới là một bước tiến.';$('#pinyin').textContent=hinted?word()[1]:'•••';$('#hintBtn').setAttribute('aria-expanded',String(hinted));$('#bookCount').textContent=knownCount();}
function updateHUD(){$('#score').textContent=String(score).padStart(5,'0');$('#coins').textContent=String(coins).padStart(2,'0');$('#lives').textContent=$('#mode').value==='practice'?'♥ ♥ ♥':Array.from({length:3},(_,i)=>i<lives?'♥':'♡').join(' ');$('#lives').title=$('#mode').value==='practice'?'Luyện tập: không mất mạng':`${lives} mạng còn lại`;$('#timer').hidden=$('#mode').value!=='challenge';$('#timer').textContent=Math.ceil(remaining)+'s';$('#progressLabel').textContent=`${index} / ${words[level].length} từ`;$('#progressTrack').innerHTML=words[level].map((_,i)=>`<span class="${i<index?'done':i===index?'current':''}"></span>`).join('');}
function setWord(){const w=word();$('#hanzi').textContent=w[0];$('#meaning').textContent=w[2];$('#wordIndex').textContent=String(words[level].length?Math.min(index+1,words[level].length):0).padStart(2,'0')+' / '+String(words[level].length).padStart(2,'0');$('#sceneStep').textContent=String(words[level].length?Math.min(index+1,words[level].length):0).padStart(2,'0')+' — '+String(words[level].length).padStart(2,'0');input.value='';input.placeholder='Nhập pinyin…';$('#inputWrap').classList.remove('success','error');remaining=20;hinted=false;feedback('Pinyin không dấu, có dấu hoặc số thanh điệu đều được.');updateSettings();updateHUD();}
function showReady(){stopMusic();status='ready';input.disabled=true;overlay.hidden=true;$('#pauseBtn').textContent='Ⅱ';$('#pauseBtn').setAttribute('aria-label','Tạm dừng');}
function updateMenu(){document.querySelectorAll('[data-level]').forEach(b=>{const count=words[+b.dataset.level].length;b.querySelector('small').textContent=(+b.dataset.level===3?'Bộ từ riêng':b.querySelector('small').textContent.split(' · ')[0])+' · '+count+' từ';});$('#vocabTotal').textContent=allTerms().size+' từ mới';$('#resumeGame').hidden=status!=='paused';$('#enterGame').innerHTML=(!words[level].length?'Thêm từ để chơi':status==='paused'?'Bắt đầu lượt mới':'Vào game')+' <span>→</span>';}
function goMenu(){if(status==='playing'||status==='jumping')pause();document.body.dataset.screen='menu';if(speechAvailable)speechSynthesis.cancel();updateMenu();(status==='paused'?$('#resumeGame'):$('#enterGame')).focus();}
function reset(l=level){level=l;index=0;score=0;coins=0;correct=0;attempts=0;combo=0;lives=3;camera=0;camTarget=0;jump=0;elapsed=0;missed.clear();particles=[];$('#worldNumber').textContent=level===3?'BỘ TỪ RIÊNG':'THẾ GIỚI 0'+(level+1);$('#worldTitle').textContent=levels[level].name;$('#locationName').textContent=levels[level].name.toUpperCase();document.querySelectorAll('[data-level]').forEach(b=>{b.classList.toggle('selected',+b.dataset.level===level);b.setAttribute('aria-pressed',String(+b.dataset.level===level));});setWord();showReady();updateMenu();}
function start(){if(!words[level].length){openVocabulary(level);return;}document.body.dataset.screen='game';status='playing';overlay.hidden=true;input.disabled=false;runStart=performance.now();input.focus();beep('start');startMusic();}
function pause(){if(status==='playing'||status==='jumping'){resumeStatus=status;status='paused';stopMusic();input.disabled=true;overlay.hidden=false;$('#overlayTitle').textContent='Nghỉ chân một chút nhé.';$('#overlayDesc').textContent='Tiến độ vẫn ở đây. Sẵn sàng rồi mình đi tiếp!';$('#startBtn').innerHTML='Tiếp tục hành trình <span>→</span>';$('#overlayHint').textContent='Nhấn Esc hoặc nút Tiếp tục để trở lại.';$('#pauseBtn').textContent='▶';$('#pauseBtn').setAttribute('aria-label','Tiếp tục');}else if(status==='paused'){status=resumeStatus;startMusic();overlay.hidden=true;input.disabled=status==='jumping';$('#pauseBtn').textContent='Ⅱ';$('#pauseBtn').setAttribute('aria-label','Tạm dừng');input.focus();}}
function success(){if(status!=='playing')return;status='jumping';attempts++;correct++;combo++;const points=hinted?60:100+Math.min(combo-1,5)*20;score+=points;coins++;input.disabled=true;$('#inputWrap').classList.add('success');feedback(`Đúng rồi! ${word()[0]} · ${word()[1]} · ${word()[2]}`,'feedback-success');if(!saved.mastered.includes(word()[0]))saved.mastered.push(word()[0]);persist();beep('coin');camStart=camera;camTarget=camera+210;jump=.0001;popup=combo>=3?`COMBO ×${combo}`:'+'+points;popupTime=1.2;$('#comboToast').textContent=combo>=3?`✦ ${combo} từ đúng liên tiếp!`:'';for(let i=0;i<14;i++)particles.push({x:490,y:270,vx:(Math.random()-.5)*170,vy:-100-Math.random()*160,t:0,color:i%2?'#ffdf79':'#ad784b'});updateHUD();}
function wrong(timeout=false){if(status!=='playing')return;attempts++;combo=0;missed.add(word()[0]);beep('error');$('#inputWrap').classList.remove('error');void input.offsetWidth;$('#inputWrap').classList.add('error');feedback(timeout?'Hết giờ! Thử lại nhé, hoặc bấm Gợi ý nếu cần.':'Chưa đúng rồi. Kiểm tra pinyin và thử lại nhé.','feedback-error');if($('#mode').value==='challenge'){lives--;remaining=20;updateHUD();if(lives<=0){finish(false);return;}}}
function check(force=false){if(status!=='playing'||input.composing)return;const value=normalize(input.value);if(value&&value===normalize(word()[1]))success();else if(force&&value)wrong();}
function openModal(title,html){if(status==='playing'||status==='jumping')pause();$('#modalTitle').textContent=title;$('#modalContent').innerHTML=html;if(!modal.open)modal.showModal();}
function finish(won){stopMusic();status=won?'complete':'gameover';input.disabled=true;$('#comboToast').textContent='';if(speechAvailable)speechSynthesis.cancel();if(won)beep('win');saved.best=Math.max(saved.best,score);persist();updateSettings();const accuracy=attempts?Math.round(correct/attempts*100):0;openModal(won?'Bạn đã về đích! ✦':'Nghỉ một nhịp, thử lại nhé!',`<p class="result-intro">${won?`Bạn và Gấu đã chinh phục <b>${levels[level].name}</b>. Mỗi từ vừa học là một bước tiến!`:'Ba chiếc tim đã hết. Những từ cần luyện thêm vẫn nằm trong sổ từ vựng của bạn.'}</p><div class="result-stats"><div><b>${score}</b><small>ĐIỂM NHẬN ĐƯỢC</small></div><div><b>${accuracy}%</b><small>ĐỘ CHÍNH XÁC</small></div><div><b>${correct}/${words[level].length}</b><small>TỪ VƯỢT QUA</small></div></div><p class="book-summary">Kỷ lục: <b>${saved.best}</b> điểm · Thời gian chơi: ${Math.round(elapsed)} giây · Đã khám phá ${knownCount()}/${allTerms().size} từ.</p>${missed.size?`<p class="review-list">Ôn thêm: ${Array.from(missed).map(escapeHTML).join(' · ')}</p>`:'<p class="book-summary">Tiếp tục đọc to từ mới để nhớ cách phát âm nhé!</p>'}<div class="result-actions">${won&&level<2?'<button class="primary" id="nextLevel">Khám phá thế giới tiếp theo →</button>':''}<button class="${won&&level<2?'secondary':'primary'}" id="replay">Chơi lại màn này ↻</button></div>`);$('#replay').onclick=()=>{modal.close();reset();start();};if($('#nextLevel'))$('#nextLevel').onclick=()=>{modal.close();reset(level+1);start();};}
let editingDeck=3,editingWord=-1,deletedWord=null,refreshBulkImport=()=>{};
function saveDecks(){
  saved.decks=words.map(deck=>deck.map(w=>[...w]));persist();
  if(level===editingDeck)reset(level);else{updateMenu();updateSettings();}
}
function vocabularyMessage(text){$('#vocabMessage').textContent=text;}
function clearVocabularyForm(){editingWord=-1;$('#vocabForm').reset();$('#saveWordBtn').textContent='＋ Thêm từ';$('#cancelWordEdit').hidden=true;}
function drawVocabularyList(){
  const list=words[editingDeck];$('#bookSummary').textContent=`Đã khám phá ${knownCount()}/${allTerms().size} từ. Chọn bộ từ để xem, thêm, sửa hoặc xóa. Các thay đổi được lưu trên trình duyệt này.`;$('#deckSize').textContent=list.length+' từ';$('#playVocabulary').disabled=!list.length;
  $('#vocabList').innerHTML=list.length?list.map((w,i)=>`<div class="vocab-row ${saved.mastered.includes(w[0])?'mastered':''}"><span class="vocab-number">${String(i+1).padStart(2,'0')}</span><strong lang="zh-CN">${escapeHTML(w[0])}</strong><span class="vocab-details"><b>${escapeHTML(w[1])}</b><small>${escapeHTML(w[2])}</small></span><button type="button" data-edit-word="${i}" aria-label="Sửa ${escapeHTML(w[0])}">Sửa</button><button type="button" data-delete-word="${i}" class="delete-word" aria-label="Xóa ${escapeHTML(w[0])}">Xóa</button></div>`).join(''):'<div class="empty-vocab"><b>Bộ từ đang trống</b><p>Thêm từ đầu tiên bằng biểu mẫu phía trên, rồi bấm Chơi bộ từ này.</p></div>';
  document.querySelectorAll('[data-edit-word]').forEach(b=>b.onclick=()=>{editingWord=+b.dataset.editWord;$('#manualEntry').open=true;const w=words[editingDeck][editingWord];$('#vocabHanzi').value=w[0];$('#vocabPinyin').value=w[1];$('#vocabMeaning').value=w[2];$('#saveWordBtn').textContent='Lưu thay đổi';$('#cancelWordEdit').hidden=false;vocabularyMessage('Đang sửa từ '+w[0]);$('#vocabHanzi').focus();});
  document.querySelectorAll('[data-delete-word]').forEach(b=>b.onclick=()=>{const i=+b.dataset.deleteWord;deletedWord={deck:editingDeck,index:i,word:words[editingDeck][i]};words[editingDeck].splice(i,1);clearVocabularyForm();saveDecks();drawVocabularyList();$('#undoWordDelete').hidden=false;vocabularyMessage('Đã xóa '+deletedWord.word[0]+'. Bạn có thể hoàn tác.');});refreshBulkImport();
}
function setupBulkImport(){
  let rows=[],parseTimer=null;
  const textarea=$('#bulkVocabulary'),preview=$('#bulkPreview'),button=$('#importBulkBtn');
  const fieldNames={hanzi:'Chữ Hán',pinyin:'Pinyin',meaning:'Nghĩa tiếng Việt'};
  function classify(){
    const seen=new Set(words[editingDeck].map(w=>w[0]));
    return rows.map(row=>{
      const fields=[row.hanzi.trim(),row.pinyin.trim(),row.meaning.trim()];
      const error=VocabularyImport.validate(...fields),duplicate=!error&&seen.has(fields[0]);
      const ready=!error&&!duplicate&&row.include!==false;
      if(ready)seen.add(fields[0]);
      return {fields,error,duplicate,ready};
    });
  }
  function render(rebuild=true){
    const states=classify(),ready=states.filter(s=>s.ready).length,invalid=states.filter(s=>s.error).length,duplicates=states.filter(s=>s.duplicate).length;
    preview.hidden=!rows.length;button.disabled=!ready;
    button.textContent=ready?'＋ Thêm '+ready+' từ vào bộ này':'Thêm vào bộ từ';
    $('#bulkStatus').textContent=rows.length?`${rows.length} dòng · ${ready} từ sẵn sàng${duplicates?' · '+duplicates+' từ trùng, bỏ qua':''}${invalid?' · '+invalid+' dòng cần kiểm tra':''}`:'Dán vào ô trên để tự tách từ.';
    if(rebuild){
      preview.innerHTML=rows.length?`<table class="bulk-table"><caption>Xem trước từ vừa dán — sửa trực tiếp ở từng cột nếu cần</caption><thead><tr><th>Chọn</th><th>Chữ Hán</th><th>Pinyin</th><th>Nghĩa tiếng Việt</th><th>Kết quả</th></tr></thead><tbody>${rows.map((row,i)=>`<tr data-bulk-row="${i}"><td><input type="checkbox" data-bulk-select="${i}" aria-label="Thêm dòng ${row.line}" ${row.include!==false?'checked':''}></td>${Object.keys(fieldNames).map(field=>`<td data-label="${fieldNames[field]}"><input type="text" data-bulk-index="${i}" data-bulk-field="${field}" aria-label="${fieldNames[field]}, dòng ${row.line}" value="${escapeHTML(row[field])}" spellcheck="false" autocapitalize="off"></td>`).join('')}<td><span data-bulk-status="${i}"></span><small class="bulk-source" title="${escapeHTML(row.raw)}">Dòng ${row.line}</small></td></tr>`).join('')}</tbody></table>`:'';
      preview.querySelectorAll('[data-bulk-field]').forEach(el=>el.oninput=()=>{rows[+el.dataset.bulkIndex][el.dataset.bulkField]=el.value;$('#bulkOutcome').textContent='';render(false);});
      preview.querySelectorAll('[data-bulk-select]').forEach(el=>el.onchange=()=>{rows[+el.dataset.bulkSelect].include=el.checked;render(false);});
    }
    states.forEach((state,i)=>{
      const rowEl=preview.querySelector(`[data-bulk-row="${i}"]`),check=preview.querySelector(`[data-bulk-select="${i}"]`),label=preview.querySelector(`[data-bulk-status="${i}"]`);
      rowEl.classList.toggle('bulk-invalid',!!state.error);rowEl.classList.toggle('bulk-duplicate',state.duplicate);
      check.disabled=!!state.error||state.duplicate;check.checked=state.ready;
      label.textContent=state.error|| (state.duplicate?'Đã có, bỏ qua':state.ready?'Sẵn sàng':'Bỏ chọn');
    });
  }
  function parse(){clearTimeout(parseTimer);parseTimer=null;rows=VocabularyImport.parse(textarea.value).map(row=>({...row,include:true}));$('#bulkOutcome').textContent='';render();}
  textarea.oninput=()=>{clearTimeout(parseTimer);parseTimer=setTimeout(()=>{if(modal.open&&$('#bulkVocabulary')===textarea)parse();},180);};
  $('#parseBulkBtn').onclick=parse;
  $('#clearBulkBtn').onclick=()=>{clearTimeout(parseTimer);parseTimer=null;textarea.value='';rows=[];$('#bulkOutcome').textContent='';render();textarea.focus();};
  button.onclick=()=>{
    if(parseTimer!==null)parse();
    // A click immediately after pasting must import the current text, not an older preview.
    const ready=classify().filter(state=>state.ready);if(!ready.length)return;
    words[editingDeck].push(...ready.map(state=>state.fields));clearVocabularyForm();saveDecks();drawVocabularyList();
    $('#bulkOutcome').textContent='Đã thêm '+ready.length+' từ vào '+levels[editingDeck].name+'.';
    vocabularyMessage('Đã lưu '+ready.length+' từ từ danh sách vừa dán.');
  };
  refreshBulkImport=render;render();
}
function openVocabulary(deck=3){
  editingDeck=deck;editingWord=-1;deletedWord=null;refreshBulkImport=()=>{};
  openModal('Sổ từ vựng',`<p class="book-summary" id="bookSummary"></p><label class="vocab-deck-label" for="vocabDeck">Bộ từ đang chỉnh sửa</label><select id="vocabDeck" aria-label="Bộ từ đang chỉnh sửa">${levels.map((l,i)=>`<option value="${i}" ${i===deck?'selected':''}>${l.name}</option>`).join('')}</select><div class="vocab-editor-layout"><div class="vocab-input-column"><section class="bulk-import" aria-label="Dán danh sách từ vựng"><label class="bulk-label" for="bulkVocabulary">Dán danh sách từ vựng</label><p class="bulk-description">Copy cả danh sách có chữ Hán, pinyin và nghĩa. Game tự chia cột; bạn có thể sửa ngay trong bảng xem trước.</p><textarea id="bulkVocabulary" rows="6" maxlength="60000" spellcheck="false" placeholder="你好 nǐ hǎo Xin chào&#10;谢谢 | xiè xie | Cảm ơn&#10;学校 xué xiào Trường học" aria-describedby="bulkHelp bulkStatus"></textarea><div class="bulk-help" id="bulkHelp">Nhận dòng có khoảng trắng, dấu |, dấu gạch ngang, hoặc bảng copy từ Excel. Mỗi từ cần đủ cả 3 phần.</div><div class="bulk-top-actions"><button type="button" id="parseBulkBtn" class="secondary">Tách và xem trước</button><button type="button" id="clearBulkBtn" class="bulk-clear">Xóa nội dung dán</button></div><p id="bulkStatus" class="bulk-status" role="status" aria-live="polite">Dán vào ô trên để tự tách từ.</p><div id="bulkPreview" class="bulk-preview" hidden></div><button type="button" id="importBulkBtn" class="primary bulk-import-button" disabled>Thêm vào bộ từ</button><p id="bulkOutcome" class="bulk-outcome" role="status" aria-live="polite"></p></section><details id="manualEntry" class="manual-entry"><summary>Nhập hoặc sửa từng từ</summary><form id="vocabForm" class="vocab-form" autocomplete="off"><label>Chữ Hán<input id="vocabHanzi" lang="zh-CN" required maxlength="20" placeholder="Ví dụ: 你好"></label><label>Pinyin<input id="vocabPinyin" required maxlength="80" placeholder="nǐ hǎo / nihao / ni3 hao3" autocapitalize="off" spellcheck="false"></label><label class="vocab-meaning">Nghĩa tiếng Việt<input id="vocabMeaning" required maxlength="120" placeholder="Ví dụ: Xin chào"></label><div class="vocab-form-actions"><button type="submit" class="primary" id="saveWordBtn">＋ Thêm từ</button><button type="button" class="secondary" id="cancelWordEdit" hidden>Hủy sửa</button></div></form></details><div class="vocab-message-row"><span id="vocabMessage" role="status" aria-live="polite">Bạn có thể nhập pinyin có dấu, không dấu hoặc số thanh điệu.</span><button id="undoWordDelete" type="button" hidden>Hoàn tác</button></div></div><div><div class="vocab-list-heading"><b>Danh sách từ</b><span id="deckSize"></span></div><div id="vocabList" class="vocab-list"></div></div></div><div class="vocab-bottom"><button type="button" id="playVocabulary" class="primary">Chơi bộ từ này →</button></div>`);
  $('#vocabDeck').onchange=()=>{editingDeck=+$('#vocabDeck').value;deletedWord=null;clearVocabularyForm();$('#undoWordDelete').hidden=true;vocabularyMessage('Đang chỉnh sửa: '+levels[editingDeck].name);drawVocabularyList();};
  $('#cancelWordEdit').onclick=()=>{clearVocabularyForm();vocabularyMessage('Đã hủy sửa.');};
  $('#vocabForm').onsubmit=e=>{e.preventDefault();const w=[$('#vocabHanzi').value.trim(),$('#vocabPinyin').value.trim(),$('#vocabMeaning').value.trim()];
    if(!w.every(Boolean)){vocabularyMessage('Điền đủ chữ Hán, pinyin và nghĩa tiếng Việt nhé.');return;}
    if(!/\p{Script=Han}/u.test(w[0])){vocabularyMessage('Ô chữ Hán cần có ít nhất một chữ tiếng Trung.');return;}
    if(!/^[a-zv]+$/.test(normalize(w[1]))){vocabularyMessage('Pinyin chỉ gồm chữ Latin, dấu thanh, dấu cách hoặc số 1–5. Dùng ü hoặc v cho âm ü.');return;}
    if(words[editingDeck].some((v,i)=>i!==editingWord&&v[0]===w[0])){vocabularyMessage('Từ này đã có trong bộ. Hãy bấm Sửa ở dòng tương ứng.');return;}
    const wasEditing=editingWord>=0;if(wasEditing)words[editingDeck][editingWord]=w;else words[editingDeck].push(w);
    clearVocabularyForm();saveDecks();drawVocabularyList();vocabularyMessage((wasEditing?'Đã sửa ':'Đã thêm ')+w[0]+'.');$('#vocabHanzi').focus();
  };
  $('#undoWordDelete').onclick=()=>{if(!deletedWord||deletedWord.deck!==editingDeck)return;const d=deletedWord;if(words[editingDeck].some(w=>w[0]===d.word[0])){vocabularyMessage('Từ này đã có lại trong bộ.');return;}words[editingDeck].splice(Math.min(d.index,words[editingDeck].length),0,d.word);deletedWord=null;saveDecks();drawVocabularyList();$('#undoWordDelete').hidden=true;vocabularyMessage('Đã khôi phục '+d.word[0]+'.');};
  $('#playVocabulary').onclick=()=>{if(!words[editingDeck].length)return;modal.close();reset(editingDeck);start();};setupBulkImport();drawVocabularyList();
}
$('#typingForm').addEventListener('submit',e=>{e.preventDefault();check(true);});input.addEventListener('input',()=>check());input.addEventListener('compositionstart',()=>input.composing=true);input.addEventListener('compositionend',()=>{input.composing=false;check();});$('#startBtn').onclick=()=>status==='paused'?pause():start();$('#pauseBtn').onclick=pause;$('#listenBtn').onclick=()=>{if(!speechAvailable){feedback('Trình duyệt chưa hỗ trợ giọng đọc. Hãy đọc theo pinyin nhé.','sound-note');return;}speak(word()[0],true);};$('#soundBtn').onclick=()=>{saved.sound=!saved.sound;if(!saved.sound&&speechAvailable)speechSynthesis.cancel();persist();updateSettings();if(saved.sound)startMusic();else stopMusic();};$('#hintBtn').onclick=()=>{if(status!=='playing')return;hinted=true;$('#pinyin').textContent=word()[1];$('#hintBtn').setAttribute('aria-expanded','true');feedback(`Gợi ý: ${word()[1]} → ${normalize(word()[1])}. Từ này nhận 60 điểm.`);input.focus();};$('#mode').onchange=()=>reset();document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>reset(+b.dataset.level));$('#enterGame').onclick=()=>{reset();start();};$('#resumeGame').onclick=()=>{document.body.dataset.screen='game';pause();};$('#menuBtn').onclick=goMenu;
$('#helpBtn').onclick=()=>openModal('Bắt đầu thật đơn giản',`<div class="help-step"><b>01</b><div><h3>Nhìn chữ Hán, nhớ cách đọc</h3><p>Từ mới có chữ Hán và nghĩa tiếng Việt. Pinyin luôn được che; bấm nút Gợi ý khi cần xem cách đọc.</p></div></div><div class="help-step"><b>02</b><div><h3>Gõ đúng, Gấu tự nhảy!</h3><p>Ví dụ 你好 → gõ <b>nihao</b>, <b>nǐ hǎo</b> hoặc <b>ni3 hao3</b>. Gõ đúng sẽ tự qua từ tiếp theo. Nhấn Enter nếu muốn kiểm tra câu trả lời.</p></div></div><div class="help-step"><b>03</b><div><h3>Chọn nhịp chơi của bạn</h3><p>Luyện tập: không giới hạn thời gian và số lần sai. Thử thách: 20 giây mỗi từ, 3 tim; sai hoặc hết giờ mất 1 tim. Bấm Gợi ý để hiện pinyin của từ đang chơi. Sang từ tiếp theo, pinyin tự ẩn lại. Nhạc nền 8-bit phát khi chơi và dừng khi tạm nghỉ.</p></div></div><div class="help-note">Esc để tạm dừng. Chuyển tab sẽ tự tạm dừng. Tiến độ sổ từ và kỷ lục được lưu trên trình duyệt này. Game luyện cách đọc qua pinyin; bạn dùng bàn phím Latin để chơi.</div>`);
$('#wordbookBtn').onclick=()=>openVocabulary(level);
$('#closeModal').onclick=()=>modal.close();modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});modal.addEventListener('close',()=>{if(status==='complete'||status==='gameover'){reset();goMenu();}});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.open&&document.body.dataset.screen==='game'){e.preventDefault();pause();}if(e.key==='Enter'&&status==='ready'&&!modal.open&&e.target===document.body){e.preventDefault();reset();start();}});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(status==='playing'||status==='jumping'))pause();});

// All scenery and sprites are drawn locally, on a deliberately low-resolution pixel grid.
const px=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function cloud(x,y,s=1){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);px(10,0,35,10,'#eef5e6');px(0,10,70,16,'#eef5e6');px(-12,19,94,13,'#eef5e6');px(-5,32,82,6,'#d3e9da');px(6,10,10,7,'#fff9e7');ctx.restore();}
function hill(x,y,w,h,c){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-h*.25);ctx.lineTo(x+w*.12,y-h*.25);ctx.lineTo(x+w*.12,y-h*.56);ctx.lineTo(x+w*.25,y-h*.56);ctx.lineTo(x+w*.25,y-h*.8);ctx.lineTo(x+w*.38,y-h*.8);ctx.lineTo(x+w*.38,y-h);ctx.lineTo(x+w*.62,y-h);ctx.lineTo(x+w*.62,y-h*.8);ctx.lineTo(x+w*.75,y-h*.8);ctx.lineTo(x+w*.75,y-h*.56);ctx.lineTo(x+w*.88,y-h*.56);ctx.lineTo(x+w*.88,y-h*.25);ctx.lineTo(x+w,y-h*.25);ctx.lineTo(x+w,y);ctx.closePath();ctx.fill();}
function bush(x,y,s=1){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);px(0,-15,64,15,'#517c4b');px(9,-26,19,14,'#517c4b');px(31,-32,20,20,'#517c4b');px(17,-19,13,8,'#709957');px(38,-22,9,7,'#709957');px(5,-8,9,5,'#709957');ctx.restore();}
function brick(x,y,question=false){px(x,y,40,38,question?'#9b6c35':'#785f46');px(x+2,y+2,36,32,question?'#ebbd64':'#c99962');px(x+4,y+4,32,4,question?'#ffe197':'#e5b57d');if(question){px(x+5,y+8,3,3,'#a17b41');px(x+32,y+8,3,3,'#a17b41');ctx.fillStyle='#916c35';ctx.font='23px Silkscreen, monospace';ctx.fillText('?',x+13,y+28);}else{px(x+2,y+17,36,3,'#8e6946');px(x+19,y+4,3,13,'#8e6946');px(x+9,y+20,3,14,'#8e6946');px(x+31,y+20,3,14,'#8e6946');}}
function coin(x,y,t){let w=Math.max(4,Math.abs(Math.cos(t*2))*14);px(x-w/2-2,y-11,w+4,22,'#a87f35');px(x-w/2,y-12,w,22,'#f4c95c');px(x-w/2+2,y-9,3,15,'#ffe89d');}
const panda=['.....HHHHHH.....','....HHHHHHHH....','...HHHHHHHHHH...','..HHYYYYYYYYHH..','..BBWWWWWWBB....','.BBBWWWWWWBBB...','.BWWBKWWKBWWB...','..WWBKWWKBWW....','..WWWWNNWWWW....','...WWWWWWWW.....','....RRRRRRRR....','...BBRRRWWBB....','..BBBWWWWWBBB...','..BBBWWWWWBBB...','...BBWWWWWBB....','....BBBBBBBB....','....BBB..BBB....','...BBBB..BBBB...'];
function drawPanda(x,y,t,air){const colors={H:'#dcb753',Y:'#f8da77',B:'#303f38',W:'#f5f0d7',K:'#1d2b29',N:'#506450',R:'#bc6850'};const s=3;ctx.save();ctx.translate(Math.round(x),Math.round(y));if(!air)ctx.translate(0,Math.round(Math.sin(t*3)*1));panda.forEach((r,iy)=>{for(let ix=0;ix<r.length;ix++){const c=colors[r[ix]];if(c)px(ix*s,iy*s,s,s,c);}});if(air){px(-5,31,9,9,colors.B);px(43,22,9,10,colors.B);}ctx.restore();}
function pipe(x){px(x+5,309,54,73,'#3f7252');px(x+8,311,48,71,'#7aa467');px(x+12,311,9,71,'#a0bd7c');px(x+48,311,6,71,'#547d50');px(x,302,64,22,'#406f4d');px(x+3,305,58,15,'#92b574');px(x+7,305,9,15,'#b4cd8c');px(x+54,305,5,15,'#628b58');}
function critter(x,t){const bob=Math.sin(t*4)*2;px(x+7,352+bob,32,25,'#896a4d');px(x+2,360+bob,42,17,'#b29163');px(x+8,354+bob,30,8,'#d2b57c');px(x+9,362+bob,8,9,'#f8edc9');px(x+29,362+bob,8,9,'#f8edc9');px(x+13,365+bob,4,6,'#34473a');px(x+29,365+bob,4,6,'#34473a');px(x+3,378,15,5,'#44583f');px(x+29,378,15,5,'#44583f');}
function house(x,y,c){px(x,y,90,95,'#d6bc8e');px(x-7,y-9,104,12,c);px(x+4,y-22,82,13,c);px(x+17,y-35,56,13,c);px(x+35,y-45,20,11,c);px(x+37,y+42,23,53,'#8b8061');px(x+12,y+22,18,24,'#a0bbab');px(x+67,y+22,15,24,'#a0bbab');px(x+18,y+22,3,24,'#e9d5ab');}
function lantern(x,y,t){const yy=y+Math.sin(t+x)*3;px(x+8,0,2,yy,'#b4b098');px(x+2,yy,16,7,'#cf9558');px(x-2,yy+7,24,21,'#d78362');px(x+3,yy+8,5,20,'#edac73');px(x+2,yy+28,16,5,'#cc9555');px(x+8,yy+33,3,11,'#e6b578');}
function render(t){const L=levels[level],cam=camera;const w=canvas.parentElement.clientWidth,h=canvas.parentElement.clientHeight;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;ctx.imageSmoothingEnabled=false;}ctx.setTransform(1,0,0,1,0,0);const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,L.skyTop);sky.addColorStop(1,L.sky);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);const inGame=document.body.dataset.screen==='game',scale=inGame?Math.max(.75,Math.min(Math.max(h/450,w/1200),w/340)):Math.max(.85,Math.min(1.7,w/1200)),ox=inGame?Math.max(w-1200*scale,Math.min(0,w*.2-338*scale)):(w<700?-210*scale:0),oy=h-450*scale;ctx.setTransform(scale,0,0,scale,ox,oy);const gradient=ctx.createLinearGradient(0,-Math.max(0,oy/scale),0,382);gradient.addColorStop(0,L.skyTop);gradient.addColorStop(1,L.sky);ctx.fillStyle=gradient;ctx.fillRect(0,0,1200,450);
  if(level===2){for(let i=0;i<28;i++){px((i*173+43)%1200,28+(i*79)%215,2,2,'#e5d9b7');}px(1010,58,32,32,'#efe0ae');px(1002,66,40,17,'#efe0ae');}else{px(1020,63,38,38,'#f9eac3');px(1013,70,52,24,'#f9eac3');}
  for(let i=-1;i<5;i++){let x=i*360-((cam*.12+t*3)%360);cloud(x+110,74+(i%2)*44,.8+i%2*.25);}
  for(let i=-1;i<5;i++){hill(i*400-(cam*.18%400),382,500,150+(i%2)*37,L.hill2);hill(i*420+200-(cam*.28%420),382,330,105+(i%2)*30,L.hill);}
  if(level===1){for(let i=0;i<5;i++)house(i*300+80-(cam*.35%300),279,['#a5845f','#9b8567'][i%2]);}
  if(level===2){for(let i=0;i<7;i++)lantern(i*210+40-(cam*.17%210),100+i%3*31,t);}
  for(let i=-1;i<8;i++){let x=i*190-(cam*.6%190);bush(x+45,382,.7+(i%2)*.3);if(i%2===0){px(x+120,364,3,18,'#6e9850');px(x+116,360,10,7,'#f3de8a');px(x+119,361,3,3,'#dca757');}}
  // Exit pennant scrolls in after the last vocabulary obstacle.
  let flagX=490+words[level].length*210-cam;px(flagX,204,5,178,'#efebc8');px(flagX-3,198,11,10,'#e3c66f');px(flagX+5,212,56,34,'#d3a356');px(flagX+5,243,31,8,'#d3a356');
  for(let n=Math.max(0,index-1);n<Math.min(words[level].length,index+5);n++){let x=490+n*210-cam;if(x<-150||x>1250)continue;let passed=n<index||(n===index&&status==='jumping'&&jump>.35);if(n%3===0){if(!passed){brick(x-40,268);brick(x,268,true);brick(x+40,268);}else{px(x-40,268,120,3,'#a6bfa050');}}else if(n%3===1){pipe(x-10);}else if(!passed){critter(x,t);}if(!passed){coin(x+16,224+Math.sin(t*3+n)*4,t);if(n===index){ctx.textAlign='center';ctx.font='600 20px "PingFang SC","Microsoft YaHei",sans-serif';let label=word()[0],lw=Math.max(60,ctx.measureText(label).width+25);px(x+17-lw/2,164,lw,38,'#fff8dc');px(x+15-lw/2,166,lw+4,34,'#fff8dc');px(x+14,202,7,5,'#fff8dc');ctx.fillStyle='#45664b';ctx.fillText(label,x+17,190);ctx.textAlign='left';}}}
  px(0,382,1200,10,L.grass);px(0,392,1200,5,'#bdcb7b');px(0,397,1200,53,L.ground);for(let i=-1;i<40;i++){let x=i*36-(cam%36);px(x,392,6,5,'#527c45');px(x+12,398,17,5,'#906b47');px(x+5,412,7,5,'#c69964');px(x+25,436,9,4,'#906b47');px(x+18,424,5,5,'#c69964');}px(0,444,1200,6,'#6e6244');
  let air=status==='jumping'||(status==='paused'&&resumeStatus==='jumping'),progress=jump/.88,py=328-(air?Math.sin(Math.min(1,progress)*Math.PI)*137:0);let playerX=338;if(air)playerX+=Math.sin(progress*Math.PI)*47;px(playerX+3,379,40,3,'#526e4366');drawPanda(playerX,py,t,air);
  particles.forEach(p=>{px(p.x-cam+camStart,p.y,5,5,p.color);});if(popupTime>0){ctx.font='16px Silkscreen, monospace';ctx.fillStyle='#fff5b6';ctx.textAlign='center';ctx.fillText(popup,playerX+25,py-20-(1.2-popupTime)*15);ctx.textAlign='left';}
}
let last=performance.now();function frame(now){let dt=Math.min((now-last)/1000,.05);last=now;if(status==='playing'){elapsed+=dt;if($('#mode').value==='challenge'){remaining-=dt;$('#timer').textContent=Math.max(0,Math.ceil(remaining))+'s';if(remaining<=0)wrong(true);}}if(status==='jumping'){elapsed+=dt;jump+=dt;const a=Math.min(1,jump/.88),e=a*a*(3-2*a);camera=camStart+(camTarget-camStart)*e;if(jump>=.88){camera=camTarget;index++;jump=0;if(index===words[level].length){updateHUD();finish(true);}else{setWord();status='playing';input.disabled=false;input.focus();}$('#comboToast').textContent='';}}if(status!=='paused'&&!modal.open){particles.forEach(p=>{p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt;});particles=particles.filter(p=>p.t<1);popupTime=Math.max(0,popupTime-dt);}render(now/1000);requestAnimationFrame(frame);}
updateSettings();reset();requestAnimationFrame(frame);
})();
