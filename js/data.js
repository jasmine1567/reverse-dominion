/* ===== data.js : マスタデータのロードと共通定義 ===== */
(function () {
  const DIRS = {
    N: [-1, 0], NE: [-1, 1], E: [0, 1], SE: [1, 1],
    S: [1, 0], SW: [1, -1], W: [0, -1], NW: [-1, -1],
  };
  const OPPOSITE = { N: "S", S: "N", E: "W", W: "E", NE: "SW", SW: "NE", NW: "SE", SE: "NW" };
  const RARITY_ORDER = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };
  const RARITY_NEXT = { N: "R", R: "SR", SR: "SSR", SSR: "UR" };
  const SELL_VALUE = { N: 20, R: 60, SR: 200, SSR: 800, UR: 2500 };
  // 同名同レアをこの枚数集めると上位レアへ昇華
  const FUSE_UPGRADE_COUNT = { N: 3, R: 3, SR: 4, SSR: 5 };

  // 攻撃マーク数による係数（多いほど弱くなる）
  function markCoef(n) {
    return Math.max(0.45, 1 - (n - 1) * 0.07);
  }
  function effAtk(card) { return Math.round(card.baseAtk * markCoef(card.marks.length)); }
  function effDef(card) { return Math.round(card.baseDef * markCoef(card.marks.length)); }

  const Data = {
    DIRS, OPPOSITE, RARITY_ORDER, RARITY_NEXT, SELL_VALUE, FUSE_UPGRADE_COUNT,
    markCoef, effAtk, effDef,
    cards: [],          // 配列
    byId: {},           // id -> card
    ready: false,

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
      if (!json) {
        throw new Error("カードデータを読み込めませんでした。ローカルサーバ経由で開いてください。");
      }
      this.cards = json.cards;
      this.byId = {};
      this.cards.forEach((c) => (this.byId[c.id] = c));
      this.ready = true;
      return this;
    },

    pool(filterFn) { return this.cards.filter(filterFn); },
    rarityRank(r) { return RARITY_ORDER[r] ?? 0; },
  };

  window.Data = Data;
})();
