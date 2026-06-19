/* ===== storage.js : localStorage 永続化 ===== */
(function () {
  const KEY = "cardgame_save_v1";
  const NAME_KEY = "cardgame_names_v1";

  function uuid() { return "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  const Store = {
    state: null,

    defaultState() {
      return {
        player: null, coins: 1000, diamonds: 30,
        owned: [],     // [{ uid, id, marks:[], level:1, exp:0, extraSkills:[skillId], fav, seq }]
        seqCounter: 0,
        items: {},     // { itemId: count }
        deck: [], savedDecks: [], leaderUid: null, dungeon: {}, dailyGacha: null,
        features: {},
        quests: { prog: {}, claimed: {}, daily: null, weekly: null },
        arena: { defense: [], lastClaim: 0, log: [] },
        stats: { battles: 0, wins: 0 }, seenIntro: false,
      };
    },

    load() {
      try { this.state = JSON.parse(localStorage.getItem(KEY)) || this.defaultState(); }
      catch (e) { console.warn("セーブ破損。初期化します。", e); this.state = this.defaultState(); }
      const d = this.defaultState();
      for (const k in d) if (!(k in this.state)) this.state[k] = d[k];
      // 旧フォーマット移行
      this.state.owned.forEach((inst) => {
        if (!inst.marks || !inst.marks.length) {
          const base = Data.byId[inst.id];
          inst.marks = base ? base.marks.slice() : Data.randomMarks();
        }
        if (!inst.level) inst.level = 1;
        if (typeof inst.exp !== "number") inst.exp = 0;
        if (!inst.extraSkills) inst.extraSkills = inst.inherit ? [inst.inherit] : [];
        delete inst.inherit;
        if (!inst.innateLv) inst.innateLv = 1;
        if (!inst.leaderLv) inst.leaderLv = 1;
        if (!inst.extraLv) inst.extraLv = {};
        if (typeof inst.fav !== "boolean") inst.fav = false;
      });
      if (!("leaderUid" in this.state)) this.state.leaderUid = null;
      if (!("features" in this.state)) this.state.features = {};
      if (typeof this.state.seqCounter !== "number") this.state.seqCounter = 0;
      this.state.owned.forEach((inst) => { if (typeof inst.seq !== "number") inst.seq = ++this.state.seqCounter; });
      this.save();
      return this.state;
    },

    save() { localStorage.setItem(KEY, JSON.stringify(this.state)); },
    reset() { this.state = this.defaultState(); this.save(); },

    /* ---- 名前レジストリ ---- */
    names() { try { return JSON.parse(localStorage.getItem(NAME_KEY) || "[]"); } catch { return []; } },
    nameTaken(name) {
      const n = name.trim().toLowerCase();
      if (n === (this.state.player?.name || "").toLowerCase()) return false;
      const all = this.names().map((x) => x.toLowerCase());
      const mocks = (window.World?.mockNames?.() || []).map((x) => x.toLowerCase());
      return all.includes(n) || mocks.includes(n);
    },
    registerName(name) {
      const old = this.state.player?.name;
      const filtered = this.names().filter((x) => x !== old);
      filtered.push(name);
      localStorage.setItem(NAME_KEY, JSON.stringify(filtered));
    },

    createPlayer(name) { this.state.player = { name, createdAt: Date.now() }; this.registerName(name); this.save(); },
    renamePlayer(name) { this.registerName(name); this.state.player.name = name; this.save(); },

    addCoins(n) { this.state.coins += n; this.save(); },
    addDiamonds(n) { this.state.diamonds += n; this.save(); },
    spendCoins(n) { if (this.state.coins < n) return false; this.state.coins -= n; this.save(); return true; },
    spendDiamonds(n) { if (this.state.diamonds < n) return false; this.state.diamonds -= n; this.save(); return true; },

    /* ---- 所持カード ---- */
    addCard(id, opts = {}) {
      const inst = {
        uid: uuid(), id,
        marks: opts.marks || Data.randomMarks(),
        level: opts.level || 1, exp: opts.exp || 0,
        extraSkills: opts.extraSkills ? opts.extraSkills.slice() : [],
        innateLv: opts.innateLv || 1, leaderLv: opts.leaderLv || 1, extraLv: opts.extraLv ? { ...opts.extraLv } : {},
        fav: false, seq: ++this.state.seqCounter,
      };
      this.state.owned.push(inst);
      this.save();
      if (window.Quest) { Quest.bump("obtain"); const r = Data.byId[id] && Data.byId[id].rarity; if (r === "SSR" || r === "UR") window.Announce && window.Announce.self(id); }
      return inst;
    },
    removeCard(uid) {
      this.state.owned = this.state.owned.filter((c) => c.uid !== uid);
      this.state.deck = this.state.deck.filter((u) => u !== uid);
      if (this.state.leaderUid === uid) this.state.leaderUid = this.state.deck[0] || null;
      (this.state.savedDecks || []).forEach((p) => { p.cards = p.cards.filter((u) => u !== uid); if (p.leader === uid) p.leader = p.cards[0] || null; });
      this.state.arena.defense = this.state.arena.defense.filter((u) => u !== uid);
      this.save();
    },
    getInstance(uid) { return this.state.owned.find((c) => c.uid === uid) || null; },

    resolveCard(uid) { const inst = this.getInstance(uid); return inst ? this.materialize(inst) : null; },
    materialize(inst) {
      const base = Data.byId[inst.id];
      if (!base) return null;
      const level = inst.level || 1;
      const marks = (inst.marks && inst.marks.length) ? inst.marks.slice() : base.marks.slice();
      const extraLv = inst.extraLv || {};
      const extras = (inst.extraSkills || []).map((sid) => { const s = Data.skillById(sid); return s ? { ...s, level: extraLv[sid] || 1 } : null; }).filter(Boolean);
      const isMax = level >= Data.MAX_LEVEL;
      const skill = base.skill ? { ...base.skill, level: inst.innateLv || 1 } : base.skill;
      const lsDef = Data.leaderSkillById(base.leaderSkill);
      const leaderSkill = lsDef ? { ...lsDef, level: inst.leaderLv || 1 } : null;
      return {
        uid: inst.uid, id: base.id, name: base.name, rarity: base.rarity, art: base.art,
        image: base.image || null,
        baseAtk: base.baseAtk, baseDef: base.baseDef, marks, level,
        exp: inst.exp || 0, expNeed: isMax ? 0 : Data.expToNext(base.rarity, level),
        skill, extraSkills: extras, leaderSkill, leaderSkillId: base.leaderSkill, isMax,
        fav: !!inst.fav, seq: inst.seq || 0,
      };
    },

    /* ---- お気に入り ---- */
    toggleFavInsts(uids, val) { uids.forEach((u) => { const i = this.getInstance(u); if (i) i.fav = (val === undefined ? !i.fav : !!val); }); this.save(); },
    isFav(uid) { const i = this.getInstance(uid); return !!(i && i.fav); },
    inAnyDeck(uid) {
      if (this.state.deck.includes(uid)) return true;
      return (this.state.savedDecks || []).some((p) => p.cards.includes(uid));
    },
    // 合成素材から除外したいカード（お気に入り or デッキ編成に含まれる）
    isProtected(uid) { return this.isFav(uid) || this.inAnyDeck(uid); },

    /* ---- アイテム ---- */
    addItem(id, n = 1) { this.state.items[id] = (this.state.items[id] || 0) + n; this.save(); },
    itemCount(id) { return this.state.items[id] || 0; },
    spendItem(id, n = 1) { if ((this.state.items[id] || 0) < n) return false; this.state.items[id] -= n; if (this.state.items[id] <= 0) delete this.state.items[id]; this.save(); return true; },

    /* ---- レベル / 経験値合成 ---- */
    applyExp(inst) {
      const rarity = Data.byId[inst.id].rarity;
      let levels = 0;
      while ((inst.level || 1) < Data.MAX_LEVEL && inst.exp >= Data.expToNext(rarity, inst.level)) {
        inst.exp -= Data.expToNext(rarity, inst.level);
        inst.level += 1; levels++;
      }
      if ((inst.level || 1) >= Data.MAX_LEVEL) inst.exp = 0;
      return levels;
    },
    feedExp(uid, fodderUids = [], itemUse = {}) {
      const inst = this.getInstance(uid);
      if (!inst) return { ok: false, reason: "見つかりません" };
      if ((inst.level || 1) >= Data.MAX_LEVEL) return { ok: false, reason: "既にMAXレベルです" };
      fodderUids = fodderUids.filter((u) => u !== uid);
      let gained = 0;
      fodderUids.forEach((fu) => { const fi = this.getInstance(fu); if (fi) gained += Data.cardXp(Data.byId[fi.id].rarity); });
      for (const iid in itemUse) { const it = Data.itemById(iid); const n = itemUse[iid] || 0; if (it && n > 0) gained += it.xp * n; }
      if (gained <= 0) return { ok: false, reason: "素材を選んでください" };
      fodderUids.forEach((fu) => this.removeCard(fu));
      for (const iid in itemUse) { if (itemUse[iid] > 0) this.spendItem(iid, itemUse[iid]); }
      const fresh = this.getInstance(uid);
      fresh.exp = (fresh.exp || 0) + gained;
      const levels = this.applyExp(fresh);
      this.save();
      return { ok: true, gained, levels, level: fresh.level, exp: fresh.exp };
    },
    addSkill(uid, skillId) {
      const inst = this.getInstance(uid);
      if (!inst) return { ok: false, reason: "見つかりません" };
      if ((inst.level || 1) < Data.MAX_LEVEL) return { ok: false, reason: "MAXレベルが必要です" };
      inst.extraSkills = inst.extraSkills || [];
      if (inst.extraSkills.length >= Data.EXTRA_SKILL_CAP) return { ok: false, reason: "追加スキルが上限です" };
      if (inst.extraSkills.includes(skillId)) return { ok: false, reason: "同じスキルは付与済み" };
      inst.extraSkills.push(skillId);
      this.save();
      return { ok: true };
    },

    /* ---- デッキ ---- */
    deckToggle(uid) {
      const d = this.state.deck, i = d.indexOf(uid);
      if (i >= 0) { d.splice(i, 1); if (this.state.leaderUid === uid) this.state.leaderUid = d[0] || null; }
      else { if (d.length >= 6) return "full"; d.push(uid); if (!this.state.leaderUid) this.state.leaderUid = uid; }
      this.save();
      return "ok";
    },
    deckCards() { return this.state.deck.map((u) => this.resolveCard(u)).filter(Boolean); },
    setLeader(uid) { if (this.state.deck.includes(uid)) { this.state.leaderUid = uid; this.save(); return true; } return false; },
    leaderCard() { const u = this.state.leaderUid; return (u && this.state.deck.includes(u)) ? this.resolveCard(u) : (this.state.deck[0] ? this.resolveCard(this.state.deck[0]) : null); },

    /* ---- 機能解放 ---- */
    dungeonCleared(index) { const id = (window.World && World.DUNGEONS[index]) ? World.DUNGEONS[index].id : null; return !!(id && this.state.dungeon[id] && this.state.dungeon[id].boss); },
    autoUnlocked() { return this.dungeonCleared(0); },
    skillFusionUnlocked() { return this.dungeonCleared(1); },

    /* ---- スキルレベルアップ（同じスキルカードを合成） ---- */
    skillUp(uid, slot, skillId, materialUids) {
      const inst = this.getInstance(uid);
      if (!inst) return { ok: false, reason: "見つかりません" };
      if (!this.skillFusionUnlocked()) return { ok: false, reason: "ダンジョン2クリアで解放されます" };
      let curLv, isSameSkill;
      const base = Data.byId[inst.id];
      if (slot === "innate") { curLv = inst.innateLv || 1; isSameSkill = (b) => b.skill && b.skill.id === base.skill.id; }
      else if (slot === "leader") { curLv = inst.leaderLv || 1; isSameSkill = (b) => b.leaderSkill === base.leaderSkill; }
      else { curLv = (inst.extraLv && inst.extraLv[skillId]) || 1; isSameSkill = (b) => b.skill && b.skill.id === skillId; }
      if (curLv >= Data.MAX_SKILL_LEVEL) return { ok: false, reason: "スキルLvが最大です" };
      const need = Data.skillUpCost(curLv);
      const mats = (materialUids || []).filter((u) => u !== uid);
      if (mats.length < need) return { ok: false, reason: `素材が${need}枚必要です` };
      for (const mu of mats.slice(0, need)) { const mi = this.getInstance(mu); if (!mi || !isSameSkill(Data.byId[mi.id])) return { ok: false, reason: "同じスキルのカードが必要です" }; }
      mats.slice(0, need).forEach((mu) => this.removeCard(mu));
      const fresh = this.getInstance(uid);
      if (slot === "innate") fresh.innateLv = curLv + 1;
      else if (slot === "leader") fresh.leaderLv = curLv + 1;
      else { fresh.extraLv = fresh.extraLv || {}; fresh.extraLv[skillId] = curLv + 1; }
      this.save();
      return { ok: true, level: curLv + 1 };
    },

    /* ---- 保存デッキ（最大5つ） ---- */
    MAX_DECKS: 5,
    saveDeckPreset(name) {
      if (!this.state.savedDecks) this.state.savedDecks = [];
      if (this.state.savedDecks.length >= this.MAX_DECKS) return { ok: false, reason: "保存できるデッキは5つまでです" };
      if (this.state.deck.length === 0) return { ok: false, reason: "編成中のデッキが空です" };
      this.state.savedDecks.push({ name: name || `デッキ${this.state.savedDecks.length + 1}`, cards: this.state.deck.slice(), leader: this.state.leaderUid });
      this.save();
      return { ok: true };
    },
    overwriteDeckPreset(index, name) {
      const p = this.state.savedDecks[index];
      if (!p) return { ok: false, reason: "対象がありません" };
      if (this.state.deck.length === 0) return { ok: false, reason: "編成中のデッキが空です" };
      p.cards = this.state.deck.slice(); p.leader = this.state.leaderUid;
      if (name) p.name = name;
      this.save();
      return { ok: true };
    },
    loadDeckPreset(index) {
      const p = this.state.savedDecks[index];
      if (!p) return { ok: false, reason: "対象がありません" };
      const valid = p.cards.filter((u) => this.getInstance(u)).slice(0, 6);
      this.state.deck = valid;
      this.state.leaderUid = (p.leader && valid.includes(p.leader)) ? p.leader : (valid[0] || null);
      this.save();
      return { ok: true, dropped: p.cards.length - valid.length };
    },
    renameDeckPreset(index, name) { const p = this.state.savedDecks[index]; if (p) { p.name = name; this.save(); } },
    deleteDeckPreset(index) { this.state.savedDecks.splice(index, 1); this.save(); },

    /* ---- ダンジョン ---- */
    dungeonProg(id) { if (!this.state.dungeon[id]) this.state.dungeon[id] = { cleared: 0, boss: false }; return this.state.dungeon[id]; },
    setDungeonProg(id, cleared, boss) { const p = this.dungeonProg(id); p.cleared = Math.max(p.cleared, cleared); if (boss) p.boss = true; this.save(); },

    /* ---- デイリー無料ガチャ ---- */
    todayStr() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; },
    canDaily() { return this.state.dailyGacha !== this.todayStr(); },
    markDaily() { this.state.dailyGacha = this.todayStr(); this.save(); },
  };

  window.Store = Store;
  window._uuid = uuid;
})();
