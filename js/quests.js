/* ===== quests.js : クエスト / 実績システム ===== */
(function () {
  // type: start(序盤・一度きり) / daily / weekly / achievement(一度きり)
  // event: 進捗トリガー（累積） / compute: 動的計算メトリクス名
  // goal, reward:{coins,diamonds,items}
  const QUESTS = [
    /* ============ 序盤ミッション（ガチャ石を多めに配布して離脱を防ぐ） ============ */
    { id: "start_battle", type: "start", name: "はじめの一歩", desc: "バトルを1回開始する", event: "battle", goal: 1, reward: { diamonds: 5 } },
    { id: "start_win", type: "start", name: "勝利の味", desc: "バトルに初勝利する", event: "win", goal: 1, reward: { diamonds: 5, coins: 300 } },
    { id: "start_gacha", type: "start", name: "運試し", desc: "ガチャを1回引く", event: "gacha", goal: 1, reward: { diamonds: 5 } },
    { id: "start_deck", type: "start", name: "自分だけのデッキ", desc: "デッキ構成を保存する", event: "deck_save", goal: 1, reward: { diamonds: 5 } },
    { id: "start_levelup", type: "start", name: "育成のはじまり", desc: "カードを1回レベルアップする", event: "levelup", goal: 1, reward: { diamonds: 5, items: { orb_s: 2 } } },
    { id: "start_use_item", type: "start", name: "アイテムを使ってみよう", desc: "経験値アイテムを使って強化する", event: "enhance_item", goal: 1, reward: { diamonds: 5, items: { orb_s: 2 } } },
    { id: "start_fusion", type: "start", name: "合成入門", desc: "合成を1回行う", event: "fusion", goal: 1, reward: { diamonds: 5 } },
    { id: "start_rare_gacha", type: "start", name: "レアを狙え", desc: "レアガチャを1回引く", event: "rare_gacha", goal: 1, reward: { diamonds: 10 } },
    { id: "start_collect_8", type: "start", name: "コレクション開始", desc: "8種類のカードを集める", compute: "distinctSpecies", goal: 8, reward: { diamonds: 10 } },
    { id: "start_win_3", type: "start", name: "連戦連勝", desc: "通算3回勝利する", event: "win", goal: 3, reward: { diamonds: 10 } },
    { id: "start_clear_dungeon", type: "start", name: "最初の制覇", desc: "ダンジョンのボスを撃破する", event: "boss", goal: 1, reward: { diamonds: 10, items: { orb_m: 1 } } },
    { id: "start_win_10", type: "start", name: "歴戦の戦士", desc: "通算10回勝利する", event: "win", goal: 10, reward: { diamonds: 15 } },
    { id: "start_ssr", type: "start", name: "輝けるカード", desc: "SSR以上のカードを1枚入手する", compute: "ssrPlusCount", goal: 1, reward: { diamonds: 20 } },
    { id: "start_maxlevel", type: "start", name: "極限の力", desc: "カードを1枚MAXレベルにする", compute: "maxLevelCount", goal: 1, reward: { diamonds: 20, items: { orb_l: 1 } } },
    { id: "start_collect_15", type: "start", name: "図鑑が埋まる", desc: "15種類のカードを集める", compute: "distinctSpecies", goal: 15, reward: { diamonds: 20 } },

    /* ============ デイリー（毎日リセット・経験値アイテムを配布） ============ */
    { id: "daily_login", type: "daily", name: "今日のログイン", desc: "デイリー無料ガチャを引く", event: "daily_gacha", goal: 1, reward: { coins: 100, items: { orb_s: 1 } } },
    { id: "daily_win", type: "daily", name: "本日の勝利", desc: "バトルに1回勝利する", event: "win", goal: 1, reward: { coins: 150 } },
    { id: "daily_win3", type: "daily", name: "鍛錬", desc: "ステージを3回クリアする", event: "win", goal: 3, reward: { coins: 250, items: { orb_s: 1 } } },
    { id: "daily_gacha", type: "daily", name: "今日のガチャ", desc: "ガチャを1回引く", event: "gacha", goal: 1, reward: { coins: 120 } },
    { id: "daily_levelup", type: "daily", name: "日々の成長", desc: "カードを1回強化する", event: "levelup", goal: 1, reward: { items: { orb_s: 2 } } },
    { id: "daily_use_item", type: "daily", name: "アイテム活用", desc: "経験値アイテムを使って強化する", event: "enhance_item", goal: 1, reward: { coins: 120, items: { orb_s: 1 } } },
    { id: "daily_fusion", type: "daily", name: "今日の合成", desc: "合成を1回行う", event: "fusion", goal: 1, reward: { coins: 150 } },
    { id: "daily_play3", type: "daily", name: "今日も冒険", desc: "バトルを3回行う", event: "battle", goal: 3, reward: { diamonds: 2 } },
    { id: "daily_boss", type: "daily", name: "ボス討伐", desc: "ボスを1体撃破する", event: "boss", goal: 1, reward: { diamonds: 3, items: { orb_m: 1 } } },

    /* ============ ウィークリー（毎週リセット・まとまった報酬） ============ */
    { id: "weekly_win_15", type: "weekly", name: "週間チャンピオン", desc: "今週15回勝利する", event: "win", goal: 15, reward: { diamonds: 20 } },
    { id: "weekly_win_30", type: "weekly", name: "週間覇者", desc: "今週30回勝利する", event: "win", goal: 30, reward: { diamonds: 35, items: { orb_m: 2 } } },
    { id: "weekly_gacha_10", type: "weekly", name: "ガチャ週間", desc: "今週ガチャを10回引く", event: "gacha", goal: 10, reward: { diamonds: 15 } },
    { id: "weekly_fusion_5", type: "weekly", name: "錬成の探求", desc: "今週5回合成する", event: "fusion", goal: 5, reward: { items: { orb_m: 2 } } },
    { id: "weekly_levelup_10", type: "weekly", name: "育成の達人", desc: "今週10回強化する", event: "levelup", goal: 10, reward: { items: { orb_m: 3 } } },
    { id: "weekly_boss_3", type: "weekly", name: "ボスハンター", desc: "今週ボスを3体撃破する", event: "boss", goal: 3, reward: { diamonds: 25, items: { orb_l: 1 } } },
    { id: "weekly_arena_3", type: "weekly", name: "闘技の週", desc: "今週リーグ戦を3回行う", event: "arena", goal: 3, reward: { diamonds: 15 } },

    /* ============ 実績（一度きり・図鑑/育成/通算系） ============ */
    { id: "ach_collect_10", type: "achievement", name: "コレクター見習い", desc: "10種類のカードを集める", compute: "distinctSpecies", goal: 10, reward: { coins: 400 } },
    { id: "ach_collect_20", type: "achievement", name: "コレクター", desc: "20種類のカードを集める", compute: "distinctSpecies", goal: 20, reward: { diamonds: 15, items: { orb_m: 1 } } },
    { id: "ach_collect_30", type: "achievement", name: "蒐集家", desc: "30種類のカードを集める", compute: "distinctSpecies", goal: 30, reward: { diamonds: 25 } },
    { id: "ach_collect_all", type: "achievement", name: "図鑑コンプリート", desc: "全36種類のカードを集める", compute: "distinctSpecies", goal: 36, reward: { diamonds: 100, items: { orb_l: 3 } } },
    { id: "ach_own_30", type: "achievement", name: "コレクションの山", desc: "カードを通算30枚入手する", event: "obtain", goal: 30, reward: { coins: 500 } },
    { id: "ach_own_80", type: "achievement", name: "カードの海", desc: "カードを通算80枚入手する", event: "obtain", goal: 80, reward: { diamonds: 20 } },

    { id: "ach_max_1", type: "achievement", name: "限界突破", desc: "カードを1枚MAXレベルにする", compute: "maxLevelCount", goal: 1, reward: { coins: 500 } },
    { id: "ach_max_5", type: "achievement", name: "育成名人", desc: "カードを5枚MAXレベルにする", compute: "maxLevelCount", goal: 5, reward: { diamonds: 20, items: { orb_l: 1 } } },
    { id: "ach_ssr_1", type: "achievement", name: "煌めきの一枚", desc: "SSR以上を1枚入手する", compute: "ssrPlusCount", goal: 1, reward: { diamonds: 10 } },
    { id: "ach_ssr_3", type: "achievement", name: "至高のコレクション", desc: "SSR以上を3枚入手する", compute: "ssrPlusCount", goal: 3, reward: { diamonds: 20 } },
    { id: "ach_ur_1", type: "achievement", name: "伝説の発見", desc: "URを1枚入手する", compute: "urCount", goal: 1, reward: { diamonds: 30, items: { orb_l: 1 } } },

    { id: "ach_win_25", type: "achievement", name: "百戦錬磨", desc: "通算25回勝利する", event: "win", goal: 25, reward: { diamonds: 15 } },
    { id: "ach_win_100", type: "achievement", name: "不敗の覇王", desc: "通算100回勝利する", event: "win", goal: 100, reward: { diamonds: 50, items: { orb_l: 2 } } },
    { id: "ach_boss_3", type: "achievement", name: "ダンジョン踏破", desc: "ボスを通算3体撃破する", event: "boss", goal: 3, reward: { diamonds: 15 } },
    { id: "ach_boss_5", type: "achievement", name: "全ダンジョン制覇", desc: "ボスを通算5体撃破する", event: "boss", goal: 5, reward: { diamonds: 30, items: { orb_l: 1 } } },

    { id: "ach_fusion_5", type: "achievement", name: "合成師", desc: "通算5回合成する", event: "fusion", goal: 5, reward: { coins: 400 } },
    { id: "ach_fusion_20", type: "achievement", name: "錬成の極み", desc: "通算20回合成する", event: "fusion", goal: 20, reward: { diamonds: 20 } },
    { id: "ach_gacha_50", type: "achievement", name: "ガチャ中毒", desc: "通算50回ガチャを引く", event: "gacha", goal: 50, reward: { diamonds: 20 } },
    { id: "ach_deck_3", type: "achievement", name: "戦術家", desc: "デッキを3つ保存する", compute: "savedDeckCount", goal: 3, reward: { coins: 400 } },
    { id: "ach_deck_5", type: "achievement", name: "デッキマスター", desc: "デッキを5つ保存する", compute: "savedDeckCount", goal: 5, reward: { diamonds: 15 } },
    { id: "ach_sell_10", type: "achievement", name: "商売上手", desc: "カードを通算10枚売却する", event: "sell", goal: 10, reward: { coins: 500 } },
    { id: "ach_arena_5", type: "achievement", name: "闘技場の常連", desc: "リーグ戦を通算5回行う", event: "arena", goal: 5, reward: { diamonds: 15 } },
  ];

  const COMPUTE = {
    distinctSpecies: () => new Set(Store.state.owned.map((o) => o.id)).size,
    ownedCount: () => Store.state.owned.length,
    maxLevelCount: () => Store.state.owned.filter((o) => (o.level || 1) >= Data.MAX_LEVEL).length,
    ssrPlusCount: () => Store.state.owned.filter((o) => { const r = Data.byId[o.id] && Data.byId[o.id].rarity; return r === "SSR" || r === "UR"; }).length,
    urCount: () => Store.state.owned.filter((o) => Data.byId[o.id] && Data.byId[o.id].rarity === "UR").length,
    savedDeckCount: () => (Store.state.savedDecks || []).length,
    bossCount: () => Object.values(Store.state.dungeon || {}).filter((d) => d.boss).length,
  };

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
      const q = Store.state.quests;
      if (!q.prog) q.prog = {}; if (!q.claimed) q.claimed = {};
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
        if (x.event === event && !x.compute && !q.claimed[x.id]) {
          const cur = Math.min(x.goal, (q.prog[x.id] || 0) + n);
          if (cur !== (q.prog[x.id] || 0)) { q.prog[x.id] = cur; any = true; }
        }
      });
      if (any) Store.save();
    },
    progress(id) {
      const x = QUESTS.find((q) => q.id === id); if (!x) return 0;
      if (x.compute && COMPUTE[x.compute]) return COMPUTE[x.compute]();
      return Store.state.quests.prog[id] || 0;
    },
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
