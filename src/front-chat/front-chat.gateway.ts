import { ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { UserEntity } from 'src/entities/user.entity';
import { IFirebaseUser } from 'src/firebase/firebase-user.interface';
import { Logger } from 'src/logger/logger';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { UserService } from 'src/user/user.service';
import { getCorsOrigin } from 'src/utils/cors';
import { SendMessageDto } from './dto/send-message.dto';
import { AgentReplyPayload } from './front-chat.interface';
import { FrontChatService } from './front-chat.service';

const userRoom = (email: string) => `user:${email.toLowerCase()}`;

// REST routes have ThrottlerGuard; WebSocket events bypass it, so we throttle here.
const SEND_MESSAGE_WINDOW_MS = 10_000;
const SEND_MESSAGE_LIMIT_PER_WINDOW = 20;

interface FrontChatSession {
  user: UserEntity;
  // Unix seconds — Firebase ID token's `exp` claim. Undefined disables expiry checks
  // (used by tests that mock parseAuth without the claim).
  tokenExp?: number;
}

@WebSocketGateway({
  namespace: '/front-chat',
  cors: { origin: getCorsOrigin(), credentials: true },
})
export class FrontChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger('FrontChatGateway');

  private readonly sessions = new Map<string, FrontChatSession>();
  private readonly sendTimestamps = new Map<string, number[]>();
  private readonly pendingFrontContactCreations = new Map<string, Promise<void>>();

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly frontChatService: FrontChatService,
    private readonly serviceUserProfilesService: ServiceUserProfilesService,
  ) {}

  private awaitFrontContactReady(user: UserEntity): Promise<void> {
    const key = user.email.toLowerCase();
    let pending = this.pendingFrontContactCreations.get(key);
    if (!pending) {
      pending = this.serviceUserProfilesService
        .getOrCreateFrontContact(user)
        .then(() => {
          this.pendingFrontContactCreations.delete(key);
        })
        .catch((error) => {
          this.pendingFrontContactCreations.delete(key);
          this.logger.warn(
            `getOrCreateFrontContact failed for user ${user.id}: ${error?.message || 'unknown error'}`,
          );
        });
      this.pendingFrontContactCreations.set(key, pending);
    }
    return pending;
  }

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (typeof client.handshake.headers?.authorization === 'string'
        ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : undefined);

    if (!token) {
      this.logger.warn(`FrontChat handshake rejected (no token) — socket ${client.id}`);
      client.disconnect(true);
      return;
    }

    let session: FrontChatSession;
    try {
      const decoded = await this.authService.parseAuth(`Bearer ${token}`);
      const result = await this.userService.getUserByFirebaseId(decoded as IFirebaseUser);
      session = {
        user: result.userEntity,
        tokenExp: typeof decoded.exp === 'number' ? decoded.exp : undefined,
      };
    } catch (error) {
      this.logger.warn(
        `FrontChat handshake rejected — socket ${client.id} — ${error?.message || 'unknown error'}`,
      );
      client.disconnect(true);
      return;
    }

    const user = session.user;
    this.sessions.set(client.id, session);
    await client.join(userRoom(user.email));

    try {
      const { messages, conversationFound } =
        await this.frontChatService.getConversationHistory(user);

      if (!conversationFound) {
        this.awaitFrontContactReady(user);
      }

      if (messages.length > 0) {
        client.emit('history', { messages });
      }
    } catch (error) {
      this.logger.warn(
        `History fetch failed for user ${user.id}: ${error?.message || 'unknown error'}`,
      );
    }
  }

  handleDisconnect(client: Socket): void {
    this.sessions.delete(client.id);
    this.sendTimestamps.delete(client.id);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody(new ValidationPipe({ whitelist: true, transform: true }))
    payload: SendMessageDto,
  ): Promise<{ ok: true }> {
    const user = this.requireFreshSession(client);

    if (this.isRateLimited(client.id)) {
      this.logger.warn(`send_message rate-limited for user ${user.id}`);
      throw new WsException('Rate limit exceeded');
    }

    try {
      const existingChatUser = await this.frontChatService.getChatUser(user.id);
      if (!existingChatUser?.frontContactId) {
        await this.awaitFrontContactReady(user);
      }
      const chatUser = await this.frontChatService.sendChannelTextMessage(user, payload.text, existingChatUser);

      if (chatUser) {
        this.serviceUserProfilesService
          .updateServiceUserProfilesChatActivity(chatUser, user.email)
          .catch(() => {});
      }

      return { ok: true };
    } catch (error) {
      this.logger.error(
        `send_message failed for user ${user.id}: ${error?.message || 'unknown error'}`,
      );
      throw new WsException('Failed to send message');
    }
  }

  // Disconnect on expiry so Socket.IO's auto-reconnect re-runs auth() with a fresh token.
  private requireFreshSession(client: Socket): UserEntity {
    const session = this.sessions.get(client.id);
    if (!session) throw new WsException('Unauthorized');
    if (session.tokenExp !== undefined && session.tokenExp * 1000 <= Date.now()) {
      this.logger.warn(`Token expired mid-session for user ${session.user.id}`);
      client.disconnect(true);
      throw new WsException('Token expired');
    }
    return session.user;
  }

  private isRateLimited(socketId: string): boolean {
    const now = Date.now();
    const cutoff = now - SEND_MESSAGE_WINDOW_MS;
    const recent = (this.sendTimestamps.get(socketId) ?? []).filter((ts) => ts > cutoff);
    if (recent.length >= SEND_MESSAGE_LIMIT_PER_WINDOW) {
      this.sendTimestamps.set(socketId, recent);
      return true;
    }
    recent.push(now);
    this.sendTimestamps.set(socketId, recent);
    return false;
  }

  emitAgentReply(recipientEmail: string, payload: AgentReplyPayload): void {
    this.server.to(userRoom(recipientEmail)).emit('agent_reply', payload);
  }
}
