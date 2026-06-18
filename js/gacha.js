/* ===== gacha.js : ガチャ抽選 ===== */
(function () {
  const COST = {
    normal: { single: 100, multi: 900, currency: "coins" },
    rare: { single: 5, multi: 45, currency: "diamonds" },
  };
  const RATES = {
    normal: [{ r: "N", w: 75 }, { r: "R", w: 20 }, { r: "SR", w: 5 }],
    rare: [{ r: "R", w: 60 }, { r: "SR", w: 40 }],
  };

  function eligible(rarity) {
    return Data.cards.filter((c) => c.rarity === rarity && !c.fusionOnly);
  }
  function rollRarity(rates) {
    const total = rates.reduce((a, x) => a + x.w, 0);
    let n = Math.random() * total;
    for (const x of rates) { if (n < x.w) return x.r; n -= x.w; }
    return rates[rates.length - 1].r;
  }
  function rollCard(rates) {
    let r = rollRarity(rates);
    let pool = eligible(r);
    if (pool.length === 0) { r = rates[0].r; pool = eligible(r); }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const Gacha = {
    COST, RATES,
    rankOf(r) { return Data.RARITY_ORDER[r]; },

    canAfford(type, count) {
      const cost = count >= 10 ? COST[type].multi : COST[type].single;
      const cur = COST[type].currency;
      return Store.state[cur] >= cost;
    },

    pull(type, count) {
      const cfg = COST[type];
      const cost = count >= 10 ? cfg.multi : cfg.single;
      const cur = cfg.currency;
      if (Store.state[cur] < cost) return { ok: false, reason: "通貨が足りません" };
      Store.state[cur] -= cost;

      const results = [];
      for (let i = 0; i < count; i++) results.push(rollCard(RATES[type]));

      // レアガチャ：最低1枚はR以上を確定（プールがR/SRのみのため常に満たすが保険）
      if (type === "rare") {
        const hasRplus = results.some((c) => this.rankOf(c.rarity) >= 1);
        if (!hasRplus) {
          const pool = eligible("R");
          results[results.length - 1] = pool[Math.floor(Math.random() * pool.length)];
        }
      }

      // 所持に追加
      const added = results.map((c) => {
        const inst = Store.addCard(c.id);
        return { ...c, uid: inst.uid };
      });
      Store.save();
      return { ok: true, cost, currency: cur, cards: added };
    },
  };

  window.Gacha = Gacha;
})();
