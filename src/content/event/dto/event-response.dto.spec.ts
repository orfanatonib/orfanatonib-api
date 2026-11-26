import type { EventEntity } from "../entities/event.entity";
import { EventResponseDto } from "./event-response.dto";

describe("EventResponseDto.fromEntity", () => {
  const entity = {
    id: "e1",
    title: "Culto",
    description: "d",
    date: "2026-12-01",
    location: "Igreja",
    audience: "all",
    // campos internos que NÃO podem sair na resposta
    createdAt: new Date(),
    updatedAt: new Date(),
    shelterSchedule: { id: "sch1" },
  } as unknown as EventEntity;

  it("expõe só o contrato público do evento", () => {
    expect(Object.keys(EventResponseDto.fromEntity(entity)).sort()).toEqual(
      [
        "audience",
        "date",
        "description",
        "id",
        "location",
        "media",
        "title",
      ].sort(),
    );
  });

  it("não vaza datas internas nem o agendamento de abrigo", () => {
    const dto = EventResponseDto.fromEntity(entity) as unknown as Record<
      string,
      unknown
    >;
    expect(dto).not.toHaveProperty("createdAt");
    expect(dto).not.toHaveProperty("updatedAt");
    expect(dto).not.toHaveProperty("shelterSchedule");
  });

  it("carrega a mídia quando informada", () => {
    const media = { id: "m1" } as never;
    expect(EventResponseDto.fromEntity(entity, media).media).toBe(media);
  });
});
