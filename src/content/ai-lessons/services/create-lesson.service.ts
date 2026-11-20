import { Injectable } from "@nestjs/common";
import { GenerateLessonRequestDto } from "../dto/generate-lesson-request.dto";
import { LessonEntity } from "../entities/lesson.entity";
import {
  getLessonStageOrder,
  LessonStageStatus,
  LessonStatus,
  DEFAULT_LESSON_CATEGORY,
} from "../enums/lesson.enums";
import { LessonWorkflowAction } from "../enums/lesson-failure-code.enum";
import { AiLessonsRepository } from "../repositories/ai-lessons.repository";
import { getLessonTemplate } from "../templates/lesson-template-resolver";
import { templateChecksum } from "../templates/lesson-templates";
import { GetLessonService } from "./get-lesson.service";
import { LessonStudioSupportService } from "./lesson-studio-support.service";

/** Creates a lesson package and its stages in a single transaction. */
@Injectable()
export class CreateLessonService {
  constructor(
    private readonly repo: AiLessonsRepository,
    private readonly support: LessonStudioSupportService,
    private readonly lessons: GetLessonService,
  ) {}

  async create(
    dto: GenerateLessonRequestDto,
    userId: string,
  ): Promise<LessonEntity> {
    const category = dto.category ?? DEFAULT_LESSON_CATEGORY;
    const lesson = await this.repo.runInTransaction(async (manager) => {
      const created = await this.repo.saveLesson(
        this.repo.createLesson({
          theme: dto.theme.trim(),
          biblicalReference: dto.biblicalReference.trim(),
          weekNumber: dto.weekNumber ?? null,
          category,
          specialContext: null,
          editorialPurpose: dto.editorialPurpose,
          status: LessonStatus.DRAFT,
          createdById: userId,
          weekMaterialId: null,
        }),
        manager,
      );
      await this.repo.saveStages(
        getLessonStageOrder(category).map((type) => {
          const template = getLessonTemplate(type, category);
          return this.repo.createStage({
            lessonId: created.id,
            type,
            status: LessonStageStatus.NOT_STARTED,
            currentVersionId: null,
            templateKey: template.key,
            templateVersion: template.version,
            templateChecksum: templateChecksum(template),
            failureCode: null,
            failureMessage: null,
            approvedAt: null,
            approvedById: null,
          });
        }),
        manager,
      );
      return created;
    });
    this.support.audit(LessonWorkflowAction.CREATE, lesson.id, userId);
    return this.lessons.getById(lesson.id);
  }
}
