/* ===== ui.js : 画面描画・モーダル・トースト ===== */
(function () {
  const $ = (id) => document.getElementById(id);

  function marksHTML(marks, wrapCls = "card-marks") {
    return `<div class="${wrapCls}">` + (marks || []).map((d) => `<i class="amk dir-${d}"></i>`).join("") + "</div>";
  }

  function skillLine(card) {
    const parts = [];
    if (card.skill && card.skill.type !== "none") parts.push(`<b>${card.skill.name}</b>：${card.skill.desc}`);
    else parts.push('<span class="muted">固有スキルなし</span>');
    (card.extraSkills || []).forEach((s) => parts.push(`<b style="color:var(--cyan)">＋${s.name}</b>：${s.desc}`));
    return parts.join("<br>");
  }

  function cardHTML(card, opts = {}) {
    const cls = ["card"];
    if (opts.selectable) cls.push("selectable");
    if (opts.selected) cls.push("selected");
    if (opts.dim) cls.push("dim");
    if (opts.mini) cls.push("mini");
    const qty = opts.qty ? `<div class="qty">×${opts.qty}</div>` : "";
    const ea = Data.effAtk(card), ed = Data.effDef(card);
    const lv = card.level >= Data.MAX_LEVEL ? "MAX" : "Lv." + card.level;
    return (
      `<div class="${cls.join(" ")}" data-rarity="${card.rarity}" ${opts.data || ""}>` +
      (opts.noMarks ? "" : marksHTML(card.marks)) +
      `<div class="card-top"><span class="rar">${card.rarity}</span><span class="card-lv">${lv}</span></div>` +
      qty +
      `<div class="card-art-frame"><div class="art">${card.art}</div></div>` +
      `<div class="nm">${card.name}</div>` +
      `<div class="stat"><span class="a">⚔${ea}</span><span class="d">🛡${ed}</span></div>` +
      (opts.mini ? "" : `<div class="skill">${skillLine(card)}</div>`) +
      `</div>`
    );
  }

  const UI = {
    cardHTML, marksHTML, skillLine,

    show(view) {
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      $("view-" + view)?.classList.add("active");
      document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
      const map = {
        home: this.renderHome, gacha: () => {}, collection: this.renderCollection,
        deck: this.renderDeck, fusion: this.renderFusion, dungeon: this.renderDungeon,
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

    /* ---------- HOME ---------- */
    renderHome() {
      const s = Store.state;
      $("homeGreeting").textContent = `ようこそ、${s.player?.name || "プレイヤー"} さん`;
      const owned = s.owned.length;
      const clears = World.DUNGEONS.filter((d) => s.dungeon[d.id]?.boss).length;
      const rk = World.ranking(s);
      const tile = (label, val, view, icon) =>
        `<div class="card selectable" data-tile="${view}" style="text-align:center">
          <div class="card-art-frame"><div class="art">${icon}</div></div>
          <div class="nm">${label}</div><div class="stat"><b style="font-size:16px">${val}</b></div></div>`;
      $("homeBody").innerHTML = `
        <div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">
          ${tile("所持カード", owned + " 枚", "collection", "🃏")}
          ${tile("デッキ", s.deck.length + " / 5", "deck", "🎴")}
          ${tile("ダンジョン制覇", clears + " / " + World.DUNGEONS.length, "dungeon", "🏰")}
          ${tile("ランキング", rk.rank + " 位 / " + rk.total, "ranking", "📊")}
        </div>
        <div class="row" style="margin-top:22px">
          <button class="primary" data-go="gacha">ガチャを引く</button>
          <button data-go="dungeon">ダンジョンに挑む</button>
          <button class="ghost" id="resetBtn">セーブをリセット</button>
        </div>
        <p class="muted" style="margin-top:18px">対人要素（競技場の自動対戦・全体ランキング）は本来サーバが必要なため、ここではローカルのモックで動作しています。</p>`;
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
    renderCollection() {
      const grid = $("collectionGrid");
      const rarity = $("colRarity").value, sort = $("colSort").value;
      let groups = this.groups().map((g) => ({ ...g, card: Store.materialize(g.insts[0]) }));
      if (rarity) groups = groups.filter((g) => g.card.rarity === rarity);
      groups.sort((a, b) => {
        if (sort === "atk") return Data.effAtk(b.card) - Data.effAtk(a.card);
        if (sort === "def") return Data.effDef(b.card) - Data.effDef(a.card);
        if (sort === "name") return a.card.name.localeCompare(b.card.name, "ja");
        return Data.rarityRank(b.card.rarity) - Data.rarityRank(a.card.rarity) || b.card.level - a.card.level;
      });
      $("colCount").textContent = `所持 ${Store.state.owned.length} 枚 / ${groups.length} 種`;
      if (groups.length === 0) { grid.innerHTML = `<div class="empty-note">カードがありません。ガチャを引いてみましょう。</div>`; return; }
      grid.innerHTML = groups.map((g) => cardHTML(g.card, { qty: g.insts.length, selectable: true, data: `data-key="${g.key}"` })).join("");
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
              <p>${skillLine(card)}</p>
              ${isMax ? '<p style="color:var(--gold)">★MAX到達：合成タブで「スキル合成」が可能です</p>' : ""}
              <p class="muted">所持 ${g.insts.length} 枚 / 1枚売却で 🪙${sell}</p>
            </div></div>`,
        actions: [
          { label: "閉じる", onClick: () => UI.closeModal() },
          ...(!isMax ? [{ label: "強化する（経験値合成）", primary: true, onClick: () => {
              UI.closeModal();
              UI.fuseState = { mode: "enhance", base: inst.uid, mats: [], items: {} };
              UI.show("fusion");
            } }] : []),
          { label: `1枚売却(🪙${sell})`, onClick: () => {
              Store.removeCard(inst.uid); Store.addCoins(sell); UI.afterChange(); UI.refreshView(); UI.toast(`売却 +🪙${sell}`);
              const ng = UI.groups().find((x) => x.key === key); ng ? UI.cardDetail(key) : UI.closeModal();
            } },
        ],
      });
    },

    /* ---------- DECK ---------- */
    renderDeck() {
      const slots = $("deckSlots");
      slots.innerHTML = "";
      for (let i = 0; i < 5; i++) {
        const uid = Store.state.deck[i];
        const el = document.createElement("div");
        if (uid) {
          const card = Store.resolveCard(uid);
          el.className = "deck-slot filled";
          el.innerHTML = `<div class="art">${card.art}</div><div>${card.name}</div><div class="muted">Lv${card.level} ⚔${Data.effAtk(card)} 🛡${Data.effDef(card)}</div>`;
          el.onclick = () => { Store.deckToggle(uid); UI.renderDeck(); };
        } else { el.className = "deck-slot"; el.innerHTML = `<div class="art">＋</div><div>空き</div>`; }
        slots.appendChild(el);
      }
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
        if (Store.deckToggle(free.uid) === "full") UI.toast("デッキは5枚までです");
        UI.renderDeck();
      }));
    },

    /* ---------- FUSION ---------- */
    fuseState: { mode: "inherit", base: null, mats: [] },
    renderFusion() {
      const v = $("view-fusion");
      v.innerHTML = `
        <div class="section-title"><h2>合成</h2><p>レベル強化（経験値）／スキル合成（MAXに追加付与）／上位レア昇華（SSR・URはここでのみ）</p></div>
        <div class="toolbar">
          <button id="fmEnhance">レベル強化</button>
          <button id="fmInherit">スキル合成</button>
          <button id="fmUpgrade">上位レア昇華</button>
          <span class="spacer"></span><span class="muted" id="fuseDesc"></span>
        </div>
        <div id="fuseArea"></div>`;
      $("fmEnhance").onclick = () => { UI.fuseState = { mode: "enhance", base: null, mats: [], items: {} }; UI.renderFusion(); };
      $("fmInherit").onclick = () => { UI.fuseState = { mode: "inherit", base: null, mats: [] }; UI.renderFusion(); };
      $("fmUpgrade").onclick = () => { UI.fuseState = { mode: "upgrade", base: null, mats: [] }; UI.renderFusion(); };
      $("fmEnhance").classList.toggle("primary", this.fuseState.mode === "enhance");
      $("fmInherit").classList.toggle("primary", this.fuseState.mode === "inherit");
      $("fmUpgrade").classList.toggle("primary", this.fuseState.mode === "upgrade");
      const m = this.fuseState.mode;
      m === "enhance" ? this.renderEnhance() : m === "inherit" ? this.renderInherit() : this.renderUpgrade();
    },
    instById(uid) { return Store.state.owned.find((o) => o.uid === uid); },

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
          <span class="muted">${!baseCard ? "ベースを選択してください" : baseCard.isMax ? "このカードはMAXです" : gain > 0 ? "素材カード/アイテムを合成" : "素材を選んでください"}</span>
        </div>
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
        const dim = selectingBase && g.card.isMax;
        return cardHTML(g.card, { qty: g.insts.length, selectable: !dim || !selectingBase, dim, selected: baseHere || usedAsMat > 0, data: `data-key="${g.key}"` });
      }).join("");
      $("fusePool").querySelectorAll("[data-key]").forEach((el) => (el.onclick = () => {
        const g = groups.find((x) => x.key === el.dataset.key);
        if (!fs.base) {
          if (g.card.isMax) { UI.toast("MAXのカードは強化できません"); return; }
          fs.base = g.insts[0].uid;
        } else {
          const avail = g.insts.find((i) => i.uid !== fs.base && !fs.mats.includes(i.uid));
          if (!avail) { UI.toast("選べるカードがありません"); return; }
          fs.mats.push(avail.uid);
        }
        UI.renderEnhance();
      }));
      const btn = $("doEnhance");
      if (btn) btn.onclick = () => {
        const r = Store.feedExp(fs.base, fs.mats.slice(), { ...fs.items });
        if (!r.ok) { UI.toast(r.reason); return; }
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
        UI.afterChange(); UI.toast(`スキル合成成功：${matBase.skill.name}`); UI.renderFusion();
      };
    },

    renderUpgrade() {
      const tiers = { N: "R", R: "SR", SR: "SSR", SSR: "UR" };
      const fs = this.fuseState;
      $("fuseDesc").textContent = "同レアを規定数まとめて上位レアを1枚生成";
      const baseInst = fs.base ? this.instById(fs.base) : null;
      const baseRarity = baseInst ? Data.byId[baseInst.id].rarity : null;
      const need = baseRarity ? Data.FUSE_UPGRADE_COUNT[baseRarity] : null;
      const target = baseRarity ? tiers[baseRarity] : null;
      const chosen = [fs.base, ...fs.mats].filter(Boolean);
      const ready = baseRarity && chosen.length === need;
      const targetPool = target ? Data.cards.filter((c) => c.rarity === target) : [];
      $("fuseArea").innerHTML = `
        <p class="muted">必要数：N×3 / R×3 / SR×4 → SSR / SSR×5 → UR</p>
        <div class="row" style="margin:8px 0">
          ${baseRarity ? `<b>${baseRarity} ${chosen.length}/${need} 枚選択中</b> → 生成: ${target}` : "<b>昇華したいレアのカードを選んでください</b>"}
          <span class="spacer"></span><button class="ghost" id="clearSel">選択クリア</button>
        </div>
        ${ready ? `<div class="row" style="margin-bottom:12px"><b>生成するカードを選択：</b></div>
          <div class="reveal-grid" id="targetPool">${targetPool.map((c) => cardHTML(Store.materialize({ id: c.id, level: 1, marks: c.marks, extraSkills: [] }), { selectable: true, noMarks: true, data: `data-tid="${c.id}"` })).join("")}</div>` : ""}
        <div class="toolbar" style="margin-top:14px"><b>素材を選択：</b></div>
        <div class="card-grid" id="fusePool"></div>`;
      $("clearSel").onclick = () => { fs.base = null; fs.mats = []; UI.renderUpgrade(); };
      const groups = this.groups().map((g) => ({ ...g, card: Store.materialize(g.insts[0]) }));
      $("fusePool").innerHTML = groups.map((g) => {
        const selCount = g.insts.filter((i) => chosen.includes(i.uid)).length;
        const matchRar = !baseRarity || g.card.rarity === baseRarity;
        return cardHTML(g.card, { qty: g.insts.length, selectable: matchRar, dim: !matchRar, selected: selCount > 0, data: `data-key="${g.key}"` });
      }).join("");
      $("fusePool").querySelectorAll("[data-key]").forEach((el) => (el.onclick = () => {
        const g = groups.find((x) => x.key === el.dataset.key);
        const r = g.card.rarity;
        if (baseRarity && r !== baseRarity) { UI.toast("同じレアリティで揃えてください"); return; }
        const avail = g.insts.find((i) => !chosen.includes(i.uid));
        if (!avail) { UI.toast("これ以上選べません"); return; }
        if (!fs.base) fs.base = avail.uid;
        else { const cap = Data.FUSE_UPGRADE_COUNT[baseRarity || r]; if (chosen.length >= cap) { UI.toast(`${cap}枚までです`); return; } fs.mats.push(avail.uid); }
        UI.renderUpgrade();
      }));
      if (ready) {
        $("targetPool").querySelectorAll("[data-tid]").forEach((el) => (el.onclick = () => {
          const tid = el.dataset.tid;
          chosen.forEach((uid) => Store.removeCard(uid));
          Store.addCard(tid);
          UI.fuseState = { mode: "upgrade", base: null, mats: [] };
          UI.afterChange(); UI.toast(`昇華成功：${Data.byId[tid].name} を入手！`); UI.renderFusion();
        }));
      }
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
        UI.afterChange(); UI.renderArena();
        UI.toast(`リーグ戦完了：🪙${res.coins}${res.diamonds ? " 💎" + res.diamonds : ""}`);
      };
    },

    /* ---------- RANKING ---------- */
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
