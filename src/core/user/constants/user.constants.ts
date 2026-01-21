export const UserErrorMessages = {
    NOT_FOUND: 'UserEntity not found',
    USER_NOT_FOUND: 'Usuário não encontrado',
    EMAIL_IN_USE: 'Este email já está em uso por outro usuário',
    CURRENT_PASSWORD_REQUIRED: 'A senha atual é obrigatória para usuários comuns',
    CURRENT_PASSWORD_INCORRECT: 'Senha atual incorreta',
    NEW_PASSWORD_SAME: 'A nova senha deve ser diferente da senha atual',
    IMAGE_DATA_REQUIRED: 'imageData é obrigatório ou envie campos diretos (title, url, etc.)',
    URL_OR_FILE_REQUIRED: 'URL ou arquivo é obrigatório',
} as const;

export const UserSuccessMessages = {
    CREATED: 'Usuário criado com sucesso',
    UPDATED: 'Usuário atualizado com sucesso',
    DELETED: 'Usuário deletado com sucesso',
    PASSWORD_CHANGED: 'Senha alterada com sucesso',
    PROFILE_UPDATED: 'Perfil atualizado com sucesso',
    IMAGE_UPDATED: 'Imagem atualizada com sucesso',
} as const;

export const UserLogs = {
    CREATED: (id: string) => `User created with ID: ${id}`,
    UPDATED: (id: string) => `User updated: ${id}`,
    DELETED: (id: string) => `User deleted: ${id}`,
    PASSWORD_CHANGED: (id: string) => `Password changed for user: ${id}`,
    PROFILE_UPDATED: (id: string) => `Profile updated for user: ${id}`,
    IMAGE_UPDATED: (id: string) => `Image updated for user: ${id}`,
    ERROR: (operation: string, error: string) => `Error during ${operation}: ${error}`,
} as const;
