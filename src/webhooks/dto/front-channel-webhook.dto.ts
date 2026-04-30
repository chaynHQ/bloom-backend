// Shape of an outbound message Front sends to a Custom Channel's "Send to URL"
// when an agent replies in the Front UI. Distinct from the Events API payload —
// see https://dev.frontapp.com/docs/getting-started-1 (Application Channel API).
export interface FrontChannelRecipient {
  handle: string;
  role?: string;
  name?: string;
}

export interface FrontChannelAuthor {
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface FrontChannelOutboundPayload {
  type: 'message' | string;
  payload: {
    id?: string;
    type?: string;
    is_inbound?: boolean;
    body?: string;
    text?: string;
    author?: FrontChannelAuthor;
    to?: FrontChannelRecipient[];
    attachments?: unknown[];
  };
  metadata?: {
    external_conversation_ids?: string[];
    external_conversation_id?: string;
  };
}

// Channel API requests (authorization, message, delete, etc.) wrap data under
// `payload`. Events API payloads use `target` instead and always carry
// `emitted_at`. This matches the Channel API at the envelope level so each
// type can be dispatched separately.
export const isChannelApiRequest = (body: unknown): body is FrontChannelOutboundPayload => {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b['type'] === 'string' &&
    'payload' in b &&
    !('emitted_at' in b) &&
    !('target' in b)
  );
};
