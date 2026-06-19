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

  // レベルアップに必要な経験値（level→level+1）
  const XP_BASE = { N: 50, R: 110, SR: 240, SSR: 480, UR: 850 };
  function expToNext(rarity, level) { return XP_BASE[rarity] * level; }
  // カードを素材にしたとき得られる経験値
  const CARD_XP = { N: 40, R: 120, SR: 380, SSR: 1100, UR: 3000 };
  function cardXp(rarity) { return CARD_XP[rarity] || 40; }

  // 経験値アイテム
  const ITEMS = [
    { id: "orb_s", name: "経験の宝珠・小", art: "🔹", xp: 150, sell: 30, rarity: "N" },
    { id: "orb_m", name: "経験の宝珠・中", art: "🔷", xp: 600, sell: 120, rarity: "R" },
    { id: "orb_l", name: "経験の宝珠・大", art: "💠", xp: 2400, sell: 480, rarity: "SR" },
  ];
  const ITEM_BY_ID = {}; ITEMS.forEach((it) => (ITEM_BY_ID[it.id] = it));

  // スキルレベル：固有/追加スキルは効果値が レベルで上昇（Lv1=1.0, +0.5/Lv）
  const MAX_SKILL_LEVEL = 5;
  function skillVal(skill) {
    const lv = skill.level || 1;
    return Math.round((skill.value || 0) * (1 + (lv - 1) * 0.5));
  }
  // 確率発動スキルの発動率（レベルで上昇、最大95%）
  function chanceVal(skill) {
    const lv = skill.level || 1;
    return Math.min(95, Math.round((skill.chance || 0) * (1 + (lv - 1) * 0.5)));
  }
  // スキルLvL→L+1 に必要な「同じスキルカード」枚数 = L
  function skillUpCost(level) { return level; }

  // リーダースキル（メタ効果）。value は1レベルあたりの値、レベルで乗算
  const LEADER_SKILLS = {
    ls_atk:    { id: "ls_atk",    name: "闘気の号令", kind: "atk",    base: 6,  unit: "%", desc: "デッキ全体の攻撃力" },
    ls_def:    { id: "ls_def",    name: "鉄壁の号令", kind: "def",    base: 6,  unit: "%", desc: "デッキ全体の防御力" },
    ls_all:    { id: "ls_all",    name: "王の威光",   kind: "all",    base: 4,  unit: "%", desc: "デッキ全体の攻撃力・防御力" },
    ls_second: { id: "ls_second", name: "後の先",     kind: "second", base: 12, unit: "%", desc: "後攻になる確率" },
    ls_coin:   { id: "ls_coin",   name: "幸運の導き", kind: "coin",   base: 12, unit: "%", desc: "コイン報酬" },
    ls_drop:   { id: "ls_drop",   name: "宝物発見",   kind: "drop",   base: 15, unit: "%", desc: "アイテム入手率" },
  };
  function leaderSkillById(id) { return LEADER_SKILLS[id] || null; }
  function leaderVal(ls, level) { return (ls.base || 0) * (level || 1); }
  function leaderDesc(ls, level) { return `${ls.desc} +${leaderVal(ls, level)}${ls.unit}`; }

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
    MAX_LEVEL, EXTRA_SKILL_CAP, ITEMS, LEADER_SKILLS, MAX_SKILL_LEVEL,
    markCoef, levelMult, effAtk, effDef, levelUpCost, randomMarks,
    expToNext, cardXp, skillVal, chanceVal, skillUpCost, leaderSkillById, leaderVal, leaderDesc,
    itemById(id) { return ITEM_BY_ID[id] || null; },
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
