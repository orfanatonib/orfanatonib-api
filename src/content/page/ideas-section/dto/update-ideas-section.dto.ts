import { CreateIdeasSectionDto } from "./create-ideas-section.dto";

/**
 * A atualização exige a seção inteira: o formulário sempre reenvia título,
 * descrição e a lista completa de mídias, e a lista é o que decide o que fica
 * e o que é removido.
 */
export class UpdateIdeasSectionDto extends CreateIdeasSectionDto {}
