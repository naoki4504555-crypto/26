
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
  if(isReload()){
    location.replace("./index.html");
  }
})();


/* HDG child BGM disabled; parent owns freebattle BGM */
window.addEventListener("message", (ev)=>{
  if(ev && ev.data && ev.data.type === "HDG_STOP_FREE_BGM"){
    try{ stopBgm(); }catch(e){}
  }
});
/* HDG iframe class for Safari bottom UI */
try{
  if(window.parent && window.parent !== window){
    document.documentElement.classList.add("hdg-iframe-mode");
  }
}catch(e){}



let player, enemy, pScore, eScore;
let gameOver = false;
let callAvailable = false;
let enemyCallTimer = null;
let audioCtx = null;
let audioUnlocked = false;
let turnNumber = 0;
let sokkooMode = false;
const AI_CALL_DELAY = 1500;

const CARD_IMAGES = {
  "短剣": "dagger.png",
  "盾": "shield.png",
  "心臓": "heart.png",
  "ソッコーダガー": "sokkoo_dagger.png",
  "ソッコーハート": "sokkoo_heart.png",
  "裏": "card_back.png"
};

function setMode(isSokkoo){
  sokkooMode = isSokkoo;
  document.getElementById("normalModeBtn").classList.toggle("active", !sokkooMode);
  document.getElementById("sokkooModeBtn").classList.toggle("active", sokkooMode);
  if(!document.getElementById("gameArea").classList.contains("hidden")) startGame();
}

function makeHand(){
  let hand;
  if(sokkooMode){
    hand = {短剣:4, 盾:5, 心臓:4, ソッコーダガー:1, ソッコーハート:1};
  } else {
    hand = {短剣:5, 盾:5, 心臓:5};
  }
  return hand;
}

function cardLabel(card){
  return card;
}




let hdLastPicoAt = 0;

function unlockAudio(){
  try{
    const ctx = getAudioContext();
    if(ctx.state === "suspended"){
      const p = ctx.resume();
      if(p && p.catch) p.catch(()=>{});
    }
    audioUnlocked = true;
return ctx;
  } catch(e){
    audioCtx = null;
    return null;
  }
}


function ensureBattleBgm(forceUnlock){
  /* disabled: parent page owns Free Battle BGM */
}

