
(function(){
  function isReload(){
    try{
      var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      if(nav && nav.type === "reload") return true;
    }catch(e){}
    try{
      if(performance.navigation && performance.navigation.type === 1) return true;
    }catch(e){}
    return false;
  }
  window.__HD_RELOADED__ = isReload();
})();




let hdAudioCtx = null;
let hdLastPicoAt = 0;

function getHdAudioCtx(){
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return null;
  if(!hdAudioCtx || hdAudioCtx.state === "closed"){
    hdAudioCtx = new AC();
  }
  return hdAudioCtx;
}

function unlockHdAudio(){
  const ctx = getHdAudioCtx();
  if(!ctx) return null;
  if(ctx.state === "suspended"){
    const p = ctx.resume();
    if(p && p.catch) p.catch(()=>{});
  }
  return ctx;
}

function playTapStartPico(){
  const se = document.getElementById('picoSe');
  if(se){
    try{
      se.pause();
      se.currentTime = 0;
      const p = se.play();
      if(p && p.catch) p.catch(()=>{});
      return;
    }catch(e){}
  }
  playClick();
}

function playClick(){
  const nowMs = Date.now();
  if(nowMs - hdLastPicoAt < 130) return;
  hdLastPicoAt = nowMs;

  const ctx = unlockHdAudio();
  if(!ctx) return;

  const fire = () => {
    try{
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.exponentialRampToValueAtTime(1460, now + 0.05);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.26, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }catch(e){}
  };

  if(ctx.state === "suspended"){
    const p = ctx.resume();
    if(p && p.then) p.then(fire).catch(()=>{});
  }else{
    fire();
  }
}

function startTitleBgm(){
  unlockHdAudio();
  const bgm = document.getElementById('titleBgm');
  const story = document.getElementById('storyBgm');
  if(story){
    story.pause();
    try{ story.currentTime = 0; }catch(e){}
  }
  if(!bgm) return;
  bgm.volume = 0.42;
  const p = bgm.play();
  if(p && p.catch) p.catch(()=>{});
}

function stopTitleBgm(){
  const bgm = document.getElementById('titleBgm');
  if(!bgm) return;
  bgm.pause();
  try{ bgm.currentTime = 0; }catch(e){}
}


let hdTitleUnlocked = sessionStorage.getItem('hd_title_unlocked') === '1';
function unlockTitleStart(event){
  if(event){
    event.preventDefault();
    event.stopPropagation();
  }
  if(hdTitleUnlocked)return false;

  hdTitleUnlocked = true;
  sessionStorage.setItem('hd_title_unlocked','1');

  const gate = document.getElementById('tapStartScreen');
  if(gate){
    gate.classList.add('starting');
    setTimeout(()=>gate.classList.add('hidden'),900);
  }

  playTapStartPico();

  const flash=document.createElement('div');
  flash.id='hdStartFlash';
  flash.innerHTML='<div class="hd-start-main">HEART & DAGGER</div><div class="hd-start-sub">A LEGEND BEGINS...</div>';
  document.body.appendChild(flash);

  startTitleBgm();

  setTimeout(()=>flash.classList.add('show'),20);
  setTimeout(()=>{
    flash.classList.remove('show');
    setTimeout(()=>flash.remove(),600);
  },1800);

  return false;
}

function startStoryBgm(){
  stopTitleBgm();
const bgm=document.getElementById('storyBgm');
  if(!bgm)return;
  bgm.pause();
  try{ bgm.currentTime = 0; }catch(e){}
  bgm.volume=0.42;
  bgm.play().catch(()=>{
    const retry=()=>{
      try{ bgm.currentTime = 0; }catch(e){}
      bgm.play().catch(()=>{});
      document.body.removeEventListener('pointerdown',retry);
      document.body.removeEventListener('click',retry);
    };
    document.body.addEventListener('pointerdown',retry,{once:true});
    document.body.addEventListener('click',retry,{once:true});
  });
}
function stopStoryBgm(){
  const bgm=document.getElementById('storyBgm');
  if(!bgm)return;
  bgm.pause();
  try{ bgm.currentTime = 0; }catch(e){}
}

function openHowto(){
  playClick();
  const modal=document.getElementById('howtoModal');
  if(modal)modal.classList.add('active');
}
function closeHowto(event){
  if(event && event.target && event.currentTarget && event.target!==event.currentTarget)return;
  const modal=document.getElementById('howtoModal');
  if(modal && modal.classList.contains('active')) playClick();
  if(modal)modal.classList.remove('active');
}


