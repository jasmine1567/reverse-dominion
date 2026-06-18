/* ===== quests.js : クエスト / 実績システム ===== */
(function () {
  // event: 進捗を進めるトリガー名 / goal: 達成に必要な回数 / reward: {coins,diamonds,items}
  const QUESTS = [
    // --- 実績（一度きり） ---
    { id: "ach_first_battle", type: "achievement", name: "はじめての戦い", desc: "バトルを1回開始する", event: "battle", goal: 1, reward: { coins: 200 } },
    { id: "ach_first_win", type: "achievement", name: "初勝利", desc: "バトルに1回勝利する", event: "win", goal: 1, reward: { coins: 300, diamonds: 3 } },
    { id: "ach_first_deck", type: "achievement", name: "デッキビルダー", desc: "デッキ構成を保存する", event: "deck_save", goal: 1, reward: { coins: 200 } },
    { id: "ach_first_levelup", type: "achievement", name: "はじめての成長", desc: "カードを1回レベルアップする", event: "levelup", goal: 1, reward: { items: { orb_s: 2 } } },
    { id: "ach_first_gacha", type: "achievement", name: "ガチャ初挑戦", desc: "ガチャを1回引く", event: "gacha", goal: 1, reward: { diamonds: 5 } },
    { id: "ach_first_fusion", type: "achievement", name: "合成の心得", desc: "合成を1回行う", event: "fusion", goal: 1, reward: { coins: 300 } },
    { id: "ach_win_5", type: "achievement", name: "歴戦の証", desc: "通算5回勝利する", event: "win", goal: 5, reward: { diamonds: 10 } },
    { id: "ach_collect_20", type: "achievement", name: "コレクター", desc: "カードを通算20枚入手する", event: "obtain", goal: 20, reward: { coins: 500, items: { orb_m: 1 } } },
    { id: "ach_boss_first", type: "achievement", name: "ダンジョン制覇者", desc: "ボスを1体撃破する", event: "boss", goal: 1, reward: { diamonds: 8 } },

    // --- デイリー ---
    { id: "daily_login", type: "daily", name: "今日のログイン", desc: "デイリー無料ガチャを引く", event: "daily_gacha", goal: 1, reward: { coins: 100 } },
    { id: "daily_win", type: "daily", name: "本日の勝利", desc: "バトルに1回勝利する", event: "win", goal: 1, reward: { coins: 150 } },
    { id: "daily_clear3", type: "daily", name: "鍛錬", desc: "ステージを3回クリアする", event: "win", goal: 3, reward: { coins: 250, items: { orb_s: 1 } } },
    { id: "daily_levelup", type: "daily", name: "日々の成長", desc: "カードを1回強化する", event: "levelup", goal: 1, reward: { items: { orb_s: 1 } } },

    // --- ウィークリー ---
    { id: "weekly_win_15", type: "weekly", name: "週間チャンピオン", desc: "今週15回勝利する", event: "win", goal: 15, reward: { diamonds: 20 } },
    { id: "weekly_fusion_3", type: "weekly", name: "錬成の探求", desc: "今週3回合成する", event: "fusion", goal: 3, reward: { items: { orb_m: 2 } } },
    { id: "weekly_boss_3", type: "weekly", name: "ボスハンター", desc: "今週ボスを3体撃破する", event: "boss", goal: 3, reward: { diamonds: 25, items: { orb_l: 1 } } },
  ];

  function weekStr() {
    const d = new Date();
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return d.getFullYear() + "-W" + week;
  }

  const Quest = {
    QUESTS,
    init() {
      if (!Store.state.quests) Store.state.quests = { prog: {}, claimed: {}, daily: null, weekly: null };
      this.checkReset();
    },
    checkReset() {
      const q = Store.state.quests;
      const today = Store.todayStr(), wk = weekStr();
      let changed = false;
      if (q.daily !== today) { QUESTS.filter((x) => x.type === "daily").forEach((x) => { delete q.prog[x.id]; delete q.claimed[x.id]; }); q.daily = today; changed = true; }
      if (q.weekly !== wk) { QUESTS.filter((x) => x.type === "weekly").forEach((x) => { delete q.prog[x.id]; delete q.claimed[x.id]; }); q.weekly = wk; changed = true; }
      if (changed) Store.save();
    },
    bump(event, n = 1) {
      this.checkReset();
      const q = Store.state.quests;
      let any = false;
      QUESTS.forEach((x) => {
        if (x.event === event && !q.claimed[x.id]) {
          const cur = Math.min(x.goal, (q.prog[x.id] || 0) + n);
          if (cur !== (q.prog[x.id] || 0)) { q.prog[x.id] = cur; any = true; }
        }
      });
      if (any) Store.save();
    },
    progress(id) { return Store.state.quests.prog[id] || 0; },
    isComplete(x) { return this.progress(x.id) >= x.goal; },
    isClaimed(id) { return !!Store.state.quests.claimed[id]; },
    claim(id) {
      const x = QUESTS.find((q) => q.id === id);
      if (!x) return { ok: false, reason: "対象なし" };
      if (this.isClaimed(id)) return { ok: false, reason: "受取済み" };
      if (this.progress(id) < x.goal) return { ok: false, reason: "未達成" };
      const r = x.reward || {};
      if (r.coins) Store.addCoins(r.coins);
      if (r.diamonds) Store.addDiamonds(r.diamonds);
      if (r.items) for (const iid in r.items) Store.addItem(iid, r.items[iid]);
      Store.state.quests.claimed[id] = true;
      Store.save();
      return { ok: true, reward: r };
    },
    list(type) { return QUESTS.filter((x) => x.type === type); },
    claimable() { this.checkReset(); return QUESTS.filter((x) => this.isComplete(x) && !this.isClaimed(x.id)).length; },
    rewardText(r) {
      const parts = [];
      if (r.coins) parts.push(`🪙${r.coins}`);
      if (r.diamonds) parts.push(`💎${r.diamonds}`);
      if (r.items) for (const iid in r.items) { const it = Data.itemById(iid); if (it) parts.push(`${it.art}×${r.items[iid]}`); }
      return parts.join(" / ") || "—";
    },
  };

  window.Quest = Quest;
})();
