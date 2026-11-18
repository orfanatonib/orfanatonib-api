import type { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import {
  MediaType,
  PlatformType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import type { MeditationEntity } from "../entities/meditation.entity";
import { MediaItemDto, MeditationDto } from "./meditation-response.dto";

const media = (overrides: Partial<MediaItemEntity> = {}): MediaItemEntity =>
  ({
    id: "m1",
    title: "Vídeo",
    description: "d",
    mediaType: MediaType.VIDEO,
    uploadType: UploadType.LINK,
    platformType: PlatformType.YOUTUBE,
    url: "https://youtu.be/x",
    isLocalFile: false,
    ...overrides,
  }) as MediaItemEntity;

describe("MediaItemDto.fromEntity", () => {
  it("typeUpload vem de uploadType (antes lia `type`, que não existe, e saía undefined)", () => {
    expect(MediaItemDto.fromEntity(media()).typeUpload).toBe(UploadType.LINK);
    expect(
      MediaItemDto.fromEntity(media({ uploadType: UploadType.UPLOAD }))
        .typeUpload,
    ).toBe(UploadType.UPLOAD);
  });

  it("platformType ausente vira undefined e o valor do enum é preservado", () => {
    expect(
      MediaItemDto.fromEntity(media({ platformType: undefined })).platformType,
    ).toBeUndefined();
    expect(
      MediaItemDto.fromEntity(media({ platformType: PlatformType.ANY }))
        .platformType,
    ).toBe(PlatformType.ANY);
  });
});

describe("MeditationDto.fromEntity", () => {
  const meditation = {
    id: "med1",
    topic: "Fé",
    startDate: new Date("2026-11-02"),
    endDate: new Date("2026-11-06"),
    createdAt: new Date(),
    updatedAt: new Date(),
    days: [
      {
        id: "d1",
        day: "Monday",
        verse: "Jo 3.16",
        topic: "Amor",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  } as unknown as MeditationEntity;

  it("monta os dias e aceita meditação sem mídia (null)", () => {
    const dto = MeditationDto.fromEntity(meditation, null);
    expect(dto.days).toHaveLength(1);
    expect(dto.days[0]).toMatchObject({ day: "Monday", verse: "Jo 3.16" });
    expect(dto.media).toBeNull();
  });

  it("sem `days` carregados devolve lista vazia em vez de quebrar", () => {
    const dto = MeditationDto.fromEntity(
      { ...meditation, days: undefined } as unknown as MeditationEntity,
      media(),
    );
    expect(dto.days).toEqual([]);
    expect(dto.media?.id).toBe("m1");
  });
});
