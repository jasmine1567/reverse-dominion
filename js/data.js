/* ===== data.js : マスタデータのロードと共通定義 ===== */
(function () {
  const DIRS = {
    N: [-1, 0], NE: [-1, 1], E: [0, 1], SE: [1, 1],
    S: [1, 0], SW: [1, -1], W: [0, -1], NW: [-1, -1],
  };
  const ALL_DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const OPPOSITE = { N: "S", S: "N", E: "W", W: "E", NE: "SW", SW: "NE", NW: "SE", SE: "NW" };
  const RARITY_ORDER = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };
  const RARITY_NEXT = { N: "R", R: "SR", SR: "SSR", SSR: "UR" };
  const SELL_VALUE = { N: 20, R: 60, SR: 200, SSR: 800, UR: 2500 };
  const FUSE_UPGRADE_COUNT = { N: 3, R: 3, SR: 4, SSR: 5 };
  const MAX_LEVEL = 10;
  const LEVELUP_BASE = { N: 80, R: 150, SR: 400, SSR: 1200, UR: 3000 };
  const EXTRA_SKILL_CAP = 2;

  function markCoef(n) { return Math.max(0.45, 1 - (n - 1) * 0.07); }
  function levelMult(level) { return 1 + ((level || 1) - 1) * 0.06; }

  function effAtk(card) {
    const m = (card.marks || []).length || 1;
    return Math.round(card.baseAtk * markCoef(m) * levelMult(card.level));
  }
  function effDef(card) {
    const m = (card.marks || []).length || 1;
    return Math.round(card.baseDef * markCoef(m) * levelMult(card.level));
  }
  function levelUpCost(rarity, level) { return LEVELUP_BASE[rarity] * level; }

  // ランダムな攻撃マーク（数も方向もランダム。2〜4方向が出やすい）
  function randomMarks() {
    const cw = [[1, 3], [2, 8], [3, 10], [4, 9], [5, 6], [6, 4], [7, 2], [8, 1]];
    const total = cw.reduce((a, x) => a + x[1], 0);
    let n = Math.random() * total, count = 1;
    for (const [c, w] of cw) { if (n < w) { count = c; break; } n -= w; }
    const pool = ALL_DIRS.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, count).sort((a, b) => ALL_DIRS.indexOf(a) - ALL_DIRS.indexOf(b));
  }

  const Data = {
    DIRS, ALL_DIRS, OPPOSITE, RARITY_ORDER, RARITY_NEXT, SELL_VALUE, FUSE_UPGRADE_COUNT,
    MAX_LEVEL, EXTRA_SKILL_CAP,
    markCoef, levelMult, effAtk, effDef, levelUpCost, randomMarks,
    cards: [], byId: {}, ready: false,

    async load() {
      let json = null;
      try {
        const res = await fetch("cards.json", { cache: "no-store" });
        if (!res.ok) throw new Error("status " + res.status);
        json = await res.json();
      } catch (e) {
        console.warn("cards.json の fetch に失敗。内蔵フォールバックを使用します。", e);
        json = window.CARDS_FALLBACK || null;
      }
      if (!json) throw new Error("カードデータを読み込めませんでした。ローカルサーバ経由で開いてください。");
      this.cards = json.cards;
      this.byId = {};
      this.cards.forEach((c) => (this.byId[c.id] = c));
      this.ready = true;
      return this;
    },

    skillById(skillId) {
      for (const c of this.cards) if (c.skill && c.skill.id === skillId) return c.skill;
      return null;
    },
    rarityRank(r) { return RARITY_ORDER[r] ?? 0; },
  };

  window.Data = Data;
})();
