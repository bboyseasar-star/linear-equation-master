import { COURSE_ID, RNG_VERSION, createSet, createQuestion, gradeAnswer, safeAnswerLatex } from './questions.js?v=20261026a';

const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const app=$('#app');
const KEYS={course:`nyushi-daimon2:v2:course:${COURSE_ID}`,history:'nyushi-daimon2:v2:history'};
const fallback=new Map();
const read=(key,initial)=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):(fallback.get(key)??initial);}catch{return fallback.get(key)??initial;}};
const write=(key,value)=>{fallback.set(key,value);try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const remove=key=>{fallback.delete(key);try{localStorage.removeItem(key);}catch{}};
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tex=value=>`\\(${value}\\)`;
async function typeset(root=app){if(window.MathJax?.typesetPromise)try{await window.MathJax.typesetPromise([root]);}catch{}}

const state={session:null,course:read(KEYS.course,{high:0}),history:read(KEYS.history,[])};
const handwriting={canvas:null,ctx:null,tool:'pen',activePointer:null,lastPoint:null,hasMarks:false,enabled:false};
// MathLive の仮想キーボード（.ML__keyboard とその中のキー・背景）も、手書きの点を打たない場所にする
const protectedSelector='button, math-field, input, textarea, select, a, [role="button"], label, .ML__keyboard, .ML__keyboard *, [class^="MLK__"], [class*=" MLK__"]';
function protectedTarget(target){return target instanceof Element&&!!target.closest(protectedSelector);}
function syncHandwritingControls(){
  $$('[data-handwriting-tool]').forEach(button=>{const selected=button.dataset.handwritingTool===handwriting.tool;button.setAttribute('aria-pressed',String(selected));});
  const erase=$('[data-handwriting-tool="erase"]'),clear=$('#handwriting-clear');if(erase)erase.disabled=!handwriting.hasMarks;if(clear)clear.disabled=!handwriting.hasMarks;
}
function sizeHandwriting(){
  const canvas=handwriting.canvas;if(!canvas)return;const dpr=window.devicePixelRatio||1,old=document.createElement('canvas');old.width=canvas.width;old.height=canvas.height;if(old.width&&old.height)old.getContext('2d').drawImage(canvas,0,0);
  canvas.width=Math.round(window.innerWidth*dpr);canvas.height=Math.round(window.innerHeight*dpr);canvas.style.width=`${window.innerWidth}px`;canvas.style.height=`${window.innerHeight}px`;
  const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';if(old.width&&old.height)ctx.drawImage(old,0,0,old.width,old.height,0,0,canvas.width,canvas.height);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineCap='round';ctx.lineJoin='round';handwriting.ctx=ctx;
}
function clearHandwriting(){if(!handwriting.ctx)return;handwriting.ctx.save();handwriting.ctx.setTransform(1,0,0,1,0,0);handwriting.ctx.clearRect(0,0,handwriting.canvas.width,handwriting.canvas.height);handwriting.ctx.restore();handwriting.hasMarks=false;syncHandwritingControls();}
function addHandwritingLayer(){
  if(handwriting.canvas){handwriting.enabled=true;return;}
  handwriting.enabled=true;handwriting.canvas=document.createElement('canvas');handwriting.canvas.className='handwriting-canvas';handwriting.canvas.setAttribute('aria-hidden','true');document.body.append(handwriting.canvas);sizeHandwriting();
  const tools=document.createElement('div');tools.className='handwriting-tools';tools.id='handwriting-tools';tools.innerHTML='<button type="button" data-handwriting-tool="pen" aria-pressed="true">✏️ ペン</button><button type="button" data-handwriting-tool="erase" aria-pressed="false" disabled>⌫ 消す</button><button type="button" id="handwriting-clear" disabled>すべて消す</button><span id="handwriting-status" class="handwriting-status" aria-live="polite"></span>';
  document.body.append(tools);$$('[data-handwriting-tool]',tools).forEach(button=>button.onclick=()=>{handwriting.tool=button.dataset.handwritingTool;$('#handwriting-status').textContent=handwriting.tool==='pen'?'書き込み中':'消しゴム中';syncHandwritingControls();});$('#handwriting-clear').onclick=()=>{clearHandwriting();handwriting.tool='pen';syncHandwritingControls();$('#handwriting-status').textContent='書き込みをすべて消しました（ペンに戻しました）';};syncHandwritingControls();
}
function removeHandwritingLayer(){handwriting.enabled=false;handwriting.activePointer=null;handwriting.lastPoint=null;handwriting.canvas?.remove();$('#handwriting-tools')?.remove();handwriting.canvas=null;handwriting.ctx=null;handwriting.hasMarks=false;}
function strokePoint(event){
  const ctx=handwriting.ctx;if(!ctx||!handwriting.lastPoint)return;const point={x:event.clientX,y:event.clientY};ctx.save();ctx.globalCompositeOperation=handwriting.tool==='erase'?'destination-out':'source-over';ctx.strokeStyle='#182436';ctx.lineWidth=handwriting.tool==='erase'?24:3;ctx.beginPath();ctx.moveTo(handwriting.lastPoint.x,handwriting.lastPoint.y);ctx.lineTo(point.x,point.y);ctx.stroke();ctx.restore();handwriting.lastPoint=point;handwriting.hasMarks=true;syncHandwritingControls();
}
document.addEventListener('pointerdown',event=>{if(!handwriting.enabled||protectedTarget(event.target)||event.button!==0)return;handwriting.activePointer=event.pointerId;handwriting.lastPoint={x:event.clientX,y:event.clientY};const ctx=handwriting.ctx;ctx.save();ctx.globalCompositeOperation=handwriting.tool==='erase'?'destination-out':'source-over';ctx.fillStyle='#182436';ctx.beginPath();ctx.arc(event.clientX,event.clientY,(handwriting.tool==='erase'?24:3)/2,0,Math.PI*2);ctx.fill();ctx.restore();handwriting.hasMarks=true;syncHandwritingControls();},true);
document.addEventListener('pointermove',event=>{if(event.pointerId===handwriting.activePointer)strokePoint(event);},true);
document.addEventListener('pointerup',event=>{if(event.pointerId===handwriting.activePointer){handwriting.activePointer=null;handwriting.lastPoint=null;}},true);
document.addEventListener('pointercancel',()=>{handwriting.activePointer=null;handwriting.lastPoint=null;},true);
document.addEventListener('pointerover',event=>{if(handwriting.activePointer!==null&&protectedTarget(event.target)){handwriting.activePointer=null;handwriting.lastPoint=null;}},true);
window.addEventListener('resize',sizeHandwriting);
// ===== 共通の小さな部品（大問2シリーズ8本でそろえる。ほかのアプリへそのまま写せるように、ここだけで完結させる） =====
// 入力欄の「決定」を、実キーの Enter（GraderCore.setupMathField の onEnter）と、仮想キーボードの ↵（MathLive の change）の
// 両方で受ける。↵ は keydown を出さないため change で拾う。change は欄からフォーカスが外れたときにも出るので、
// 欄にフォーカスがあるときだけ受ける。同じ操作で両方が来ても、400ms 以内の2回目は無視して二重採点を防ぐ。
function bindMathFieldSubmit(mf,onSubmit){
  if(!mf||mf.dataset.submitBound)return;mf.dataset.submitBound='1';
  let last=0;const fire=()=>{const now=Date.now();if(now-last<400)return;last=now;onSubmit();};
  if(window.GraderCore)window.GraderCore.setupMathField(mf,{onEnter:event=>{if(!event.repeat)fire();}});
  mf.addEventListener('change',()=>{const focused=typeof mf.hasFocus==='function'?mf.hasFocus():document.activeElement===mf;if(focused)fire();});
}
// 仮想キーボードが出ている間は、<html> に vk-open を付けて高さ固定をゆるめ（CSS 側）、
// getTargets() が返す要素（入力欄・判定・決定ボタン）がキーボードの上に見えるようにスクロールする。閉じたら先頭へ戻す。
function followVirtualKeyboard(getTargets){
  const vk=window.mathVirtualKeyboard;if(!vk||followVirtualKeyboard.bound)return;followVirtualKeyboard.bound=true;
  followVirtualKeyboard.getTargets=getTargets;
  const update=()=>{
    const h=Math.round(vk.boundingRect?.height||0),open=vk.visible!==false&&h>0,root=document.documentElement;
    const was=root.classList.contains('vk-open');root.classList.toggle('vk-open',open);root.style.setProperty('--vk-height',`${open?h:0}px`);
    if(!open){if(was)window.scrollTo(0,0);return;}
    requestAnimationFrame(()=>{
      const els=(followVirtualKeyboard.getTargets()||[]).filter(Boolean);if(!els.length)return;
      const rects=els.map(e=>e.getBoundingClientRect()).filter(r=>r.width||r.height);if(!rects.length)return;const top=Math.min(...rects.map(r=>r.top)),bottom=Math.max(...rects.map(r=>r.bottom));
      const visibleBottom=window.innerHeight-h-8;let dy=0;
      if(bottom>visibleBottom)dy=bottom-visibleBottom;if(top-dy<8)dy=top-8;
      if(dy)window.scrollBy(0,dy);
    });
  };
  vk.addEventListener('geometrychange',update);vk.addEventListener('virtual-keyboard-toggle',update);window.addEventListener('resize',update);
  followVirtualKeyboard.update=update;
}
function top(extra=''){return `<header class="topbar"><h1 class="brand"><span class="emoji-icon">👹</span> 高校入試対策シリーズ ～大問2・一次方程式～</h1>${extra}</header>`;}
function renderHome(){
  removeHandwritingLayer();
  const history=state.history.slice(0,20);
  app.innerHTML=`<section class="shell"><div class="content home-grid simple-home"><section class="hero home-start"><h1 class="home-title"><span class="emoji-icon">👹</span> 高校入試対策シリーズ<br>～大問2・一次方程式～</h1><div class="actions"><button class="primary" id="start">▶ スタート！</button></div><a href="legal.html">このアプリについて</a></section><aside class="card"><h3>学習の履歴</h3><div class="history"><ul>${history.length?history.map(h=>`<li>${escapeHTML(new Date(h.at).toLocaleString('ja-JP'))}<br>${h.score}/10 ${h.clear?'💮 クリア':'挑戦中'}</li>`).join(''):'<li>まだ記録はありません。</li>'}</ul></div><div class="actions"><button class="danger" id="reset">この端末の記録を消す</button></div></aside></div></section>`;
  $('#start').onclick=()=>startNormal(); $('#reset').onclick=()=>{if(window.confirm('この端末の記録を消します。よいですか？')){remove(KEYS.course);remove(KEYS.history);state.course={high:0};state.history=[];renderHome();}};
}
function startNormal(){state.session={mode:'normal',seed:randomSeed(),index:0,questions:createSet(randomSeed()),answers:[]};renderQuestion();}
function randomSeed(){return(Date.now()^Math.floor(performance.now()*1000))>>>0;}
function current(){return state.session.questions[state.session.index];}
function answer(){return state.session.answers[state.session.index]??={hints:0,phase:'EDITING',input:''};}
function renderQuestion(){
  const q=current(),a=answer(),total=state.session.questions.length,score=state.session.answers.filter(x=>x?.correct).length;
  app.innerHTML=`<section class="shell quiz-shell">${top('<button class="ghost" id="home">🏠 中断</button>')}<div class="content"><div class="meta"><span>Q ${state.session.index+1} / ${total}</span><span>${state.session.mode==='review'?'まちがい復習':'現在 '+score+' 点'}</span></div><div class="progress"><span style="width:${state.session.index/total*100}%"></span></div><div class="question-layout"><section class="card problem"><p>${escapeHTML(q.promptParts[0].value)}</p><div class="math">${tex(q.promptParts[1].value)}</div><div class="answer-row compact-answer"><span>${tex('x=')}</span><div class="math-wrap"><math-field id="answer" aria-label="x の値を入力"></math-field></div><button class="frac-key" data-insert="\\frac{#0}{#?}" aria-label="分数を入力">${tex('\\frac{a}{b}')}</button></div><small class="muted">※半角英数字で入力してね。</small><section class="feedback hidden" id="feedback"></section><div class="actions" id="answer-actions"><button class="primary" id="submit">✅ 決定！</button></div></section><aside class="side"><section class="question-hint"><section class="hint-box" id="hint"></section><div class="hint-actions"><button class="ghost" id="hint-next">💡 ヒント</button></div></section></aside></div></div></section>`;
  const mf=$('#answer');mf.value=a.input||'';bindMathFieldSubmit(mf,()=>{if(answer().phase==='LOCKED')next();else submit();});try{mf.mathModeSpace='\\:';}catch{}followVirtualKeyboard(()=>[$('.answer-row'),$('#feedback:not(.hidden)'),$('#answer-actions')]);$$('[data-insert]').forEach(b=>b.onclick=()=>insertMath(b.dataset.insert));$('#home').onclick=renderHome;$('#submit').onclick=submit;$('#hint-next').onclick=requestHint;renderHints(a);if(a.phase==='LOCKED')showFeedback(a);typeset(app);addHandwritingLayer();
  // 新しい問題は先頭から見せる（キーボードを開いたまま「次へ」で進んでも問題文が上に隠れないように）
  window.scrollTo(0,0);followVirtualKeyboard.update?.();
}
function insertMath(latex){const mf=$('#answer');if(!mf||mf.hasAttribute('read-only'))return;const options={selectionMode:'placeholder',focus:true};try{mf.insert(latex,options);}catch{try{mf.executeCommand(['insert',latex,options]);}catch{}}mf.focus();}
function renderHints(a){const hint=$('#hint'),steps=current().hints,from=a.phase==='LOCKED'&&a.hints===steps.length?1:0;if(!a.hints){hint.innerHTML='<div class="hint-placeholder">💡 ヒントを押すと、ここに計算の流れが出るよ。</div>';}else hint.innerHTML=steps.slice(from,a.hints).map((step,i)=>`<article class="hint-step ${from+i===steps.length-1?'hint-step-answer':''}"><div class="hint-calc">${tex(step.calc)}</div><p class="hint-explain">${escapeHTML(step.description)}</p></article>`).join('');const b=$('#hint-next');b.textContent=a.hints>=steps.length-1?'⚠️ 答えを見る':'💡 次のステップ';if(a.phase==='LOCKED')b.classList.add('hidden');typeset(hint);}
function requestHint(){const a=answer(),last=current().hints.length-1;if(a.hints>=last){if(!window.confirm('⚠️ 次のヒントは答えだよ！この問題は不正解で確定します。'))return;a.hints=current().hints.length;a.phase='LOCKED';a.correct=false;a.code='GIVE_UP';a.input=$('#answer')?.value||'';showFeedback(a);renderHints(a);return;}a.hints++;renderHints(a);}
// 空欄・書きかけ（empty / unreadable）は採点しない：ロックせず、記録せず、そのまま書き直せるようにする
function submit(){const a=answer();if(a.phase==='LOCKED')return;const mf=$('#answer');if(!mf)return;const raw=mf.value,result=gradeAnswer(current(),raw);if(result.kind==='incomplete'){showNotice(result.message);mf.focus();return;}a.input=raw;a.result=result;a.correct=result.status==='correct';a.phase='LOCKED';showFeedback(a);renderHints(a);}
function showNotice(message){const box=$('#feedback');box.className='feedback notice compact-feedback';box.innerHTML=`<strong>✏️ まだ採点していません</strong><p>${escapeHTML(message)}</p>`;followVirtualKeyboard.update?.();}
function shownAnswer(){const v=current().answerSpec.canonicalValue;return v.d===1?String(v.n):`${v.n<0?'-':''}\\frac{${Math.abs(v.n)}}{${v.d}}`;}
// 結果の見せ方：○ 正解／△ 分母のマイナス（0点）／× あと一歩（途中）／× 書き方／× 値の誤り
const FEEDBACK={
  correct:{cls:'good',title:'○ 正解'},
  negDenominator:{cls:'partial',title:'△ 書き直そう（正解には数えません）'},
  unfinished:{cls:'unfinished',title:'× 不正解（あと一歩）'},
  notation:{cls:'notation',title:'× 不正解（書き方）'},
  wrong:{cls:'bad',title:'× 不正解'}
};
function showFeedback(a){state.lockedAt=Date.now();$('#answer').setAttribute('read-only','');const box=$('#feedback');const kind=a.result?.kind||'wrong',view=FEEDBACK[kind]||FEEDBACK.wrong;if(a.correct){box.className='feedback good';box.innerHTML=`<strong>${view.title}</strong><p>よくできました。</p>`;burst(24);}else{a.hints=current().hints.length;box.className=`feedback ${view.cls} compact-feedback`;const lead=a.result?.message||(a.code==='GIVE_UP'?'答えを見たので、この問題は不正解です。':'');box.innerHTML=`<strong>${view.title}</strong>${lead?`<p>${escapeHTML(lead)}</p>`:''}<p>ヒントの計算の流れを見て、確認しよう。</p>`;}$('#answer-actions').innerHTML='<button class="primary" id="next">次へ →</button>';$('#next').onclick=next;const wasTyping=document.activeElement===$('#answer');typeset(box);followVirtualKeyboard.update?.();if(wasTyping)$('#next').focus({preventScroll:true});}
// 採点の直後（NEXT_GUARD_MS の間）は「次へ」を受け付けない：決定のダブルクリック・すばやい2回タップで、判定を見ないまま進むのを防ぐ
const NEXT_GUARD_MS=500;
function next(){if(Date.now()-(state.lockedAt||0)<NEXT_GUARD_MS)return;state.session.index++;if(state.session.index>=state.session.questions.length)return finish();renderQuestion();}
function finish(){const s=state.session,score=s.answers.filter(a=>a?.correct).length,clear=score>=8;if(s.mode==='normal'){state.course.high=Math.max(state.course.high||0,score);write(KEYS.course,state.course);state.history.unshift({at:new Date().toISOString(),score,clear});state.history=state.history.slice(0,20);write(KEYS.history,state.history);}renderResult(s.answers,score,clear,s.mode);}
function renderResult(answers,score,clear,mode){removeHandwritingLayer();const wrong=answers.map((a,i)=>({a,i})).filter(x=>!x.a?.correct);app.innerHTML=`<section class="shell"><div class="home-top">${top()}</div><div class="content"><section><div class="eyebrow">${clear?'🎉 クリア！':'今回の結果'}</div><h2 class="result-score">${score} / ${answers.length}</h2><p>${clear?'8問以上正解です。よくできました！':'まちがいを復習して、もう一度挑戦しよう。'}</p></section><section class="result-list">${answers.map((a,i)=>`<article class="result-item ${a?.correct?'good':'bad'}"><strong>Q${i+1} ${a?.correct?'⭕':a?.result?.status==='negDenominator'?'🔺':'❌'}</strong><p>あなたの答え：${yourAnswer(a)}</p><p>正しい答え：${tex(`x=${valueLatex(a?.question??null,i)}`)}</p></article>`).join('')}</section><div class="actions">${wrong.length?'<button class="primary" id="review">まちがいだけ復習</button>':''}<button class="secondary" id="again">もう一度！</button><button class="ghost" id="tohome">🏠 ホームへ</button></div></div></section>`;if(clear)burst();$('#again').onclick=startNormal;$('#tohome').onclick=renderHome;if(wrong.length)$('#review').onclick=()=>startReview(wrong.map(x=>state.session.questions[x.i].templateId));typeset(app);}
function yourAnswer(a){const latex=a?.input?safeAnswerLatex(a.input):null;return latex?tex(escapeHTML(latex)):a?.input?'（読み取れない入力）':'（なし）';}
function valueLatex(_,index){const q=state.session.questions[index],v=q.answerSpec.canonicalValue;return v.d===1?String(v.n):`${v.n<0?'-':''}\\frac{${Math.abs(v.n)}}{${v.d}}`;}
function startReview(ids){const seed=randomSeed();state.session={mode:'review',seed,index:0,questions:ids.map((id,i)=>createQuestion(id,(seed+i*7919)>>>0)),answers:[]};renderQuestion();}
function burst(count=45){for(let i=0;i<count;i++){const e=document.createElement('i');e.className='confetti';e.style.setProperty('--x',`${(Math.random()-.5)*80}vw`);e.style.background=['#5b3cc4','#f97316','#22c55e','#fbbf24'][i%4];e.style.left='50%';document.body.append(e);setTimeout(()=>e.remove(),1200);}}
renderHome();
