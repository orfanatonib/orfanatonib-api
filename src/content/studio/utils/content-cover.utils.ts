import {
  CONTENT_COVER,
  CONTENT_COVER_BRIEF_PROMPT,
  CONTENT_COVER_BRIEF_SCHEMA,
  CONTENT_COVER_HEADLINE,
} from "../constants/content-cover.constants";

export interface ContentCoverSource {
  readonly theme: string;
  readonly biblicalReferences: string;
  readonly canonicalObjective: string;
  readonly canonicalNotes?: string | null;
}

export interface ContentCoverBrief {
  /** Título escrito na imagem, já em maiúsculas. */
  readonly headline: string;
  readonly character: { readonly name: string; readonly appearance: string };
  readonly scene: string;
  readonly palette: readonly string[];
}

const clean = (
  value: unknown,
  max: number = CONTENT_COVER.MAX_FIELD_LENGTH,
): string =>
  (typeof value === "string" ? value : "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const wordsOf = (text: string): string[] => text.split(" ").filter(Boolean);

const isConnector = (word: string): boolean =>
  (CONTENT_COVER_HEADLINE.TRAILING_CONNECTORS as readonly string[]).includes(
    word.toLocaleLowerCase("pt-BR"),
  );

/** Título sem aspas, emojis nem pontuação final, em uma linha. */
export function normalizeHeadline(raw: string): string {
  return raw
    .replace(/["“”‘’«»`´]/g, "")
    .replace(/[^\p{L}\p{N}\s'’:;,.\-–—?!]/gu, "")
    .replace(/[\s.,:;\-–—!?]+$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function headlineFits(headline: string): boolean {
  return (
    headline.length > 0 &&
    headline.length <= CONTENT_COVER_HEADLINE.MAX_CHARS &&
    wordsOf(headline).length <= CONTENT_COVER_HEADLINE.MAX_WORDS
  );
}

/** Forma curta de um título longo, sem modelo: antes do subtítulo, sem terminar em conectivo. */
export function simplifyTitle(title: string): string {
  const normalized = normalizeHeadline(title);
  if (headlineFits(normalized)) return normalized;
  const [main] = normalized.split(CONTENT_COVER_HEADLINE.SUBTITLE_SEPARATORS);
  const chosen: string[] = [];
  for (const word of wordsOf(main || normalized)) {
    const next = [...chosen, word].join(" ");
    if (
      chosen.length >= CONTENT_COVER_HEADLINE.MAX_WORDS ||
      next.length > CONTENT_COVER_HEADLINE.MAX_CHARS
    )
      break;
    chosen.push(word);
  }
  while (chosen.length > 1 && isConnector(chosen[chosen.length - 1]))
    chosen.pop();
  return (chosen.join(" ") || normalized).slice(
    0,
    CONTENT_COVER_HEADLINE.MAX_CHARS,
  );
}

export function coverHeadline(candidate: string, theme: string): string {
  const normalized = normalizeHeadline(candidate);
  const short = headlineFits(normalized)
    ? normalized
    : simplifyTitle(normalized || theme);
  return short.toLocaleUpperCase("pt-BR");
}

/** Entrada do modelo de texto que escreve o briefing. */
export function buildCoverBriefInput(
  source: ContentCoverSource,
): Record<string, unknown> {
  return {
    material: {
      tema: source.theme,
      referenciasBiblicas: source.biblicalReferences,
      objetivo: source.canonicalObjective,
      observacoes: source.canonicalNotes ?? null,
    },
    limitesDoTitulo: {
      maximoDePalavras: CONTENT_COVER_HEADLINE.MAX_WORDS,
      maximoDeCaracteres: CONTENT_COVER_HEADLINE.MAX_CHARS,
    },
  };
}

export const COVER_BRIEF_INSTRUCTIONS = [CONTENT_COVER_BRIEF_PROMPT];
export const COVER_BRIEF_SCHEMA =
  CONTENT_COVER_BRIEF_SCHEMA as unknown as Record<string, unknown>;

/** Resposta do modelo, ou o motivo de não servir. */
export function parseCoverBrief(
  raw: Record<string, unknown>,
  source: Pick<ContentCoverSource, "theme">,
): { brief: ContentCoverBrief } | { problem: string } {
  const character =
    raw.character && typeof raw.character === "object"
      ? (raw.character as Record<string, unknown>)
      : {};
  const name = clean(character.name, 120);
  const appearance = clean(character.appearance);
  const scene = clean(raw.scene);
  if (!name || !appearance) return { problem: "personagem principal ausente" };
  if (!scene) return { problem: "cena ausente" };
  const palette = (Array.isArray(raw.palette) ? raw.palette : [])
    .map((color) => clean(color, 40))
    .filter(Boolean)
    .slice(0, 4);
  return {
    brief: {
      headline: coverHeadline(clean(raw.headline, 200), source.theme),
      character: { name, appearance },
      scene,
      palette,
    },
  };
}

/** Briefing feito só do tema, quando o modelo de texto não responde. */
export function fallbackCoverBrief(
  source: ContentCoverSource,
): ContentCoverBrief {
  return {
    headline: coverHeadline(source.theme, source.theme),
    character: { name: "", appearance: "" },
    scene: "",
    palette: [],
  };
}

const section = (title: string, lines: ReadonlyArray<string | false>): string =>
  `${title}\n${lines.filter(Boolean).join("\n")}`;

/** Instruções do gerador de imagem: o texto exato, a área segura e a linha única de texto ficam explícitos. */
export function buildCoverImageInstructions(
  brief: ContentCoverBrief,
  source: ContentCoverSource,
  extra?: string | null,
): string[] {
  const hasCharacter = Boolean(brief.character.name);
  const letters = [...brief.headline.replace(/\s+/g, " ")].join(" ");
  return [
    section("FINALIDADE", [
      "Capa horizontal (proporção 3:2) do card de um material bíblico infantil do Orfanato NIB, para crianças atendidas em abrigos. Mistura um TÍTULO CURTO escrito na arte com o PERSONAGEM PRINCIPAL da passagem, e será vista em tamanho pequeno: poucos elementos, formas grandes, cores vivas. Desenho cartoon infantil, fofo e acolhedor.",
    ]),
    section("PERSONAGEM PRINCIPAL (um só, em destaque)", [
      hasCharacter
        ? `${brief.character.name}. Aparência fixa, siga à risca: ${brief.character.appearance}`
        : `O protagonista da passagem ${source.biblicalReferences} (apenas um personagem), com roupas e acessórios da época do relato, expressão amigável.`,
      "Ocupa cerca de dois terços da altura do quadro, com o rosto inteiro visível, nítido e sorridente ou confiante. Corpo de cartoon infantil com cabeça grande. Fica do lado direito do quadro, virado levemente para o centro.",
    ]),
    section("CENA E CENÁRIO", [
      brief.scene ||
        `Um cenário simples, fiel ao relato de ${source.biblicalReferences}, com no máximo dois elementos que ajudem a reconhecer a história.`,
      "Fundo colorido e simples, com profundidade suave, que preenche todo o quadro.",
      brief.palette.length > 0 && `Paleta: ${brief.palette.join(", ")}.`,
    ]),
    section("TEXTO NA IMAGEM (o único texto permitido)", [
      `Escreva exatamente este título, em MAIÚSCULAS: "${brief.headline}". As aspas são só delimitadores: não as desenhe.`,
      `Letra por letra: ${letters}. Mesmas letras, mesmos acentos, mesma ordem, em português do Brasil. Não acrescente, não troque nem repita letras.`,
      "Tipografia: letras grossas e arredondadas de livro infantil, em caixa-alta, com preenchimento claro, contorno escuro grosso e sombra suave, com contraste forte com o fundo.",
      "Posição: lado esquerdo, em no máximo duas linhas, alinhado à esquerda, ocupando cerca de 45% da largura, sem tocar no personagem.",
      "Nenhum outro texto: sem subtítulo, referência bíblica, versículo, legenda, assinatura, marca d'água ou logotipo.",
    ]),
    section("ENQUADRAMENTO E MARGEM DE SEGURANÇA", [
      "A imagem será cortada nas bordas: mantenha o título inteiro e o rosto do personagem dentro da área central (80% da largura e da altura), com margem livre de pelo menos 8% em cada borda.",
      "O fundo vai até as bordas: sem moldura, sem borda branca, sem cantos arredondados desenhados.",
    ]),
    section("CONFERÊNCIA ANTES DE FINALIZAR", [
      `O texto da imagem é exatamente "${brief.headline}". Há um único personagem principal. O título e o rosto estão dentro da área de segurança. Nada violento, assustador ou realista.`,
    ]),
    ...(extra?.trim()
      ? [`ORIENTAÇÃO EXTRA DO ADMINISTRADOR: ${extra.trim()}`]
      : []),
  ];
}