function showStoryModeScreen(){
  const gate=document.getElementById('tapStartScreen');
  if(gate)gate.classList.add('hidden');

  const title=document.getElementById('titleScreen');
  const story=document.getElementById('storyScreen');
  const novel=document.getElementById('novelScreen');
  const free=document.getElementById('freeBattleScreen');
  const frame=document.getElementById('freeBattleFrame');

  if(title)title.classList.remove('active');
  if(novel)novel.classList.remove('active');
  if(free)free.classList.remove('active');
  if(frame)frame.src='about:blank';

  if(story)story.classList.add('active');

  renderStages();
  stopTitleBgm();
  startStoryBgm();
}

function showTitle(){playClick();sessionStorage.setItem('hd_title_unlocked','1');const gate=document.getElementById('tapStartScreen');if(gate)gate.classList.add('hidden');stopStoryBgm();const free=document.getElementById('freeBattleScreen');if(free)free.classList.remove('active');const frame=document.getElementById('freeBattleFrame');if(frame)frame.src='about:blank';document.getElementById('novelScreen')?.classList.remove('active');document.getElementById('storyScreen').classList.remove('active');document.getElementById('titleScreen').classList.add('active');startTitleBgm();}
function goStory(){
  playClick();
  sessionStorage.setItem('hd_title_unlocked','1');
  history.replaceState({screen:'story'}, '', '#story');
  showStoryModeScreen();
}

function returnFromFreeBattle(){
  const screen=document.getElementById('freeBattleScreen');
  const frame=document.getElementById('freeBattleFrame');

  if(screen)screen.classList.remove('active');
  if(frame)frame.src='about:blank';

  document.getElementById('storyScreen').classList.remove('active');
  document.getElementById('novelScreen')?.classList.remove('active');
  document.getElementById('titleScreen').classList.add('active');

  sessionStorage.setItem('hd_title_unlocked','1');
  const gate=document.getElementById('tapStartScreen');
  if(gate)gate.classList.add('hidden');

  startTitleBgm();
}

function goBattle(){
  playClick();
  stopTitleBgm();
  stopStoryBgm();

  document.getElementById('titleScreen').classList.remove('active');
  document.getElementById('storyScreen').classList.remove('active');
  document.getElementById('novelScreen')?.classList.remove('active');

  const screen=document.getElementById('freeBattleScreen');
  const frame=document.getElementById('freeBattleFrame');

  if(screen)screen.classList.add('active');

  if(frame){
    const sendStart=()=>{
      try{
        frame.contentWindow.postMessage({type:'HDG_START_FREE_BGM'}, '*');
      }catch(e){}
    };

    frame.onload=()=>{
      sendStart();
      setTimeout(sendStart,50);
      setTimeout(sendStart,150);
      setTimeout(sendStart,350);
      setTimeout(sendStart,700);
    };

    frame.src='./freebattle.html?v='+Date.now();

    sendStart();
    setTimeout(sendStart,20);
  }
}
let novelIdx = 0;
let currentNovelStage = 1;
let novelInputLocked = false;
let novelLastAdvanceAt = 0;

function hideAllScreens(){
  document.getElementById('titleScreen').classList.remove('active');
  document.getElementById('storyScreen').classList.remove('active');
  const novel=document.getElementById('novelScreen');
  if(novel)novel.classList.remove('active');
  const free=document.getElementById('freeBattleScreen');
  if(free)free.classList.remove('active');
}

function openNovelStage(stage){
  playClick();
  currentNovelStage = stage;
  novelIdx = 0;
  novelInputLocked = false;
  novelLastAdvanceAt = 0;
  hideAllScreens();
  stopStoryBgm();
  document.getElementById('novelScreen').classList.add('active');
  renderNovelLine();
}

function backToStageSelectFromNovel(e){
  if(e){ e.preventDefault(); e.stopPropagation(); }
  playClick();
  hideAllScreens();
  renderStages();
  document.getElementById('storyScreen').classList.add('active');
  startStoryBgm();
}

function renderNovelLine(){
  const lines = novelLinesByStage[currentNovelStage] || [];
  const line = lines[novelIdx];
  if(!line)return;
  const currentChar = line.char || (line.speaker === 'マモル' ? 'mamoru' : 'tsurugi');
  const tsurugi = document.getElementById('novelTsurugi');
  const mamoru = document.getElementById('novelMamoru');
  if(currentChar === 'none'){
    tsurugi.classList.remove('show');
    mamoru.classList.remove('show');
  }else{
    const isT = currentChar === 'tsurugi';
    tsurugi.classList.toggle('show', isT);
    mamoru.classList.toggle('show', !isT);
  }
  const name = document.getElementById('novelName');
  name.textContent = line.speaker;
  name.className = 'novel-nameplate ' + (line.speaker === 'マモル' ? 'mamoru' : line.speaker === 'ツルギ' ? 'tsurugi' : 'mystery');
  document.getElementById('novelText').textContent = line.text;
}

