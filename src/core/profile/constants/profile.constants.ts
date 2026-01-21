export const ProfileErrorMessages = {
    NOT_FOUND: 'Perfil não encontrado',
    PROFILE_ALREADY_EXISTS: 'Este perfil já existe',
    CREATION_FAILED: 'Falha ao criar perfil',
    UPDATE_FAILED: 'Falha ao atualizar perfil',
    DELETE_FAILED: 'Falha ao deletar perfil',
} as const;

export const ProfileSuccessMessages = {
    CREATED: 'Perfil criado com sucesso',
    UPDATED: 'Perfil atualizado com sucesso',
    DELETED: 'Perfil deletado com sucesso',
} as const;

export const ProfileLogs = {
    CREATED: (id: string, name: string) => `Perfil criado: ${id} - ${name}`,
    UPDATED: (id: string) => `Perfil atualizado: ${id}`,
    DELETED: (id: string) => `Perfil deletado: ${id}`,
    ERROR: (operation: string, error: string) => `Erro durante ${operation}: ${error}`,
} as const;
