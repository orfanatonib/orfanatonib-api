import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sources(path)
      : path.endsWith('.ts') && !path.endsWith('.spec.ts')
        ? [path]
        : [];
  });
}

/**
 * Fronteira externa do Estúdio, que tem fila própria (`content_generation_jobs`). Só pode ser alcançada pelo
 * `ConfiguredAiGenerationGateway`, que em `AI_PROVIDER_MODE=fake` nunca delega a eles (ver teste abaixo).
 */
const STUDIO_PROVIDER_GATEWAYS = [
  'content/studio/ai/gemini-generation.gateway.ts',
  'content/studio/ai/openai-generation.gateway.ts',
];

describe('LLM queue architecture', () => {
  const root = join(__dirname, '../../..');
  it('keeps provider HTTP calls out of every AI feature', () => {
    const violations = sources(root).filter((path) => {
      // This existing helper only downloads signed S3 artwork; it is not an AI provider.
      if (
        relative(root, path) === 'content/ai-lessons/utils/asset-url.utils.ts'
      )
        return false;
      const content = readFileSync(path, 'utf8');
      const aiFeature =
        path.includes('ai-lessons') ||
        path.includes('ideas-section-ai') ||
        /api\.openai\.com|generativelanguage\.googleapis\.com/.test(content);
      return (
        aiFeature &&
        /\b(?:axios\.(?:post|get|request|create)|fetch|https?\.request|generateContent|chat\.completions\.create|responses\.create)\s*[(<]/.test(
          content,
        )
      );
    });
    expect(violations.map((path) => relative(root, path)).sort()).toEqual(
      STUDIO_PROVIDER_GATEWAYS,
    );
  });

  it('only the module wiring builds on the real Studio gateways, so fake mode cannot be bypassed', () => {
    const consumers = sources(root)
      .filter((path) =>
        // Importar só a classe de erro é permitido; importar a classe do gateway real não.
        /import\s*{[^}]*\b(?:OpenAi|Gemini)GenerationGateway\b[^}]*}/.test(
          readFileSync(path, 'utf8'),
        ),
      )
      .map((path) => relative(root, path));
    expect(consumers.sort()).toEqual([
      'content/studio/content-studio.module.ts',
    ]);
  });

  it('allows only the worker to depend on the HTTP transport', () => {
    const consumers = sources(root)
      .filter((path) =>
        /from ['"].*ai-provider-transport\.provider['"]/.test(
          readFileSync(path, 'utf8'),
        ),
      )
      .map((path) => relative(root, path));
    expect(consumers.sort()).toEqual([
      'shared/providers/ai-queue/ai-request-queue.module.ts',
      'shared/providers/ai-queue/ai-request.processor.ts',
    ]);
  });
});