function buttonTap(){
  const nowMs = Date.now();
  if(nowMs - hdLastPicoAt < 130) return;
  hdLastPicoAt = nowMs;
const ctx = unlockAudio();
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



/* HDG one-time silent audio unlock */
let hdAudioUnlockedOnce = false;

function unlockAudioOnce(){
  if(hdAudioUnlockedOnce) return;
  hdAudioUnlockedOnce = true;

  try{
    const ctx = unlockAudio();
    if(!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    gain.gain.setValueAtTime(0.000001, now);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.001);
  }catch(e){}
}

window.addEventListener("pointerdown", unlockAudioOnce, { once:true, passive:true });

function clearBattleResultLabels(){
  const p = document.getElementById("playerResultLabel");
  const e = document.getElementById("enemyResultLabel");
  if(!p || !e) return;
  p.textContent = "";
  e.textContent = "";
  p.className = "battle-result-label";
  e.className = "battle-result-label";
}

function showBattleResultLabels(kind){
  const p = document.getElementById("playerResultLabel");
  const e = document.getElementById("enemyResultLabel");
  if(!p || !e) return;

  clearBattleResultLabels();

  if(kind === "win"){
    p.textContent = "WIN";
    e.textContent = "LOSE";
    p.classList.add("show", "win");
    e.classList.add("show", "lose");
  } else if(kind === "lose"){
    p.textContent = "LOSE";
    e.textContent = "WIN";
    p.classList.add("show", "lose");
    e.classList.add("show", "win");
  }
}


function clearHistoryLog(){
  const log = document.getElementById("log");
  if(log && log.parentNode){
    const newLog = log.cloneNode(false);
    newLog.id = "log";
    log.parentNode.replaceChild(newLog, log);
  }

  const historyEl = document.getElementById("history");
  if(historyEl && historyEl.parentNode){
    const newHistory = historyEl.cloneNode(false);
    newHistory.id = "history";
    historyEl.parentNode.replaceChild(newHistory, historyEl);
  }
}

function startGame(){
clearHistoryLog();
clearEnemyCallTimer();
  player = makeHand();
  enemy = makeHand();
  pScore = 0;
  eScore = 0;
  gameOver = false;
  callAvailable = false;
  turnNumber = 0;

  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("gameArea").classList.remove("hidden");
  document.getElementById("playerImg").src = CARD_IMAGES["裏"];
  document.getElementById("enemyImg").src = CARD_IMAGES["裏"];
  document.getElementById("playerName").innerText = "未選択";
  document.getElementById("enemyName").innerText = "未選択";
  document.getElementById("turnText").innerText = "0ターン目";
  document.getElementById("resultText").innerText = "カードを選んでください";
  document.getElementById("resultText").classList.remove("sokkoo-win-text", "sokkoo-lose-text");
  document.body.classList.remove("sokkoo-win-flash", "sokkoo-lose-flash", "game-over-view");
  const overlay = document.getElementById("sokkooOverlay");
  if(overlay) overlay.classList.remove("win", "lose");
  clearHistoryLog();
  resetCardClasses();
  clearBattleResultLabels();
  updateUI();
  playSound("start");
}

function setCardEmptyState(){
  const playerMap = {
    "短剣": player.短剣,
    "盾": player.盾,
    "心臓": player.心臓,
    "ソッコーダガー": player.ソッコーダガー || 0,
    "ソッコーハート": player.ソッコーハート || 0
  };

  const enemyMap = {
    "短剣": enemy.短剣,
    "盾": enemy.盾,
    "心臓": enemy.心臓,
    "ソッコーダガー": enemy.ソッコーダガー || 0,
    "ソッコーハート": enemy.ソッコーハート || 0
  };

  document.querySelectorAll(".controls .card-btn[data-card]").forEach(btn => {
    const card = btn.getAttribute("data-card");
    btn.classList.toggle("card-empty", (playerMap[card] || 0) === 0);
  });

  document.querySelectorAll(".panel.enemy .mini-card[data-card]").forEach(box => {
    const card = box.getAttribute("data-card");
    box.classList.toggle("card-empty", (enemyMap[card] || 0) === 0);
  });
}

function triggerSokkooEffect(kind){
  const body = document.body;
  const resultBox = document.getElementById("resultText");

  body.classList.remove("sokkoo-win-flash", "sokkoo-lose-flash");
  resultBox.classList.remove("sokkoo-win-text", "sokkoo-lose-text");

  void body.offsetWidth;

  const overlay = document.getElementById("sokkooOverlay");
  if(overlay){
    overlay.classList.remove("win", "lose");
    void overlay.offsetWidth;
  }

  if(kind === "win"){
    body.classList.add("sokkoo-win-flash");
    resultBox.classList.add("sokkoo-win-text");
    if(overlay) overlay.classList.add("win");
    playSound("sokkooWin");
    vibrate("sokkooWin");
  } else {
    body.classList.add("sokkoo-lose-flash");
    resultBox.classList.add("sokkoo-lose-text");
    if(overlay) overlay.classList.add("lose");
    playSound("sokkooLose");
    vibrate("sokkooLose");
  }
}


function forceMobileRemainCardFrameSize(){
  if(!window.matchMedia("(max-width: 767px)").matches) return;

  const targets = document.querySelectorAll(
    ".controls.normal-layout .card-btn, " +
    ".controls.sokkoo-layout .card-btn, " +
    ".panel.enemy:not(.sokkoo-enemy) .mini-card, " +
    ".panel.enemy.sokkoo-enemy .mini-card"
  );

  targets.forEach(el => {
    el.style.height = "88px";
    el.style.minHeight = "88px";
    el.style.maxHeight = "88px";
    el.style.boxSizing = "border-box";
    el.style.overflow = "hidden";
    el.style.display = "flex";
    el.style.flexDirection = "column";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.paddingTop = "6px";
    el.style.paddingBottom = "5px";
  });
}


function forceSmartphoneRemainIconSize(){}

function updateUI(){
  document.body.classList.toggle("game-over-view", gameOver);
  // 自分の残り枚数を下のカード選択ボタンに表示
  document.getElementById("cDagger").innerText = player.短剣;
  document.getElementById("cShield").innerText = player.盾;
  document.getElementById("cHeart").innerText = player.心臓;
  document.getElementById("cSD").innerText = player.ソッコーダガー || 0;
  document.getElementById("cSH").innerText = player.ソッコーハート || 0;

  // 上部の自分パネルは廃止済み。古いIDが存在する場合だけ更新。
  if(document.getElementById("pDagger")) document.getElementById("pDagger").innerText = player.短剣;
  if(document.getElementById("pShield")) document.getElementById("pShield").innerText = player.盾;
  if(document.getElementById("pHeart")) document.getElementById("pHeart").innerText = player.心臓;
  if(document.getElementById("pSokkooDagger")) document.getElementById("pSokkooDagger").innerText = player.ソッコーダガー || 0;
  if(document.getElementById("pSokkooHeart")) document.getElementById("pSokkooHeart").innerText = player.ソッコーハート || 0;
  if(document.getElementById("pSokkooDaggerBox")) document.getElementById("pSokkooDaggerBox").classList.toggle("hidden", !sokkooMode);
  if(document.getElementById("pSokkooHeartBox")) document.getElementById("pSokkooHeartBox").classList.toggle("hidden", !sokkooMode);
  document.getElementById("eDagger").innerText = enemy.短剣;
  document.getElementById("eShield").innerText = enemy.盾;
  document.getElementById("eHeart").innerText = enemy.心臓;
  document.getElementById("eSokkooDagger").innerText = enemy.ソッコーダガー || 0;
  document.getElementById("eSokkooHeart").innerText = enemy.ソッコーハート || 0;
  document.getElementById("eSokkooDaggerBox").classList.toggle("hidden", !sokkooMode);
  document.getElementById("eSokkooHeartBox").classList.toggle("hidden", !sokkooMode);
  document.querySelector(".panel.enemy").classList.toggle("sokkoo-enemy", sokkooMode);
  document.getElementById("turnText").innerText = turnNumber + "ターン目";
  document.getElementById("pScore").innerText = pScore;
  document.getElementById("eScore").innerText = eScore;

  document.getElementById("btnDagger").disabled = gameOver || player.短剣 === 0;
  document.getElementById("btnShield").disabled = gameOver || player.盾 === 0;
  document.getElementById("btnHeart").disabled = gameOver || player.心臓 === 0;
  document.getElementById("btnSokkooDagger").classList.toggle("hidden", !sokkooMode);
  document.getElementById("btnSokkooHeart").classList.toggle("hidden", !sokkooMode);
  document.getElementById("btnSokkooDagger").disabled = gameOver || !sokkooMode || (player.ソッコーダガー || 0) === 0;
  document.getElementById("btnSokkooHeart").disabled = gameOver || !sokkooMode || (player.ソッコーハート || 0) === 0;
  const controls = document.getElementById("controls");
  controls.classList.toggle("normal-layout", !sokkooMode);
  controls.classList.toggle("sokkoo-layout", sokkooMode);

  const callBtn = document.getElementById("callBtn");
  callBtn.disabled = gameOver;
  callBtn.classList.remove("call-ready", "call-hidden");
  setCardEmptyState();
  
  forceMobileRemainCardFrameSize();
}

function randomEnemy(){
  // 相手の残りカードを、実際の枚数ぶんだけ山札化して完全ランダムに1枚引く
  const deck = [];

  for(const card of Object.keys(enemy)){
    const count = enemy[card] || 0;
    for(let i = 0; i < count; i++){
      deck.push(card);
    }
  }

  if(deck.length === 0) return null;

  // Fisher-Yatesではなく、残り山札から1枚を等確率抽選
  const index = Math.floor(Math.random() * deck.length);
  return deck[index];
}

function play(card){
  if(gameOver || player[card] <= 0) return;

  // 同点確定状態でカードを出そうとした場合は、相手が先にコールした扱いにする
  if(isDrawLockedExactly()){
    enemyCall();
    return;
  }

  clearEnemyCallTimer();

  const enemyCard = randomEnemy();
  if(!enemyCard) return;

  player[card]--;
  enemy[enemyCard]--;

  turnNumber++;
  document.getElementById("turnText").innerText = turnNumber + "ターン目";

  showCards(card, enemyCard);
  judge(card, enemyCard);
  updateUI();

  if(gameOver) return;

  if(totalCards(player) === 0){
    endGame();
    return;
  }
  if(checkEarlyEnd()) return;
  checkHeartAndDaggerCall();
}

function showCards(pCard, eCard){
  resetCardClasses();
  const pImg = document.getElementById("playerImg");
  const eImg = document.getElementById("enemyImg");

  pImg.src = CARD_IMAGES[pCard];
  eImg.src = CARD_IMAGES[eCard];
  document.getElementById("playerName").innerText = cardLabel(pCard);
  document.getElementById("enemyName").innerText = cardLabel(eCard);

  void pImg.offsetWidth;
  void eImg.offsetWidth;
  pImg.classList.add("card-enter-player");
  eImg.classList.add("card-enter-enemy");
  playSound("card");
  vibrate("card");
}


function logBattle(pCard, eCard, result){
  log(`${turnNumber}ターン目　${pCard}　VS　${eCard}　→　${result}`);
}



function triggerSokkooShakeSafely(){
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const battle = document.querySelector(".battle");
  if(isMobile && battle){
    document.body.classList.remove("sokkoo-special-shake");
    battle.classList.remove("sokkoo-special-shake-local");
    void battle.offsetWidth;
    battle.classList.add("sokkoo-special-shake-local");
    setTimeout(() => battle.classList.remove("sokkoo-special-shake-local"), 500);
    return;
  }
  document.body.classList.remove("sokkoo-special-shake");
  void document.body.offsetWidth;
  document.body.classList.add("sokkoo-special-shake");
  setTimeout(() => document.body.classList.remove("sokkoo-special-shake"), 500);
}

function triggerSokkooFinishSpecial(kind){
  const overlay = document.getElementById("sokkooFinishOverlay");
  if(overlay){
    overlay.className = "sokkoo-finish-overlay";
    void overlay.offsetWidth;
    overlay.className = "sokkoo-finish-overlay show " + kind;
    setTimeout(() => {
      overlay.className = "sokkoo-finish-overlay";
    }, 950);
  }

  triggerSokkooShakeSafely();

  const p = document.getElementById("playerResultLabel");
  const e = document.getElementById("enemyResultLabel");
  if(p && e){
    p.classList.add("sokkoo-special");
    e.classList.add("sokkoo-special");
  }
}

function finishSokkoo(kind, pCard, eCard){
  gameOver = true;
  callAvailable = false;
  clearEnemyCallTimer();

  const result = kind === "win" ? "速攻勝利！" : "速攻敗北！";
  const resultText = document.getElementById("resultText");

  resultText.innerText = result;
  resultText.classList.remove("sokkoo-win-text", "sokkoo-lose-text");
  resultText.classList.add(kind === "win" ? "sokkoo-win-text" : "sokkoo-lose-text");

  document.getElementById("playerImg").classList.toggle("card-win", kind === "win");
  document.getElementById("playerImg").classList.toggle("card-lose", kind === "lose");
  document.getElementById("enemyImg").classList.toggle("card-win", kind === "lose");
  document.getElementById("enemyImg").classList.toggle("card-lose", kind === "win");

  triggerSokkooEffect(kind);
  showBattleResultLabels(kind);
  triggerSokkooFinishSpecial(kind);
  forceMobileRemainCardFrameSize();
  setCardEmptyState();
  logBattle(pCard, eCard, result);
  updateUI();
}

function judge(p, e){
  let result = "ポイントなし";

  // ソッコールール：専用演出つき
  if(p === "ソッコーダガー" && (e === "心臓" || e === "ソッコーハート")){
    finishSokkoo("win", p, e);
    return;
  }

  if(e === "ソッコーダガー" && (p === "心臓" || p === "ソッコーハート")){
    finishSokkoo("lose", p, e);
    return;
  }

  if(p === "ソッコーハート" && (e === "短剣" || e === "ソッコーダガー")){
    finishSokkoo("lose", p, e);
    return;
  }

  if(e === "ソッコーハート" && (p === "短剣" || p === "ソッコーダガー")){
    finishSokkoo("win", p, e);
    return;
  }

  if(p === "短剣" && e === "心臓"){
    pScore++;
    result = "あなたが1ポイント獲得！";
    document.getElementById("playerImg").classList.add("card-win");
    document.getElementById("enemyImg").classList.add("card-lose");
    playSound("win");
    vibrate("point");
  } else if(e === "短剣" && p === "心臓"){
    eScore++;
    result = "相手が1ポイント獲得！";
    document.getElementById("enemyImg").classList.add("card-win");
    document.getElementById("playerImg").classList.add("card-lose");
    playSound("lose");
    vibrate("point");
  } else {
    playSound("block");
    vibrate("block");
  }

  document.getElementById("resultText").classList.remove("sokkoo-win-text", "sokkoo-lose-text");
  document.getElementById("resultText").innerText = result;
  logBattle(p, e, result);
}

function getFutureOutcomes(){
  const memo = new Map();
  return searchFutureOutcomes(
    {...player},
    {...enemy},
    pScore - eScore,
    memo
  );
}

function checkEarlyEnd(){
  const outcomes = getFutureOutcomes();

  if(outcomes.size === 1 && outcomes.has("player")){
    gameOver = true;
    callAvailable = false;
    clearEnemyCallTimer();
    document.getElementById("resultText").innerText = "勝負あり！あなたの勝ち！";
    showBattleResultLabels("win");
    log("どんな順番で出しても最終的にあなたの勝ちです！");
    playSound("finalWin");
    vibrate("win");
    updateUI();
    return true;
  }

  if(outcomes.size === 1 && outcomes.has("enemy")){
    gameOver = true;
    callAvailable = false;
    clearEnemyCallTimer();
    document.getElementById("resultText").innerText = "勝負あり！あなたの負け！";
    showBattleResultLabels("lose");
    log("どんな順番で出しても最終的にあなたの負けです！");
    playSound("finalLose");
    vibrate("lose");
    updateUI();
    return true;
  }

  return false;
}

function checkHeartAndDaggerCall(){
  if(gameOver) return;
  callAvailable = isDrawLockedExactly();

  if(callAvailable){
    
    
    enemyCallTimer = setTimeout(() => {
      if(!gameOver && isDrawLockedExactly()) enemyCall();
    }, AI_CALL_DELAY);
  }
  updateUI();
}

function playerCall(){
  if(gameOver) return;
  clearEnemyCallTimer();

  if(isDrawLockedExactly()){
    gameOver = true;
    callAvailable = false;
    document.getElementById("resultText").innerText = "ハート＆ダガーコール！あなたの勝ち！";
    showBattleResultLabels("win");
    log("ハート＆ダガーコール！あなたの勝ち！");
    vibrate("call");
    playSound("finalWin");
    vibrate("win");
  } else {
    gameOver = true;
    callAvailable = false;
    document.getElementById("resultText").innerText = "誤コール！あなたの負け！";
    showBattleResultLabels("lose");
    log("誤コール！あなたの負け！");
    playSound("finalLose");
    vibrate("lose");
  }
  updateUI();
}

function enemyCall(){
  if(gameOver) return;
  gameOver = true;
  callAvailable = false;
  document.getElementById("resultText").innerText = "相手がハート＆ダガーコール！あなたの負け！";
  showBattleResultLabels("lose");
  log("相手がハート＆ダガーコール！あなたの負け！");
  vibrate("call");
  playSound("finalLose");
    vibrate("lose");
  updateUI();
}

function isDrawLockedExactly(){
  const outcomes = getFutureOutcomes();
  return outcomes.size === 1 && outcomes.has("draw");
}

function searchFutureOutcomes(pHand, eHand, scoreDiff, memo){
  const key = [
    pHand.短剣, pHand.盾, pHand.心臓, pHand.ソッコーダガー || 0, pHand.ソッコーハート || 0,
    eHand.短剣, eHand.盾, eHand.心臓, eHand.ソッコーダガー || 0, eHand.ソッコーハート || 0,
    scoreDiff
  ].join(",");

  if(memo.has(key)){
    return new Set(memo.get(key));
  }

  if(totalCards(pHand) === 0){
    let result;
    if(scoreDiff > 0) result = "player";
    else if(scoreDiff < 0) result = "enemy";
    else result = "draw";

    const finalSet = new Set([result]);
    memo.set(key, [...finalSet]);
    return finalSet;
  }

  const results = new Set();
  const pCards = availableCards(pHand);
  const eCards = availableCards(eHand);

  for(const pCard of pCards){
    for(const eCard of eCards){
      const nextP = {...pHand};
      const nextE = {...eHand};
      nextP[pCard]--;
      nextE[eCard]--;

      let nextDiff = scoreDiff;
      if(pCard === "ソッコーダガー" && (eCard === "心臓" || eCard === "ソッコーハート")){
        results.add("player");
        continue;
      }
      if(eCard === "ソッコーダガー" && (pCard === "心臓" || pCard === "ソッコーハート")){
        results.add("enemy");
        continue;
      }
      if(pCard === "ソッコーハート" && (eCard === "短剣" || eCard === "ソッコーダガー")){
        results.add("enemy");
        continue;
      }
      if(eCard === "ソッコーハート" && (pCard === "短剣" || pCard === "ソッコーダガー")){
        results.add("player");
        continue;
      }

      if(pCard === "短剣" && eCard === "心臓") nextDiff++;
      else if(eCard === "短剣" && pCard === "心臓") nextDiff--;

      const childResults = searchFutureOutcomes(nextP, nextE, nextDiff, memo);
      for(const r of childResults) results.add(r);

      if(results.size > 1){
        memo.set(key, [...results]);
        return results;
      }
    }
  }

  memo.set(key, [...results]);
  return results;
}

function availableCards(hand){
  const cards = [];
  if(hand.短剣 > 0) cards.push("短剣");
  if(hand.盾 > 0) cards.push("盾");
  if(hand.心臓 > 0) cards.push("心臓");
  if((hand.ソッコーダガー || 0) > 0) cards.push("ソッコーダガー");
  if((hand.ソッコーハート || 0) > 0) cards.push("ソッコーハート");
  return cards;
}

function endGame(){
  gameOver = true;
  callAvailable = false;
  clearEnemyCallTimer();

  let msg = "";
  if(pScore > eScore){
    msg = "ゲーム終了！あなたの勝ち！";
    showBattleResultLabels("win");
    playSound("finalWin");
    vibrate("win");
  } else if(pScore < eScore){
    msg = "ゲーム終了！相手の勝ち！";
    showBattleResultLabels("lose");
    playSound("finalLose");
    vibrate("lose");
  } else {
    // 引き分け終了は発生させない。最終的に同点になった場合も相手のコール扱い。
    enemyCall();
    return;
  }
  document.getElementById("resultText").innerText = msg;
  log("=== " + msg + " ===");
  updateUI();
}

function resetCardClasses(){
  clearBattleResultLabels();
  document.getElementById("playerImg").classList.remove("card-enter-player", "card-enter-enemy", "card-win", "card-lose");
  document.getElementById("enemyImg").classList.remove("card-enter-player", "card-enter-enemy", "card-win", "card-lose");
}

function clearEnemyCallTimer(){
  if(enemyCallTimer){
    clearTimeout(enemyCallTimer);
    enemyCallTimer = null;
  }
}

function totalCards(obj){ return obj.短剣 + obj.盾 + obj.心臓 + (obj.ソッコーダガー || 0) + (obj.ソッコーハート || 0); }

function log(
text){
  const logDiv = document.getElementById("log");
  logDiv.innerHTML += text + "<br>";
  logDiv.scrollTop = logDiv.scrollHeight;
}

function getAudioContext(){
  if(!audioCtx || audioCtx.state === "closed"){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function beep(freq, duration, type = "sine", volume = 0.18){
  const seVolumeBoost = 2.6;
  volume = Math.min(volume * seVolumeBoost, 0.42);

  try{
    const ctx = getAudioContext();

    if(ctx.state === "suspended"){
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch(e){
    // 復帰不能なAudioContextを破棄。次のタップで作り直す。
    audioCtx = null;
  }
}

function vibrate(type){
  if(!navigator.vibrate) return;

  if(type === "card"){
    navigator.vibrate(20);
  } else if(type === "point"){
    navigator.vibrate([35, 35, 35]);
  } else if(type === "win"){
    navigator.vibrate([60, 40, 100]);
  } else if(type === "lose"){
    navigator.vibrate([120, 50, 120]);
  } else if(type === "call"){
    navigator.vibrate([50, 30, 50, 30, 120]);
  } else if(type === "sokkooWin"){
    navigator.vibrate([45, 25, 45, 25, 160, 35, 220]);
  } else if(type === "sokkooLose"){
    navigator.vibrate([180, 45, 180, 45, 260]);
  } else if(type === "block"){
    navigator.vibrate(25);
  }
}

function playSound(type){
  if(type === "button"){
    beep(880, 0.035, "triangle", 0.075);
    return;
  }

  if(type === "start"){
    beep(660, 0.045, "triangle", 0.09);
    setTimeout(() => beep(990, 0.055, "triangle", 0.09), 55);
  }
  else if(type === "card"){
    beep(320, .05, "square", .04);
  } else if(type === "win"){
    beep(700, .08, "triangle", .08);
    setTimeout(() => beep(900, .10, "triangle", .08), 80);
  } else if(type === "lose"){
    beep(220, .16, "sawtooth", .06);
  } else if(type === "block"){
    beep(180, .08, "square", .05);
  } else if(type === "finalWin"){
    beep(523, .09, "triangle", .08);
    setTimeout(() => beep(659, .09, "triangle", .08), 100);
    setTimeout(() => beep(784, .18, "triangle", .08), 200);
  } else if(type === "finalLose"){
    beep(300, .12, "sawtooth", .06);
    setTimeout(() => beep(200, .20, "sawtooth", .06), 130);
  } else if(type === "draw"){
    beep(400, .10, "sine", .06);
    setTimeout(() => beep(400, .10, "sine", .06), 130);
  }
  else if(type === "sokkooWin"){
    beep(880, .07, "triangle", .10);
    setTimeout(() => beep(1175, .08, "triangle", .10), 85);
    setTimeout(() => beep(1568, .16, "triangle", .11), 180);
    setTimeout(() => beep(2093, .22, "triangle", .09), 350);
  }
  else if(type === "sokkooLose"){
    beep(180, .16, "sawtooth", .08);
    setTimeout(() => beep(130, .22, "sawtooth", .08), 150);
    setTimeout(() => beep(90, .34, "sawtooth", .075), 370);
  }
}


function resumeAudioIfNeeded(){
  if(!audioUnlocked) return;
  try{
    const ctx = getAudioContext();
    if(ctx.state === "suspended"){
      ctx.resume();
    }
  } catch(e){
    audioCtx = null;
  }
}

// iPhone/Safari対策：ページ復帰後の最初の操作で音を復帰
document.addEventListener("visibilitychange", () => {
  if(!document.hidden){
    resumeAudioIfNeeded();
  }
});

window.addEventListener("pageshow", () => {
  resumeAudioIfNeeded();
});

window.addEventListener("focus", () => {
  resumeAudioIfNeeded();
});

function openRules(){
  document.getElementById("rulesModal").classList.remove("hidden");
}

function closeRules(){
  document.getElementById("rulesModal").classList.add("hidden");
}


window.addEventListener("resize", forceMobileRemainCardFrameSize);
window.addEventListener("load", forceMobileRemainCardFrameSize);
setTimeout(forceMobileRemainCardFrameSize, 100);








let bgmEnabled = false;

function getBgmAudio(){
  const audio = document.getElementById("bgm");
  if(audio){
    audio.volume = 0.18;
    audio.loop = true;
  }
  return audio;
}

function updateBgmButtons(){}

function ensureBattleBgm(forceUnlock){
  try{
    const audio = getBgmAudio();
    if(!audio) return;

    bgmEnabled = true;
    const p = audio.play();
    if(p && p.catch){
      p.catch(()=>{});
    }
  }catch(e){}
}

function startBgm(){
  /* disabled: parent page owns Free Battle BGM */
}

function stopBgm(){
  const audio = document.getElementById("bgm");
  if(audio){
    audio.pause();
    try{audio.currentTime=0;}catch(e){}
  }
}

function toggleBgm(){
  /* disabled: parent page owns Free Battle BGM */
}



(function(){
  
function setupBackButton(){
    const btn = document.getElementById('hdBackTitleBtn');
    if(!btn || btn.dataset.ready === '1') return;
    btn.dataset.ready = '1';
    btn.addEventListener('click', function(ev){
      ev.preventDefault();
      buttonTap();

      setTimeout(function(){
        try{
          if(parent && parent !== window && typeof parent.returnFromFreeBattle === 'function'){
            parent.returnFromFreeBattle();
            return;
          }
        }catch(e){}
        location.href = './index.html';
      }, 170);
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupBackButton);
  else setupBackButton();
})();
