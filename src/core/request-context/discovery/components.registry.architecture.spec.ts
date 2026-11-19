import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { ModulesContainer, NestFactory } from "@nestjs/core";

import { AppModule } from "src/app.module";

import { UNKNOWN_MODULE_NAME } from "../constants";
import { ComponentsRegistry } from "./components.registry";

const SRC = join(__dirname, "..", "..", "..");

/** Os módulos versionados hoje; um módulo novo entra pelo container sozinho. */
const KNOWN_MODULES = [
  "AcceptedChristsModule",
  "AddressesModule",
  "AppModule",
  "AtendenteModule",
  "AttendanceModule",
  "AuthModule",
  "AwsModule",
  "CommentModule",
  "ContactModule",
  "ContentStudioModule",
  "DatabaseModule",
  "DocumentModule",
  "EmailModule",
  "EventModule",
  "FeatureFlagsCoreModule",
  "FeatureFlagsModule",
  "HealthModule",
  "IdeasPageModule",
  "IdeasSectionModule",
  "ImageModule",
  "ImageSectionModule",
  "InformativeModule",
  "IntegrationModule",
  "LeaderProfilesModule",
  "MediaModule",
  "MeditationModule",
  "MemberProfilesModule",
  "NotificationModule",
  "PagelasModule",
  "ProfileModule",
  "RemindersModule",
  "RouteModule",
  "ShelterScheduleModule",
  "ShelteredModule",
  "SheltersModule",
  "SiteFeedbackModule",
  "TeamsModule",
  "UserModule",
  "VideosPageModule",
  "VisitMaterialsPageModule",
  "VisitReportModule",
];

/**
 * Controllers de módulos ainda fora do `AppModule` (Estúdio Clubinho, planos
 * 43–44, trabalho em andamento). Sair da lista assim que o módulo for ligado.
 */
const NOT_WIRED_YET: ReadonlySet<string> = new Set([
  "AiLessonsController",
  "AiProvidersController",
]);

const NEW_MODULES = [
  "RequestContextModule",
  "LogStorageModule",
  "ObservabilityModule",
  "AuditModule",
  "LogRecordsModule",
];

const sourceFiles = (dir: string): string[] => {
  const files: string[] = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) files.push(...sourceFiles(full));
    else if (item.name.endsWith(".ts") && !item.name.endsWith(".spec.ts"))
      files.push(full);
  }
  return files;
};

describe("descoberta automática do grafo", () => {
  let registry: ComponentsRegistry;
  let close: () => Promise<void>;

  beforeAll(async () => {
    // Preview monta o grafo sem instanciar providers; o registry é construído
    // aqui a partir do container real, exatamente como faz no boot.
    const app = await NestFactory.create(AppModule, {
      preview: true,
      logger: false,
      abortOnError: false,
    });
    await app.init();
    registry = new ComponentsRegistry(app.get(ModulesContainer));
    registry.build();
    close = () => app.close();
  }, 60000);

  afterAll(async () => {
    if (close) await close();
  });

  it("os módulos existentes e os 5 novos são descobertos sem lista manual no runtime", () => {
    const discovered = new Set(registry.moduleNames());
    for (const name of [...KNOWN_MODULES, ...NEW_MODULES])
      expect(discovered.has(name)).toBe(true);
    expect(KNOWN_MODULES).toHaveLength(41);
  });

  it("todo controller e provider de classe do grafo está associado a um módulo real", () => {
    const components = registry.components();
    expect(components.length).toBeGreaterThan(100);
    const orphans = components.filter(
      (c) => c.moduleName === UNKNOWN_MODULE_NAME,
    );
    expect(orphans).toEqual([]);
    const controllers = components.filter((c) => c.kind === "controller");
    expect(controllers.length).toBeGreaterThanOrEqual(35);
    expect(registry.moduleOf("SheltersController")).toBe("SheltersModule");
    expect(registry.moduleOf("LogRecordsController")).toBe("LogRecordsModule");
  });

  it("todo controller do código fonte aparece no grafo (nenhum fica fora do mecanismo global)", () => {
    const declared = sourceFiles(SRC)
      .filter((f) => f.endsWith(".controller.ts"))
      .flatMap((f) =>
        [
          ...readFileSync(f, "utf8").matchAll(
            /export class (\w+Controller)\b/g,
          ),
        ].map((m) => m[1]),
      );
    const discovered = new Set(
      registry
        .components()
        .filter((c) => c.kind === "controller")
        .map((c) => c.componentName),
    );
    const missing = declared
      .filter((name) => !discovered.has(name))
      .filter((name) => !NOT_WIRED_YET.has(name));
    expect(missing).toEqual([]);
  });

  it("contexto de log desconhecido cai em unknown-module e é contabilizado", () => {
    const before = registry.unknownContextCount;
    expect(registry.moduleOf("ClasseQueNaoExiste")).toBe(UNKNOWN_MODULE_NAME);
    expect(registry.unknownContextCount).toBe(before + 1);
  });
});

describe("regras de camada da observabilidade/auditoria", () => {
  const files = sourceFiles(SRC).map((f) => ({
    path: relative(SRC, f),
    source: readFileSync(f, "utf8"),
  }));

  it("só o provider de storage importa o SDK do DynamoDB", () => {
    const offenders = files
      .filter((f) => /@aws-sdk\/(client-dynamodb|lib-dynamodb)/.test(f.source))
      .filter((f) => !f.path.startsWith("shared/providers/log-storage/"))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("nenhum controller, service de domínio ou repository chama as portas de storage", () => {
    const offenders = files
      .filter((f) =>
        /(ObservabilityStoragePort|AuditStoragePort)/.test(f.source),
      )
      .filter((f) => !f.path.startsWith("shared/providers/log-storage/"))
      .filter(
        (f) =>
          !f.path.startsWith("core/observability/") &&
          !f.path.startsWith("core/audit/") &&
          !f.path.startsWith("core/log-records/"),
      )
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("WriteAuditEventService só é usado pelo interceptor, filtro e boundary", () => {
    const allowed = new Set([
      "core/audit/audit.module.ts",
      "core/audit/index.ts",
      "core/audit/interceptors/audit.interceptor.ts",
      "core/audit/services/action-boundary.service.ts",
      "core/audit/services/write-audit-event.service.ts",
      "common/filters/http-exception.filter.ts",
    ]);
    const offenders = files
      .filter(
        (f) =>
          f.source.includes("WriteAuditEventService") && !allowed.has(f.path),
      )
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("nenhuma entidade TypeORM de log foi criada", () => {
    const offenders = files
      .filter((f) => f.source.includes("@Entity("))
      .filter((f) => /observab|audit|technical-log|log-record/i.test(f.path))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("nenhum decorator de auditoria por endpoint existe", () => {
    const offenders = files
      .filter((f) => /@AuditAction\(|@Audited\(/.test(f.source))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});
