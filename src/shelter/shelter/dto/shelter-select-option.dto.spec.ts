import { toShelterSelectOption } from "./shelter-select-option.dto";
import { toShelterTeamSelectOption } from "./shelter-team-select-option.dto";
import {
  buildAddressEntity,
  buildShelterEntity,
  buildTeamEntity,
} from "../shelter.fixtures";

describe("toShelterSelectOption", () => {
  it("labels the option with the shelter district", () => {
    expect(toShelterSelectOption(buildShelterEntity())).toEqual({
      id: "shelter-id",
      name: "Abrigo Esperança : Centro",
      leader: true,
    });
  });

  it("omits the district when the address flag is off", () => {
    expect(toShelterSelectOption(buildShelterEntity(), false).name).toBe(
      "Abrigo Esperança",
    );
  });

  it("falls back to a dash when there is no district to show", () => {
    const shelter = buildShelterEntity({
      address: buildAddressEntity({ district: "   " }),
    });

    expect(toShelterSelectOption(shelter).name).toBe("Abrigo Esperança : —");
  });

  it("reports no leader when no team has one", () => {
    const shelter = buildShelterEntity({
      teams: [buildTeamEntity({ leaders: [] })],
    });

    expect(toShelterSelectOption(shelter).leader).toBe(false);
  });

  it("reports no leader when the teams were not loaded", () => {
    const shelter = buildShelterEntity({
      teams: undefined as unknown as [],
      address: undefined as unknown as ReturnType<typeof buildAddressEntity>,
    });

    expect(toShelterSelectOption(shelter)).toMatchObject({
      leader: false,
      name: "Abrigo Esperança : —",
    });
  });
});

describe("toShelterTeamSelectOption", () => {
  it("labels the team with its number and the shelter name", () => {
    const team = buildTeamEntity({ numberTeam: 3 });
    team.shelter = buildShelterEntity();

    expect(toShelterTeamSelectOption(team)).toEqual({
      id: "team-id",
      shelterId: "shelter-id",
      label: "Equipe 3 - Abrigo Esperança",
      teamNumber: 3,
      shelterName: "Abrigo Esperança",
    });
  });

  it("falls back to a dash when the shelter is missing", () => {
    expect(toShelterTeamSelectOption(buildTeamEntity())).toMatchObject({
      shelterId: "",
      shelterName: "—",
      label: "Equipe 1 - —",
    });
  });
});
