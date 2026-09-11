import { Controller, Get, Header, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { ResourceNotFoundException } from "src/common/exceptions";
import { EmailTemplateKey } from "../enums/email-template-key.enum";
import {
  EMAIL_TEMPLATE_KEYS,
  renderEmail,
} from "../templates/email-template.registry";
import { EMAIL_PREVIEW_SAMPLES } from "./email-preview.samples";
import { EmailDispatchService } from "../services/email-dispatch.service";

/**
 * Pré-visualização dos e-mails sem disparar nada.
 *
 * Revisar um template exigia provocar o acontecimento real — pedir recuperação
 * de senha, criar um evento — e abrir a caixa de entrada. Aqui o HTML é
 * renderizado com dados de exemplo e devolvido direto no navegador.
 *
 * Só admin: o HTML carrega a identidade visual e os textos institucionais.
 */
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller("email-previews")
export class EmailPreviewController {
  constructor(private readonly dispatcher: EmailDispatchService) {}

  @Get()
  list(): {
    templates: Array<{
      key: EmailTemplateKey;
      subject: string;
      previewUrl: string;
    }>;
  } {
    const context = this.dispatcher.renderContext();

    return {
      templates: EMAIL_TEMPLATE_KEYS.map((key) => ({
        key,
        subject: renderEmail(key, EMAIL_PREVIEW_SAMPLES[key], context).subject,
        previewUrl: `/email-previews/${key}`,
      })),
    };
  }

  @Get(":key")
  @Header("Content-Type", "text/html; charset=utf-8")
  preview(@Param("key") key: string): string {
    return this.render(key).html;
  }

  @Get(":key/text")
  @Header("Content-Type", "text/plain; charset=utf-8")
  previewText(@Param("key") key: string): string {
    return this.render(key).text;
  }

  private render(key: string): { html: string; text: string } {
    const templateKey = EMAIL_TEMPLATE_KEYS.find(
      (candidate) => String(candidate) === key,
    );
    if (!templateKey) {
      throw new ResourceNotFoundException(
        `Template de e-mail não encontrado: ${key}`,
        { available: EMAIL_TEMPLATE_KEYS },
      );
    }

    return renderEmail(
      templateKey,
      EMAIL_PREVIEW_SAMPLES[templateKey],
      this.dispatcher.renderContext(),
    );
  }
}
