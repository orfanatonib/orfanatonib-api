import { EventAudience } from "../entities/event.entity";
import { allowedAudiencesFor } from "./event-audience.util";

describe("allowedAudiencesFor", () => {
  it.each([
    [undefined, [EventAudience.ALL]],
    [null, [EventAudience.ALL]],
    ["qualquer", [EventAudience.ALL]],
    ["member", [EventAudience.ALL, EventAudience.MEMBERS]],
    ["MEMBER", [EventAudience.ALL, EventAudience.MEMBERS]],
    [
      "leader",
      [EventAudience.ALL, EventAudience.MEMBERS, EventAudience.LEADERS],
    ],
    [
      "admin",
      [EventAudience.ALL, EventAudience.MEMBERS, EventAudience.LEADERS],
    ],
  ])("%s", (role, expected) => {
    expect(allowedAudiencesFor(role)).toEqual(expected);
  });
});
