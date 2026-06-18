/* 自動生成: cards.json のフォールバック（file:// 直開き用） */
window.CARDS_FALLBACK = {
  "meta": {
    "version": 1,
    "directions": [
      "N",
      "NE",
      "E",
      "SE",
      "S",
      "SW",
      "W",
      "NW"
    ],
    "note": "marksは攻撃可能方向。baseAtk/baseDefは基礎値で、実効値はマーク数の係数で減衰する。fusionOnly=true のカードはガチャから出ず合成でのみ入手。"
  },
  "cards": [
    {
      "id": "n001",
      "name": "スライム",
      "rarity": "N",
      "art": "🟢",
      "baseAtk": 28,
      "baseDef": 22,
      "marks": [
        "E",
        "W"
      ],
      "skill": {
        "id": "none",
        "name": "なし",
        "trigger": "none",
        "type": "none",
        "value": 0,
        "desc": "効果なし"
      }
    },
    {
      "id": "n002",
      "name": "コウモリ",
      "rarity": "N",
      "art": "🦇",
      "baseAtk": 34,
      "baseDef": 14,
      "marks": [
        "NE",
        "NW",
        "S"
      ],
      "skill": {
        "id": "atk_up_s",
        "name": "急襲",
        "trigger": "attack",
        "type": "atk_up",
        "value": 6,
        "desc": "攻撃時、自身の攻撃力+6"
      }
    },
    {
      "id": "n003",
      "name": "ゴブリン",
      "rarity": "N",
      "art": "👺",
      "baseAtk": 30,
      "baseDef": 26,
      "marks": [
        "N",
        "S"
      ],
      "skill": {
        "id": "none",
        "name": "なし",
        "trigger": "none",
        "type": "none",
        "value": 0,
        "desc": "効果なし"
      }
    },
    {
      "id": "n004",
      "name": "アーチャー",
      "rarity": "N",
      "art": "🏹",
      "baseAtk": 32,
      "baseDef": 18,
      "marks": [
        "N",
        "E",
        "W"
      ],
      "skill": {
        "id": "atk_up_s",
        "name": "狙撃",
        "trigger": "attack",
        "type": "atk_up",
        "value": 5,
        "desc": "攻撃時、自身の攻撃力+5"
      }
    },
    {
      "id": "n005",
      "name": "盾兵",
      "rarity": "N",
      "art": "🛡️",
      "baseAtk": 16,
      "baseDef": 40,
      "marks": [
        "S"
      ],
      "skill": {
        "id": "def_up_s",
        "name": "構え",
        "trigger": "defense",
        "type": "def_up",
        "value": 10,
        "desc": "防御時、自身の防御力+10"
      }
    },
    {
      "id": "n006",
      "name": "野犬",
      "rarity": "N",
      "art": "🐕",
      "baseAtk": 31,
      "baseDef": 20,
      "marks": [
        "E",
        "W",
        "N"
      ],
      "skill": {
        "id": "none",
        "name": "なし",
        "trigger": "none",
        "type": "none",
        "value": 0,
        "desc": "効果なし"
      }
    },
    {
      "id": "n007",
      "name": "見習い魔術師",
      "rarity": "N",
      "art": "🧙",
      "baseAtk": 33,
      "baseDef": 17,
      "marks": [
        "NE",
        "SE",
        "SW",
        "NW"
      ],
      "skill": {
        "id": "none",
        "name": "なし",
        "trigger": "none",
        "type": "none",
        "value": 0,
        "desc": "効果なし"
      }
    },
    {
      "id": "n008",
      "name": "山賊",
      "rarity": "N",
      "art": "🪓",
      "baseAtk": 38,
      "baseDef": 12,
      "marks": [
        "E"
      ],
      "skill": {
        "id": "atk_up_m",
        "name": "強打",
        "trigger": "attack",
        "type": "atk_up",
        "value": 9,
        "desc": "攻撃時、自身の攻撃力+9"
      }
    },
    {
      "id": "n009",
      "name": "コボルト",
      "rarity": "N",
      "art": "🐾",
      "baseAtk": 27,
      "baseDef": 24,
      "marks": [
        "N",
        "E"
      ],
      "skill": {
        "id": "none",
        "name": "なし",
        "trigger": "none",
        "type": "none",
        "value": 0,
        "desc": "効果なし"
      }
    },
    {
      "id": "n010",
      "name": "石像",
      "rarity": "N",
      "art": "🗿",
      "baseAtk": 12,
      "baseDef": 44,
      "marks": [
        "N"
      ],
      "skill": {
        "id": "def_up_m",
        "name": "硬化",
        "trigger": "defense",
        "type": "def_up",
        "value": 14,
        "desc": "防御時、自身の防御力+14"
      }
    },
    {
      "id": "n011",
      "name": "スケルトン",
      "rarity": "N",
      "art": "💀",
      "baseAtk": 29,
      "baseDef": 23,
      "marks": [
        "S",
        "W"
      ],
      "skill": {
        "id": "none",
        "name": "なし",
        "trigger": "none",
        "type": "none",
        "value": 0,
        "desc": "効果なし"
      }
    },
    {
      "id": "n012",
      "name": "毒トカゲ",
      "rarity": "N",
      "art": "🦎",
      "baseAtk": 30,
      "baseDef": 21,
      "marks": [
        "NE",
        "SW"
      ],
      "skill": {
        "id": "pierce_s",
        "name": "毒牙",
        "trigger": "attack",
        "type": "pierce",
        "value": 15,
        "desc": "攻撃時、相手の防御力を15%無視"
      }
    },
    {
      "id": "r001",
      "name": "重装騎士",
      "rarity": "R",
      "art": "🐴",
      "baseAtk": 44,
      "baseDef": 38,
      "marks": [
        "N",
        "E",
        "S"
      ],
      "skill": {
        "id": "def_up_m",
        "name": "鉄壁",
        "trigger": "defense",
        "type": "def_up",
        "value": 16,
        "desc": "防御時、自身の防御力+16"
      }
    },
    {
      "id": "r002",
      "name": "炎の魔導士",
      "rarity": "R",
      "art": "🔥",
      "baseAtk": 52,
      "baseDef": 24,
      "marks": [
        "NE",
        "NW",
        "SE",
        "SW"
      ],
      "skill": {
        "id": "atk_up_m",
        "name": "火力強化",
        "trigger": "attack",
        "type": "atk_up",
        "value": 12,
        "desc": "攻撃時、自身の攻撃力+12"
      }
    },
    {
      "id": "r003",
      "name": "暗殺者",
      "rarity": "R",
      "art": "🗡️",
      "baseAtk": 56,
      "baseDef": 18,
      "marks": [
        "NW"
      ],
      "skill": {
        "id": "pierce_m",
        "name": "弱点穿ち",
        "trigger": "attack",
        "type": "pierce",
        "value": 30,
        "desc": "攻撃時、相手の防御力を30%無視"
      }
    },
    {
      "id": "r004",
      "name": "聖騎士",
      "rarity": "R",
      "art": "✨",
      "baseAtk": 42,
      "baseDef": 40,
      "marks": [
        "N",
        "S",
        "E",
        "W"
      ],
      "skill": {
        "id": "field_def",
        "name": "守護の陣",
        "trigger": "enter",
        "type": "field_ally_def",
        "value": 6,
        "desc": "登場時、隣接する味方の防御力+6"
      }
    },
    {
      "id": "r005",
      "name": "槍術士",
      "rarity": "R",
      "art": "🔱",
      "baseAtk": 48,
      "baseDef": 30,
      "marks": [
        "N",
        "S"
      ],
      "skill": {
        "id": "counter_up",
        "name": "返し突き",
        "trigger": "counter",
        "type": "counter_up",
        "value": 14,
        "desc": "反撃時、自身の攻撃力+14"
      }
    },
    {
      "id": "r006",
      "name": "氷の精霊",
      "rarity": "R",
      "art": "❄️",
      "baseAtk": 46,
      "baseDef": 33,
      "marks": [
        "NE",
        "SE",
        "W"
      ],
      "skill": {
        "id": "atk_up_s",
        "name": "氷撃",
        "trigger": "attack",
        "type": "atk_up",
        "value": 8,
        "desc": "攻撃時、自身の攻撃力+8"
      }
    },
    {
      "id": "r007",
      "name": "狼騎兵",
      "rarity": "R",
      "art": "🐺",
      "baseAtk": 50,
      "baseDef": 26,
      "marks": [
        "E",
        "W",
        "N"
      ],
      "skill": {
        "id": "atk_up_m",
        "name": "疾走",
        "trigger": "attack",
        "type": "atk_up",
        "value": 11,
        "desc": "攻撃時、自身の攻撃力+11"
      }
    },
    {
      "id": "r008",
      "name": "守護天使",
      "rarity": "R",
      "art": "👼",
      "baseAtk": 38,
      "baseDef": 44,
      "marks": [
        "S",
        "SW",
        "SE"
      ],
      "skill": {
        "id": "guard",
        "name": "加護",
        "trigger": "defense",
        "type": "guard",
        "value": 1,
        "desc": "防御時、1回だけ攻撃を確実にブロック"
      }
    },
    {
      "id": "r009",
      "name": "雷の戦士",
      "rarity": "R",
      "art": "⚡",
      "baseAtk": 54,
      "baseDef": 22,
      "marks": [
        "N",
        "NE",
        "E"
      ],
      "skill": {
        "id": "atk_up_m",
        "name": "帯電",
        "trigger": "attack",
        "type": "atk_up",
        "value": 10,
        "desc": "攻撃時、自身の攻撃力+10"
      }
    },
    {
      "id": "sr001",
      "name": "竜騎士",
      "rarity": "SR",
      "art": "🐉",
      "baseAtk": 66,
      "baseDef": 48,
      "marks": [
        "N",
        "E",
        "S",
        "W"
      ],
      "skill": {
        "id": "chain",
        "name": "連鎖の咆哮",
        "trigger": "win",
        "type": "chain",
        "value": 1,
        "desc": "勝利時、その方向の先のカードも味方化する"
      }
    },
    {
      "id": "sr002",
      "name": "大魔導師",
      "rarity": "SR",
      "art": "🪄",
      "baseAtk": 72,
      "baseDef": 34,
      "marks": [
        "NE",
        "NW",
        "SE",
        "SW",
        "N"
      ],
      "skill": {
        "id": "atk_up_l",
        "name": "魔力暴走",
        "trigger": "attack",
        "type": "atk_up",
        "value": 18,
        "desc": "攻撃時、自身の攻撃力+18"
      }
    },
    {
      "id": "sr003",
      "name": "影の暗殺者",
      "rarity": "SR",
      "art": "🥷",
      "baseAtk": 78,
      "baseDef": 28,
      "marks": [
        "NW",
        "SE"
      ],
      "skill": {
        "id": "pierce_l",
        "name": "絶命突き",
        "trigger": "attack",
        "type": "pierce",
        "value": 50,
        "desc": "攻撃時、相手の防御力を50%無視"
      }
    },
    {
      "id": "sr004",
      "name": "城塞ゴーレム",
      "rarity": "SR",
      "art": "🏰",
      "baseAtk": 40,
      "baseDef": 70,
      "marks": [
        "N"
      ],
      "skill": {
        "id": "def_up_l",
        "name": "難攻不落",
        "trigger": "defense",
        "type": "def_up",
        "value": 24,
        "desc": "防御時、自身の防御力+24"
      }
    },
    {
      "id": "sr005",
      "name": "聖女",
      "rarity": "SR",
      "art": "🕊️",
      "baseAtk": 50,
      "baseDef": 56,
      "marks": [
        "N",
        "E",
        "S",
        "W"
      ],
      "skill": {
        "id": "field_def_l",
        "name": "聖域",
        "trigger": "enter",
        "type": "field_ally_def",
        "value": 12,
        "desc": "登場時、隣接する味方の防御力+12"
      }
    },
    {
      "id": "sr006",
      "name": "双剣士",
      "rarity": "SR",
      "art": "⚔️",
      "baseAtk": 70,
      "baseDef": 36,
      "marks": [
        "E",
        "W"
      ],
      "skill": {
        "id": "counter_up_l",
        "name": "二刀返し",
        "trigger": "counter",
        "type": "counter_up",
        "value": 22,
        "desc": "反撃時、自身の攻撃力+22"
      }
    },
    {
      "id": "sr007",
      "name": "嵐の女王",
      "rarity": "SR",
      "art": "🌪️",
      "baseAtk": 68,
      "baseDef": 42,
      "marks": [
        "N",
        "NE",
        "E",
        "SE"
      ],
      "skill": {
        "id": "atk_up_l",
        "name": "暴風",
        "trigger": "attack",
        "type": "atk_up",
        "value": 15,
        "desc": "攻撃時、自身の攻撃力+15"
      }
    },
    {
      "id": "ssr001",
      "name": "黒竜王",
      "rarity": "SSR",
      "fusionOnly": true,
      "art": "🐲",
      "baseAtk": 92,
      "baseDef": 70,
      "marks": [
        "N",
        "E",
        "S",
        "W",
        "NE",
        "SW"
      ],
      "skill": {
        "id": "chain",
        "name": "覇竜連鎖",
        "trigger": "win",
        "type": "chain",
        "value": 1,
        "desc": "勝利時、その方向の先のカードも味方化する"
      },
      "image": "images/ssr001.webp"
    },
    {
      "id": "ssr002",
      "name": "賢者王",
      "rarity": "SSR",
      "fusionOnly": true,
      "art": "📜",
      "baseAtk": 96,
      "baseDef": 58,
      "marks": [
        "NE",
        "NW",
        "SE",
        "SW"
      ],
      "skill": {
        "id": "atk_up_xl",
        "name": "禁呪",
        "trigger": "attack",
        "type": "atk_up",
        "value": 26,
        "desc": "攻撃時、自身の攻撃力+26"
      },
      "image": "images/ssr002.webp"
    },
    {
      "id": "ssr003",
      "name": "不死の将軍",
      "rarity": "SSR",
      "fusionOnly": true,
      "art": "☠️",
      "baseAtk": 80,
      "baseDef": 84,
      "marks": [
        "N",
        "E",
        "S",
        "W"
      ],
      "skill": {
        "id": "def_up_xl",
        "name": "不滅",
        "trigger": "defense",
        "type": "def_up",
        "value": 30,
        "desc": "防御時、自身の防御力+30"
      },
      "image": "images/ssr003.webp"
    },
    {
      "id": "ssr004",
      "name": "業火の魔神",
      "rarity": "SSR",
      "fusionOnly": true,
      "art": "👹",
      "baseAtk": 104,
      "baseDef": 50,
      "marks": [
        "NE",
        "NW",
        "SE",
        "SW",
        "E",
        "W"
      ],
      "skill": {
        "id": "pierce_xl",
        "name": "獄炎",
        "trigger": "attack",
        "type": "pierce",
        "value": 60,
        "desc": "攻撃時、相手の防御力を60%無視"
      },
      "image": "images/ssr004.webp"
    },
    {
      "id": "ssr005",
      "name": "光輝の聖王",
      "rarity": "SSR",
      "fusionOnly": true,
      "art": "🌟",
      "baseAtk": 84,
      "baseDef": 78,
      "marks": [
        "N",
        "E",
        "S",
        "W"
      ],
      "skill": {
        "id": "field_def_xl",
        "name": "聖王の加護",
        "trigger": "enter",
        "type": "field_ally_def",
        "value": 20,
        "desc": "登場時、隣接する味方の防御力+20"
      },
      "image": "images/ssr005.webp"
    },
    {
      "id": "ur001",
      "name": "創世の龍神",
      "rarity": "UR",
      "fusionOnly": true,
      "art": "🐉✨",
      "baseAtk": 120,
      "baseDef": 95,
      "marks": [
        "N",
        "NE",
        "E",
        "SE",
        "S",
        "SW",
        "W",
        "NW"
      ],
      "skill": {
        "id": "chain",
        "name": "天地連鎖",
        "trigger": "win",
        "type": "chain",
        "value": 1,
        "desc": "勝利時、その方向の先のカードも味方化する"
      },
      "image": "images/ur001.webp"
    },
    {
      "id": "ur002",
      "name": "終焉の魔王",
      "rarity": "UR",
      "fusionOnly": true,
      "art": "👑",
      "baseAtk": 135,
      "baseDef": 80,
      "marks": [
        "NE",
        "NW",
        "SE",
        "SW",
        "N",
        "S"
      ],
      "skill": {
        "id": "pierce_xl",
        "name": "終末",
        "trigger": "attack",
        "type": "pierce",
        "value": 70,
        "desc": "攻撃時、相手の防御力を70%無視"
      },
      "image": "images/ur002.webp"
    },
    {
      "id": "ur003",
      "name": "天空の女神",
      "rarity": "UR",
      "fusionOnly": true,
      "art": "👸",
      "baseAtk": 110,
      "baseDef": 110,
      "marks": [
        "N",
        "E",
        "S",
        "W",
        "NE",
        "SE"
      ],
      "skill": {
        "id": "atk_up_xl",
        "name": "神威",
        "trigger": "attack",
        "type": "atk_up",
        "value": 30,
        "desc": "攻撃時、自身の攻撃力+30"
      },
      "image": "images/ur003.webp"
    }
  ]
};
