import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentVisualStyle } from "../../enums/content-visual.enums";
import { AUDIENCE_VISUAL_ART } from "./visual-art.constants";

/** Nunca realista, qualquer que seja o desenho (regra do Clubinho). */
const NOT_PHOTOREAL =
  "Nunca fotorrealista nem pintura realista; sem textura detalhada de pele, pelo, madeira ou tecido. Animais e objetos seguem o mesmo traço, sem marcas, logotipos ou objetos modernos reconhecíveis.";

export interface VisualStyleOption {
  readonly style: ContentVisualStyle;
  readonly title: string;
  readonly description: string;
  /** Direção de desenho enviada ao diretor de arte e a cada imagem. */
  readonly prompt: string;
}

export const VISUAL_STYLES: Readonly<
  Record<ContentVisualStyle, VisualStyleOption>
> = {
  [ContentVisualStyle.CUTE_CARTOON]: {
    style: ContentVisualStyle.CUTE_CARTOON,
    title: "Cartoon fofo (padrão)",
    description:
      "Personagens de cabeça grande, olhos brilhantes, cores vivas e contorno grosso.",
    prompt: AUDIENCE_VISUAL_ART[ContentAudience.CHILD].lessonStyle,
  },
  [ContentVisualStyle.ILLUSTRATED]: {
    style: ContentVisualStyle.ILLUSTRATED,
    title: "Livro ilustrado",
    description: "Pintura digital suave, cores claras e luminosas.",
    prompt: `Livro ilustrado infantil: pintura digital suave, cores claras e luminosas, proporções levemente estilizadas e expressões amigáveis, contornos nítidos e contraste suficiente para impressão e recorte. ${NOT_PHOTOREAL}`,
  },
  [ContentVisualStyle.CLASSIC_CARTOON]: {
    style: ContentVisualStyle.CLASSIC_CARTOON,
    title: "Desenho bíblico clássico",
    description: "Contorno preto forte, cores chapadas e poucos detalhes.",
    prompt: `Desenho bíblico clássico de material impresso: contorno preto forte e contínuo em todas as formas, cores chapadas e vivas, sombra simples em um único tom, poucos detalhes, proporções de desenho animado (cabeça um pouco maior), expressões claras e amigáveis. Nada de pintura, aquarela ou degradê. Sol, nuvens, plantas e objetos não têm rosto. ${NOT_PHOTOREAL}`,
  },
  [ContentVisualStyle.MODERN_ILLUSTRATION]: {
    style: ContentVisualStyle.MODERN_ILLUSTRATION,
    title: "Ilustração moderna",
    description:
      "Estilo de série animada ou capa de livro jovem, traço limpo e luz dramática.",
    prompt: AUDIENCE_VISUAL_ART[ContentAudience.TEEN].lessonStyle,
  },
  [ContentVisualStyle.GRAPHIC_NOVEL]: {
    style: ContentVisualStyle.GRAPHIC_NOVEL,
    title: "Graphic novel",
    description:
      "Tinta marcada, contraste forte e enquadramento de quadrinhos.",
    prompt: `Graphic novel: arte-final em tinta com contornos marcados e variação de espessura, sombras chapadas, contraste forte, paleta limitada de cores quentes e frias, enquadramento de quadrinho com profundidade; personagens com proporções realistas estilizadas e expressões naturais. Nunca infantil. ${NOT_PHOTOREAL}`,
  },
  [ContentVisualStyle.EDITORIAL_PAINTING]: {
    style: ContentVisualStyle.EDITORIAL_PAINTING,
    title: "Pintura editorial",
    description:
      "Ilustração sóbria de livro de estudo, paleta terrosa e calma.",
    prompt: AUDIENCE_VISUAL_ART[ContentAudience.ADULT].lessonStyle,
  },
  [ContentVisualStyle.SOFT_WATERCOLOR]: {
    style: ContentVisualStyle.SOFT_WATERCOLOR,
    title: "Aquarela suave",
    description: "Aquarela digital delicada, cores diluídas e luz natural.",
    prompt: `Aquarela digital delicada: manchas de cor diluídas, bordas suaves, papel claro aparecendo, contornos finos e discretos, paleta harmônica e luminosa, luz natural, proporções naturais e expressões contidas e dignas. Nada de estilo infantil nem de caricatura. ${NOT_PHOTOREAL}`,
  },
};

/** Desenhos oferecidos a cada público e o padrão da lista (o primeiro). */
export const VISUAL_STYLE_OPTIONS_BY_AUDIENCE: Readonly<
  Record<ContentAudience, readonly ContentVisualStyle[]>
> = {
  [ContentAudience.BABY]: [
    ContentVisualStyle.CUTE_CARTOON,
    ContentVisualStyle.ILLUSTRATED,
    ContentVisualStyle.CLASSIC_CARTOON,
  ],
  [ContentAudience.CHILD]: [
    ContentVisualStyle.CUTE_CARTOON,
    ContentVisualStyle.ILLUSTRATED,
    ContentVisualStyle.CLASSIC_CARTOON,
  ],
  [ContentAudience.TEEN]: [
    ContentVisualStyle.MODERN_ILLUSTRATION,
    ContentVisualStyle.GRAPHIC_NOVEL,
    ContentVisualStyle.CLASSIC_CARTOON,
  ],
  [ContentAudience.ADULT]: [
    ContentVisualStyle.EDITORIAL_PAINTING,
    ContentVisualStyle.SOFT_WATERCOLOR,
    ContentVisualStyle.GRAPHIC_NOVEL,
  ],
};

export const VISUAL_QUANTITY = { min: 4, max: 10 } as const;
export const VISUAL_INSTRUCTIONS_MAX_LENGTH = 1000;
