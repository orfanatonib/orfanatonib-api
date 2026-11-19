import { toFullDisplayName } from "src/common/utils/display-name.util";
import type { UserEntity } from "src/core/user/entities/user.entity";
import { SectionAuthorDto } from "./dto/section-author.dto";

/**
 * Converte a relação `author` no DTO do feed (nome completo de quem publicou, como no Clubinho). Seção antiga (sem autor), conta
 * removida ou relação não carregada → `null` ("Autor não informado" no app).
 */
export const toSectionAuthorDto = (
  author: Pick<UserEntity, "name"> | null | undefined,
): SectionAuthorDto | null => {
  const displayName = toFullDisplayName(author?.name);
  return displayName ? { displayName } : null;
};
