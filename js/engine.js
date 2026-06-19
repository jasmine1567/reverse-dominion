/* ===== engine.js : バトルの純粋ロジック（UI非依存） ===== */
(function () {
  const { DIRS, OPPOSITE, effAtk, effDef } = Data;

  function skillsOf(card) {
    return [card.skill, ...(card.extraSkills || [])].filter((s) => s && s.type && s.type !== "none");
  }
  function sumSkill(card, trigger, type) {
    return skillsOf(card).filter((s) => s.trigger === trigger && s.type === type).reduce((a, s) => a + Data.skillVal(s), 0);
  }
  function maxSkill(card, trigger, type) {
    return skillsOf(card).filter((s) => s.trigger === trigger && s.type === type).reduce((a, s) => Math.max(a, Data.skillVal(s)), 0);
  }
  const attackBonus = (c) => sumSkill(c, "attack", "atk_up");
  const counterBonus = (c) => sumSkill(c, "counter", "counter_up");
  const defenseBonus = (c) => sumSkill(c, "defense", "def_up");
  const piercePct = (c) => maxSkill(c, "attack", "pierce");
  const enterAllyDef = (c) => maxSkill(c, "enter", "field_ally_def");
  const hasGuard = (c) => skillsOf(c).some((s) => s.trigger === "defense" && s.type === "guard");
  const hasChain = (c) => skillsOf(c).some((s) => s.trigger === "win" && s.type === "chain");
  const findSkill = (c, trigger, type) => skillsOf(c).find((s) => s.trigger === trigger && s.type === type) || null;
  const rng = () => Math.random();

  function inBounds(st, r, c) { return r >= 0 && c >= 0 && r < st.size && c < st.size; }
  function cellAt(st, r, c) { return inBounds(st, r, c) ? st.cells[r][c] : undefined; }

  function effectiveAtk(cell, opt = {}) {
    let v = effAtk(cell.card) + (cell.buffs.atk || 0);
    v += opt.counter ? counterBonus(cell.card) : attackBonus(cell.card);
    return v;
  }
  function effectiveDef(cell) { return Math.max(0, effDef(cell.card) + (cell.buffs.def || 0) + defenseBonus(cell.card)); }
  function flipCell(cell, owner) { cell.owner = owner; }

  const Engine = {
    DIRS, OPPOSITE, effectiveAtk, effectiveDef, skillsOf, hasChain,

    createBoard(size, blockCells) {
      const cells = Array.from({ length: size }, () => Array(size).fill(null));
      (blockCells || []).forEach(([r, c]) => (cells[r][c] = { block: true }));
      return { size, cells, placed: { ally: 0, enemy: 0 }, capacity: { ally: 5, enemy: 5 } };
    },
    freeCells(st) {
      const out = [];
      for (let r = 0; r < st.size; r++) for (let c = 0; c < st.size; c++) if (st.cells[r][c] === null) out.push({ r, c });
      return out;
    },
    canPlace(st, owner) { return st.placed[owner] < st.capacity[owner] && this.freeCells(st).length > 0; },
    isOver(st) { return this.freeCells(st).length === 0 || (st.placed.ally >= st.capacity.ally && st.placed.enemy >= st.capacity.enemy); },
    score(st) {
      let ally = 0, enemy = 0;
      for (let r = 0; r < st.size; r++) for (let c = 0; c < st.size; c++) {
        const cell = st.cells[r][c]; if (cell && !cell.block) cell.owner === "ally" ? ally++ : enemy++;
      }
      return { ally, enemy };
    },
    clone(st) {
      return {
        size: st.size, placed: { ...st.placed }, capacity: { ...st.capacity },
        cells: st.cells.map((row) => row.map((cell) => {
          if (!cell) return null;
          if (cell.block) return { block: true };
          return { owner: cell.owner, card: cell.card, buffs: { ...cell.buffs }, guardUsed: cell.guardUsed };
        })),
      };
    },

    place(st, r, c, owner, card, log = []) {
      const meCard = { ...card, marks: (card.marks || []).slice() };
      const me = { owner, card: meCard, buffs: { atk: 0, def: 0 }, guardUsed: false };
      st.cells[r][c] = me;
      st.placed[owner]++;
      const result = { placedAt: { r, c }, owner, flips: [], blocked: [], chainFlips: [], counterFlip: null, converted: [], clashes: [] };

      // 登場：味方防御バフ
      const enterDef = enterAllyDef(meCard);
      if (enterDef > 0) {
        let any = false;
        for (const d in DIRS) { const [dr, dc] = DIRS[d]; const nb = cellAt(st, r + dr, c + dc);
          if (nb && !nb.block && nb.owner === owner && nb !== me) { nb.buffs.def += enterDef; any = true; } }
        if (any) { log.push({ t: "skill", msg: `${meCard.name} の登場効果で隣接味方の防御力+${enterDef}` }); result.enterBuff = true; }
      }
      // 登場：弱体（隣接敵の防御力ダウン）
      const wk = findSkill(meCard, "enter", "weaken");
      if (wk) {
        const amt = Data.skillVal(wk); let any = false;
        for (const d in DIRS) { const [dr, dc] = DIRS[d]; const nb = cellAt(st, r + dr, c + dc);
          if (nb && !nb.block && nb.owner !== owner) { nb.buffs.def -= amt; any = true; } }
        if (any) { log.push({ t: "skill", msg: `${meCard.name} の弱体で隣接敵の防御力-${amt}` }); result.enterWeaken = true; }
      }
      // 登場：刻印増殖（攻撃マークをランダムに追加）
      const bm = findSkill(meCard, "enter", "bonus_mark");
      if (bm) {
        const add = Data.skillVal(bm);
        const avail = Data.ALL_DIRS.filter((d) => !meCard.marks.includes(d));
        let got = 0;
        for (let k = 0; k < add && avail.length; k++) { const idx = (rng() * avail.length) | 0; meCard.marks.push(avail.splice(idx, 1)[0]); got++; }
        if (got > 0) { log.push({ t: "skill", msg: `${meCard.name} の刻印で攻撃マーク+${got}` }); result.enterMark = true; }
      }

      const critSk = findSkill(meCard, "attack", "crit");
      const probChain = findSkill(meCard, "win", "prob_chain");

      for (const dir of meCard.marks) {
        const [dr, dc] = DIRS[dir];
        const tr = r + dr, tc = c + dc;
        const nb = cellAt(st, tr, tc);
        if (!nb || nb.block || nb.owner === owner) continue;

        let atk = effectiveAtk(me, { counter: false });
        // 会心（確率発動）
        if (critSk) {
          const ch = Data.chanceVal(critSk), success = rng() * 100 < ch;
          result.clashes.push({ type: "roll", kind: "crit", label: `${meCard.name}の会心`, chance: ch, success, aRC: { r, c }, dRC: { r: tr, c: tc } });
          if (success) { atk = Math.round(atk * (1 + Data.skillVal(critSk) / 100)); log.push({ t: "skill", msg: `会心発動！ ${meCard.name} の攻撃力が上昇` }); }
        }
        const rawDef = effectiveDef(nb);
        let converted = false, defShown = rawDef, guarded = false, pcRoll = null;

        if (hasGuard(nb.card) && !nb.guardUsed) {
          nb.guardUsed = true; guarded = true;
          result.blocked.push({ r: tr, c: tc });
          log.push({ t: "block", msg: `${nb.card.name} が【加護】で攻撃を防いだ` });
        } else {
          const pierce = piercePct(meCard);
          const defFinal = pierce > 0 ? Math.round(rawDef * (1 - pierce / 100)) : rawDef;
          defShown = defFinal;
          if (atk > defFinal) {
            flipCell(nb, owner);
            result.flips.push({ r: tr, c: tc });
            result.converted.push({ id: nb.card.id, name: nb.card.name, marks: (nb.card.marks || []).slice() });
            log.push({ t: "win", msg: `${meCard.name}(攻${atk}) → ${nb.card.name}(防${defFinal}) 撃破・味方化` });
            converted = true;
            const b = cellAt(st, r + dr * 2, c + dc * 2);
            const hasTarget = b && !b.block && b.owner !== owner;
            if (hasChain(meCard) && hasTarget) {
              flipCell(b, owner);
              result.chainFlips.push({ r: r + dr * 2, c: c + dc * 2 });
              result.converted.push({ id: b.card.id, name: b.card.name, marks: (b.card.marks || []).slice() });
              log.push({ t: "chain", msg: `【連鎖】${b.card.name} も味方化！` });
            } else if (probChain) {
              const ch = Data.chanceVal(probChain), success = rng() * 100 < ch;
              pcRoll = { chance: ch, success, target: hasTarget ? { r: r + dr * 2, c: c + dc * 2 } : { r: tr, c: tc } };
              if (success && hasTarget) {
                flipCell(b, owner);
                result.chainFlips.push({ r: r + dr * 2, c: c + dc * 2 });
                result.converted.push({ id: b.card.id, name: b.card.name, marks: (b.card.marks || []).slice() });
                log.push({ t: "chain", msg: `【連撃】${b.card.name} も味方化！` });
              }
            }
          } else {
            result.blocked.push({ r: tr, c: tc });
            log.push({ t: "block", msg: `${nb.card.name}(防${defFinal}) が ${meCard.name}(攻${atk}) をブロック` });
          }
        }

        result.clashes.push({
          type: "attack", aName: meCard.name, dName: nb.card.name, aArt: meCard.art, dArt: nb.card.art,
          atk, def: defShown, win: converted, guarded,
          aRC: { r, c }, dRC: { r: tr, c: tc },
        });
        if (pcRoll) {
          result.clashes.push({ type: "roll", kind: "prob_chain", label: `${meCard.name}の連撃`, chance: pcRoll.chance, success: pcRoll.success, aRC: { r, c }, dRC: pcRoll.target });
        }

        if (converted) continue;

        const opp = OPPOSITE[dir];
        if (nb.card.marks.includes(opp)) {
          const cAtk = effectiveAtk(nb, { counter: true });
          const myDef = effectiveDef(me);
          const cWin = cAtk > myDef;
          if (cWin) { flipCell(me, nb.owner); result.counterFlip = { r, c };
            log.push({ t: "counter", msg: `反撃！ ${nb.card.name}(攻${cAtk}) → ${meCard.name}(防${myDef}) 寝返り` });
          } else log.push({ t: "block", msg: `${nb.card.name} の反撃を ${meCard.name}(防${myDef}) が耐えた` });
          result.clashes.push({
            type: "counter", aName: nb.card.name, dName: meCard.name, aArt: nb.card.art, dArt: meCard.art,
            atk: cAtk, def: myDef, win: cWin, guarded: false,
            aRC: { r: tr, c: tc }, dRC: { r, c },
          });
          if (cWin) break;
        }
      }
      return result;
    },
  };

  window.Engine = Engine;
})();
