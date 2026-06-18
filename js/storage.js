/* ===== storage.js : localStorage 永続化 ===== */
(function () {
  const KEY = "cardgame_save_v1";
  const NAME_KEY = "cardgame_names_v1";

  function uuid() {
    return "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  const Store = {
    state: null,

    defaultState() {
      return {
        player: null,            // { name, createdAt }
        coins: 1000,
        diamonds: 30,
        owned: [],               // [{ uid, id, inherit: skillId|null }]
        deck: [],                // [uid] 最大6
        dungeon: {},             // { dungeonId: { cleared: n, boss: bool } }
        arena: { defense: [], lastClaim: 0, log: [] },
        stats: { battles: 0, wins: 0 },
        seenIntro: false,
      };
    },

    load() {
      try {
        const raw = localStorage.getItem(KEY);
        this.state = raw ? JSON.parse(raw) : this.defaultState();
      } catch (e) {
        console.warn("セーブ破損。初期化します。", e);
        this.state = this.defaultState();
      }
      // 後方互換の保険
      const d = this.defaultState();
      for (const k in d) if (!(k in this.state)) this.state[k] = d[k];
      return this.state;
    },

    save() {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    },

    reset() {
      this.state = this.defaultState();
      this.save();
    },

    /* ---- 名前レジストリ（重複不可。サーバ無しのためローカル＋モック） ---- */
    names() {
      try { return JSON.parse(localStorage.getItem(NAME_KEY) || "[]"); }
      catch { return []; }
    },
    nameTaken(name) {
      const n = name.trim().toLowerCase();
      const mine = (this.state.player?.name || "").toLowerCase();
      if (n === mine) return false; // 自分の現在名はOK
      const all = this.names().map((x) => x.toLowerCase());
      const mocks = (window.World?.mockNames?.() || []).map((x) => x.toLowerCase());
      return all.includes(n) || mocks.includes(n);
    },
    registerName(name) {
      const list = this.names();
      const old = this.state.player?.name;
      const filtered = list.filter((x) => x !== old);
      filtered.push(name);
      localStorage.setItem(NAME_KEY, JSON.stringify(filtered));
    },

    /* ---- プレイヤー ---- */
    createPlayer(name) {
      this.state.player = { name, createdAt: Date.now() };
      this.registerName(name);
      this.save();
    },
    renamePlayer(name) {
      this.registerName(name);
      this.state.player.name = name;
      this.save();
    },

    /* ---- 通貨 ---- */
    addCoins(n) { this.state.coins += n; this.save(); },
    addDiamonds(n) { this.state.diamonds += n; this.save(); },
    spendCoins(n) { if (this.state.coins < n) return false; this.state.coins -= n; this.save(); return true; },
    spendDiamonds(n) { if (this.state.diamonds < n) return false; this.state.diamonds -= n; this.save(); return true; },

    /* ---- 所持カード ---- */
    addCard(id, inherit = null) {
      const inst = { uid: uuid(), id, inherit };
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

    // バトル等で使う「実体カード」を生成（基礎データ＋継承スキル）
    resolveCard(uid) {
      const inst = this.getInstance(uid);
      if (!inst) return null;
      return this.materialize(inst);
    },
    materialize(inst) {
      const base = Data.byId[inst.id];
      if (!base) return null;
      const inheritSkill = inst.inherit ? findSkillById(inst.inherit) : null;
      return {
        uid: inst.uid,
        id: base.id,
        name: base.name,
        rarity: base.rarity,
        art: base.art,
        baseAtk: base.baseAtk,
        baseDef: base.baseDef,
        marks: base.marks.slice(),
        skill: base.skill,           // 固有スキル
        inheritSkill,                // 継承スキル（合成で付与）
      };
    },

    /* ---- デッキ ---- */
    deckToggle(uid) {
      const d = this.state.deck;
      const i = d.indexOf(uid);
      if (i >= 0) { d.splice(i, 1); }
      else { if (d.length >= 6) return "full"; d.push(uid); }
      this.save();
      return "ok";
    },
    deckCards() { return this.state.deck.map((u) => this.resolveCard(u)).filter(Boolean); },

    /* ---- ダンジョン進捗 ---- */
    dungeonProg(id) {
      if (!this.state.dungeon[id]) this.state.dungeon[id] = { cleared: 0, boss: false };
      return this.state.dungeon[id];
    },
    setDungeonProg(id, cleared, boss) {
      const p = this.dungeonProg(id);
      p.cleared = Math.max(p.cleared, cleared);
      if (boss) p.boss = true;
      this.save();
    },
  };

  function findSkillById(skillId) {
    for (const c of Data.cards) {
      if (c.skill && c.skill.id === skillId) return c.skill;
    }
    return null;
  }

  window.Store = Store;
  window._uuid = uuid;
})();
