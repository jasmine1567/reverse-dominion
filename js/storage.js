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
        owned: [],     // [{ uid, id, marks:[], level:1, extraSkills:[skillId] }]
        deck: [], dungeon: {},
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
        if (!inst.extraSkills) inst.extraSkills = inst.inherit ? [inst.inherit] : [];
        delete inst.inherit;
      });
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
        level: opts.level || 1,
        extraSkills: opts.extraSkills ? opts.extraSkills.slice() : [],
      };
      this.state.owned.push(inst);
      this.save();
      return inst;
    },
    removeCard(uid) {
      this.state.owned = this.state.owned.filter((c) => c.uid !== uid);
      this.state.deck = this.state.deck.filter((u) => u !== uid);
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
      const extras = (inst.extraSkills || []).map((sid) => Data.skillById(sid)).filter(Boolean);
      return {
        uid: inst.uid, id: base.id, name: base.name, rarity: base.rarity, art: base.art,
        baseAtk: base.baseAtk, baseDef: base.baseDef, marks, level,
        skill: base.skill, extraSkills: extras,
        isMax: level >= Data.MAX_LEVEL,
      };
    },

    /* ---- レベル / スキル ---- */
    levelUp(uid) {
      const inst = this.getInstance(uid);
      if (!inst) return { ok: false, reason: "見つかりません" };
      if ((inst.level || 1) >= Data.MAX_LEVEL) return { ok: false, reason: "既にMAXです" };
      const rarity = Data.byId[inst.id].rarity;
      const cost = Data.levelUpCost(rarity, inst.level || 1);
      if (this.state.coins < cost) return { ok: false, reason: "コインが足りません", cost };
      this.state.coins -= cost;
      inst.level = (inst.level || 1) + 1;
      this.save();
      return { ok: true, cost, level: inst.level };
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
      if (i >= 0) d.splice(i, 1);
      else { if (d.length >= 6) return "full"; d.push(uid); }
      this.save();
      return "ok";
    },
    deckCards() { return this.state.deck.map((u) => this.resolveCard(u)).filter(Boolean); },

    /* ---- ダンジョン ---- */
    dungeonProg(id) { if (!this.state.dungeon[id]) this.state.dungeon[id] = { cleared: 0, boss: false }; return this.state.dungeon[id]; },
    setDungeonProg(id, cleared, boss) { const p = this.dungeonProg(id); p.cleared = Math.max(p.cleared, cleared); if (boss) p.boss = true; this.save(); },
  };

  window.Store = Store;
  window._uuid = uuid;
})();
