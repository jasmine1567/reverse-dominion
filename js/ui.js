/* ===== ui.js : 画面描画・モーダル・トースト ===== */
(function () {
  const $ = (id) => document.getElementById(id);

  function marksHTML(marks, wrapCls = "card-marks") {
    return `<div class="${wrapCls}">` + (marks || []).map((d) => `<i class="amk dir-${d}"></i>`).join("") + "</div>";
  }

  // SSR以上などイラスト画像が指定されたカードは画像を表示。読み込み失敗時は絵文字にフォールバック。
  function artHTML(card, cls = "art") {
    if (card.image) {
      return `<div class="art-img"><img class="ci" src="${card.image}" alt="${card.name}" loading="lazy" onerror="this.closest('.art-img').classList.add('failed')"><span class="${cls} fallback">${card.art}</span></div>`;
    }
    return `<div class="${cls}">${card.art}</div>`;
  }

  function skillLine(card, opts = {}) {
    const parts = [];
    const lv = (s) => (s.level && s.level > 1) ? ` <span style="color:var(--gold)">Lv${s.level}</span>` : "";
    const ch = (s) => s.chance ? ` <span style="color:var(--cyan)">発動${Data.chanceVal(s)}%</span>` : "";
    if (card.skill && card.skill.type !== "none") parts.push(`<b>${card.skill.name}</b>${lv(card.skill)}${ch(card.skill)}：${card.skill.desc}`);
    else parts.push('<span class="muted">固有スキルなし</span>');
    (card.extraSkills || []).forEach((s) => parts.push(`<b style="color:var(--cyan)">＋${s.name}</b>${lv(s)}${ch(s)}：${s.desc}`));
    if (opts.leader && card.leaderSkill) {
      const ls = card.leaderSkill;
      parts.push(`<b style="color:#e7d6a8">👑${ls.name}</b>${ls.level > 1 ? ` <span style="color:var(--gold)">Lv${ls.level}</span>` : ""}：${Data.leaderDesc(ls, ls.level)}`);
    }
    return parts.join("<br>");
  }

  const RARITY_DOTS = { N: 1, R: 2, SR: 3, SSR: 4, UR: 5 };

  function cardHTML(card, opts = {}) {
    const cls = ["card", "framed"];
    if (opts.selectable) cls.push("selectable");
    if (opts.selected) cls.push("selected");
    if (opts.dim) cls.push("dim");
    if (opts.mini) cls.push("mini");
    const qty = opts.qty ? `<div class="qty">×${opts.qty}</div>` : "";
    const favBtn = opts.favKey ? `<button class="fav-btn ${opts.favActive ? "on" : ""}" data-fav="${opts.favKey}" title="お気に入り">${opts.favActive ? "★" : "☆"}</button>` : "";
    const lockBadge = opts.locked ? `<div class="lock-badge">🔒${opts.lockReason || "保護"}</div>` : "";
    const ea = Data.effAtk(card), ed = Data.effDef(card);
    const lv = card.level >= Data.MAX_LEVEL ? "★" : String(card.level);
    const dots = Array.from({ length: RARITY_DOTS[card.rarity] || 1 }, () => "<i></i>").join("");
    const isHi = card.rarity === "SSR" || card.rarity === "UR";
    const corners = isHi ? '<i class="fr-corner tl"></i><i class="fr-corner tr"></i><i class="fr-corner bl"></i><i class="fr-corner br"></i>' : "";
    const holo = card.rarity === "UR" ? '<i class="fr-holo"></i>' : "";
    const rings = (!card.image && isHi) ? '<i class="fr-ring r1"></i><i class="fr-ring r2"></i>' : "";
    const sweep = card.rarity === "UR" ? '<i class="fr-sweep"></i>' : "";
    return (
      `<div class="${cls.join(" ")}" data-rarity="${card.rarity}" ${opts.data || ""}>` +
      holo + corners + favBtn + lockBadge +
      (opts.noMarks ? "" : marksHTML(card.marks)) +
      `<div class="card-inner">` + sweep +
        `<div class="fr-head">` +
          `<div class="fr-orb">${lv}</div>` +
          `<div class="fr-rarwrap"><div class="fr-rar">${card.rarity}</div><div class="fr-dots">${dots}</div></div>` +
        `</div>` +
        `<div class="fr-illust">${rings}${artHTML(card, "cart")}</div>` +
        `<div class="fr-name">${card.name}</div>` +
        (opts.mini ? "" : `<div class="fr-skill">${skillLine(card)}</div>`) +
        `<div class="fr-stats">` +
          `<div class="fr-stat atk"><span class="fr-lbl">攻</span><span class="fr-val">${ea}</span></div>` +
          `<div class="fr-stat def"><span class="fr-lbl">守</span><span class="fr-val">${ed}</span></div>` +
        `</div>` +
      `</div>` + qty +
      `</div>`
    );
  }

  const UI = {
    cardHTML, marksHTML, skillLine, artHTML,

    show(view) {
      if (view !== "battle" && window.Battle && Battle.stopTimers) Battle.stopTimers();
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      $("view-" + view)?.classList.add("active");
      document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
      const map = {
        home: this.renderHome, gacha: () => {}, collection: this.renderCollection, dex: this.renderDex,
        deck: this.renderDeck, fusion: this.renderFusion, dungeon: this.renderDungeon,
        quest: this.renderQuests, skills: this.renderSkills,
        arena: this.renderArena, ranking: this.renderRanking, battle: () => {},
      };
      (map[view] || (() => {})).call(this);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    refreshWallet() {
      const s = Store.state;
      $("playerName").textContent = s.player?.name || "—";
      $("coinAmt").textContent = s.coins.toLocaleString();
      $("diamondAmt").textContent = s.diamonds.toLocaleString();
    },

    toast(msg) {
      const wrap = $("toastWrap");
      const t = document.createElement("div");
      t.className = "toast"; t.textContent = msg;
      wrap.appendChild(t);
      setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(() => t.remove(), 320); }, 1900);
    },

    modal({ title, body, actions = [], noClose = false }) {
      const m = $("modal");
      m.innerHTML = `<h3>${title}</h3><div>${body}</div>` +
        `<div class="modal-actions">` +
        actions.map((a, i) => `<button class="${a.primary ? "primary" : ""} ${a.danger ? "danger" : ""}" data-act="${i}">${a.label}</button>`).join("") +
        `</div>`;
      $("overlay").classList.add("show"); $("overlay")._noClose = noClose;
      m.querySelectorAll("[data-act]").forEach((b) => (b.onclick = () => actions[+b.dataset.act].onClick()));
    },
    closeModal() { $("overlay").classList.remove("show"); },

    promptText(title, def, onOk) {
      UI.modal({
        title,
        body: `<input type="text" id="__prompt" maxlength="20" value="${(def || "").replace(/"/g, "&quot;")}" style="width:100%" />`,
        actions: [
          { label: "キャンセル", onClick: () => UI.closeModal() },
          { label: "決定", primary: true, onClick: () => { const v = $("__prompt").value.trim(); UI.closeModal(); onOk(v); } },
        ],
      });
      setTimeout(() => { const i = $("__prompt"); if (i) { i.focus(); i.select(); } }, 50);
    },

    /* ---------- HOME ---------- */
    homeAdvice() {
      const s = Store.state;
      if (window.Quest && Quest.claimable() > 0) return { icon: "🎁", msg: `受け取れる報酬が ${Quest.claimable()} 件あります。クエスト画面で受け取ろう！`, go: "quest" };
      if (Store.canDaily && Store.canDaily()) return { icon: "🎁", msg: "デイリー無料10連がまだです。引いておこう！", go: "gacha" };
      if (window.Quest) {
        const dailyLeft = Quest.list("daily").some((q) => !Quest.isComplete(q));
        if (dailyLeft) return { icon: "🎯", msg: "デイリークエストをクリアして報酬を集めよう！", go: "quest" };
      }
      if (s.deck.length < 6) return { icon: "🎴", msg: "デッキを6枚編成してリーダーを設定しよう。", go: "deck" };
      if ((s.savedDecks || []).length === 0) return { icon: "💾", msg: "編成したデッキは保存しておくと便利です。", go: "deck" };
      const nextD = World.DUNGEONS.find((d) => !(s.dungeon[d.id] && s.dungeon[d.id].boss));
      if (nextD) return { icon: "🏰", msg: `次は「${nextD.name}」に挑戦してみよう！`, go: "dungeon" };
      if (window.Quest) { const wk = Quest.list("weekly").some((q) => !Quest.isComplete(q)); if (wk) return { icon: "📅", msg: "ウィークリークエストの達成を目指そう！", go: "quest" }; }
      return { icon: "⚔️", msg: "競技場でリーグ戦に挑戦して報酬を稼ごう！", go: "arena" };
    },

    renderHome() {
      const s = Store.state;
      $("homeGreeting").textContent = `ようこそ、${s.player?.name || "プレイヤー"} さん`;
      const owned = s.owned.length;
      const clears = World.DUNGEONS.filter((d) => s.dungeon[d.id]?.boss).length;
      const rk = World.ranking(s);
      const leader = Store.leaderCard ? Store.leaderCard() : null;
      const adv = this.homeAdvice();
      const tile = (label, val, view, icon) =>
        `<div class="card framed selectable" data-tile="${view}" data-rarity="N" style="text-align:center">
          <div class="card-inner"><div class="fr-illust"><div class="cart">${icon}</div></div>
          <div class="fr-name">${label}</div><div class="fr-stats" style="justify-content:center"><b style="font-size:16px;font-family:'Cinzel',serif">${val}</b></div></div></div>`;
      const leaderHTML = leader
        ? `<div class="leader-card" data-go="deck" title="クリックでデッキ編成へ">${cardHTML(leader)}</div>`
        : `<div class="leader-empty" data-go="deck">👑<br><span class="muted">タップしてデッキで<br>リーダーを設定</span></div>`;
      const lsLine = leader && leader.leaderSkill ? `<div class="ls-line">👑 ${leader.leaderSkill.name}：${Data.leaderDesc(leader.leaderSkill, leader.leaderSkill.level)} <span class="muted">(Lv.${leader.leaderSkill.level})</span></div>` : "";
      $("homeBody").innerHTML = `
        <div class="home-hero">
          <div class="leader-stage">${leaderHTML}</div>
          <div class="home-side">
            <div class="advice" data-go="${adv.go}"><span class="adv-ico">${adv.icon}</span><span>${adv.msg}</span></div>
            ${lsLine}
            <div class="row" style="margin-top:10px">
              <button class="primary" data-go="gacha">ガチャ</button>
              <button data-go="dungeon">ダンジョン</button>
              <button data-go="quest">クエスト</button>
            </div>
          </div>
        </div>
        <div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));margin-top:20px">
          ${tile("所持カード", owned + " 枚", "collection", "🃏")}
          ${tile("デッキ", s.deck.length + " / 6", "deck", "🎴")}
          ${tile("ダンジョン制覇", clears + " / " + World.DUNGEONS.length, "dungeon", "🏰")}
          ${tile("クエスト", (window.Quest ? Quest.claimable() : 0) + " 件", "quest", "🎯")}
          ${tile("ランキング", rk.rank + " 位", "ranking", "📊")}
        </div>
        <div class="row" style="margin-top:18px">
          <button class="ghost" id="resetBtn">セーブをリセット</button>
        </div>
        <p class="muted" style="margin-top:14px">対人要素（競技場の自動対戦・全体ランキング・他プレイヤーの入手アナウンス）は本来サーバが必要なため、ここではローカルのモックで動作しています。</p>`;
      $("homeBody").querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => UI.show(b.dataset.go)));
      $("homeBody").querySelectorAll("[data-tile]").forEach((b) => (b.onclick = () => UI.show(b.dataset.tile)));
      $("resetBtn").onclick = () => UI.modal({
        title: "セーブをリセット",
        body: '<p class="muted">所持カード・通貨・進捗がすべて消えます。よろしいですか？</p>',
        actions: [
          { label: "やめる", onClick: () => UI.closeModal() },
          { label: "リセットする", danger: true, onClick: () => { Store.reset(); UI.closeModal(); location.reload(); } },
        ],
      });
    },

    /* ---------- グループ化 ---------- */
    groups() {
      const map = new Map();
      Store.state.owned.forEach((inst) => {
        const key = inst.id + "|" + inst.level + "|" + (inst.marks || []).join("") + "|" + (inst.extraSkills || []).join(",");
        if (!map.has(key)) map.set(key, { key, id: inst.id, insts: [] });
        map.get(key).insts.push(inst);
      });
      return [...map.values()];
    },

    /* ---------- COLLECTION ---------- */
    collFavOnly: false,
    renderCollection() {
      const grid = $("collectionGrid");
      const rarity = $("colRarity").value, sort = $("colSort").value || "rarity_desc";
      const q = (($("colSearch") && $("colSearch").value) || "").trim();
      let groups = this.groups().map((g) => ({ ...g, card: Store.materialize(g.insts[0]), anyFav: g.insts.some((i) => i.fav) }));
      if (rarity) groups = groups.filter((g) => g.card.rarity === rarity);
      if (q) groups = groups.filter((g) => g.card.name.includes(q));
      if (this.collFavOnly) groups = groups.filter((g) => g.anyFav);
      const rrank = (g) => Data.rarityRank(g.card.rarity);
      const gseq = (g) => Math.max(...g.insts.map((i) => i.seq || 0));
      groups.sort((a, b) => {
        switch (sort) {
          case "rarity_asc": return rrank(a) - rrank(b) || a.card.level - b.card.level;
          case "seq_desc": return gseq(b) - gseq(a);
          case "seq_asc": return gseq(a) - gseq(b);
          case "atk": return Data.effAtk(b.card) - Data.effAtk(a.card);
          case "def": return Data.effDef(b.card) - Data.effDef(a.card);
          case "level": return b.card.level - a.card.level || rrank(b) - rrank(a);
          case "name": return a.card.name.localeCompare(b.card.name, "ja");
          default: return rrank(b) - rrank(a) || b.card.level - a.card.level;
        }
      });
      const favBtn = $("colFav"); if (favBtn) favBtn.classList.toggle("primary", this.collFavOnly);
      // レア別保有枚数サマリー
      const rc = {};
      ["UR", "SSR", "SR", "R", "N"].forEach((r) => (rc[r] = 0));
      Store.state.owned.forEach((o) => { const r = Data.byId[o.id] && Data.byId[o.id].rarity; if (r in rc) rc[r]++; });
      const summary = `<div class="rarity-summary">${["UR", "SSR", "SR", "R", "N"].map((r) => `<span class="rs-chip rs-${r}"><b>${r}</b> ${rc[r]}枚</span>`).join("")}<span class="rs-chip rs-total">合計 ${Store.state.owned.length}枚</span></div>`;
      $("colCount").textContent = `表示 ${groups.length} 種`;
      if (groups.length === 0) { grid.innerHTML = `<div class="empty-note">該当するカードがありません。</div>`; }
      else grid.innerHTML = groups.map((g) => cardHTML(g.card, { qty: g.insts.length, selectable: true, favKey: g.key, favActive: g.anyFav, data: `data-key="${g.key}"` })).join("");
      // サマリーをグリッド上部に差し込み
      let sumEl = document.getElementById("raritySummary");
      if (!sumEl) { sumEl = document.createElement("div"); sumEl.id = "raritySummary"; grid.parentNode.insertBefore(sumEl, grid); }
      sumEl.innerHTML = summary;
      grid.querySelectorAll(".fav-btn").forEach((b) => (b.onclick = (e) => {
        e.stopPropagation();
        const g = UI.groups().find((x) => x.key === b.dataset.fav); if (!g) return;
        const anyFav = g.insts.some((i) => i.fav);
        Store.toggleFavInsts(g.insts.map((i) => i.uid), !anyFav);
        UI.renderCollection();
      }));
      grid.querySelectorAll("[data-key]").forEach((el) => (el.onclick = () => UI.cardDetail(el.dataset.key)));
    },

    cardDetail(key) {
      const g = this.groups().find((x) => x.key === key);
      if (!g) return;
      const inst = g.insts[0];
      const card = Store.materialize(inst);
      const base = Data.byId[g.id];
      const sell = Data.SELL_VALUE[base.rarity];
      const isMax = card.level >= Data.MAX_LEVEL;
      const expPct = isMax ? 100 : Math.min(100, (card.exp / card.expNeed) * 100);
      UI.modal({
        title: card.name + `（${card.rarity}）`,
        body:
          `<div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
            <div style="width:150px">${cardHTML(card)}</div>
            <div style="flex:1;min-width:200px">
              <p>レベル <b>${card.level}</b> / ${Data.MAX_LEVEL} <span class="stars">${"★".repeat(Math.min(5, Math.round(card.level / 2)))}</span></p>
              <div class="expbar"><i style="width:${expPct}%"></i></div>
              <p class="muted">${isMax ? "MAXレベル" : `EXP ${card.exp} / ${card.expNeed}`}</p>
              <p>実効 ⚔<b>${Data.effAtk(card)}</b> / 🛡<b>${Data.effDef(card)}</b>　<span class="muted">(基礎 ${base.baseAtk}/${base.baseDef})</span></p>
              <p class="muted">攻撃マーク ${card.marks.length} 方向：${card.marks.join(" ")}（多いほど係数で弱体）</p>
              <p>${skillLine(card, { leader: true })}</p>
              ${isMax ? '<p style="color:var(--gold)">★MAX到達：合成タブで「スキル合成」が可能です</p>' : ""}
              <p class="muted">所持 ${g.insts.length} 枚 / 1枚売却で 🪙${sell}</p>
            </div></div>`,
        actions: [
          { label: "閉じる", onClick: () => UI.closeModal() },
          { label: g.insts.some((i) => i.fav) ? "★お気に入り解除" : "☆お気に入り登録", onClick: () => {
              const anyFav = g.insts.some((i) => i.fav);
              Store.toggleFavInsts(g.insts.map((i) => i.uid), !anyFav);
              UI.refreshView(); UI.cardDetail(key);
            } },
          ...(!isMax ? [{ label: "強化する（経験値合成）", primary: true, onClick: () => {
              UI.closeModal();
              UI.fuseState = { mode: "enhance", base: inst.uid, mats: [], items: {} };
              UI.show("fusion");
            } }] : []),
          { label: `1枚売却(🪙${sell})`, onClick: () => {
              Store.removeCard(inst.uid); Store.addCoins(sell); if (window.Quest) Quest.bump("sell"); UI.afterChange(); UI.refreshView(); UI.toast(`売却 +🪙${sell}`);
              const ng = UI.groups().find((x) => x.key === key); ng ? UI.cardDetail(key) : UI.closeModal();
            } },
        ],
      });
    },

    /* ---------- DECK ---------- */
    renderDeck() {
      this.renderDeckPresets();
      // リーダーバナー
      const banner = $("deckLeaderBanner");
      if (banner) {
        const leader = Store.leaderCard ? Store.leaderCard() : null;
        if (leader) {
          const ls = leader.leaderSkill;
          banner.innerHTML = `<div class="leader-banner">
            <div class="lb-card">${cardHTML(leader, { mini: true })}</div>
            <div class="lb-info">
              <div class="lb-title">👑 リーダー：${leader.name}</div>
              ${ls
                ? `<div class="lb-skill"><b>${ls.name}</b>　${Data.leaderDesc(ls, ls.level)} <span class="muted">(Lv.${ls.level})</span></div>
                   <div class="muted" style="font-size:11px">${ls.desc}（試合中ずっとデッキ全体に作用）</div>`
                : `<div class="muted">このカードはリーダースキルを持ちません。<br>リーダースキルは <b>SSR以上</b>のカードが保有しています。</div>`}
            </div></div>`;
        } else {
          banner.innerHTML = `<div class="leader-banner empty"><div class="muted">デッキにカードを入れて「👑設定」でリーダーを決めましょう。先頭がリーダーになります。</div></div>`;
        }
      }
      const slots = $("deckSlots");
      slots.innerHTML = "";
      for (let i = 0; i < 6; i++) {
        const uid = Store.state.deck[i];
        const el = document.createElement("div");
        if (uid) {
          const card = Store.resolveCard(uid);
          const isLeader = Store.state.leaderUid === uid;
          el.className = "deck-slot filled" + (isLeader ? " leader" : "");
          el.innerHTML =
            (isLeader ? '<div class="leader-tag">👑 リーダー</div>' : "") +
            `<div class="art">${card.art}</div><div>${card.name}</div>` +
            `<div class="muted">Lv${card.level} ⚔${Data.effAtk(card)} 🛡${Data.effDef(card)}</div>` +
            `<div class="slot-actions">` +
              (isLeader ? "" : `<button class="mini-btn" data-lead="${uid}">👑設定</button>`) +
              `<button class="mini-btn ghost" data-remove="${uid}">外す</button>` +
            `</div>`;
        } else { el.className = "deck-slot"; el.innerHTML = `<div class="art">＋</div><div>空き</div>`; }
        slots.appendChild(el);
      }
      slots.querySelectorAll("[data-lead]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); Store.setLeader(b.dataset.lead); UI.toast("リーダーを設定しました"); UI.renderDeck(); }));
      slots.querySelectorAll("[data-remove]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); Store.deckToggle(b.dataset.remove); UI.renderDeck(); }));
      const pool = $("deckPool");
      const groups = this.groups().map((g) => ({ ...g, card: Store.materialize(g.insts[0]) }));
      groups.sort((a, b) => Data.rarityRank(b.card.rarity) - Data.rarityRank(a.card.rarity) || b.card.level - a.card.level);
      if (groups.length === 0) { pool.innerHTML = `<div class="empty-note">カードがありません。</div>`; return; }
      pool.innerHTML = groups.map((g) => {
        const inDeck = g.insts.filter((i) => Store.state.deck.includes(i.uid)).length;
        const avail = g.insts.length - inDeck;
        return cardHTML(g.card, { qty: g.insts.length, selectable: avail > 0, dim: avail === 0, data: `data-key="${g.key}"` });
      }).join("");
      pool.querySelectorAll("[data-key]").forEach((el) => (el.onclick = () => {
        const g = groups.find((x) => x.key === el.dataset.key);
        const free = g.insts.find((i) => !Store.state.deck.includes(i.uid));
        if (!free) return;
        if (Store.deckToggle(free.uid) === "full") UI.toast("デッキは6枚までです");
        UI.renderDeck();
      }));
    },

    renderDeckPresets() {
      const host = $("deckPresets");
      if (!host) return;
      const decks = Store.state.savedDecks || [];
      const slotsHTML = decks.map((p, i) => {
        const arts = p.cards.map((u) => Store.resolveCard(u)).filter(Boolean).map((c) => c.art).join("");
        const lc = p.leader ? Store.resolveCard(p.leader) : null;
        return `<div class="preset">
          <div class="preset-head"><b>${p.name}</b><span class="muted">${p.cards.length}枚</span></div>
          <div class="preset-arts">${arts || "（空）"}</div>
          ${lc ? `<div class="muted" style="font-size:11px;margin-bottom:6px">👑 ${lc.name}</div>` : ""}
          <div class="preset-actions">
            <button class="primary" data-load="${i}">編成にセット</button>
            <button data-over="${i}">上書き保存</button>
            <button class="ghost" data-rename="${i}">改名</button>
            <button class="danger" data-del="${i}">削除</button>
          </div></div>`;
      }).join("");
      host.innerHTML = `
        <div class="row" style="margin-bottom:10px">
          <span class="chip">現在の編成 <b>${Store.state.deck.length}/6</b></span>
          <span class="chip">保存数 <b>${decks.length}/${Store.MAX_DECKS}</b></span>
          <span class="spacer"></span>
          <button class="gold" id="saveDeckBtn" ${decks.length >= Store.MAX_DECKS ? "disabled" : ""}>現在の編成を新規保存</button>
        </div>
        <div class="preset-grid">${slotsHTML || '<span class="muted">保存済みデッキはありません。編成して「新規保存」を押すと、最大5つまで保存できます。</span>'}</div>`;
      const saveBtn = $("saveDeckBtn");
      if (saveBtn) saveBtn.onclick = () => {
        if (Store.state.deck.length === 0) { UI.toast("編成が空です"); return; }
        UI.promptText("デッキ名を入力", `デッキ${decks.length + 1}`, (name) => {
          const r = Store.saveDeckPreset(name);
          if (!r.ok) { UI.toast(r.reason); return; }
          if (window.Quest) Quest.bump("deck_save");
          UI.toast("デッキを保存しました"); UI.renderDeck();
        });
      };
      host.querySelectorAll("[data-load]").forEach((b) => (b.onclick = () => {
        const r = Store.loadDeckPreset(+b.dataset.load);
        if (!r.ok) { UI.toast(r.reason); return; }
        UI.toast(r.dropped ? `セット（${r.dropped}枚は未所持のため除外）` : "編成にセットしました"); UI.renderDeck();
      }));
      host.querySelectorAll("[data-over]").forEach((b) => (b.onclick = () => {
        const r = Store.overwriteDeckPreset(+b.dataset.over);
        if (!r.ok) { UI.toast(r.reason); return; }
        if (window.Quest) Quest.bump("deck_save");
        UI.toast("上書き保存しました"); UI.renderDeck();
      }));
      host.querySelectorAll("[data-rename]").forEach((b) => (b.onclick = () => {
        const i = +b.dataset.rename;
        UI.promptText("新しいデッキ名", decks[i].name, (name) => { Store.renameDeckPreset(i, name || decks[i].name); UI.renderDeck(); });
      }));
      host.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => {
        Store.deleteDeckPreset(+b.dataset.del); UI.renderDeck();
      }));
    },

    /* ---------- FUSION ---------- */
    fuseState: { mode: "enhance", base: null, mats: [], items: {} },
    renderFusion() {
      const v = $("view-fusion");
      const skillOpen = Store.skillFusionUnlocked();
      v.innerHTML = `
        <div class="section-title"><h2>合成</h2><p>レベル強化（経験値）／スキルレベル・スキル合成（ダンジョン2クリアで解放）／上位レア昇華</p></div>
        <div class="toolbar">
          <button id="fmEnhance">レベル強化</button>
          <button id="fmSkill">スキルレベル ${skillOpen ? "" : "🔒"}</button>
          <button id="fmInherit">スキル合成 ${skillOpen ? "" : "🔒"}</button>
          <button id="fmUpgrade">上位レア昇華</button>
          <span class="spacer"></span><span class="muted" id="fuseDesc"></span>
        </div>
        <div id="fuseArea"></div>`;
      $("fmEnhance").onclick = () => { UI.fuseState = { mode: "enhance", base: null, mats: [], items: {} }; UI.renderFusion(); };
      $("fmSkill").onclick = () => { if (!Store.skillFusionUnlocked()) { UI.toast("ダンジョン2をクリアすると解放されます"); return; } UI.fuseState = { mode: "skill", base: null, slot: null, skillId: null, mats: [] }; UI.renderFusion(); };
      $("fmInherit").onclick = () => { if (!Store.skillFusionUnlocked()) { UI.toast("ダンジョン2をクリアすると解放されます"); return; } UI.fuseState = { mode: "inherit", base: null, mats: [] }; UI.renderFusion(); };
      $("fmUpgrade").onclick = () => { UI.fuseState = { mode: "upgrade", base: null, mats: [] }; UI.renderFusion(); };
      const mode = this.fuseState.mode;
      $("fmEnhance").classList.toggle("primary", mode === "enhance");
      $("fmSkill").classList.toggle("primary", mode === "skill");
      $("fmInherit").classList.toggle("primary", mode === "inherit");
      $("fmUpgrade").classList.toggle("primary", mode === "upgrade");
      if ((mode === "inherit" || mode === "skill") && !skillOpen) {
        $("fuseDesc").textContent = "";
        $("fuseArea").innerHTML = `<div class="empty-note">🔒 この機能は<b>ダンジョン2「ゴブリン砦」</b>のボスを撃破すると解放されます。</div>`;
        return;
      }
      mode === "enhance" ? this.renderEnhance() : mode === "skill" ? this.renderSkillLevel() : mode === "inherit" ? this.renderInherit() : this.renderUpgrade();
    },
    instById(uid) { return Store.state.owned.find((o) => o.uid === uid); },

    // 保護カード（デッキ・お気に入り）を除外し、弱いカードから素材候補を返す
    autoPickFodder(baseUid, opts = {}) {
      const cand = Store.state.owned
        .filter((o) => o.uid !== baseUid && !Store.isProtected(o.uid))
        .sort((a, b) => Data.rarityRank(Data.byId[a.id].rarity) - Data.rarityRank(Data.byId[b.id].rarity) || (a.level || 1) - (b.level || 1));
      if (opts.targetExp && opts.targetExp > 0) {
        const out = []; let acc = 0;
        for (const o of cand) {
          out.push(o.uid); acc += Data.cardXp(Data.byId[o.id].rarity);
          if (acc >= opts.targetExp) break;
          if (out.length >= 30) break;
        }
        return out;
      }
      return cand.slice(0, opts.limit || 20).map((o) => o.uid);
    },

    /* ---------- スキルレベル（同じスキルカードを合成） ---------- */
    renderSkillLevel() {
      $("fuseDesc").textContent = "固有/リーダー/追加スキルを個別にレベルアップ（同じスキルのカードを消費）";
      const fs = this.fuseState;
      const baseInst = fs.base ? this.instById(fs.base) : null;
      const baseCard = baseInst ? Store.materialize(baseInst) : null;

      if (!baseCard) {
        $("fuseArea").innerHTML = `<div class="toolbar"><b>強化したいカードを選択：</b></div><div class="card-grid" id="fusePool"></div>`;
        this.fillSkillPool();
        return;
      }
      // スキルスロット一覧
      const slots = [];
      if (baseCard.skill && baseCard.skill.type !== "none") slots.push({ slot: "innate", id: baseCard.skill.id, label: "固有", name: baseCard.skill.name, lv: baseInst.innateLv || 1 });
      if (baseCard.leaderSkill) slots.push({ slot: "leader", id: baseCard.leaderSkillId, label: "リーダー", name: baseCard.leaderSkill.name, lv: baseInst.leaderLv || 1 });
      (baseCard.extraSkills || []).forEach((s) => slots.push({ slot: "extra", id: s.id, label: "追加", name: s.name, lv: (baseInst.extraLv && baseInst.extraLv[s.id]) || 1 }));

      const sel = fs.slot ? slots.find((s) => s.slot === fs.slot && s.id === fs.skillId) : null;
      let detail = "";
      if (sel) {
        const need = Data.skillUpCost(sel.lv);
        const isMaxLv = sel.lv >= Data.MAX_SKILL_LEVEL;
        // 同じスキルの素材候補
        const valids = Store.state.owned.filter((o) => {
          if (o.uid === fs.base) return false;
          const b = Data.byId[o.id];
          if (sel.slot === "leader") return b.leaderSkill === sel.id;
          return b.skill && b.skill.id === sel.id;
        });
        const chosen = fs.mats.filter((u) => this.instById(u));
        detail = `
          <div class="skill-panel">
            <p>「<b>${sel.name}</b>」（${sel.label}） 現在 <b>Lv.${sel.lv}</b> / ${Data.MAX_SKILL_LEVEL}</p>
            ${isMaxLv ? '<p style="color:var(--gold)">スキルレベルが最大です</p>' :
              `<p class="muted">Lv.${sel.lv}→${sel.lv + 1} に必要：同じスキルのカード <b>${need}</b> 枚（選択 ${chosen.length}/${need}）</p>
               <div class="row" style="margin:8px 0"><button class="gold" id="doSkillUp" ${chosen.length >= need ? "" : "disabled"}>スキルレベルアップ</button>
               <button id="skillAuto">おまかせで${need}枚選ぶ</button>
               <span class="muted">素材は消費されます</span></div>
               <p class="muted" style="font-size:11px;margin:0 0 6px">🔒 デッキ編成中・お気に入りのカードは対象外です</p>
               <div class="toolbar"><b>素材（「${sel.name}」を持つカード）：</b></div>
               <div class="card-grid" id="skillMatPool">${valids.length ? "" : '<span class="muted">同じスキルを持つカードがありません。</span>'}</div>`}
          </div>`;
      }

      $("fuseArea").innerHTML = `
        <div class="fusion-zone">
          <div><div class="muted" style="margin-bottom:6px">強化するカード</div>
            <div class="fusion-slot">${cardHTML(baseCard)}</div>
            <button class="ghost" id="skillBack" style="margin-top:8px">別のカードを選ぶ</button></div>
          <div style="flex:1;min-width:220px">
            <div class="muted" style="margin-bottom:6px">スキルを選択</div>
            <div class="skill-slot-list">${slots.map((s) => `<button class="skill-slot ${fs.slot === s.slot && fs.skillId === s.id ? "sel" : ""}" data-slot="${s.slot}" data-sid="${s.id}"><span class="ss-label">${s.label}</span> ${s.name} <span class="ss-lv">Lv.${s.lv}</span></button>`).join("")}</div>
            ${detail}
          </div>
        </div>`;
      $("skillBack").onclick = () => { UI.fuseState = { mode: "skill", base: null, slot: null, skillId: null, mats: [] }; UI.renderFusion(); };
      $("fuseArea").querySelectorAll(".skill-slot").forEach((b) => (b.onclick = () => { fs.slot = b.dataset.slot; fs.skillId = b.dataset.sid; fs.mats = []; UI.renderSkillLevel(); }));

      if (sel) {
        const pool = $("skillMatPool");
        if (pool) {
          const valids = Store.state.owned.filter((o) => {
            if (o.uid === fs.base) return false;
            const b = Data.byId[o.id];
            if (sel.slot === "leader") return b.leaderSkill === sel.id;
            return b.skill && b.skill.id === sel.id;
          });
          pool.innerHTML += valids.map((o) => {
            const card = Store.materialize(o);
            const isSel = fs.mats.includes(o.uid);
            const prot = Store.isProtected(o.uid) && !isSel;
            return cardHTML(card, { selectable: !prot, dim: prot, selected: isSel, locked: prot, data: `data-mat="${o.uid}"` });
          }).join("");
          pool.querySelectorAll("[data-mat]").forEach((el) => (el.onclick = () => {
            const u = el.dataset.mat;
            if (Store.isProtected(u) && !fs.mats.includes(u)) { UI.toast("保護中のカードは選べません"); return; }
            const idx = fs.mats.indexOf(u);
            if (idx >= 0) fs.mats.splice(idx, 1); else fs.mats.push(u);
            UI.renderSkillLevel();
          }));
          const sa = $("skillAuto");
          if (sa) sa.onclick = () => {
            const need = Data.skillUpCost(sel.lv);
            const pick = valids.filter((o) => !Store.isProtected(o.uid))
              .sort((a, b) => Data.rarityRank(Data.byId[a.id].rarity) - Data.rarityRank(Data.byId[b.id].rarity))
              .slice(0, need).map((o) => o.uid);
            if (pick.length < need) { UI.toast(`素材が足りません（保護カードを除く ${pick.length}/${need}）`); }
            fs.mats = pick; UI.renderSkillLevel();
          };
        }
        const btn = $("doSkillUp");
        if (btn) btn.onclick = () => {
          const r = Store.skillUp(fs.base, fs.slot, fs.skillId, fs.mats.slice());
          if (!r.ok) { UI.toast(r.reason); return; }
          if (window.Quest) Quest.bump("fusion");
          fs.mats = [];
          UI.afterChange(); UI.toast(`スキルLv.${r.level} に上昇！`); UI.renderSkillLevel();
        };
      }
    },
    fillSkillPool() {
      const pool = $("fusePool");
      const groups = this.groups().map((g) => ({ ...g, card: Store.materialize(g.insts[0]) }));
      // 何かしらスキルを持つカードのみ（固有 or リーダーは全カード持つ）
      pool.innerHTML = groups.map((g) => cardHTML(g.card, { qty: g.insts.length, selectable: true, data: `data-key="${g.key}"` })).join("");
      pool.querySelectorAll("[data-key]").forEach((el) => (el.onclick = () => {
        const g = groups.find((x) => x.key === el.dataset.key);
        UI.fuseState.base = g.insts[0].uid; UI.fuseState.slot = null; UI.fuseState.skillId = null; UI.fuseState.mats = [];
        UI.renderSkillLevel();
      }));
    },

    renderEnhance() {
      $("fuseDesc").textContent = "ベースに素材カード・経験値アイテムを合成してレベルアップ";
      const fs = this.fuseState;
      if (!fs.items) fs.items = {};
      if (!fs.mats) fs.mats = [];
      const baseCard = fs.base ? Store.resolveCard(fs.base) : null;
      let gain = 0;
      fs.mats.forEach((u) => { const i = Store.getInstance(u); if (i) gain += Data.cardXp(Data.byId[i.id].rarity); });
      for (const iid in fs.items) { const it = Data.itemById(iid); if (it) gain += it.xp * fs.items[iid]; }
      // 予測レベル
      let predLv = baseCard ? baseCard.level : 1, predExp = baseCard ? baseCard.exp + gain : 0;
      if (baseCard) { const rarity = baseCard.rarity; while (predLv < Data.MAX_LEVEL && predExp >= Data.expToNext(rarity, predLv)) { predExp -= Data.expToNext(rarity, predLv); predLv++; } if (predLv >= Data.MAX_LEVEL) predExp = 0; }
      const items = Data.ITEMS.map((it) => {
        const have = Store.itemCount(it.id), use = fs.items[it.id] || 0;
        return `<div class="item-chip ${have ? "" : "empty"} ${use ? "sel" : ""}" data-item="${it.id}">
          <span class="ico">${it.art}</span>
          <span class="meta"><b>${it.name}</b><span>+${it.xp} EXP</span></span>
          <span class="qn">所持${have}</span>
          <span class="item-stepper"><button data-step="-1" data-iid="${it.id}">−</button><b>${use}</b><button data-step="1" data-iid="${it.id}">＋</button></span>
        </div>`;
      }).join("");
      $("fuseArea").innerHTML = `
        <div class="fusion-zone">
          <div><div class="muted" style="margin-bottom:6px">ベース（強化する側）</div>
            <div class="fusion-slot">${baseCard ? cardHTML(baseCard) : '<span class="muted">下からカードを選択</span>'}</div></div>
          <div class="fusion-arrow">＋EXP</div>
          <div><div class="muted" style="margin-bottom:6px">獲得経験値</div>
            <div class="fusion-slot" style="display:block">
              <p style="font-size:24px;font-weight:900;color:var(--cyan);margin:0">+${gain} <span style="font-size:13px;color:var(--text-dim)">EXP</span></p>
              ${baseCard ? `<p class="muted">Lv.${baseCard.level} → <b style="color:var(--gold)">Lv.${predLv}</b>${predLv >= Data.MAX_LEVEL ? "（MAX）" : ` (EXP ${predExp}/${Data.expToNext(baseCard.rarity, predLv)})`}</p>` : ""}
            </div></div>
        </div>
        <div class="muted" style="margin:4px 0 4px">経験値アイテム</div>
        <div class="item-strip">${items || '<span class="muted">アイテムなし</span>'}</div>
        <div class="row" style="margin-bottom:12px">
          <button class="gold" id="doEnhance" ${baseCard && gain > 0 && !baseCard.isMax ? "" : "disabled"}>強化する</button>
          ${baseCard && !baseCard.isMax ? `<button id="autoPick">おまかせ選択</button>` : ""}
          ${fs.mats.length ? `<button class="ghost" id="clearMats">素材クリア</button>` : ""}
          <span class="muted">${!baseCard ? "ベースを選択してください" : baseCard.isMax ? "このカードはMAXです" : gain > 0 ? "素材カード/アイテムを合成" : "素材を選んでください"}</span>
        </div>
        ${baseCard ? '<p class="muted" style="font-size:11px;margin:0 0 8px">🔒 デッキ編成中・お気に入りのカードは「おまかせ選択」の対象外です（手動でも選べません）。</p>' : ""}
        <div class="toolbar"><b>${fs.base ? "素材カード" : "ベース"}を選択：</b> <span class="muted">（素材カードは消費されます）</span></div>
        <div class="card-grid" id="fusePool"></div>`;
      // item steppers
      $("fuseArea").querySelectorAll("[data-step]").forEach((b) => (b.onclick = (e) => {
        e.stopPropagation();
        const iid = b.dataset.iid, step = +b.dataset.step, have = Store.itemCount(iid);
        let v = (fs.items[iid] || 0) + step;
        v = Math.max(0, Math.min(have, v)); fs.items[iid] = v;
        UI.renderEnhance();
      }));
      const groups = this.groups().map((g) => ({ ...g, card: Store.materialize(g.insts[0]) }));
      $("fusePool").innerHTML = groups.map((g) => {
        const baseHere = fs.base && g.insts.some((i) => i.uid === fs.base);
        const usedAsMat = g.insts.filter((i) => fs.mats.includes(i.uid)).length;
        const selectingBase = !fs.base;
        const protectedAll = !selectingBase && g.insts.every((i) => i.uid === fs.base || Store.isProtected(i.uid));
        const dim = (selectingBase && g.card.isMax) || protectedAll;
        return cardHTML(g.card, { qty: g.insts.length, selectable: !dim, dim, selected: baseHere || usedAsMat > 0, locked: !selectingBase && protectedAll, lockReason: "保護", data: `data-key="${g.key}"` });
      }).join("");
      $("fusePool").querySelectorAll("[data-key]").forEach((el) => (el.onclick = () => {
        const g = groups.find((x) => x.key === el.dataset.key);
        if (!fs.base) {
          if (g.card.isMax) { UI.toast("MAXのカードは強化できません"); return; }
          fs.base = g.insts[0].uid;
        } else {
          const avail = g.insts.find((i) => i.uid !== fs.base && !fs.mats.includes(i.uid) && !Store.isProtected(i.uid));
          if (!avail) { UI.toast("選べる素材がありません（保護中の可能性）"); return; }
          fs.mats.push(avail.uid);
        }
        UI.renderEnhance();
      }));
      const ap = $("autoPick");
      if (ap) ap.onclick = () => {
        const picked = UI.autoPickFodder(fs.base, { targetExp: (baseCard.expNeed || 0) - (baseCard.exp || 0) });
        if (picked.length === 0) { UI.toast("おまかせ選択できる素材がありません（保護カードを除く）"); return; }
        fs.mats = picked; UI.renderEnhance();
        UI.toast(`おまかせで ${picked.length} 枚を選択`);
      };
      const cm = $("clearMats"); if (cm) cm.onclick = () => { fs.mats = []; UI.renderEnhance(); };
      const btn = $("doEnhance");
      if (btn) btn.onclick = () => {
        const usedItems = Object.values(fs.items || {}).some((v) => v > 0);
        const r = Store.feedExp(fs.base, fs.mats.slice(), { ...fs.items });
        if (!r.ok) { UI.toast(r.reason); return; }
        if (window.Quest) { if (r.levels > 0) Quest.bump("levelup", r.levels); if (usedItems) Quest.bump("enhance_item"); }
        const baseUid = fs.base;
        UI.fuseState = { mode: "enhance", base: Store.getInstance(baseUid) ? baseUid : null, mats: [], items: {} };
        UI.afterChange();
        UI.toast(r.levels > 0 ? `+${r.gained}EXP → Lv.${r.level}！` : `+${r.gained}EXP`);
        UI.renderFusion();
      };
    },

    renderInherit() {
      $("fuseDesc").textContent = "ベースはMAXレベル必須・素材の固有スキルを追加（最大2つ）";
      const fs = this.fuseState;
      const baseCard = fs.base ? Store.resolveCard(fs.base) : null;
      const matCard = fs.mats[0] ? Store.resolveCard(fs.mats[0]) : null;
      const cost = 500;
      const ready = baseCard && matCard;
      $("fuseArea").innerHTML = `
        <div class="fusion-zone">
          <div><div class="muted" style="margin-bottom:6px">ベース（MAXレベル・追加される側）</div>
            <div class="fusion-slot">${baseCard ? cardHTML(baseCard) : '<span class="muted">下からMAXカードを選択</span>'}</div></div>
          <div class="fusion-arrow">＋スキル</div>
          <div><div class="muted" style="margin-bottom:6px">素材（消費・スキル提供）</div>
            <div class="fusion-slot">${matCard ? cardHTML(matCard) : '<span class="muted">下から選択</span>'}</div></div>
        </div>
        <div class="row" style="margin-bottom:14px">
          <button class="gold" id="doFuse" ${ready ? "" : "disabled"}>スキル合成（🪙${cost}）</button>
          <span class="muted">${ready ? `「${baseCard.name}」に「${matCard.skill.name || "—"}」を追加` : "MAXのベースと素材を選んでください"}</span>
        </div>
        <div class="toolbar"><b>${fs.base ? "素材" : "ベース(MAX)"}を選択：</b></div>
        <div class="card-grid" id="fusePool"></div>`;
      const groups = this.groups().map((g) => ({ ...g, card: Store.materialize(g.insts[0]) }));
      $("fusePool").innerHTML = groups.map((g) => {
        const used = (fs.base && g.insts.some((i) => i.uid === fs.base)) || (fs.mats[0] && g.insts.some((i) => i.uid === fs.mats[0]));
        const selectingBase = !fs.base;
        const dim = selectingBase && !g.card.isMax;
        return cardHTML(g.card, { qty: g.insts.length, selectable: !dim, dim, selected: used, data: `data-key="${g.key}"` });
      }).join("");
      $("fusePool").querySelectorAll("[data-key]").forEach((el) => (el.onclick = () => {
        const g = groups.find((x) => x.key === el.dataset.key);
        if (!fs.base) {
          if (!g.card.isMax) { UI.toast("ベースはMAXレベルが必要です"); return; }
          if ((g.insts[0].extraSkills || []).length >= Data.EXTRA_SKILL_CAP) { UI.toast("追加スキルが上限です"); return; }
          fs.base = g.insts[0].uid;
        } else if (!fs.mats[0]) {
          const pick = g.insts.find((i) => i.uid !== fs.base) || g.insts[0];
          if (pick.uid === fs.base) { UI.toast("別のカードを選んでください"); return; }
          fs.mats[0] = pick.uid;
        } else { fs.base = null; fs.mats = []; if (g.card.isMax) fs.base = g.insts[0].uid; }
        UI.renderInherit();
      }));
      const btn = $("doFuse");
      if (btn) btn.onclick = () => {
        if (Store.state.coins < cost) { UI.toast("コインが足りません"); return; }
        const matInst = this.instById(fs.mats[0]);
        const matBase = Data.byId[matInst.id];
        if (!matBase.skill || matBase.skill.type === "none") { UI.toast("素材にスキルがありません"); return; }
        const r = Store.addSkill(fs.base, matBase.skill.id);
        if (!r.ok) { UI.toast(r.reason); return; }
        Store.spendCoins(cost); Store.removeCard(matInst.uid); Store.save();
        UI.fuseState = { mode: "inherit", base: null, mats: [] };
        if (window.Quest) Quest.bump("fusion");
        UI.afterChange(); UI.toast(`スキル合成成功：${matBase.skill.name}`); UI.renderFusion();
      };
    },

    renderUpgrade() {
      const tiers = { N: "R", R: "SR", SR: "SSR", SSR: "UR" };
      const fs = this.fuseState;
      if (!fs.targetFrom) fs.targetFrom = null; // 素材レア
      $("fuseDesc").textContent = "作りたいレアを選ぶと素材が自動選択されます（生成カードはランダム）";

      // 各レアの保有数（保護除外で素材にできる枚数）
      const fromRarities = ["N", "R", "SR", "SSR"];
      const counts = {};
      fromRarities.forEach((r) => {
        const need = Data.FUSE_UPGRADE_COUNT[r];
        const avail = Store.state.owned.filter((o) => Data.byId[o.id].rarity === r && !Store.isProtected(o.uid));
        counts[r] = { need, have: avail.length, uids: avail.map((o) => o.uid) };
      });

      const tiles = fromRarities.map((r) => {
        const c = counts[r], ok = c.have >= c.need, sel = fs.targetFrom === r;
        return `<button class="up-tier ${sel ? "sel" : ""}" data-from="${r}" ${ok ? "" : "disabled"}>
          <div class="ut-target">${tiers[r]} を生成</div>
          <div class="ut-need">${r} ×${c.need} を消費</div>
          <div class="ut-have ${ok ? "ok" : "ng"}">素材 ${c.have}/${c.need}${ok ? "" : "（不足）"}</div>
        </button>`;
      }).join("");

      const from = fs.targetFrom;
      const picked = from && counts[from].have >= counts[from].need ? counts[from].uids.slice(0, counts[from].need) : [];
      const target = from ? tiers[from] : null;

      $("fuseArea").innerHTML = `
        <p class="muted">同じレアを規定数まとめると上位レアが <b>1枚ランダム</b>で生成されます。<br>生成カードは選べませんが、同じレアの中でも<b>出現率の低い激レア</b>が当たることがあります。</p>
        <div class="up-tier-grid">${tiles}</div>
        <p class="muted" style="font-size:11px;margin-top:8px">🔒 デッキ編成中・お気に入りのカードは素材から自動で除外されます。</p>
        ${from ? `
          <div class="up-confirm">
            <div class="muted" style="margin-bottom:8px">自動選択された素材（${from} ×${picked.length}）：</div>
            <div class="up-mat-row">${picked.map((u) => { const c = Store.materialize(Store.getInstance(u)); return cardHTML(c, { mini: true }); }).join("")}</div>
            <div class="row" style="margin-top:12px">
              <button class="gold" id="doUpgrade">${target} をランダム生成する</button>
              <button class="ghost" id="upReselect">選び直す</button>
            </div>
          </div>` : `<p class="muted" style="margin-top:14px">上のボタンから作りたいレアを選んでください。</p>`}`;

      $("fuseArea").querySelectorAll("[data-from]").forEach((b) => (b.onclick = () => {
        fs.targetFrom = b.dataset.from; UI.renderUpgrade();
      }));
      const re = $("upReselect"); if (re) re.onclick = () => { fs.targetFrom = null; UI.renderUpgrade(); };
      const du = $("doUpgrade");
      if (du) du.onclick = () => {
        if (picked.length < counts[from].need) { UI.toast("素材が不足しています"); return; }
        const r = Store.upgradeFuse(picked, target);
        if (!r.ok) { UI.toast(r.reason); return; }
        if (window.Quest) Quest.bump("fusion");
        UI.fuseState = { mode: "upgrade", base: null, mats: [], targetFrom: null };
        UI.afterChange();
        UI.upgradeReveal(r.card);
      };
    },

    // 生成結果の演出（ランダム）
    upgradeReveal(card) {
      const mc = Store.materialize({ id: card.id, level: 1, marks: card.marks.slice(), extraSkills: [] });
      const rare = (card.weight || 100) <= 35;
      UI.modal({
        title: rare ? "✨ 激レア出現！ ✨" : "🎉 上位レア生成成功！",
        body: `<p class="muted" style="text-align:center">生成されたカード${rare ? "（出現率が低い激レアカードです！）" : ""}</p>
          <div class="reveal-grid" style="justify-content:center">${cardHTML(mc)}</div>`,
        actions: [{ label: "確認", primary: true, onClick: () => { UI.closeModal(); UI.renderFusion(); } }],
      });
    },

    /* ---------- DUNGEON ---------- */
    renderDungeon() {
      const list = $("dungeonList");
      list.innerHTML = World.DUNGEONS.map((d) => {
        const p = Store.state.dungeon[d.id] || { cleared: 0, boss: false };
        const dots = [1, 2, 3, 4, 5].map((s) => {
          const cleared = s <= p.cleared, cur = s === Math.min(p.cleared + 1, 5);
          return `<div class="stage-dot ${cleared ? "clear" : ""} ${s === 5 ? "boss" : ""} ${cur && !cleared ? "current" : ""}">${s === 5 ? "★" : s}</div>`;
        }).join("");
        const pct = (p.cleared / 5) * 100;
        return `<div class="dungeon-card">
          <div class="lv">Lv.${d.level}</div><h3>${d.name}</h3>
          <div class="stage-track">${dots}</div>
          <div class="prog"><i style="width:${pct}%"></i></div>
          <div class="row"><button class="primary" data-d="${d.id}">${p.cleared >= 5 ? "再挑戦" : "挑戦"}</button>
          ${p.boss ? '<span class="chip">制覇済</span>' : ""}</div></div>`;
      }).join("");
      list.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => Battle.startDungeon(b.dataset.d)));
    },

    /* ---------- ARENA ---------- */
    renderArena() {
      const s = Store.state;
      const power = World.deckPower(s);
      const def = s.arena.defense.map((u) => Store.resolveCard(u)).filter(Boolean);
      const logHTML = (s.arena.log || []).map((b) =>
        `<tr><td>${b.win ? "🟦 勝利" : "🟥 敗北"}</td><td>vs ${b.opp}</td><td class="num">🪙${b.coins}${b.diamonds ? " 💎" + b.diamonds : ""}</td></tr>`).join("");
      $("arenaBody").innerHTML = `
        <div class="row" style="margin-bottom:14px">
          <span class="chip">防衛戦力 <b>${power}</b></span>
          <span class="chip">登録 <b>${def.length}/5</b></span>
          <span class="spacer"></span><button class="gold" id="leagueBtn">本日のリーグ戦を実行</button>
        </div>
        <div class="deck-slots" id="arenaSlots"></div>
        ${logHTML ? `<h3>直近の自動対戦</h3><table class="rank"><tbody>${logHTML}</tbody></table>` : '<p class="muted">カードを登録してリーグ戦を実行すると、自動対戦の結果と報酬がここに表示されます。</p>'}
        <p class="muted" style="margin-top:16px">本来は毎日決まった時刻にサーバ側で他プレイヤーと自動対戦します。ここではローカルのモック対戦で再現しています。</p>
        <h3 style="margin-top:20px">登録するカードを選択</h3>
        <div class="card-grid" id="arenaPool"></div>`;
      const slots = $("arenaSlots");
      for (let i = 0; i < 5; i++) {
        const uid = s.arena.defense[i];
        const el = document.createElement("div");
        if (uid) {
          const c = Store.resolveCard(uid);
          el.className = "deck-slot filled";
          el.innerHTML = `<div class="art">${c.art}</div><div>${c.name}</div>`;
          el.onclick = () => { s.arena.defense = s.arena.defense.filter((u) => u !== uid); Store.save(); UI.renderArena(); };
        } else { el.className = "deck-slot"; el.innerHTML = `<div class="art">＋</div><div>空き</div>`; }
        slots.appendChild(el);
      }
      const groups = this.groups().map((g) => ({ ...g, card: Store.materialize(g.insts[0]) }));
      $("arenaPool").innerHTML = groups.map((g) => {
        const inDef = g.insts.filter((i) => s.arena.defense.includes(i.uid)).length;
        const avail = g.insts.length - inDef;
        return cardHTML(g.card, { qty: g.insts.length, selectable: avail > 0, dim: avail === 0, data: `data-key="${g.key}"` });
      }).join("");
      $("arenaPool").querySelectorAll("[data-key]").forEach((el) => (el.onclick = () => {
        if (s.arena.defense.length >= 5) { UI.toast("登録は5枚までです"); return; }
        const g = groups.find((x) => x.key === el.dataset.key);
        const free = g.insts.find((i) => !s.arena.defense.includes(i.uid));
        if (!free) return;
        s.arena.defense.push(free.uid); Store.save(); UI.renderArena();
      }));
      $("leagueBtn").onclick = () => {
        const res = World.runLeague(s);
        if (!res.ok) { UI.toast(res.reason); return; }
        if (window.Quest) Quest.bump("arena");
        UI.afterChange(); UI.renderArena();
        UI.toast(`リーグ戦完了：🪙${res.coins}${res.diamonds ? " 💎" + res.diamonds : ""}`);
      };
    },

    /* ---------- QUEST ---------- */
    showClaimedQuests: false,
    renderQuests() {
      if (!window.Quest) { $("questBody").innerHTML = '<div class="empty-note">クエストを読み込めませんでした。</div>'; return; }
      Quest.checkReset();
      const showClaimed = this.showClaimedQuests;
      const section = (title, sub, list) => {
        const visible = list.filter((x) => showClaimed || !Quest.isClaimed(x.id));
        if (visible.length === 0) return "";
        const rows = visible.map((x) => {
          const prog = Quest.progress(x.id), done = prog >= x.goal, claimed = Quest.isClaimed(x.id);
          const pct = Math.min(100, (prog / x.goal) * 100);
          return `<div class="quest ${claimed ? "claimed" : done ? "done" : ""}">
            <div class="q-main">
              <div class="q-name">${x.name} ${claimed ? '<span class="q-badge ok">受取済</span>' : done ? '<span class="q-badge go">達成</span>' : ""}</div>
              <div class="q-desc">${x.desc}</div>
              <div class="q-bar"><i style="width:${pct}%"></i></div>
              <div class="q-meta"><span>${Math.min(prog, x.goal)} / ${x.goal}</span><span class="muted">報酬：${Quest.rewardText(x.reward)}</span></div>
            </div>
            <div class="q-act"><button class="gold" data-claim="${x.id}" ${done && !claimed ? "" : "disabled"}>${claimed ? "受取済" : "受け取る"}</button></div>
          </div>`;
        }).join("");
        return `<div class="quest-section"><h3>${title} <span class="muted" style="font-weight:400">${sub}</span></h3>${rows}</div>`;
      };
      const claimable = Quest.claimable();
      const claimedCount = ["start", "daily", "weekly", "achievement"].reduce((a, k) => a + Quest.list(k).filter((x) => Quest.isClaimed(x.id)).length, 0);
      $("questBody").innerHTML =
        `<div class="claim-all-bar">
           <span>受け取れる報酬：<b>${claimable}</b> 件</span>
           <span class="spacer"></span>
           <button class="ghost" id="toggleClaimed">${showClaimed ? "受領済みを隠す" : `受領済みを表示(${claimedCount})`}</button>
           <button class="gold" id="claimAllBtn" ${claimable ? "" : "disabled"}>まとめて受け取る</button>
         </div>` +
        section("🔰 序盤ミッション", "ゲームに慣れながら報酬ゲット", Quest.list("start")) +
        section("デイリー", "毎日0時にリセット", Quest.list("daily")) +
        section("ウィークリー", "毎週リセット", Quest.list("weekly")) +
        section("実績", "一度だけ達成できます", Quest.list("achievement")) ||
        '<div class="empty-note">表示できるクエストがありません。</div>';
      const tc = $("toggleClaimed"); if (tc) tc.onclick = () => { UI.showClaimedQuests = !UI.showClaimedQuests; UI.renderQuests(); };
      const cab = $("claimAllBtn");
      if (cab) cab.onclick = () => {
        const r = Quest.claimAll();
        if (r.count === 0) { UI.toast("受け取れる報酬がありません"); return; }
        UI.afterChange(); UI.toast(`${r.count}件受取：${Quest.rewardText(r.reward)}`); UI.renderQuests();
      };
      $("questBody").querySelectorAll("[data-claim]").forEach((b) => (b.onclick = () => {
        const r = Quest.claim(b.dataset.claim);
        if (!r.ok) { UI.toast(r.reason); return; }
        UI.afterChange(); UI.toast(`報酬獲得：${Quest.rewardText(r.reward)}`); UI.renderQuests();
      }));
    },

    /* ---------- CARD DEX（図鑑） ---------- */
    ownedCountById(id) { return Store.state.owned.filter((o) => o.id === id).length; },
    renderDex() {
      const rarities = ["UR", "SSR", "SR", "R", "N"];
      const all = Data.cards.slice();
      const totalAll = all.length;
      const ownedKinds = all.filter((c) => this.ownedCountById(c.id) > 0).length;
      const pct = Math.round((ownedKinds / totalAll) * 100);
      const head = `
        <div class="dex-progress">
          <div class="dex-prog-top"><b>コンプリート率</b><span class="dex-pct ${pct === 100 ? "done" : ""}">${pct}%</span></div>
          <div class="dex-bar"><i style="width:${pct}%"></i></div>
          <div class="muted">${ownedKinds} / ${totalAll} 種 を収集${pct === 100 ? " 🎉 全コンプ達成！" : ""}</div>
        </div>`;
      const sections = rarities.map((r) => {
        const list = all.filter((c) => c.rarity === r);
        const own = list.filter((c) => this.ownedCountById(c.id) > 0).length;
        const cells = list.map((c) => {
          const cnt = this.ownedCountById(c.id);
          if (cnt > 0) {
            const card = Store.materialize({ id: c.id, level: 1, marks: c.marks.slice(), extraSkills: [] });
            return `<div class="dex-cell owned" data-dex="${c.id}">${cardHTML(card, { mini: true, noMarks: true })}<div class="dex-have">×${cnt}</div></div>`;
          }
          return `<div class="dex-cell locked rar-${r}"><div class="dex-q">？</div><div class="dex-qname">？？？</div></div>`;
        }).join("");
        const complete = own === list.length;
        return `<div class="dex-section">
          <h3 class="dex-rhead rar-${r}">${r} <span class="muted">${own}/${list.length}</span> ${complete ? '<span class="dex-complete">COMPLETE!</span>' : ""}</h3>
          <div class="dex-grid">${cells}</div></div>`;
      }).join("");
      $("dexBody").innerHTML = head + sections;
      $("dexBody").querySelectorAll("[data-dex]").forEach((el) => (el.onclick = () => UI.dexDetail(el.dataset.dex)));
    },
    dexDetail(id) {
      const c = Data.byId[id]; if (!c) return;
      const cnt = this.ownedCountById(id);
      const card = Store.materialize({ id, level: 1, marks: c.marks.slice(), extraSkills: [] });
      const lsTxt = card.leaderSkill ? `<p>👑 リーダースキル：<b>${card.leaderSkill.name}</b>（${Data.leaderDesc(card.leaderSkill, 1)}）</p>` : '<p class="muted">リーダースキルなし（SSR以上が保有）</p>';
      UI.modal({
        title: `No.${id} ${c.name}`,
        body: `<div class="dex-detail">
            <div class="dex-detail-card">${cardHTML(card, { noMarks: false })}</div>
            <div class="dex-detail-info">
              <p><span class="rs-chip rs-${c.rarity}"><b>${c.rarity}</b></span> 　所持 <b>${cnt}</b> 枚</p>
              <p>基礎 ⚔${c.baseAtk} / 🛡${c.baseDef}</p>
              <p>攻撃マーク：${c.marks.join(" ")}</p>
              <p>${skillLine(card)}</p>
              ${lsTxt}
              <p class="muted">${c.weight && c.weight <= 35 ? "★出現率の低い激レアカード" : ""}</p>
            </div>
          </div>`,
        actions: [{ label: "閉じる", primary: true, onClick: () => UI.closeModal() }],
      });
    },
    miniBoard(cells, cap) {
      // cells: 9要素（3x3）。各要素 {t:'ally'|'enemy'|'empty'|'block'|'ally2'|'enemy2', a:'矢印', fx:'flip'|'pulse'|'down'|'mark'}
      const cell = (c) => {
        if (!c || c.t === "empty") return '<div class="mb-cell"></div>';
        if (c.t === "block") return '<div class="mb-cell block">■</div>';
        const cls = c.t.replace("2", "");
        const arrow = c.a ? `<span class="mb-arrow">${c.a}</span>` : "";
        const fx = c.fx ? ` fx-${c.fx}` : "";
        return `<div class="mb-cell ${cls}${fx}">${c.g || ""}${arrow}</div>`;
      };
      return `<div class="mini-board">${cells.map(cell).join("")}</div>${cap ? `<div class="mb-cap">${cap}</div>` : ""}`;
    },
    renderSkills() {
      const M = (cells, cap) => this.miniBoard(cells, cap);
      const A = { t: "ally", g: "🟦" }, E = { t: "enemy", g: "🟥" }, _ = { t: "empty" };
      const docs = [
        { name: "基本：攻撃と味方化", fam: "基本", desc: "設置したカードの攻撃マーク（▼）の方向にいる敵を、攻撃力＞相手の防御力 なら味方化（裏返し）します。",
          board: M([_, { t: "ally", g: "🟦", a: "→", fx: "pulse" }, { t: "enemy", g: "🟥", fx: "flip" }, _, _, _, _, _, _], "🟦の攻撃 → 🟥が味方化（🟦へ）") },
        { name: "基本：反撃", fam: "基本", desc: "攻撃しても倒せず、相手の攻撃マークが自分を向いていると反撃されます。反撃力＞自分の防御力 だと逆に寝返ります。",
          board: M([_, { t: "ally", g: "🟦", a: "→" }, { t: "enemy", g: "🟥", a: "←", fx: "pulse" }, _, _, _, _, _, _], "互いに向き合うと反撃が発生") },
        { name: "連鎖の咆哮（chain）", fam: "勝利時", desc: "攻撃で味方化に成功したとき、その方向のさらに先のカードも味方化します（必ず発動）。",
          board: M([{ t: "ally", g: "🟦", a: "→", fx: "pulse" }, { t: "enemy", g: "🟥", fx: "flip" }, { t: "enemy", g: "🟥", fx: "flip" }, _, _, _, _, _, _], "1体目→2体目まで連鎖で味方化") },
        { name: "連撃の連鎖（確率）", fam: "勝利時", desc: "攻撃成功時、一定確率でその先のカードも攻撃します。発動率はスキルレベルで上昇（例：Lv1 30%→Lv3 60%）。発動時は抽選エフェクトが表示されます。",
          board: M([{ t: "ally", g: "🟦", a: "→", fx: "pulse" }, { t: "enemy", g: "🟥", fx: "flip" }, { t: "enemy", g: "🟥", fx: "mark" }, _, _, _, _, _, _], "🎯抽選成功でその先も味方化") },
        { name: "会心（確率）", fam: "攻撃時", desc: "攻撃時、一定確率で攻撃力が大きく上昇します。発動率・上昇量ともにレベルで強化。発動時は抽選エフェクトが出ます。",
          board: M([_, { t: "ally", g: "🟦", a: "→", fx: "mark" }, { t: "enemy", g: "🟥", fx: "flip" }, _, _, _, _, _, _], "🎯抽選成功で攻撃力UP") },
        { name: "毒牙（pierce）", fam: "攻撃時", desc: "攻撃時、相手の防御力を一定割合だけ無視して攻撃します。レベルで無視率UP。",
          board: M([_, { t: "ally", g: "🟦", a: "→", fx: "pulse" }, { t: "enemy", g: "🟥", fx: "flip" }, _, _, _, _, _, _], "相手の防御を貫通") },
        { name: "加護（guard）", fam: "防御時", desc: "1回だけ、受けた攻撃を無効化します（ブロック）。",
          board: M([_, { t: "enemy", g: "🟥", a: "→" }, { t: "ally", g: "🟦", fx: "pulse", g2: 1 }, _, _, _, _, _, _], "最初の攻撃を無効化") },
        { name: "弱体の呪い（weaken）", fam: "登場時", desc: "登場時、隣接する敵カードの防御力を下げます。レベルで効果UP。倒しやすくなります。",
          board: M([{ t: "enemy", g: "🟥", fx: "down" }, { t: "enemy", g: "🟥", fx: "down" }, _, { t: "enemy", g: "🟥", fx: "down" }, { t: "ally", g: "🟦", fx: "pulse" }, { t: "enemy", g: "🟥", fx: "down" }, _, _, _], "隣接敵の防御力ダウン") },
        { name: "守護の陣（field_ally_def）", fam: "登場時", desc: "登場時、隣接する味方の防御力を上げます。レベルで効果UP。",
          board: M([{ t: "ally", g: "🟦", fx: "pulse" }, { t: "ally", g: "🟦", fx: "pulse" }, _, { t: "ally", g: "🟦", fx: "pulse" }, { t: "ally", g: "🟦", fx: "mark" }, { t: "ally", g: "🟦", fx: "pulse" }, _, _, _], "隣接味方の防御力アップ") },
        { name: "増殖の刻印（bonus_mark）", fam: "登場時", desc: "登場時、自分の攻撃マークがランダムに増えます。レベルで増加数UP。攻撃範囲が広がります。",
          board: M([{ t: "empty", a: "↖" }, { t: "empty", a: "↑" }, { t: "empty", a: "↗" }, { t: "empty", a: "←" }, { t: "ally", g: "🟦", fx: "mark" }, { t: "empty", a: "→" }, _, { t: "empty", a: "↓" }, _], "攻撃マークが増える") },
        { name: "急襲 / 構え / 返し突き", fam: "ステータス", desc: "急襲＝攻撃時に攻撃力UP、構え＝防御時に防御力UP、返し突き＝反撃時に攻撃力UP。いずれもレベルで上昇量が増えます。",
          board: M([_, { t: "ally", g: "🟦", a: "→", fx: "mark" }, { t: "enemy", g: "🟥" }, _, _, _, _, _, _], "状況に応じてステータス上昇") },
        { name: "リーダースキル", fam: "リーダー", desc: "デッキのリーダーに設定したカードのリーダースキルが、試合全体に作用します（例：デッキ全体の攻撃力UP、後攻になる確率UP、報酬・アイテム入手率UPなど）。レベルで効果UP。",
          board: M([{ t: "ally", g: "👑", fx: "pulse" }, { t: "ally", g: "🟦", fx: "mark" }, { t: "ally", g: "🟦", fx: "mark" }, { t: "ally", g: "🟦", fx: "mark" }, _, _, _, _, _], "リーダーが味方全体を強化") },
      ];
      const groups = {};
      docs.forEach((d) => { (groups[d.fam] = groups[d.fam] || []).push(d); });
      $("skillsBody").innerHTML = Object.keys(groups).map((fam) =>
        `<div class="quest-section"><h3>${fam}</h3>` +
        groups[fam].map((d) =>
          `<div class="skill-doc">
            <div class="sd-board">${d.board}</div>
            <div class="sd-text"><h4>${d.name}</h4><p>${d.desc}</p></div>
          </div>`).join("") +
        `</div>`).join("");
    },
    renderRanking() {
      const rk = World.ranking(Store.state);
      const top = rk.rows.slice(0, 50);
      $("rankingBody").innerHTML = `
        <p>あなたは <b>${rk.rank}</b> 位 / 全 ${rk.total} 人　（スコア ${rk.me.score}）</p>
        <table class="rank"><thead><tr><th>順位</th><th>プレイヤー</th><th>スコア</th><th>戦力</th></tr></thead>
        <tbody>${top.map((r, i) => `<tr class="${r.me ? "me" : ""}"><td>${i + 1}</td><td>${r.name}${r.me ? " (あなた)" : ""}</td><td class="num">${r.score}</td><td class="num">${r.power || "-"}</td></tr>`).join("")}</tbody></table>
        <p class="muted" style="margin-top:12px">スコアはダンジョン進捗（クリアステージ数・ボス制覇）で決まります。全プレイヤー横断ランキングは本来サーバで集計しますが、ここではモックで再現しています。</p>`;
    },

    refreshView() {
      const active = document.querySelector(".view.active");
      if (!active) return;
      const id = active.id.replace("view-", "");
      const map = { collection: this.renderCollection, deck: this.renderDeck, fusion: this.renderFusion, arena: this.renderArena, home: this.renderHome };
      (map[id] || (() => {})).call(this);
    },
    afterChange() { this.refreshWallet(); },
  };

  window.UI = UI;
})();