function advanceNovel(){
  const novel=document.getElementById('novelScreen');
  if(!novel || !novel.classList.contains('active'))return;
  const now = Date.now();
  if(novelInputLocked || now - novelLastAdvanceAt < 140)return;
  novelInputLocked = true;
  novelLastAdvanceAt = now;
  playClick();
  const lines = novelLinesByStage[currentNovelStage] || [];
  novelIdx += 1;
  if(novelIdx >= lines.length){
    sessionStorage.setItem('hd_story_stage', String(currentNovelStage));
    setTimeout(()=>{ location.href='./freebattle.html'; },170);
    return;
  }
  renderNovelLine();
  setTimeout(()=>{ novelInputLocked = false; },80);
}

document.addEventListener('pointerup',(e)=>{
  const novel=document.getElementById('novelScreen');
  if(!novel || !novel.classList.contains('active'))return;
  if(e.target && e.target.closest && e.target.closest('.novel-back'))return;
  advanceNovel();
});

function renderStages(){
  const grid=document.getElementById('stageGrid'); grid.innerHTML='';
  for(let i=1;i<=8;i++){
    const b=document.createElement('button'); b.className='stage-card';
    const isMysteryStage8 = (i === 8 && clearedStage < 7);
    const imgName = isMysteryStage8 ? 'stage8-locked.png' : `stage${i}.png`;
    b.style.backgroundImage = `url('./${imgName}?v=stage-remap-20260503-v2')`;
    if(i<=clearedStage)b.classList.add('done');
    b.disabled=i>unlockedStage || isMysteryStage8;
    const stageNoText = `STAGE ${i}`;
    const statusText = isMysteryStage8 ? 'LOCK' : (i<=clearedStage?'CLEAR':i===unlockedStage?'PLAY':'LOCK');
    b.innerHTML=`<div class="stage-no">${stageNoText}</div><div class="stage-name"></div><div class="stage-status">${statusText}</div>`;
    b.onclick=()=>{ if(i===1){ openNovelStage(1); } else { clearStage(i); } }; grid.appendChild(b);
  }
}
function clearStage(i){
  playClick();
  if(i>unlockedStage)return;
  clearedStage=Math.max(clearedStage,i);
  unlockedStage=Math.min(8,Math.max(unlockedStage,i+1));
  localStorage.setItem("hd_story_cleared",String(clearedStage));
  localStorage.setItem("hd_story_unlocked",String(unlockedStage));
  document.getElementById('clearMsg').textContent = i===8 ? "全ステージクリア！" : `STAGE ${i} CLEAR！ 次のステージが解放された！`;
  renderStages();
}







function showStoryScreenFromHash(){
  showStoryModeScreen();
}

window.addEventListener('pageshow',()=>{
  if(sessionStorage.getItem('hd_return_title_bgm') === '1'){
    sessionStorage.removeItem('hd_return_title_bgm');
    sessionStorage.setItem('hd_title_unlocked','1');
    hdTitleUnlocked = true;
    const gate=document.getElementById('tapStartScreen');
    if(gate)gate.classList.add('hidden');
    document.getElementById('novelScreen')?.classList.remove('active');
    document.getElementById('storyScreen').classList.remove('active');
    document.getElementById('titleScreen').classList.add('active');
    startTitleBgm();
  }
});

window.addEventListener('DOMContentLoaded',()=>{
  const tapGate=document.getElementById('tapStartScreen');
  if(tapGate){
    tapGate.addEventListener('pointerdown', unlockTitleStart, {passive:false});
    tapGate.addEventListener('click', unlockTitleStart, {passive:false});
  }
  const gate=document.getElementById('tapStartScreen');

  if(window.__HD_RELOADED__){
    sessionStorage.removeItem('hd_title_unlocked');
    sessionStorage.removeItem('hd_return_title_bgm');
    hdTitleUnlocked = false;
    if(location.hash){
      history.replaceState(null, '', location.pathname);
    }
    stopTitleBgm();
    stopStoryBgm();
    if(gate)gate.classList.remove('hidden','starting');
    document.getElementById('novelScreen')?.classList.remove('active');
    document.getElementById('storyScreen').classList.remove('active');
    document.getElementById('freeBattleScreen')?.classList.remove('active');
    document.getElementById('titleScreen').classList.add('active');
    return;
  }

  restoreTitleFromFreebattle();

  if(location.hash === '#story'){
    sessionStorage.setItem('hd_title_unlocked','1');
    hdTitleUnlocked = true;
    showStoryModeScreen();
    return;
  }

  if(hdTitleUnlocked){
    if(gate)gate.classList.add('hidden');
    document.getElementById('novelScreen')?.classList.remove('active');
    document.getElementById('storyScreen').classList.remove('active');
    document.getElementById('freeBattleScreen')?.classList.remove('active');
    document.getElementById('titleScreen').classList.add('active');
    startTitleBgm();
  }
});
