import { EventAudience } from "../entities/event.entity";

/** Públicos de evento que cada papel pode ver (anônimo só vê "todos"). */
export function allowedAudiencesFor(role?: string | null): EventAudience[] {
  switch (role?.toLowerCase()) {
    case "member":
      return [EventAudience.ALL, EventAudience.MEMBERS];
    case "leader":
    case "admin":
      return [EventAudience.ALL, EventAudience.MEMBERS, EventAudience.LEADERS];
    default:
      return [EventAudience.ALL];
  }
}
