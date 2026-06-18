/* ===== engine.js : バトルの純粋ロジック（UI非依存） ===== */
(function () {
  const { DIRS, OPPOSITE, effAtk, effDef } = Data;

  function skillsOf(card) {
    return [card.skill, card.inheritSkill].filter((s) => s && s.type && s.type !== "none");
  }
  function sumSkill(card, trigger, type) {
    return skillsOf(card)
      .filter((s) => s.trigger === trigger && s.type === type)
      .reduce((a, s) => a + (s.value || 0), 0);
  }
  function maxSkill(card, trigger, type) {
    return skillsOf(card)
      .filter((s) => s.trigger === trigger && s.type === type)
      .reduce((a, s) => Math.max(a, s.value || 0), 0);
  }
  const attackBonus = (c) => sumSkill(c, "attack", "atk_up");
  const counterBonus = (c) => sumSkill(c, "counter", "counter_up");
  const defenseBonus = (c) => sumSkill(c, "defense", "def_up");
  const piercePct = (c) => maxSkill(c, "attack", "pierce");
  const enterAllyDef = (c) => maxSkill(c, "enter", "field_ally_def");
  const hasGuard = (c) => skillsOf(c).some((s) => s.trigger === "defense" && s.type === "guard");
  const hasChain = (c) => skillsOf(c).some((s) => s.trigger === "win" && s.type === "chain");

  function inBounds(st, r, c) { return r >= 0 && c >= 0 && r < st.size && c < st.size; }
  function cellAt(st, r, c) { return inBounds(st, r, c) ? st.cells[r][c] : undefined; }

  function effectiveAtk(cell, opt = {}) {
    let v = effAtk(cell.card) + (cell.buffs.atk || 0);
    v += opt.counter ? counterBonus(cell.card) : attackBonus(cell.card);
    return v;
  }
  function effectiveDef(cell) {
    return effDef(cell.card) + (cell.buffs.def || 0) + defenseBonus(cell.card);
  }

  function flipCell(cell, owner) { cell.owner = owner; }

  const Engine = {
    DIRS, OPPOSITE,
    effectiveAtk, effectiveDef,
    skillsOf, hasChain,

    createBoard(size, blockCells) {
      const cells = Array.from({ length: size }, () => Array(size).fill(null));
      (blockCells || []).forEach(([r, c]) => (cells[r][c] = { block: true }));
      return {
        size,
        cells,
        placed: { ally: 0, enemy: 0 },
        capacity: { ally: 5, enemy: 5 },
      };
    },

    freeCells(st) {
      const out = [];
      for (let r = 0; r < st.size; r++)
        for (let c = 0; c < st.size; c++)
          if (st.cells[r][c] === null) out.push({ r, c });
      return out;
    },

    canPlace(st, owner) {
      return st.placed[owner] < st.capacity[owner] && this.freeCells(st).length > 0;
    },

    isOver(st) {
      const full = this.freeCells(st).length === 0;
      const done = st.placed.ally >= st.capacity.ally && st.placed.enemy >= st.capacity.enemy;
      return full || done;
    },

    score(st) {
      let ally = 0, enemy = 0;
      for (let r = 0; r < st.size; r++)
        for (let c = 0; c < st.size; c++) {
          const cell = st.cells[r][c];
          if (cell && !cell.block) cell.owner === "ally" ? ally++ : enemy++;
        }
      return { ally, enemy };
    },

    clone(st) {
      return {
        size: st.size,
        placed: { ...st.placed },
        capacity: { ...st.capacity },
        cells: st.cells.map((row) =>
          row.map((cell) => {
            if (!cell) return null;
            if (cell.block) return { block: true };
            return { owner: cell.owner, card: cell.card, buffs: { ...cell.buffs }, guardUsed: cell.guardUsed };
          })
        ),
      };
    },

    /* カードを設置し、攻撃・反撃・スキルを解決する。result を返す */
    place(st, r, c, owner, card, log = []) {
      const me = { owner, card, buffs: { atk: 0, def: 0 }, guardUsed: false };
      st.cells[r][c] = me;
      st.placed[owner]++;

      const result = { flips: [], blocked: [], chainFlips: [], counterFlip: null, converted: [] };

      // 登場時スキル：隣接味方の防御力アップ
      const enterDef = enterAllyDef(card);
      if (enterDef > 0) {
        let any = false;
        for (const d in DIRS) {
          const [dr, dc] = DIRS[d];
          const nb = cellAt(st, r + dr, c + dc);
          if (nb && !nb.block && nb.owner === owner && nb !== me) { nb.buffs.def += enterDef; any = true; }
        }
        if (any) log.push({ t: "skill", msg: `${card.name} の登場効果で隣接味方の防御力+${enterDef}` });
      }

      // 攻撃フェーズ：各マーク方向
      for (const dir of card.marks) {
        const [dr, dc] = DIRS[dir];
        const tr = r + dr, tc = c + dc;
        const nb = cellAt(st, tr, tc);
        if (!nb || nb.block || nb.owner === owner) continue;

        const atk = effectiveAtk(me, { counter: false });
        const rawDef = effectiveDef(nb);
        let converted = false;

        if (hasGuard(nb.card) && !nb.guardUsed) {
          nb.guardUsed = true;
          result.blocked.push({ r: tr, c: tc });
          log.push({ t: "block", msg: `${nb.card.name} が【加護】で攻撃を防いだ` });
        } else {
          const pierce = piercePct(card);
          const defFinal = pierce > 0 ? Math.round(rawDef * (1 - pierce / 100)) : rawDef;
          if (atk > defFinal) {
            flipCell(nb, owner);
            result.flips.push({ r: tr, c: tc });
            result.converted.push({ id: nb.card.id, name: nb.card.name });
            log.push({ t: "win", msg: `${card.name}(攻${atk}) → ${nb.card.name}(防${defFinal}) 撃破・味方化` });
            converted = true;
            // 勝利時スキル：連鎖
            if (hasChain(card)) {
              const b = cellAt(st, r + dr * 2, c + dc * 2);
              if (b && !b.block && b.owner !== owner) {
                flipCell(b, owner);
                result.chainFlips.push({ r: r + dr * 2, c: c + dc * 2 });
                result.converted.push({ id: b.card.id, name: b.card.name });
                log.push({ t: "chain", msg: `【連鎖】${b.card.name} も味方化！` });
              }
            }
          } else {
            result.blocked.push({ r: tr, c: tc });
            log.push({ t: "block", msg: `${nb.card.name}(防${defFinal}) が ${card.name}(攻${atk}) をブロック` });
          }
        }

        if (converted) continue; // 味方化したカードは反撃しない

        // 反撃フェーズ：相手のマークがこちらを向いていれば
        const opp = OPPOSITE[dir];
        if (nb.card.marks.includes(opp)) {
          const cAtk = effectiveAtk(nb, { counter: true });
          const myDef = effectiveDef(me);
          if (cAtk > myDef) {
            flipCell(me, nb.owner);
            result.counterFlip = { r, c };
            log.push({ t: "counter", msg: `反撃！ ${nb.card.name}(攻${cAtk}) → ${card.name}(防${myDef}) 寝返り` });
            break; // 自分が寝返ったので以降の攻撃は無し
          } else {
            log.push({ t: "block", msg: `${nb.card.name} の反撃を ${card.name}(防${myDef}) が耐えた` });
          }
        }
      }
      return result;
    },
  };

  window.Engine = Engine;
})();
