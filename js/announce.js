/* ===== announce.js : 全体アナウンス（SSR以上入手の通知） ===== */
(function () {
  const Announce = {
    el: null,
    init() {
      this.el = document.getElementById("announceBar");
      this.startMockLoop();
    },
    show(text, cls) {
      if (!this.el) return;
      const item = document.createElement("div");
      item.className = "announce-item " + (cls || "");
      item.innerHTML = `<span class="aw-ico">📢</span><span class="aw-txt">${text}</span>`;
      this.el.appendChild(item);
      requestAnimationFrame(() => item.classList.add("show"));
      setTimeout(() => { item.classList.remove("show"); setTimeout(() => item.remove(), 500); }, 5200);
    },
    self(cardId) {
      const c = Data.byId[cardId]; if (!c) return;
      const name = (Store.state.player && Store.state.player.name) || "あなた";
      this.show(`🎉 ${name} が 【${c.rarity}】${c.name} を入手！`, "self " + c.rarity);
    },
    randomOther() {
      const pool = Data.cards.filter((c) => c.rarity === "SSR" || c.rarity === "UR");
      if (!pool.length) return;
      const c = pool[(Math.random() * pool.length) | 0];
      const names = (window.World && World.mockNames()) || ["冒険者"];
      const nm = names[(Math.random() * names.length) | 0];
      this.show(`${nm} が 【${c.rarity}】${c.name} を入手しました！`, c.rarity === "UR" ? "ur" : "ssr");
    },
    startMockLoop() {
      if (this._t) clearInterval(this._t);
      // URは稀、SSRは時々。一定間隔でランダムに流す
      this._t = setInterval(() => { if (!document.hidden) this.randomOther(); }, 15000);
      setTimeout(() => this.randomOther(), 4500);
    },
  };
  window.Announce = Announce;
})();
