/**
 * Strips literal markdown formatting markers (bold, italic, headers, backticks)
 * from text while preserving line breaks and structural spacing.
 */
export function stripMarkdown(text: string): string {
  if (!text) return '';

  return text
    // Strip fenced code blocks ```lang ... ```
    .replace(/^```[a-zA-Z]*\n?([\s\S]*?)\n?```$/gm, '$1')
    .replace(/```/g, '')
    // Strip inline backticks `code`
    .replace(/`([^`]+)`/g, '$1')
    .replace(/`/g, '')
    // Strip bold & italic markers **text** and __text__
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Clean up any remaining stray ** or __ markers
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    // Strip leading markdown headers (#, ##, ###, etc.) at line starts
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}
