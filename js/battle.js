/* ===== battle.js : バトル進行・描画・CPU AI ===== */
(function () {
  const SIZE = 4;
  let S = null; // セッション

  function dirMarksHTML(marks) {
    return '<div class="marks">' + marks.map((d) => `<i class="mk-${d}"></i>`).join("") + "</div>";
  }

  function boardCardHTML(cell) {
    const c = cell.card;
    return (
      `<div class="bcard ${cell.owner}" data-uid="${c.uid}">` +
      dirMarksHTML(c.marks) +
      `<div class="bart">${c.art}</div>` +
      `<div class="bname">${c.name}</div>` +
      `<div class="bstat">⚔${Data.effAtk(c)} 🛡${Data.effDef(c)}</div>` +
      `</div>`
    );
  }

  function renderBoard(changed) {
    const board = document.getElementById("board");
    board.innerHTML = "";
    const playable = S.turn === "ally" && S.selectedHandIdx != null && Engine.canPlace(S.state, "ally");
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = S.state.cells[r][c];
        const el = document.createElement("div");
        el.className = "cell";
        if (cell && cell.block) el.classList.add("block");
        else if (cell) {
          el.innerHTML = boardCardHTML(cell);
          if (changed && changed.some((x) => x.r === r && x.c === c)) {
            const bc = el.querySelector(".bcard");
            bc.classList.add(changed.find((x) => x.r === r && x.c === c).type || "flip");
          }
        } else if (playable) {
          el.classList.add("playable");
          el.onclick = () => playerPlace(r, c);
        }
        board.appendChild(el);
      }
    }
    const sc = Engine.score(S.state);
    document.getElementById("allyScore").textContent = sc.ally;
    document.getElementById("enemyScore").textContent = sc.enemy;
    const pill = document.getElementById("turnPill");
    pill.textContent = S.turn === "ally" ? "あなたのターン" : "CPUのターン";
    pill.className = "turn-pill " + (S.turn === "ally" ? "you" : "cpu");
  }

  function renderHand() {
    const hand = document.getElementById("hand");
    hand.innerHTML = "";
    S.hand.forEach((h, i) => {
      const c = h.card;
      const el = document.createElement("div");
      el.className = "card hcard" + (h.used ? " used" : "") + (S.selectedHandIdx === i ? " active" : "");
      el.dataset.rarity = c.rarity;
      el.innerHTML =
        `<div class="rar">${c.rarity}</div>` +
        `<div class="art" style="font-size:24px;margin-top:12px">${c.art}</div>` +
        `<div class="nm" style="min-height:auto;font-size:11px">${c.name}</div>` +
        `<div class="stat"><span class="a">⚔${Data.effAtk(c)}</span><span class="d">🛡${Data.effDef(c)}</span></div>`;
      if (!h.used && S.turn === "ally" && Engine.canPlace(S.state, "ally")) {
        el.onclick = () => { S.selectedHandIdx = i; renderHand(); renderBoard(); updateInstruct(); };
      }
      hand.appendChild(el);
    });
  }

  function updateInstruct() {
    const t = document.getElementById("battleInstruct");
    if (S.turn !== "ally") { t.textContent = "CPUが思考中…"; return; }
    if (!Engine.canPlace(S.state, "ally")) { t.textContent = "あなたの設置は完了。CPUの番です"; return; }
    t.textContent = S.selectedHandIdx == null ? "手札からカードを選んでください" : "点滅マスをタップして設置";
  }

  function log(entries) {
    const box = document.getElementById("battleLog");
    entries.forEach((e) => {
      const div = document.createElement("div");
      const cls = ["win", "chain", "counter"].includes(e.t) ? "hl" : "";
      div.className = cls;
      div.textContent = "› " + e.msg;
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  }

  function changedFrom(result) {
    const ch = [];
    result.flips.forEach((p) => ch.push({ ...p, type: "flip" }));
    result.chainFlips.forEach((p) => ch.push({ ...p, type: "flip" }));
    result.blocked.forEach((p) => ch.push({ ...p, type: "blocked" }));
    if (result.counterFlip) ch.push({ ...result.counterFlip, type: "flip" });
    return ch;
  }

  function playerPlace(r, c) {
    if (S.turn !== "ally" || S.selectedHandIdx == null) return;
    const h = S.hand[S.selectedHandIdx];
    if (h.used) return;
    const logs = [];
    const res = Engine.place(S.state, r, c, "ally", h.card, logs);
    h.used = true;
    S.selectedHandIdx = null;
    res.converted.forEach((cv) => S.converted.push(cv)); // 味方化した敵カード
    renderBoard(changedFrom(res));
    renderHand();
    log(logs);
    afterMove("ally");
  }

  function cpuMove() {
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
    // レベルが低いほど雑な手を選ぶ
    const skill = 0.45 + S.dungeon.level * 0.11;
    const pick = Math.random() < skill ? choices[0] : choices[Math.floor(Math.random() * Math.min(4, choices.length))];

    const h = S.cpuHand[pick.i];
    const logs = [];
    const res = Engine.place(S.state, pick.r, pick.c, "enemy", h.card, logs);
    h.used = true;
    renderBoard(changedFrom(res));
    log(logs);
    afterMove("enemy");
  }

  function afterMove(mover) {
    updateInstruct();
    if (Engine.isOver(S.state)) { setTimeout(endStage, 700); return; }
    let next = mover === "ally" ? "enemy" : "ally";
    if (!Engine.canPlace(S.state, next)) next = next === "ally" ? "enemy" : "ally";
    S.turn = next;
    renderHand();
    if (next === "enemy") {
      setTimeout(cpuMove, 650);
    } else {
      renderBoard(); updateInstruct();
    }
  }

  function endStage() {
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
    // 勝利報酬
    const d = S.dungeon, stage = S.stage;
    const coins = d.level * 30 + stage * 12;
    let diamonds = 0;
    Store.addCoins(coins);
    if (stage === 5) { diamonds = d.level * 3; Store.addDiamonds(diamonds); }
    Store.setDungeonProg(d.id, stage, stage === 5);
    Store.state.stats.battles++; Store.state.stats.wins++; Store.save();

    // 味方化したカードから1枚選んで入手
    let pool = uniqueById(S.converted);
    if (pool.length === 0) pool = S.cpuDeckBase.map((c) => ({ id: c.id, name: c.name }));
    showReward(sc, coins, diamonds, pool, stage === 5);
  }

  function uniqueById(arr) {
    const seen = new Set(); const out = [];
    arr.forEach((c) => { if (!seen.has(c.id)) { seen.add(c.id); out.push(c); } });
    return out;
  }

  function showReward(sc, coins, diamonds, pool, isBoss) {
    const cardsHTML = pool.map((c) => {
      const base = Data.byId[c.id];
      return `<div class="card selectable" data-rarity="${base.rarity}" data-pick="${c.id}" style="width:120px">
        <div class="rar">${base.rarity}</div>
        <div class="art" style="font-size:30px;margin-top:14px">${base.art}</div>
        <div class="nm" style="font-size:12px">${base.name}</div>
        <div class="stat"><span class="a">⚔${base.baseAtk}</span><span class="d">🛡${base.baseDef}</span></div>
      </div>`;
    }).join("");
    UI.modal({
      title: isBoss ? "🏆 ダンジョン制覇！" : `ステージ ${S.stage} クリア！`,
      body:
        `<p>スコア あなた ${sc.ally} - ${sc.enemy} CPU</p>` +
        `<p>獲得：🪙${coins}${diamonds ? ` / 💎${diamonds}` : ""}</p>` +
        `<p class="muted">味方にしたカードから1枚選んで入手：</p>` +
        `<div class="reveal-grid">${cardsHTML}</div>`,
      actions: [],
      noClose: true,
    });
    document.querySelectorAll("[data-pick]").forEach((el) => {
      el.onclick = () => {
        const id = el.dataset.pick;
        Store.addCard(id);
        UI.closeModal();
        UI.refreshWallet();
        if (isBoss) { UI.toast("ダンジョン制覇！カードを入手"); UI.show("dungeon"); }
        else nextStage();
      };
    });
  }

  function nextStage() {
    S.stage++;
    startStage();
  }

  function startStage() {
    const d = S.dungeon, stage = S.stage;
    const blocks = World.blockCells(SIZE);
    const state = Engine.createBoard(SIZE, blocks);
    const deck = Store.deckCards();
    const cpuDeck = World.enemyDeck(d, stage);
    S.state = state;
    S.hand = deck.map((card) => ({ card, used: false }));
    S.cpuHand = cpuDeck.map((card) => ({ card, used: false }));
    S.cpuDeckBase = cpuDeck;
    S.converted = [];
    S.selectedHandIdx = null;
    S.turn = "ally";

    document.getElementById("battleTitle").textContent = `${d.name} — ステージ ${stage}/5${stage === 5 ? "（ボス）" : ""}`;
    document.getElementById("battleSub").textContent = `Lv.${d.level}　ブロック ${blocks.length}個　先手：あなた`;
    document.getElementById("battleLog").innerHTML = "";
    UI.show("battle");
    renderBoard(); renderHand(); updateInstruct();
  }

  const Battle = {
    startDungeon(dungeonId) {
      const d = World.DUNGEONS.find((x) => x.id === dungeonId);
      const deck = Store.deckCards();
      if (deck.length < 5) { UI.toast("デッキを5枚以上編成してください"); UI.show("deck"); return; }
      S = { dungeon: d, stage: 1 };
      startStage();
    },
    quit() {
      UI.modal({
        title: "リタイアしますか？",
        body: '<p class="muted">この挑戦の進捗は失われます。</p>',
        actions: [
          { label: "続ける", onClick: () => UI.closeModal() },
          { label: "リタイア", danger: true, onClick: () => { UI.closeModal(); UI.show("dungeon"); } },
        ],
      });
    },
  };

  window.Battle = Battle;
})();
