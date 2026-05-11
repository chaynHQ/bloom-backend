import { frontSupportEmail } from 'src/utils/constants';
import { formatAuthorName, stripHtml } from 'src/utils/html';
import {
  AgentReplyAttachment,
  ChatHistoryMessage,
  FrontApiAttachment,
  FrontApiMessage,
  FrontChatContactCustomFields,
} from './front-chat.interface';

// Front groups messages sharing a thread_ref into one conversation, so a stable
// per-user value gives every user a single long-running conversation.
export const buildThreadRef = (userId: string) => `bloom-user-${userId}`;

export function getContactAlias(email: string): string {
  return `alt:email:${encodeURIComponent(email)}`;
}

export function serializeCustomFields(
  fields: FrontChatContactCustomFields,
): Record<string, string | number | boolean> {
  const serialized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      serialized[key] = value;
    }
  }
  return serialized;
}

export type AttachmentKind = 'image' | 'voice' | 'file';

export interface ClassifiedAttachment {
  url: string;
  filename?: string;
  kind: AttachmentKind;
}

// Classifies every attachment Front delivered on the message, preserving order. Front
// can attach multiple files (e.g. an .png alongside a .txt) and the widget renders
// each one in the same bubble.
export function classifyAttachments(
  attachments: FrontApiAttachment[] | undefined,
): ClassifiedAttachment[] {
  if (!attachments?.length) return [];
  const result: ClassifiedAttachment[] = [];
  for (const a of attachments) {
    if (!a.url) continue;
    const kind: AttachmentKind = a.content_type?.startsWith('image/')
      ? 'image'
      : a.content_type?.startsWith('audio/')
        ? 'voice'
        : 'file';
    result.push({ url: a.url, filename: a.filename, kind });
  }
  return result;
}

// Strictly parse a Front attachment URL and rebuild it from a hardcoded template.
// Returns the rebuilt URL when valid, null otherwise. Important: the URL handed
// to fetch is assembled from string literals + regex-extracted IDs — NO part of
// the raw input is passed through. This is the SSRF defence: a hostname allowlist
// alone isn't enough because static analysers (and humans) can't easily verify it.
export function normalizeFrontAttachmentUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;

  // Tenant subdomain on the Front API host. The bare api2.frontapp.com host is
  // intentionally not allowed for attachment downloads — Front's signed download
  // URLs always live on the tenant subdomain.
  const tenantMatch = parsed.hostname.match(/^([a-z0-9-]+)\.api\.frontapp\.com$/);
  if (!tenantMatch) return null;
  const tenant = tenantMatch[1];

  // /messages/{msg_uid}/download/{fil_id}
  const pathMatch = parsed.pathname.match(
    /^\/messages\/([A-Za-z0-9_-]+)\/download\/([A-Za-z0-9_-]+)\/?$/,
  );
  if (!pathMatch) return null;
  const [, messageId, fileId] = pathMatch;

  return `https://${tenant}.api.frontapp.com/messages/${messageId}/download/${fileId}`;
}

// S3 presigned URLs (where Front redirects download requests) live on AWS hosts.
// Validating the redirect target prevents an attacker who somehow got past the
// Front URL check from pivoting via a 302.
export function isAllowedS3RedirectTarget(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'amazonaws.com' || parsed.hostname.endsWith('.amazonaws.com'))
    );
  } catch {
    return false;
  }
}

// Channel API imported messages can store inline images as markdown in the body
// rather than as m.attachments. Parse them out so history renders them correctly.
const INLINE_IMAGE_REGEX = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;

function parseInlineImages(body: string | undefined): Array<{ url: string; name: string }> {
  if (!body) return [];
  const results: Array<{ url: string; name: string }> = [];
  for (const match of body.matchAll(INLINE_IMAGE_REGEX)) {
    results.push({ name: match[1] || 'image', url: match[2] });
  }
  return results;
}

function stripInlineImages(text: string): string {
  return text.replace(INLINE_IMAGE_REGEX, '').trim();
}

// Live agent replies have is_inbound === false. For Channel API imported messages
// everything arrives as is_inbound === true; detect imported operator messages by
// checking whether the sender handle was the support address.
function isAgentMessage(message: FrontApiMessage): boolean {
  return !message.is_inbound || message.author?.email === frontSupportEmail;
}

export function mapFrontMessageToHistory(message: FrontApiMessage): ChatHistoryMessage | undefined {
  const fileAttachments = classifyAttachments(message.attachments);
  // Inline markdown images (Channel API imported messages where the operator pasted an
  // image URL into the body) are promoted to image attachments and stripped from the
  // displayed text so they don't render as raw markdown alongside the image.
  const inlineImages = parseInlineImages(message.body);
  const rawText = message.text ?? stripHtml(message.body ?? '');
  const bodyText = inlineImages.length > 0 ? stripInlineImages(rawText) : rawText;

  const attachments: ClassifiedAttachment[] = [
    ...inlineImages.map<ClassifiedAttachment>((img) => ({
      url: img.url,
      filename: img.name,
      kind: 'image',
    })),
    ...fileAttachments,
  ];

  const text = deriveDisplayText(bodyText, attachments);
  if (!text && attachments.length === 0) return undefined;

  const histMsg: ChatHistoryMessage = {
    id: message.id,
    direction: isAgentMessage(message) ? 'agent' : 'user',
    text,
    authorName: formatAuthorName(message.author ?? undefined),
    createdAt: (message.created_at ?? Date.now() / 1000) * 1000,
  };

  if (attachments.length > 0) {
    histMsg.attachments = attachments.map(toAgentReplyAttachment);
  }

  return histMsg;
}

export function toAgentReplyAttachment(attachment: ClassifiedAttachment): AgentReplyAttachment {
  return {
    url: `/front-chat/attachment-proxy?url=${encodeURIComponent(attachment.url)}`,
    name: attachment.filename,
    kind: attachment.kind,
  };
}

// Single-attachment messages override generic body text with the filename (Front
// auto-fills "Attachment" as the body when an agent uploads a file without typing).
// Multi-attachment messages keep the body text; the frontend renders each filename
// alongside its file.
function deriveDisplayText(text: string, attachments: ClassifiedAttachment[]): string {
  if (attachments.length > 1) return text;
  if (attachments.length === 1) {
    const [only] = attachments;
    if (only.kind === 'image') return only.filename ?? 'image';
    if (only.kind === 'voice') return text || 'Voice note';
    return only.filename ?? 'attachment';
  }
  return text;
}
