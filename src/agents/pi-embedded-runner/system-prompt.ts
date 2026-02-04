import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { AgentSession } from "@mariozechner/pi-coding-agent";
import type { MemoryCitationsMode } from "../../config/types.memory.js";
import type { ResolvedTimeFormat } from "../date-time.js";
import type { EmbeddedContextFile } from "../pi-embedded-helpers.js";
import type { EmbeddedSandboxInfo } from "./types.js";
import type { ReasoningLevel, ThinkLevel } from "./utils.js";
import { buildAgentSystemPrompt, type PromptMode } from "../system-prompt.js";
import { buildToolSummaryMap } from "../tool-summaries.js";

export function buildEmbeddedSystemPrompt(params: {
  workspaceDir: string;
  defaultThinkLevel?: ThinkLevel;
  reasoningLevel?: ReasoningLevel;
  extraSystemPrompt?: string;
  ownerNumbers?: string[];
  reasoningTagHint: boolean;
  heartbeatPrompt?: string;
  skillsPrompt?: string;
  docsPath?: string;
  ttsHint?: string;
  reactionGuidance?: {
    level: "minimal" | "extensive";
    channel: string;
  };
  workspaceNotes?: string[];
  /** Controls which hardcoded sections to include. Defaults to "full". */
  promptMode?: PromptMode;
  runtimeInfo: {
    agentId?: string;
    host: string;
    os: string;
    arch: string;
    node: string;
    model: string;
    provider?: string;
    capabilities?: string[];
    channel?: string;
    /** Supported message actions for the current channel (e.g., react, edit, unsend) */
    channelActions?: string[];
  };
  messageToolHints?: string[];
  sandboxInfo?: EmbeddedSandboxInfo;
  tools: AgentTool[];
  modelAliasLines: string[];
  userTimezone: string;
  userTime?: string;
  userTimeFormat?: ResolvedTimeFormat;
  contextFiles?: EmbeddedContextFile[];
  memoryCitationsMode?: MemoryCitationsMode;
  excludeDynamicContext?: boolean;
}): string {
  return buildAgentSystemPrompt({
    workspaceDir: params.workspaceDir,
    defaultThinkLevel: params.defaultThinkLevel,
    reasoningLevel: params.reasoningLevel,
    extraSystemPrompt: params.extraSystemPrompt,
    ownerNumbers: params.ownerNumbers,
    reasoningTagHint: params.reasoningTagHint,
    heartbeatPrompt: params.heartbeatPrompt,
    skillsPrompt: params.skillsPrompt,
    docsPath: params.docsPath,
    ttsHint: params.ttsHint,
    workspaceNotes: params.workspaceNotes,
    reactionGuidance: params.reactionGuidance,
    promptMode: params.promptMode,
    runtimeInfo: params.runtimeInfo,
    messageToolHints: params.messageToolHints,
    sandboxInfo: params.sandboxInfo,
    toolNames: params.tools.map((tool) => tool.name),
    toolSummaries: buildToolSummaryMap(params.tools),
    modelAliasLines: params.modelAliasLines,
    userTimezone: params.userTimezone,
    userTime: params.userTime,
    userTimeFormat: params.userTimeFormat,
    contextFiles: params.contextFiles,
    memoryCitationsMode: params.memoryCitationsMode,
    excludeDynamicContext: params.excludeDynamicContext,
  });
}

export function createSystemPromptOverride(
  systemPrompt: string,
): (defaultPrompt?: string) => string {
  const override = systemPrompt.trim();
  return (_defaultPrompt?: string) => override;
}

export function applySystemPromptOverrideToSession(
  session: AgentSession,
  override: string | ((defaultPrompt?: string) => string),
) {
  const prompt = typeof override === "function" ? override() : override.trim();
  session.agent.setSystemPrompt(prompt);
  const mutableSession = session as unknown as {
    _baseSystemPrompt?: string;
    _rebuildSystemPrompt?: (toolNames: string[]) => string;
  };
  mutableSession._baseSystemPrompt = prompt;
  mutableSession._rebuildSystemPrompt = () => prompt;
}

export function getStaticSystemPrompt(
  params: Parameters<typeof buildEmbeddedSystemPrompt>[0],
): string {
  return buildEmbeddedSystemPrompt({ ...params, excludeDynamicContext: true });
}

export function getDynamicContext(params: Parameters<typeof buildEmbeddedSystemPrompt>[0]): string {
  // Map EmbeddedSandboxInfo to core sandboxInfo
  const sandboxInfo = params.sandboxInfo
    ? {
        enabled: params.sandboxInfo.enabled,
        workspaceDir: params.sandboxInfo.workspaceDir,
        workspaceAccess: params.sandboxInfo.workspaceAccess,
        agentWorkspaceMount: params.sandboxInfo.agentWorkspaceMount,
        browserBridgeUrl: params.sandboxInfo.browserBridgeUrl,
        browserNoVncUrl: params.sandboxInfo.browserNoVncUrl,
        hostBrowserAllowed: params.sandboxInfo.hostBrowserAllowed,
        elevated: params.sandboxInfo.elevated,
      }
    : undefined;

  const { buildSystemContextMessage } = require("../system-prompt.js");
  return buildSystemContextMessage({
    workspaceDir: params.workspaceDir,
    workspaceNotes: params.workspaceNotes,
    sandboxInfo,
    ownerNumbers: params.ownerNumbers,
    userTimezone: params.userTimezone,
    runtimeInfo: params.runtimeInfo,
    defaultThinkLevel: params.defaultThinkLevel,
    extraSystemPrompt: params.extraSystemPrompt,
    promptMode: params.promptMode,
  });
}
