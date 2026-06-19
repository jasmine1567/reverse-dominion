/* ===== battle.js : バトル進行・描画・CPU AI・演出 ===== */
(function () {
  const SIZE = 4;
  let S = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- 描画 ---------- */
  function boardCardHTML(cell) {
    const c = cell.card;
    return (
      `<div class="bcard ${cell.owner}">` +
      UI.marksHTML(c.marks, "bcard-marks") +
      UI.artHTML(c, "bart") +
      `<div class="bname">${c.name}</div>` +
      `<div class="bstat">⚔${Data.effAtk(c)} 🛡${Data.effDef(c)}</div>` +
      `</div>`
    );
  }

  function renderBoard() {
    const board = document.getElementById("board");
    board.innerHTML = "";
    const playable = S.turn === "ally" && !S.animating && S.selectedHandIdx != null && Engine.canPlace(S.state, "ally");
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const cell = S.state.cells[r][c];
      const el = document.createElement("div");
      el.className = "cell"; el.dataset.r = r; el.dataset.c = c;
      if (cell && cell.block) el.classList.add("block");
      else if (cell) el.innerHTML = boardCardHTML(cell);
      else if (playable) { el.classList.add("playable"); el.onclick = () => playerPlace(r, c); }
      board.appendChild(el);
    }
    const sc = Engine.score(S.state);
    document.getElementById("allyScore").textContent = sc.ally;
    document.getElementById("enemyScore").textContent = sc.enemy;
    const pill = document.getElementById("turnPill");
    pill.textContent = S.animating ? "戦闘中…" : (S.turn === "ally" ? "あなたのターン" : "CPUのターン");
    pill.className = "turn-pill " + (S.turn === "ally" ? "you" : "cpu");
  }

  function cellEl(rc) { return document.querySelector(`#board .cell[data-r='${rc.r}'][data-c='${rc.c}']`); }
  function bcardEl(rc) { const e = cellEl(rc); return e ? e.querySelector(".bcard") : null; }

  function renderHand() {
    const hand = document.getElementById("hand");
    hand.innerHTML = "";
    S.hand.forEach((h, i) => {
      const el = document.createElement("div");
      el.className = "hcard" + (h.used ? " used" : "") + (S.selectedHandIdx === i ? " active" : "");
      el.innerHTML = UI.cardHTML(h.card, { mini: true });
      if (!h.used && S.turn === "ally" && !S.animating && Engine.canPlace(S.state, "ally")) {
        el.onclick = () => { S.selectedHandIdx = i; renderHand(); renderBoard(); updateInstruct(); };
      }
      hand.appendChild(el);
    });
  }

  function updateInstruct() {
    const t = document.getElementById("battleInstruct");
    if (S.animating) { t.textContent = "戦闘解決中…"; return; }
    if (S.turn !== "ally") { t.textContent = "CPUが思考中…"; return; }
    if (!Engine.canPlace(S.state, "ally")) { t.textContent = "あなたの設置は完了。CPUの番です"; return; }
    t.textContent = S.selectedHandIdx == null ? "手札からカードを選んでください" : "点滅マスをタップして設置";
  }

  function log(entries) {
    const box = document.getElementById("battleLog");
    entries.forEach((e) => {
      const div = document.createElement("div");
      div.className = ["win", "chain", "counter"].includes(e.t) ? "hl" : "";
      div.textContent = "› " + e.msg;
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  }

  /* ---------- エフェクト ---------- */
  function clashLayer() {
    let layer = document.querySelector(".board-wrap .clash-layer");
    if (!layer) { layer = document.createElement("div"); layer.className = "clash-layer"; document.querySelector(".board-wrap").appendChild(layer); }
    return layer;
  }

  async function showRoll(clash) {
    const layer = clashLayer();
    const el = document.createElement("div");
    el.className = "roll-fx";
    el.innerHTML =
      `<div class="roll-label">${clash.label}</div>` +
      `<div class="roll-wheel"><span class="roll-spin">🎯</span></div>` +
      `<div class="roll-chance">発動率 ${clash.chance}%</div>` +
      `<div class="roll-result"></div>`;
    layer.appendChild(el);
    const aEl = bcardEl(clash.aRC), dEl = bcardEl(clash.dRC);
    if (aEl) aEl.classList.add("fx-attacker");
    if (dEl) dEl.classList.add("fx-roll-target");
    await wait(680); // 抽選中
    const res = el.querySelector(".roll-result");
    el.classList.add(clash.success ? "hit" : "miss");
    res.textContent = clash.success ? "成功！" : "失敗…";
    if (clash.success) { if (dEl) { dEl.classList.add("fx-win"); } cellEl(clash.dRC)?.classList.add("fx-win-glow"); }
    await wait(620);
    el.classList.add("out");
    await wait(240);
    el.remove();
    aEl && aEl.classList.remove("fx-attacker");
    dEl && dEl.classList.remove("fx-roll-target");
  }

  async function showClash(clash) {
    if (clash.type === "roll") return showRoll(clash);
    const layer = clashLayer();
    const win = clash.win;
    const verdict = clash.type === "counter"
      ? (win ? "反撃成功・寝返り！" : "反撃を耐えた")
      : (clash.guarded ? "GUARD!" : (win ? "撃破・味方化！" : "BLOCK!"));
    const cls = clash.type === "counter" ? (win ? "win counter" : "lose") : (win ? "win" : "lose");
    const atkLoser = !win ? "" : ""; // attacker never the visual loser when win
    const el = document.createElement("div");
    el.className = "clash " + cls;
    el.innerHTML =
      `<div class="side atk ${win ? "" : "loser"}"><div class="who">⚔ 攻 ${clash.aArt} ${clash.aName}</div><div class="num">${clash.atk}</div></div>` +
      `<div class="vs">VS</div>` +
      `<div class="side def ${win ? "loser" : ""}"><div class="who">🛡 防 ${clash.dArt} ${clash.dName}</div><div class="num">${clash.def}</div></div>` +
      `<div class="verdict">${verdict}</div>`;
    layer.appendChild(el);

    const aEl = bcardEl(clash.aRC), dEl = bcardEl(clash.dRC);
    if (aEl) aEl.classList.add("fx-attacker");
    if (dEl) dEl.classList.add("fx-hit");
    await wait(520);
    if (win && clash.type === "attack" && dEl) { dEl.classList.add("fx-win"); cellEl(clash.dRC)?.classList.add("fx-win-glow"); }
    else if (clash.type === "counter" && win) { cellEl(clash.dRC)?.classList.add("fx-counter-glow"); }
    else { dEl && dEl.classList.add("fx-block"); cellEl(clash.dRC)?.classList.add("fx-block-glow"); }
    await wait(420);
    el.classList.add("out");
    await wait(260);
    el.remove();
    aEl && aEl.classList.remove("fx-attacker");
  }

  async function animateClashes(res, placedAt) {
    S.animating = true;
    renderBoard();
    const pe = cellEl(placedAt); if (pe) { const bc = pe.querySelector(".bcard"); bc && bc.classList.add("fx-place"); }
    if (res.enterBuff && pe) pe.classList.add("fx-enter-glow");
    await wait(380);
    for (const clash of res.clashes) await showClash(clash);
    S.animating = false;
    renderBoard();
  }

  async function showVictory() {
    const layer = document.createElement("div");
    layer.className = "victory-layer show";
    layer.innerHTML = `<div class="victory-rays"></div><div class="victory-banner">VICTORY</div>`;
    document.body.appendChild(layer);
    const colors = ["#e8c15a", "#46d4d8", "#ff5d73", "#5bd08a", "#b06ff0", "#fff"];
    for (let i = 0; i < 80; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[(Math.random() * colors.length) | 0];
      c.style.animationDuration = (1 + Math.random() * 1.4) + "s";
      c.style.animationDelay = (Math.random() * 0.4) + "s";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 2600);
    }
    await wait(1500);
    layer.remove();
  }

  /* ---------- 進行 ---------- */
  async function placeAlly(i, r, c) {
    clearTimer();
    const h = S.hand[i];
    if (!h || h.used) return;
    S.selectedHandIdx = null;
    const logs = [];
    const res = Engine.place(S.state, r, c, "ally", h.card, logs);
    h.used = true;
    res.converted.forEach((cv) => S.converted.push(cv));
    renderHand();
    log(logs);
    await animateClashes(res, { r, c });
    renderHand();
    afterMove("ally");
  }

  async function playerPlace(r, c) {
    if (S.turn !== "ally" || S.animating || S.selectedHandIdx == null) return;
    await placeAlly(S.selectedHandIdx, r, c);
  }

  function bestAllyMove() {
    const free = Engine.freeCells(S.state);
    let best = null;
    S.hand.forEach((h, i) => {
      if (h.used) return;
      free.forEach(({ r, c }) => {
        const clone = Engine.clone(S.state);
        Engine.place(clone, r, c, "ally", h.card, []);
        const sc = Engine.score(clone);
        const v = sc.ally - sc.enemy;
        if (!best || v > best.value) best = { i, r, c, value: v };
      });
    });
    return best;
  }

  async function autoPlace() {
    if (!S || S.turn !== "ally" || S.animating || S._ended) return;
    if (!Engine.canPlace(S.state, "ally")) { afterMove("ally"); return; }
    const m = bestAllyMove();
    if (!m) { afterMove("ally"); return; }
    S.selectedHandIdx = m.i; renderHand(); renderBoard();
    await new Promise((res) => setTimeout(res, 280));
    await placeAlly(m.i, m.r, m.c);
  }

  /* ---------- 30秒タイマー / 自動操作 ---------- */
  function clearTimer() {
    if (S && S.timerId) { clearInterval(S.timerId); S.timerId = null; }
    const wrap = document.getElementById("turnTimer");
    if (wrap) wrap.classList.remove("show", "auto", "urgent");
  }
  function startTimer() {
    clearTimer();
    if (!S || S.turn !== "ally" || S.animating || S._ended) return;
    if (!Engine.canPlace(S.state, "ally")) return;
    const wrap = document.getElementById("turnTimer");
    const fill = document.getElementById("turnTimerFill");
    const num = document.getElementById("turnTimerNum");
    if (S.auto) {
      if (wrap) wrap.classList.add("show", "auto");
      if (num) num.textContent = "AUTO";
      setTimeout(() => { if (S && S.auto) autoPlace(); }, 600);
      return;
    }
    S.remain = 30;
    if (wrap) wrap.classList.add("show");
    const upd = () => { if (fill) fill.style.width = (S.remain / 30 * 100) + "%"; if (num) num.textContent = S.remain; if (wrap) wrap.classList.toggle("urgent", S.remain <= 5); };
    upd();
    S.timerId = setInterval(() => {
      S.remain--; upd();
      if (S.remain <= 0) { clearTimer(); UI.toast("時間切れ：自動で設置します"); autoPlace(); }
    }, 1000);
  }
  function toggleAuto() {
    S.auto = !S.auto;
    const b = document.getElementById("autoBtn");
    if (b) { b.textContent = "自動操作：" + (S.auto ? "ON" : "OFF"); b.classList.toggle("primary", S.auto); }
    if (S.turn === "ally" && !S.animating && !S._ended) startTimer();
  }
  function setupAutoButton() {
    const b = document.getElementById("autoBtn");
    if (!b) return;
    if (Store.autoUnlocked()) {
      b.style.display = ""; b.textContent = "自動操作：" + (S.auto ? "ON" : "OFF");
      b.classList.toggle("primary", !!S.auto); b.onclick = toggleAuto;
    } else { b.style.display = "none"; }
  }

  async function cpuMove() {
    if (Engine.isOver(S.state)) return endStage();
    const free = Engine.freeCells(S.state);
    const choices = [];
    S.cpuHand.forEach((h, i) => {
      if (h.used) return;
      free.forEach(({ r, c }) => {
        const clone = Engine.clone(S.state);
        Engine.place(clone, r, c, "enemy", h.card, []);
        const sc = Engine.score(clone);
        choices.push({ i, r, c, value: sc.enemy - sc.ally });
      });
    });
    if (choices.length === 0) return endStage();
    choices.sort((a, b) => b.value - a.value);
    const skill = 0.45 + S.dungeon.level * 0.11;
    const pick = Math.random() < skill ? choices[0] : choices[Math.floor(Math.random() * Math.min(4, choices.length))];
    const h = S.cpuHand[pick.i];
    const logs = [];
    const res = Engine.place(S.state, pick.r, pick.c, "enemy", h.card, logs);
    h.used = true;
    log(logs);
    await animateClashes(res, { r: pick.r, c: pick.c });
    afterMove("enemy");
  }

  function afterMove(mover) {
    clearTimer();
    updateInstruct();
    if (Engine.isOver(S.state)) { setTimeout(endStage, 500); return; }
    let next = mover === "ally" ? "enemy" : "ally";
    if (!Engine.canPlace(S.state, next)) next = next === "ally" ? "enemy" : "ally";
    S.turn = next;
    renderHand(); renderBoard(); updateInstruct();
    if (next === "enemy") setTimeout(cpuMove, 500);
    else setTimeout(startTimer, 200);
  }

  async function endStage() {
    if (S._ended) return; S._ended = true;
    clearTimer();
    const sc = Engine.score(S.state);
    const win = sc.ally > sc.enemy;
    if (!win) {
      UI.modal({
        title: sc.ally === sc.enemy ? "引き分け…" : "敗北…",
        body: `<p>スコア あなた ${sc.ally} - ${sc.enemy} CPU</p><p class="muted">ダンジョンから追い出されました。</p>`,
        actions: [{ label: "ダンジョンへ戻る", primary: true, onClick: () => { UI.closeModal(); UI.show("dungeon"); } }],
      });
      return;
    }
    const d = S.dungeon, stage = S.stage;
    const meta = S.meta || {};
    const coins = Math.round((d.level * 30 + stage * 12) * (1 + (meta.coinPct || 0) / 100));
    let diamonds = 0;
    Store.addCoins(coins);
    if (stage === 5) { diamonds = d.level * 3; Store.addDiamonds(diamonds); }
    // 経験値アイテムのドロップ（リーダーのドロップUPで確率上昇）
    const items = [];
    const dropChance = Math.min(0.95, 0.5 * (1 + (meta.dropPct || 0) / 100));
    if (stage === 5) {
      const big = d.level >= 4 ? "orb_l" : "orb_m";
      Store.addItem(big, 1); items.push(big);
    } else if (Math.random() < dropChance) {
      const it = Math.random() < 0.2 ? "orb_m" : "orb_s";
      Store.addItem(it, 1); items.push(it);
    }
    Store.setDungeonProg(d.id, stage, stage === 5);
    Store.state.stats.battles++; Store.state.stats.wins++; Store.save();
    if (window.Quest) { Quest.bump("win"); if (stage === 5) Quest.bump("boss"); }

    await showVictory();

    // 報酬カードは「敵が保有し、ゲーム中に味方化した敵カード」のみ
    const pool = uniqueById(S.converted);
    showReward(sc, coins, diamonds, items, pool, stage === 5);
  }

  function uniqueById(arr) {
    const seen = new Set(), out = [];
    arr.forEach((c) => { if (!seen.has(c.id)) { seen.add(c.id); out.push(c); } });
    return out;
  }

  function showReward(sc, coins, diamonds, items, pool, isBoss) {
    const itemTxt = items.length ? items.map((i) => { const it = Data.itemById(i); return `${it.art}${it.name}`; }).join("・") : "";
    const proceed = () => { if (isBoss) { UI.toast("ダンジョン制覇！"); UI.show("dungeon"); } else nextStage(); };
    if (pool.length === 0) {
      UI.modal({
        title: isBoss ? "🏆 ダンジョン制覇！" : `ステージ ${S.stage} クリア！`,
        body:
          `<p>スコア あなた ${sc.ally} - ${sc.enemy} CPU</p>` +
          `<p>獲得：🪙${coins}${diamonds ? ` / 💎${diamonds}` : ""}${itemTxt ? ` / ${itemTxt}` : ""}</p>` +
          `<p class="muted">今回は敵カードを味方化できなかったため、カード報酬はありません。<br>敵の攻撃マークを攻撃で上書きして味方化すると、そのカードを入手できます。</p>`,
        noClose: true,
        actions: [{ label: isBoss ? "ダンジョンへ" : "次のステージへ", primary: true, onClick: () => { UI.closeModal(); proceed(); } }],
      });
      return;
    }
    const cardsHTML = pool.map((c, idx) => {
      const marks = (c.marks && c.marks.length) ? c.marks : Data.byId[c.id].marks;
      const card = Store.materialize({ id: c.id, level: 1, marks, extraSkills: [] });
      return UI.cardHTML(card, { selectable: true, data: `data-pick="${idx}"` });
    }).join("");
    UI.modal({
      title: isBoss ? "🏆 ダンジョン制覇！" : `ステージ ${S.stage} クリア！`,
      body:
        `<p>スコア あなた ${sc.ally} - ${sc.enemy} CPU</p>` +
        `<p>獲得：🪙${coins}${diamonds ? ` / 💎${diamonds}` : ""}${itemTxt ? ` / ${itemTxt}` : ""}</p>` +
        `<p class="muted">味方化した敵カードから1枚を選んで入手（表示どおりの攻撃マーク・ステータスで入手できます）：</p>` +
        `<div class="reveal-grid">${cardsHTML}</div>`,
      noClose: true, actions: [],
    });
    document.querySelectorAll("[data-pick]").forEach((el) => {
      el.onclick = () => {
        const c = pool[+el.dataset.pick];
        const marks = (c.marks && c.marks.length) ? c.marks : Data.byId[c.id].marks;
        Store.addCard(c.id, { marks: marks.slice() });
        UI.closeModal(); UI.refreshWallet(); proceed();
      };
    });
  }

  function nextStage() { S.stage++; startStage(); }

  function startStage() {
    const d = S.dungeon, stage = S.stage;
    const m = S.meta || {};
    const blocks = World.blockCells(SIZE);
    S.state = Engine.createBoard(SIZE, blocks);
    S.hand = Store.deckCards().map((base) => {
      const card = { ...base };
      if (m.atkPct) card.baseAtk = Math.round(card.baseAtk * (1 + m.atkPct / 100));
      if (m.defPct) card.baseDef = Math.round(card.baseDef * (1 + m.defPct / 100));
      return { card, used: false };
    });
    const cpuDeck = World.enemyDeck(d, stage);
    S.cpuHand = cpuDeck.map((card) => ({ card, used: false }));
    S.cpuDeckBase = cpuDeck;
    S.converted = []; S.selectedHandIdx = null; S.animating = false; S._ended = false;
    // 後攻になる確率（リーダースキル）
    const goSecond = (m.second || 0) > 0 && Math.random() * 100 < m.second;
    S.turn = goSecond ? "enemy" : "ally";

    document.getElementById("battleTitle").textContent = `${d.name} — ステージ ${stage}/5${stage === 5 ? "（ボス）" : ""}`;
    const lead = S.leader ? `　👑${S.leader.name}` : "";
    const lsTxt = S.leaderSkillText ? `　${S.leaderSkillText}` : "";
    document.getElementById("battleSub").textContent = `Lv.${d.level}　ブロック ${blocks.length}個　先手：${goSecond ? "CPU" : "あなた"}${lead}${lsTxt}`;
    document.getElementById("battleLog").innerHTML = "";
    UI.show("battle");
    setupAutoButton();
    renderBoard(); renderHand(); updateInstruct();
    if (window.Quest) Quest.bump("battle");
    if (S.turn === "enemy") setTimeout(cpuMove, 700);
    else setTimeout(startTimer, 400);
  }

  function computeLeaderMeta() {
    const leader = Store.leaderCard();
    S.leader = leader || null;
    const meta = { atkPct: 0, defPct: 0, second: 0, coinPct: 0, dropPct: 0 };
    S.leaderSkillText = "";
    if (leader && leader.leaderSkill) {
      const ls = leader.leaderSkill, v = Data.leaderVal(ls, ls.level);
      if (ls.kind === "atk") meta.atkPct = v;
      else if (ls.kind === "def") meta.defPct = v;
      else if (ls.kind === "all") { meta.atkPct = v; meta.defPct = v; }
      else if (ls.kind === "second") meta.second = v;
      else if (ls.kind === "coin") meta.coinPct = v;
      else if (ls.kind === "drop") meta.dropPct = v;
      S.leaderSkillText = `${ls.name}(${Data.leaderDesc(ls, ls.level)})`;
    }
    S.meta = meta;
  }

  const Battle = {
    startDungeon(dungeonId) {
      const d = World.DUNGEONS.find((x) => x.id === dungeonId);
      if (Store.deckCards().length < 5) { UI.toast("デッキを5枚以上編成してください"); UI.show("deck"); return; }
      S = { dungeon: d, stage: 1, auto: false };
      computeLeaderMeta();
      startStage();
    },
    quit() {
      UI.modal({
        title: "リタイアしますか？",
        body: '<p class="muted">この挑戦の進捗は失われます。</p>',
        actions: [
          { label: "続ける", onClick: () => UI.closeModal() },
          { label: "リタイア", danger: true, onClick: () => { clearTimer(); UI.closeModal(); UI.show("dungeon"); } },
        ],
      });
    },
    stopTimers() { clearTimer(); },
  };

  window.Battle = Battle;
})();
