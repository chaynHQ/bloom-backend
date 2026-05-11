export interface CrispConversation {
  session_id: string;
  website_id: string;
  people_id?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  created_at?: number;
  updated_at?: number;
  state?: string;
  is_verified?: boolean;
  is_blocked?: boolean;
  active?: {
    now?: boolean;
  };
  meta?: {
    nickname?: string;
    email?: string;
    phone?: string;
    address?: string;
    subject?: string;
    ip?: string;
    data?: Record<string, unknown>;
    segments?: string[];
    device?: {
      capabilities?: string[];
      geolocation?: Record<string, unknown>;
      system?: Record<string, unknown>;
      timezone?: number;
      locales?: string[];
    };
  };
}

export interface CrispMessage {
  type: string;
  from: string; // 'user' | 'operator'
  origin: string;
  content?: string;
  fingerprint?: number;
  timestamp?: number;
  stamped?: boolean;
  user?: {
    type?: string;
    nickname?: string;
    user_id?: string;
  };
  mentions?: unknown[];
  edited?: boolean;
  translated?: boolean;
  automated?: boolean;
  preview?: unknown[];
  stealth?: boolean;
  read?: string;
  delivered?: string;
}

export interface CrispAttachment {
  type: string;
  name?: string;
  url?: string;
  size?: number;
}

export interface CrispNote {
  type: string;
  from: string;
  content: string;
  timestamp: number;
  user?: {
    user_id?: string;
    nickname?: string;
  };
}

export interface MigrationProgress {
  totalContacts: number;
  processedContacts: number;
  totalConversations: number;
  processedConversations: number;
  totalMessages: number;
  processedMessages: number;
  totalAttachments: number;
  processedAttachments: number;
  totalNotes: number;
  processedNotes: number;
  errors: string[];
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface MigrationResult {
  success: boolean;
  progress: MigrationProgress;
  errors: Array<{
    sessionId?: string;
    email?: string;
    error: string;
    timestamp: Date;
  }>;
}

export interface ConversationMigrationData {
  sessionId: string;
  email?: string;
  name?: string;
  messages: CrispMessage[];
  notes: CrispNote[];
  metadata: CrispConversation;
  createdAt: Date;
  updatedAt: Date;
}
