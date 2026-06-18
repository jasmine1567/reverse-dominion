/* ===== world.js : ダンジョン / 競技場 / ランキング（サーバ無しのためモック） ===== */
(function () {
  const WORLD_KEY = "cardgame_world_v1";

  const DUNGEONS = [
    { id: "d1", name: "みならいの森", level: 1, tiers: ["N"], boss: ["N", "R"], mult: 1.0 },
    { id: "d2", name: "ゴブリン砦", level: 2, tiers: ["N", "R"], boss: ["R"], mult: 1.08 },
    { id: "d3", name: "古城の回廊", level: 3, tiers: ["R", "SR"], boss: ["SR"], mult: 1.16 },
    { id: "d4", name: "竜の巣", level: 4, tiers: ["SR"], boss: ["SR", "SSR"], mult: 1.24 },
    { id: "d5", name: "魔王城", level: 5, tiers: ["SR", "SSR"], boss: ["SSR", "UR"], mult: 1.34 },
  ];

  const MOCK_NAMES = [
    "アルテミス", "kuro_neko", "ゼファー", "Luna", "鋼鉄のジョー", "PixelKnight", "雪村", "Vortex",
    "おまる将軍", "Seraph", "三日月", "GhostByte", "リリス", "tatsumaki", "Nova", "黒曜",
    "白銀のレイ", "Crimson", "うどん大好き", "Echo", "ファルコン", "蒼天", "Mochi", "Drake",
    "夜叉丸", "Glitch", "ひまわり", "Zenith", "羅刹", "ProtoMan", "蛍", "Halcyon",
    "雷電", "Kobold99", "桜花", "Onyx", "牙狼", "Specter", "みかん星人", "Aether",
  ];

  function seededRand(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  const World = {
    DUNGEONS,
    _world: null,

    mockNames() { return MOCK_NAMES; },

    loadWorld() {
      if (this._world) return this._world;
      let w;
      try { w = JSON.parse(localStorage.getItem(WORLD_KEY)); } catch { w = null; }
      if (!w) {
        const rnd = seededRand(20260618);
        w = {
          players: MOCK_NAMES.map((name) => ({
            name,
            score: Math.floor(200 + rnd() * 9000),
            power: Math.floor(300 + rnd() * 1400),
          })),
        };
        localStorage.setItem(WORLD_KEY, JSON.stringify(w));
      }
      this._world = w;
      return w;
    },

    /* ---- ダンジョン CPU 編成 ---- */
    enemyDeck(dungeon, stage) {
      const isBoss = stage === 5;
      const tiers = isBoss ? dungeon.boss : dungeon.tiers;
      const pool = Data.cards.filter((c) => tiers.includes(c.rarity));
      const deck = [];
      const n = 5;
      const cpuLevel = Math.min(Data.MAX_LEVEL, 1 + Math.floor((dungeon.level - 1) * 1.6) + (stage - 1) + (isBoss ? 2 : 0));
      for (let i = 0; i < n; i++) {
        const base = pool[Math.floor(Math.random() * pool.length)] || Data.cards[0];
        const mult = dungeon.mult * (1 + (stage - 1) * 0.03) * (isBoss && i === 0 ? 1.25 : 1);
        deck.push({
          uid: "cpu_" + i + "_" + Math.random().toString(36).slice(2, 6),
          id: base.id, name: base.name, rarity: base.rarity, art: base.art,
          baseAtk: Math.round(base.baseAtk * mult),
          baseDef: Math.round(base.baseDef * mult),
          marks: Data.randomMarks(),
          level: cpuLevel,
          skill: base.skill, extraSkills: [],
          cpuBoss: isBoss && i === 0,
        });
      }
      return deck;
    },

    blockCells(size) {
      const count = Math.floor(Math.random() * 7); // 0..6
      const all = [];
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) all.push([r, c]);
      for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
      return all.slice(0, count);
    },

    /* ---- ランキング ---- */
    playerScore(state) {
      let s = 0;
      DUNGEONS.forEach((d) => {
        const p = state.dungeon[d.id];
        if (p) { s += d.level * 100 * p.cleared; if (p.boss) s += d.level * 300; }
      });
      return s;
    },
    ranking(state) {
      const w = this.loadWorld();
      const me = { name: state.player?.name || "あなた", score: this.playerScore(state), power: this.deckPower(state), me: true };
      const rows = w.players.map((p) => ({ ...p })).concat([me]);
      rows.sort((a, b) => b.score - a.score);
      const rank = rows.findIndex((r) => r.me) + 1;
      return { rows, rank, total: rows.length, me };
    },

    /* ---- 競技場 ---- */
    deckPower(state) {
      const cards = state.arena.defense.map((u) => Store.resolveCard(u)).filter(Boolean);
      return cards.reduce((a, c) => a + Data.effAtk(c) + Data.effDef(c), 0);
    },
    runLeague(state) {
      const w = this.loadWorld();
      const myPower = this.deckPower(state);
      if (state.arena.defense.length === 0) return { ok: false, reason: "防衛カードを登録してください" };
      const battles = [];
      let coins = 0, diamonds = 0;
      for (let i = 0; i < 5; i++) {
        const opp = w.players[Math.floor(Math.random() * w.players.length)];
        const pWin = Math.max(0.1, Math.min(0.9, 0.5 + (myPower - opp.power) / 2500));
        const win = Math.random() < pWin;
        const reward = win ? { c: 200 + Math.floor(Math.random() * 200), d: Math.random() < 0.5 ? 2 : 1 }
          : { c: 60 + Math.floor(Math.random() * 60), d: 0 };
        coins += reward.c; diamonds += reward.d;
        battles.push({ opp: opp.name, win, coins: reward.c, diamonds: reward.d });
      }
      state.coins += coins; state.diamonds += diamonds;
      state.arena.lastClaim = Date.now();
      state.arena.log = battles;
      Store.save();
      return { ok: true, battles, coins, diamonds };
    },
  };

  window.World = World;
})();
