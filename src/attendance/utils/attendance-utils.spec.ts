import { UnauthenticatedException } from "src/common/exceptions";
import { AuthenticatedRequest, UserRole } from "src/core/auth/auth.types";
import { AttendanceCategory } from "../entities/attendance.entity";
import { toAttendanceActor } from "./attendance-scope.util";
import {
  byDateDesc,
  formatDayBR,
  isoDay,
  occurrencesOf,
  pastOccurrencesOf,
} from "./attendance-occurrence.util";
import { toRecordsFilters } from "./attendance-filters.util";
import { AttendanceFiltersDto } from "../dto/attendance-filters.dto";
import { ATTENDANCE_LIMIT_DEFAULT, ATTENDANCE_LIMIT_MAX } from "../constants";
import { TODAY, buildSchedule, buildTeam } from "../attendance.fixtures";

const requestWith = (user?: unknown): AuthenticatedRequest =>
  ({ user }) as AuthenticatedRequest;

describe("toAttendanceActor", () => {
  it("lê o ator do token, pelo campo que a strategy popula", () => {
    // O controller lia `req.user.id`, que a JwtStrategy nunca devolve.
    expect(
      toAttendanceActor(
        requestWith({ userId: "user-1", role: UserRole.LEADER }),
      ),
    ).toEqual({ userId: "user-1", role: UserRole.LEADER });
  });

  it("normaliza o papel independentemente da caixa", () => {
    expect(
      toAttendanceActor(requestWith({ userId: "user-1", role: "ADMIN" })).role,
    ).toBe(UserRole.ADMIN);
  });

  it("descarta papel desconhecido", () => {
    expect(
      toAttendanceActor(requestWith({ userId: "user-1", role: "auditor" }))
        .role,
    ).toBeNull();
  });

  it("recusa requisição sem usuário", () => {
    expect(() => toAttendanceActor(requestWith())).toThrow(
      UnauthenticatedException,
    );
    expect(() => toAttendanceActor(requestWith({ role: "admin" }))).toThrow(
      UnauthenticatedException,
    );
  });
});

describe("occurrencesOf", () => {
  const team = buildTeam();

  it("um agendamento com visita e reunião vira dois encontros", () => {
    const occurrences = occurrencesOf(buildSchedule(), team);

    expect(occurrences.map((o) => o.category)).toEqual([
      AttendanceCategory.VISIT,
      AttendanceCategory.MEETING,
    ]);
  });

  it("o local de cada encontro é diferente", () => {
    const [visit, meeting] = occurrencesOf(buildSchedule(), team);

    expect(visit.location).toBe("Abrigo - Abrigo Esperança");
    expect(meeting.location).toBe("NIB - Sala 2");
  });

  it("reunião sem sala informa 'Sem local'", () => {
    const [, meeting] = occurrencesOf(
      buildSchedule({ meetingRoom: undefined }),
      team,
    );

    expect(meeting.location).toBe("NIB - Sem local");
  });

  it("agendamento só com visita gera um encontro", () => {
    expect(
      occurrencesOf(buildSchedule({ meetingDate: undefined }), team),
    ).toHaveLength(1);
  });

  it("agendamento sem data nenhuma não gera encontro", () => {
    expect(
      occurrencesOf(
        buildSchedule({ visitDate: undefined, meetingDate: undefined }),
        team,
      ),
    ).toEqual([]);
  });

  it("equipe sem descrição recebe o rótulo pelo número", () => {
    const [visit] = occurrencesOf(
      buildSchedule(),
      buildTeam({ numberTeam: 4 }),
    );

    expect(visit.teamName).toBe("Equipe 4");
  });

  it("equipe com descrição mantém a descrição", () => {
    const [visit] = occurrencesOf(
      buildSchedule(),
      buildTeam({ description: "Equipe da tarde" }),
    );

    expect(visit.teamName).toBe("Equipe da tarde");
  });
});

describe("pastOccurrencesOf", () => {
  it("mantém só o que já aconteceu", () => {
    const schedule = buildSchedule({
      visitDate: "2026-09-01",
      meetingDate: "2026-12-01",
    });

    const past = pastOccurrencesOf(schedule, buildTeam(), TODAY);

    expect(past.map((o) => o.category)).toEqual([AttendanceCategory.VISIT]);
  });

  it("não devolve nada quando tudo está no futuro", () => {
    const schedule = buildSchedule({
      visitDate: "2027-01-01",
      meetingDate: "2027-01-02",
    });

    expect(pastOccurrencesOf(schedule, buildTeam(), TODAY)).toEqual([]);
  });
});

describe("byDateDesc e isoDay", () => {
  it("ordena do mais recente para o mais antigo", () => {
    const list = [{ date: "2026-01-01" }, { date: "2026-06-01" }];

    expect([...list].sort(byDateDesc)[0].date).toBe("2026-06-01");
  });

  it("isoDay corta a data no dia", () => {
    expect(isoDay(new Date("2026-09-10T23:45:00.000Z"))).toBe("2026-09-10");
  });
});

describe("toRecordsFilters", () => {
  const query = (overrides: Partial<AttendanceFiltersDto> = {}) =>
    Object.assign(new AttendanceFiltersDto(), overrides);

  it("aplica os padrões quando a consulta vem vazia", () => {
    const filters = toRecordsFilters(
      query({ page: undefined, limit: undefined }),
    );

    expect(filters).toMatchObject({
      page: 1,
      limit: ATTENDANCE_LIMIT_DEFAULT,
      sortBy: "createdAt",
      sortOrder: "DESC",
    });
  });

  it("limita o tamanho da página ao teto", () => {
    expect(toRecordsFilters(query({ limit: 5000 })).limit).toBe(
      ATTENDANCE_LIMIT_MAX,
    );
  });

  it("normaliza o sentido da ordenação", () => {
    expect(toRecordsFilters(query({ sortOrder: "asc" })).sortOrder).toBe("ASC");
    expect(toRecordsFilters(query({ sortOrder: "DeSc" })).sortOrder).toBe(
      "DESC",
    );
  });

  it("recusa um campo de ordenação que o SQL não conhece", () => {
    // Antes o valor caía num ternário e entrava na consulta como viesse.
    expect(toRecordsFilters(query({ sortBy: "senha" })).sortBy).toBe(
      "createdAt",
    );
    expect(toRecordsFilters(query({ sortBy: "visitDate" })).sortBy).toBe(
      "visitDate",
    );
  });

  it("descarta busca por nome em branco", () => {
    expect(
      toRecordsFilters(query({ memberName: "   " })).memberName,
    ).toBeUndefined();
    expect(toRecordsFilters(query({ memberName: " Maria " })).memberName).toBe(
      "Maria",
    );
  });

  it("nunca devolve página menor que 1", () => {
    expect(toRecordsFilters(query({ page: 0 })).page).toBe(1);
  });
});

describe("formatDayBR", () => {
  it("mostra o dia que está no banco, sem deslocar pelo fuso", () => {
    // `new Date("2026-09-01").toLocaleDateString("pt-BR")` devolvia 31/08 em
    // qualquer fuso a oeste de Greenwich: a visita aparecia um dia antes.
    expect(formatDayBR("2026-09-01")).toBe("01/09/2026");
    expect(formatDayBR("2026-01-01")).toBe("01/01/2026");
  });

  it("aceita data com hora", () => {
    expect(formatDayBR("2026-09-01T23:00:00Z")).toBe("01/09/2026");
  });

  it("devolve o valor original quando não é data", () => {
    expect(formatDayBR("sem data")).toBe("sem data");
  });
});
