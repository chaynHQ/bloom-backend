import { frontSupportEmail } from 'src/utils/constants';
import { formatAuthorName, stripHtml } from 'src/utils/html';
import {
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

// Picks one attachment with a precedence (image > voice > other-file). Mirrors how
// Front delivers attachments on a message — we only render one.
export function classifyAttachment(
  attachments: FrontApiAttachment[] | undefined,
): ClassifiedAttachment | undefined {
  if (!attachments?.length) return undefined;
  const image = attachments.find((a) => a.url && a.content_type?.startsWith('image/'));
  if (image?.url) return { url: image.url, filename: image.filename, kind: 'image' };
  const audio = attachments.find((a) => a.url && a.content_type?.startsWith('audio/'));
  if (audio?.url) return { url: audio.url, filename: audio.filename, kind: 'voice' };
  const file = attachments.find((a) => a.url);
  if (file?.url) return { url: file.url, filename: file.filename, kind: 'file' };
  return undefined;
}

// Crisp CDN is public — return the URL directly so the browser fetches it,
// avoiding a server-side fetch of a user-supplied URL (SSRF).
export function buildAttachmentUrl(url: string): string {
  try {
    if (new URL(url).hostname.endsWith('.crisp.chat')) return url;
  } catch {
    // fall through to proxy
  }
  return `/front-chat/attachment-proxy?url=${encodeURIComponent(url)}`;
}

export function isValidAttachmentUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'api2.frontapp.com' || parsed.hostname.endsWith('.frontapp.com'))
    );
  } catch {
    return false;
  }
}

// Channel API imported messages can store inline images as markdown in the body
// rather than as m.attachments. Parse them out so history renders them correctly.
function parseInlineImage(body: string | undefined): { url: string; name: string } | undefined {
  if (!body) return undefined;
  const match = body.match(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/);
  if (!match) return undefined;
  return { name: match[1] || 'image', url: match[2] };
}

// Live agent replies have is_inbound === false. For Channel API imported messages
// everything arrives as is_inbound === true; detect imported operator messages by
// checking whether the sender handle was the support address.
function isAgentMessage(message: FrontApiMessage): boolean {
  return !message.is_inbound || message.author?.email === frontSupportEmail;
}

export function mapFrontMessageToHistory(
  message: FrontApiMessage,
): ChatHistoryMessage | undefined {
  const attachment = classifyAttachment(message.attachments);
  // Inline markdown image overrides non-image attachments (audio/file). This matches
  // Channel API imported messages where the operator pasted an image URL into the body
  // alongside e.g. an audio attachment — we want the image to render.
  const inlineImage =
    attachment?.kind !== 'image' ? parseInlineImage(message.body) : undefined;
  const text = message.text ?? stripHtml(message.body ?? '');

  if (!text && !attachment && !inlineImage) return undefined;

  const histMsg: ChatHistoryMessage = {
    id: message.id,
    direction: isAgentMessage(message) ? 'agent' : 'user',
    text: deriveDisplayText(text, attachment, inlineImage),
    authorName: formatAuthorName(message.author ?? undefined),
    createdAt: (message.created_at ?? Date.now() / 1000) * 1000,
  };

  if (inlineImage) {
    histMsg.kind = 'image';
    histMsg.attachmentUrl = buildAttachmentUrl(inlineImage.url);
    histMsg.attachmentName = inlineImage.name;
  } else if (attachment) {
    histMsg.kind = attachment.kind;
    histMsg.attachmentUrl = buildAttachmentUrl(attachment.url);
    histMsg.attachmentName = attachment.filename;
  }

  return histMsg;
}

// Images/files: show filename. Voice: use message body text ("Voice note") for
// consistency with fresh messages. Fallback to plain text for everything else.
// Precedence matches mapFrontMessageToHistory: inline image overrides non-image attachments.
function deriveDisplayText(
  text: string,
  attachment: ClassifiedAttachment | undefined,
  inlineImage: { name: string } | undefined,
): string {
  if (attachment?.kind === 'image') return attachment.filename ?? 'image';
  if (inlineImage) return inlineImage.name;
  if (attachment?.kind === 'voice') return text || 'Voice note';
  if (attachment?.kind === 'file') return attachment.filename ?? 'attachment';
  return text;
}
