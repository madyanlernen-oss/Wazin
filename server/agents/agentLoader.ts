import fs from 'fs';
import path from 'path';
import { AGENT_FILE_MAP, MAX_CACHED_PROMPTS } from '../config/constants';

// In-memory LRU prompt cache
const promptCache = new Map<string, string>();

/**
 * Loads an agent markdown persona definition from the Agents/ directory.
 * Strips legacy JSON enforcement suffix and caches result in memory.
 */
export function loadAgentPrompt(agentKey: string): string {
  if (promptCache.has(agentKey)) {
    return promptCache.get(agentKey)!;
  }

  const selectedFile = AGENT_FILE_MAP[agentKey] || '01-financial.md';
  let agentPath = path.join(process.cwd(), 'agents', selectedFile);
  if (!fs.existsSync(agentPath)) {
    agentPath = path.join(process.cwd(), 'Agents', selectedFile);
  }

  let prompt = 'أنت مساعد ذكي ومستشار شخصي في منصة وزان لتوازن الحياة.';
  if (fs.existsSync(agentPath)) {
    const rawDoc = fs.readFileSync(agentPath, 'utf8');
    prompt = rawDoc.replace(/يجب أن تكون إجابتك دائماً بصيغة JSON[\s\S]*/, '').trim();
  }

  // Manage cache capacity
  if (promptCache.size >= MAX_CACHED_PROMPTS) {
    const oldestKey = promptCache.keys().next().value;
    if (oldestKey) promptCache.delete(oldestKey);
  }

  promptCache.set(agentKey, prompt);
  return prompt;
}
