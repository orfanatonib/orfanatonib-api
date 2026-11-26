import { CutoutCategory } from "./visual-art.constants";

/**
 * Kit de recortes: distribuição das categorias por prancha para 4 a 10 pranchas (modelo do Clubinho). O conjunto
 * básico entra sempre; cada nível só reorganiza categorias e acrescenta peças.
 */
type KitCategory = Exclude<CutoutCategory, CutoutCategory.SCENE>;
const C = CutoutCategory;

export interface CutoutKitTier {
  readonly sheets: readonly (readonly KitCategory[])[];
  readonly extras: string;
}

export const CUTOUT_KIT_TIERS: Readonly<Record<number, CutoutKitTier>> = {
  4: {
    sheets: [
      [C.CHARACTERS],
      [C.ANIMALS, C.OBJECTS],
      [C.BUILDINGS, C.SCENERY],
      [C.SKY_AND_NATURE],
    ],
    extras: "",
  },
  5: {
    sheets: [
      [C.CHARACTERS],
      [C.ANIMALS],
      [C.OBJECTS],
      [C.BUILDINGS, C.SCENERY],
      [C.SKY_AND_NATURE],
    ],
    extras: "segunda pose ou variante dos personagens principais",
  },
  6: {
    sheets: [
      [C.CHARACTERS],
      [C.ANIMALS],
      [C.OBJECTS],
      [C.BUILDINGS],
      [C.SCENERY],
      [C.SKY_AND_NATURE],
    ],
    extras:
      "mais ângulos das construções e peças extras de cenário (colinas menores, caminhos, rio)",
  },
  7: {
    sheets: [
      [C.CHARACTERS],
      [C.ANIMALS],
      [C.OBJECTS],
      [C.BUILDINGS],
      [C.SCENERY],
      [C.SKY_AND_NATURE],
      [C.SKY_AND_NATURE],
    ],
    extras:
      "céu e natureza ampliados: nuvens em mais formatos, pássaros em mais posições, lua em fases, estrelas, árvores e flores variadas",
  },
  8: {
    sheets: [
      [C.CHARACTERS],
      [C.ANIMALS],
      [C.ANIMALS],
      [C.OBJECTS],
      [C.BUILDINGS],
      [C.SCENERY],
      [C.SKY_AND_NATURE],
      [C.SKY_AND_NATURE],
    ],
    extras: "filhotes, mais animais de contexto e variantes de estado",
  },
  9: {
    sheets: [
      [C.CHARACTERS],
      [C.CHARACTERS],
      [C.ANIMALS],
      [C.ANIMALS],
      [C.OBJECTS],
      [C.BUILDINGS],
      [C.SCENERY],
      [C.SKY_AND_NATURE],
      [C.SKY_AND_NATURE],
    ],
    extras:
      "expressões e poses adicionais em momentos-chave, figurantes e multidão em silhuetas",
  },
  10: {
    sheets: [
      [C.CHARACTERS],
      [C.CHARACTERS],
      [C.ANIMALS],
      [C.ANIMALS],
      [C.OBJECTS],
      [C.OBJECTS],
      [C.BUILDINGS],
      [C.SCENERY],
      [C.SKY_AND_NATURE],
      [C.SKY_AND_NATURE],
    ],
    extras:
      "objetos secundários, adereços de época e peças de transição (portas, cercas, tendas, barcos menores)",
  },
};

export const CUTOUT_KIT_BASIC_SET: readonly string[] = [
  "todos os personagens nomeados da lição (uma pose base cada)",
  "todos os animais citados",
  "todas as construções e lugares citados",
  "cenário essencial: montanhas/colinas, chão/caminho e, se a lição pedir, mar/rio/deserto",
  "objetos que os personagens usam ou tocam na história",
  "céu e natureza mínimos: nuvens, sol, pássaros e uma árvore (lua e estrelas se a história for à noite)",
];

/** Texto das regras do kit para a quantidade de pranchas escolhida. */
export function cutoutKitPromptRules(quantity: number): string[] {
  const n = Math.min(10, Math.max(4, Math.trunc(quantity) || 4));
  const tier = CUTOUT_KIT_TIERS[n];
  const extras: string[] = [];
  for (let level = 5; level <= n; level += 1)
    if (CUTOUT_KIT_TIERS[level].extras)
      extras.push(CUTOUT_KIT_TIERS[level].extras);
  return [
    `- Conjunto básico obrigatório em qualquer quantidade: ${CUTOUT_KIT_BASIC_SET.join("; ")}.`,
    `- Com ${n} pranchas, organize assim: ${tier.sheets
      .map((sheet, index) => `prancha ${index + 1}: ${sheet.join(" + ")}`)
      .join(
        "; ",
      )}.${extras.length ? ` Além do básico, acrescente: ${extras.join("; ")}.` : " Nada além do básico."}`,
  ];
}
