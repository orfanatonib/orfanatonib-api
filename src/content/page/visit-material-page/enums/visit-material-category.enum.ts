/** Categorias (faixas etárias) de uma página de material de visita; os valores espelham o Estúdio. */
export enum VisitMaterialCategory {
  BABY = "BABY",
  CHILD = "CHILD",
  TEEN = "TEEN",
  ADULT = "ADULT",
}

/** Ordem de exibição, da faixa mais nova para a mais velha. */
export const VISIT_MATERIAL_CATEGORY_ORDER: readonly VisitMaterialCategory[] = [
  VisitMaterialCategory.BABY,
  VisitMaterialCategory.CHILD,
  VisitMaterialCategory.TEEN,
  VisitMaterialCategory.ADULT,
];
