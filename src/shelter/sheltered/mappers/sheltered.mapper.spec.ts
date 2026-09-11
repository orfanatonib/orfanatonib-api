import { DecisionType } from "src/shelter/accepted-christ/enums/decision-type.enum";
import {
  toShelteredAddressDto,
  toShelteredListItemDto,
  toShelteredResponseDto,
} from "./sheltered.mapper";
import {
  buildAcceptedChristEntity,
  buildAddressEntity,
  buildShelteredEntity,
  FIXED_CREATED_AT,
  FIXED_UPDATED_AT,
} from "../sheltered.fixtures";
import { ShelteredGender } from "../enums/sheltered-gender.enum";

describe("sheltered.mapper", () => {
  describe("toShelteredAddressDto", () => {
    it("returns null when the acolhido has no address", () => {
      expect(toShelteredAddressDto(null)).toBeNull();
      expect(toShelteredAddressDto(undefined)).toBeNull();
    });

    it("maps every public address column", () => {
      expect(toShelteredAddressDto(buildAddressEntity())).toEqual({
        id: "address-id",
        street: "Rua das Flores",
        number: "100",
        district: "Centro",
        city: "Manaus",
        state: "AM",
        postalCode: "69000000",
        complement: "Apto 2",
      });
    });

    it("normalizes absent optional columns to null", () => {
      const dto = toShelteredAddressDto(
        buildAddressEntity({ street: null, district: null, postalCode: null }),
      );

      expect(dto).toMatchObject({
        street: null,
        district: null,
        postalCode: null,
      });
    });
  });

  describe("toShelteredResponseDto", () => {
    it("maps the full contract", () => {
      expect(toShelteredResponseDto(buildShelteredEntity())).toEqual({
        id: "sheltered-id",
        name: "Maria Silva",
        gender: ShelteredGender.FEMALE,
        birthDate: "2015-04-02",
        guardianName: "Joana Silva",
        guardianPhone: "92999990000",
        joinedAt: "2024-08-01",
        active: true,
        shelter: { id: "shelter-id", name: "Abrigo Esperança" },
        address: {
          id: "address-id",
          street: "Rua das Flores",
          number: "100",
          district: "Centro",
          city: "Manaus",
          state: "AM",
          postalCode: "69000000",
          complement: "Apto 2",
        },
        createdAt: FIXED_CREATED_AT.toISOString(),
        updatedAt: FIXED_UPDATED_AT.toISOString(),
      });
    });

    it("returns null relations for an acolhido without shelter or address", () => {
      const dto = toShelteredResponseDto(
        buildShelteredEntity({ shelter: null, address: null }),
      );

      expect(dto.shelter).toBeNull();
      expect(dto.address).toBeNull();
    });

    it("never leaks internal relations such as pagelas or acceptedChrists", () => {
      const dto = toShelteredResponseDto(
        buildShelteredEntity({
          acceptedChrists: [buildAcceptedChristEntity()],
        }),
      );

      expect(dto).not.toHaveProperty("pagelas");
      expect(dto).not.toHaveProperty("acceptedChrists");
    });

    it("normalizes date columns returned as timestamps", () => {
      const dto = toShelteredResponseDto(
        buildShelteredEntity({
          birthDate: "2015-04-02T00:00:00.000Z",
          joinedAt: null,
        }),
      );

      expect(dto.birthDate).toBe("2015-04-02");
      expect(dto.joinedAt).toBeNull();
    });
  });

  describe("toShelteredListItemDto", () => {
    it("flattens the shelter into shelterId and maps the decisions", () => {
      const dto = toShelteredListItemDto(
        buildShelteredEntity({
          acceptedChrists: [
            buildAcceptedChristEntity({ decision: DecisionType.RECONCILED }),
          ],
        }),
      );

      expect(dto).toEqual({
        id: "sheltered-id",
        name: "Maria Silva",
        guardianName: "Joana Silva",
        gender: ShelteredGender.FEMALE,
        guardianPhone: "92999990000",
        shelterId: "shelter-id",
        active: true,
        acceptedChrists: [
          {
            id: "accepted-christ-id",
            decision: DecisionType.RECONCILED,
            createdAt: FIXED_CREATED_AT.toISOString(),
            updatedAt: FIXED_UPDATED_AT.toISOString(),
          },
        ],
      });
    });

    it("returns a null shelterId and an empty decision list when relations are absent", () => {
      const entity = buildShelteredEntity({ shelter: null });
      Reflect.deleteProperty(entity, "acceptedChrists");

      const dto = toShelteredListItemDto(entity);

      expect(dto.shelterId).toBeNull();
      expect(dto.acceptedChrists).toEqual([]);
    });
  });
});
