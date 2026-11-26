import { CompleteProfileResponseDto } from "../dto/complete-profile-response.dto";

interface ProfileUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: CompleteProfileResponseDto["role"];
}

interface ProfilePersonalData {
  birthDate?: Date | string | null;
  gender?: string | null;
  gaLeaderName?: string | null;
  gaLeaderContact?: string | null;
}

interface ProfilePreferences {
  loveLanguages?: unknown;
  temperaments?: unknown;
  favoriteColor?: unknown;
  favoriteFood?: unknown;
  favoriteMusic?: unknown;
  whatMakesYouSmile?: unknown;
  skillsAndTalents?: unknown;
}

/** `YYYY-MM-DD` de um `Date` ou de uma string ISO (sem deslocar o dia por fuso). */
export function birthDateOnly(
  value?: Date | string | null,
): string | undefined {
  if (!value) return undefined;
  return value instanceof Date
    ? value.toISOString().split("T")[0]
    : String(value).split("T")[0];
}

/**
 * Resposta única de create/update/get do perfil completo (antes copiada em três
 * serviços). Nunca inclui senha nem token: só o que `CompleteProfileResponseDto` declara.
 */
export function toCompleteProfileResponse(
  user: ProfileUser,
  personalData: ProfilePersonalData | null | undefined,
  preferences: ProfilePreferences | null | undefined,
): CompleteProfileResponseDto {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    role: user.role,
    personalData: personalData
      ? ({
          birthDate: birthDateOnly(personalData.birthDate),
          gender: personalData.gender,
          gaLeaderName: personalData.gaLeaderName,
          gaLeaderContact: personalData.gaLeaderContact,
        } as CompleteProfileResponseDto["personalData"])
      : undefined,
    preferences: preferences
      ? ({
          loveLanguages: preferences.loveLanguages,
          temperaments: preferences.temperaments,
          favoriteColor: preferences.favoriteColor,
          favoriteFood: preferences.favoriteFood,
          favoriteMusic: preferences.favoriteMusic,
          whatMakesYouSmile: preferences.whatMakesYouSmile,
          skillsAndTalents: preferences.skillsAndTalents,
        } as CompleteProfileResponseDto["preferences"])
      : undefined,
  };
}
