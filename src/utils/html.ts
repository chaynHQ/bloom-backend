export function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export function formatAuthorName(
  author: { first_name?: string; last_name?: string; username?: string } | undefined,
): string | undefined {
  if (!author) return undefined;
  const full = [author.first_name, author.last_name].filter(Boolean).join(' ').trim();
  return full || author.username || undefined;
}
