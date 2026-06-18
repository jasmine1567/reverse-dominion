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
        const name = $("regName").value;
        const err = validateName(name);
        if (err) { UI.toast(err); return; }
        Store.createPlayer(name.trim());
        grantStarter();
        UI.closeModal();
        UI.refreshWallet();
        UI.show("home");
        UI.toast(`ようこそ、${name.trim()} さん！`);
      } }],
    });
    setTimeout(() => $("regName")?.focus(), 50);
  }

  function grantStarter() {
    // デッキが組めるよう N/R を6枚配布
    const ns = Data.cards.filter((c) => c.rarity === "N");
    const rs = Data.cards.filter((c) => c.rarity === "R");
    const pick = (arr, k) => Array.from({ length: k }, () => arr[Math.floor(Math.random() * arr.length)]);
    [...pick(ns, 4), ...pick(rs, 2)].forEach((c) => Store.addCard(c.id));
    Store.save();
  }

  function openRename() {
    UI.modal({
      title: "プレイヤー名の変更",
      body: `<input type="text" id="reName" maxlength="16" value="${Store.state.player.name}" style="width:100%" />`,
      actions: [
        { label: "キャンセル", onClick: () => UI.closeModal() },
        { label: "変更する", primary: true, onClick: () => {
          const name = $("reName").value;
          const err = validateName(name);
          if (err) { UI.toast(err); return; }
          Store.renamePlayer(name.trim());
          UI.closeModal(); UI.refreshWallet(); UI.toast("名前を変更しました");
        } },
      ],
    });
    setTimeout(() => $("reName")?.focus(), 50);
  }

  function gachaReveal(type, result) {
    const cards = result.cards.slice().sort((a, b) => Data.rarityRank(b.rarity) - Data.rarityRank(a.rarity));
    const best = cards[0]?.rarity;
    const grid = cards.map((c) => UI.cardHTML(Store.materialize({ id: c.id, inherit: null }))).join("");
    const again = Gacha.canAfford(type, result.cards.length);
    UI.modal({
      title: `ガチャ結果 ${best ? `— 最高 ${best}` : ""}`,
      body: `<div class="reveal-grid">${grid}</div>`,
      actions: [
        { label: "閉じる", onClick: () => { UI.closeModal(); } },
        ...(again ? [{ label: `もう一度（${result.cards.length}連）`, primary: true, onClick: () => {
          UI.closeModal(); doGacha(type, result.cards.length);
        } }] : []),
      ],
    });
  }

  function doGacha(type, count) {
    if (!Gacha.canAfford(type, count)) {
      UI.toast(type === "normal" ? "コインが足りません" : "ダイヤが足りません");
      return;
    }
    const res = Gacha.pull(type, count);
    if (!res.ok) { UI.toast(res.reason); return; }
    UI.refreshWallet();
    gachaReveal(type, res);
  }

  function wire() {
    document.querySelectorAll("#nav button").forEach((b) =>
      (b.onclick = () => UI.show(b.dataset.view))
    );
    document.querySelectorAll("[data-gacha]").forEach((b) =>
      (b.onclick = () => doGacha(b.dataset.gacha, +b.dataset.pull))
    );
    $("playerName").onclick = () => { if (Store.state.player) openRename(); };
    $("colRarity").onchange = () => UI.renderCollection();
    $("colSort").onchange = () => UI.renderCollection();
    $("battleQuit").onclick = () => Battle.quit();
    $("overlay").onclick = (e) => {
      if (e.target === $("overlay") && !$("overlay")._noClose) UI.closeModal();
    };
  }

  async function init() {
    try {
      await Data.load();
    } catch (e) {
      document.querySelector("main").innerHTML =
        `<div class="empty-note"><h3>カードデータを読み込めませんでした</h3>
        <p>${e.message}</p>
        <p class="muted">ローカルサーバ経由で開いてください。例：このフォルダで<br>
        <span class="kbd">python3 -m http.server</span><br>を実行し <span class="kbd">http://localhost:8000</span> を開きます。</p></div>`;
      return;
    }
    Store.load();
    World.loadWorld();
    wire();
    UI.refreshWallet();
    if (!Store.state.player) openRegistration();
    else UI.show("home");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
