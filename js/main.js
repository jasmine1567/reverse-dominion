/* ===== main.js : 初期化とイベント配線 ===== */
(function () {
  const $ = (id) => document.getElementById(id);

  function validateName(name) {
    const n = (name || "").trim();
    if (n.length < 1) return "名前を入力してください";
    if (n.length > 16) return "16文字以内で入力してください";
    if (Store.nameTaken(n)) return "その名前は既に使われています";
    return null;
  }

  function openRegistration() {
    UI.modal({
      title: "Re:Verse Dominion へようこそ",
      body: `
        <p class="muted">プレイヤー名を登録してください（重複不可・後から変更可能）。</p>
        <input type="text" id="regName" placeholder="プレイヤー名" maxlength="16" style="width:100%;margin-top:8px" />
        <p class="muted" style="margin-top:10px">初回特典として、コイン・ダイヤとスターターカードを進呈します。</p>`,
      noClose: true,
      actions: [{ label: "登録して開始", primary: true, onClick: () => {
        const name = $("regName").value, err = validateName(name);
        if (err) { UI.toast(err); return; }
        Store.createPlayer(name.trim()); grantStarter();
        UI.closeModal(); UI.refreshWallet(); UI.show("home");
        UI.toast(`ようこそ、${name.trim()} さん！`);
      } }],
    });
    setTimeout(() => $("regName")?.focus(), 50);
  }

  function grantStarter() {
    const ns = Data.cards.filter((c) => c.rarity === "N");
    const rs = Data.cards.filter((c) => c.rarity === "R");
    const pick = (arr, k) => Array.from({ length: k }, () => arr[Math.floor(Math.random() * arr.length)]);
    [...pick(ns, 4), ...pick(rs, 2)].forEach((c) => Store.addCard(c.id));
    Store.addItem("orb_s", 3); Store.addItem("orb_m", 1);
    Store.save();
  }

  function openRename() {
    UI.modal({
      title: "プレイヤー名の変更",
      body: `<input type="text" id="reName" maxlength="16" value="${Store.state.player.name}" style="width:100%" />`,
      actions: [
        { label: "キャンセル", onClick: () => UI.closeModal() },
        { label: "変更する", primary: true, onClick: () => {
          const name = $("reName").value, err = validateName(name);
          if (err) { UI.toast(err); return; }
          Store.renamePlayer(name.trim()); UI.closeModal(); UI.refreshWallet(); UI.toast("名前を変更しました");
        } },
      ],
    });
    setTimeout(() => $("reName")?.focus(), 50);
  }

  /* ---------- ガチャ 1枚ずつ演出 ---------- */
  function buildRays(rarity) {
    const n = rarity === "UR" ? 16 : rarity === "SSR" ? 14 : 12;
    let s = "";
    const color = { N: "#8c97ad", R: "#4f9be8", SR: "#b06ff0", SSR: "#f0a93a", UR: "#ff5b8a" }[rarity];
    for (let i = 0; i < n; i++) s += `<i style="--rot:${(360 / n) * i}deg;background:${color}"></i>`;
    return `<div class="rarity-burst">${s}</div>`;
  }

  function revealSequence(type, cards) {
    return new Promise((resolve) => {
      const stage = document.createElement("div");
      stage.className = "gacha-stage";
      document.body.appendChild(stage);
      requestAnimationFrame(() => stage.classList.add("show"));
      let i = 0;

      function showOne() {
        const c = cards[i];
        const card = Store.materialize({ id: c.id, level: 1, marks: c.marks, extraSkills: [] });
        const r = c.rarity;
        stage.innerHTML =
          `<div class="flash"></div>` +
          `<div class="counter">${i + 1} / ${cards.length}　${type === "rare" ? "💎レア" : "🪙ノーマル"}ガチャ</div>` +
          `<button class="skip">スキップ ▶▶</button>` +
          `<div class="reveal-card">` +
            `<div class="aura ${r}"></div>${buildRays(r)}` +
            UI.cardHTML(card) +
          `</div>` +
          `<div class="tap-hint">タップで次へ</div>`;
        const flash = stage.querySelector(".flash");
        flash.classList.add("go");
        // SSR/UR は画面全体を一瞬白くするより強い演出
        if (r === "SSR" || r === "UR") { flash.style.animationDuration = "0.6s"; }
        stage.querySelector(".reveal-card").onclick = next;
        stage.querySelector(".skip").onclick = (e) => { e.stopPropagation(); finish(); };
        stage.onclick = next;
      }
      function next() { i++; if (i >= cards.length) finish(); else showOne(); }
      function finish() { stage.classList.remove("show"); setTimeout(() => stage.remove(), 150); resolve(); }

      showOne();
    });
  }

  async function gachaReveal(type, result) {
    await revealSequence(type, result.cards);
    const cards = result.cards.slice().sort((a, b) => Data.rarityRank(b.rarity) - Data.rarityRank(a.rarity));
    const best = cards[0]?.rarity;
    const grid = cards.map((c) => UI.cardHTML(Store.materialize({ id: c.id, level: 1, marks: c.marks, extraSkills: [] }))).join("");
    const again = Gacha.canAfford(type, result.cards.length);
    UI.modal({
      title: `ガチャ結果 ${best ? `— 最高 ${best}` : ""}`,
      body: `<div class="reveal-grid">${grid}</div>`,
      actions: [
        { label: "閉じる", onClick: () => UI.closeModal() },
        ...(again ? [{ label: `もう一度（${result.cards.length}連）`, primary: true, onClick: () => { UI.closeModal(); doGacha(type, result.cards.length); } }] : []),
      ],
    });
  }

  function refreshDaily() {
    const banner = $("dailyBanner"), btn = $("dailyGacha"), status = $("dailyStatus");
    if (!banner) return;
    const can = Store.canDaily();
    banner.classList.toggle("done", !can);
    if (btn) btn.disabled = !can;
    if (status) status.textContent = can ? "1日1回、ノーマル10連を無料で引けます" : "本日は引き済みです。また明日どうぞ。";
  }

  function doDaily() {
    if (!Store.canDaily()) { UI.toast("本日の無料ガチャは引き済みです"); return; }
    const res = Gacha.pull("normal", 10, { free: true });
    if (!res.ok) { UI.toast(res.reason); return; }
    Store.markDaily(); refreshDaily(); UI.refreshWallet();
    if (window.Quest) { Quest.bump("gacha"); Quest.bump("daily_gacha"); }
    gachaReveal("normal", res);
  }

  function doGacha(type, count) {
    if (!Gacha.canAfford(type, count)) { UI.toast(type === "normal" ? "コインが足りません" : "ダイヤが足りません"); return; }
    const res = Gacha.pull(type, count);
    if (!res.ok) { UI.toast(res.reason); return; }
    UI.refreshWallet();
    if (window.Quest) Quest.bump("gacha");
    gachaReveal(type, res);
  }

  function wire() {
    document.querySelectorAll("#nav button").forEach((b) => (b.onclick = () => { UI.show(b.dataset.view); if (b.dataset.view === "gacha") refreshDaily(); }));
    document.querySelectorAll("[data-gacha]").forEach((b) => (b.onclick = () => doGacha(b.dataset.gacha, +b.dataset.pull)));
    $("dailyGacha").onclick = doDaily;
    $("playerName").onclick = () => { if (Store.state.player) openRename(); };
    $("colRarity").onchange = () => UI.renderCollection();
    $("colSort").onchange = () => UI.renderCollection();
    $("battleQuit").onclick = () => Battle.quit();
    $("overlay").onclick = (e) => { if (e.target === $("overlay") && !$("overlay")._noClose) UI.closeModal(); };
  }

  async function init() {
    try { await Data.load(); }
    catch (e) {
      document.querySelector("main").innerHTML =
        `<div class="empty-note"><h3>カードデータを読み込めませんでした</h3><p>${e.message}</p>
        <p class="muted">ローカルサーバ経由で開いてください。例：<span class="kbd">python3 -m http.server</span> → <span class="kbd">http://localhost:8000</span></p></div>`;
      return;
    }
    Store.load(); if (window.Quest) Quest.init(); World.loadWorld(); wire(); UI.refreshWallet(); refreshDaily();
    if (!Store.state.player) openRegistration(); else UI.show("home");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
