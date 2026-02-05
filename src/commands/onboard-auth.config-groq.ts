import type { OpenClawConfig } from "../config/config.js";
import {
  buildGroqModelDefinition,
  GROQ_BASE_URL,
  GROQ_DEFAULT_MODEL_ID,
  GROQ_DEFAULT_MODEL_REF,
} from "./onboard-auth.models.js";

export function applyGroqProviderConfig(cfg: OpenClawConfig): OpenClawConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[GROQ_DEFAULT_MODEL_REF] = {
    ...models[GROQ_DEFAULT_MODEL_REF],
    alias: models[GROQ_DEFAULT_MODEL_REF]?.alias ?? "Groq",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.groq;
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const defaultModel = buildGroqModelDefinition();
  const hasDefaultModel = existingModels.some((model) => model.id === GROQ_DEFAULT_MODEL_ID);
  const mergedModels = hasDefaultModel ? existingModels : [...existingModels, defaultModel];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as Record<
    string,
    unknown
  > as { apiKey?: string };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  providers.groq = {
    ...existingProviderRest,
    baseUrl: GROQ_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : [defaultModel],
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyGroqConfig(cfg: OpenClawConfig): OpenClawConfig {
  const next = applyGroqProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: GROQ_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}
