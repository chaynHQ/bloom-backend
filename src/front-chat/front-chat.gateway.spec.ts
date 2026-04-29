import { WsException } from '@nestjs/websockets';
import { UserEntity } from 'src/entities/user.entity';
import { FrontChatGateway } from './front-chat.gateway';

describe('FrontChatGateway', () => {
  let gateway: FrontChatGateway;
  let authService: { parseAuth: jest.Mock };
  let userService: { getUserByFirebaseId: jest.Mock };
  let frontChatService: { sendChannelTextMessage: jest.Mock };
  let server: { to: jest.Mock; emit: jest.Mock };

  const buildUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
    ({ id: 'user-1', email: 'user@example.com', name: 'Alex', ...overrides }) as UserEntity;

  const buildSocket = (token: string | undefined, id = 'sock-1') => ({
    id,
    handshake: { auth: token === undefined ? {} : { token }, headers: {} },
    join: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
  });

  beforeEach(() => {
    authService = { parseAuth: jest.fn() };
    userService = { getUserByFirebaseId: jest.fn() };
    frontChatService = { sendChannelTextMessage: jest.fn() };

    const emit = jest.fn();
    server = { to: jest.fn().mockReturnValue({ emit }), emit };

    gateway = new FrontChatGateway(
      authService as any,
      userService as any,
      frontChatService as any,
    );
    gateway.server = server as any;
  });

  describe('handleConnection', () => {
    it('rejects sockets without a token', async () => {
      const socket = buildSocket(undefined);
      await gateway.handleConnection(socket as any);
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(authService.parseAuth).not.toHaveBeenCalled();
    });

    it('rejects sockets when token verification fails', async () => {
      authService.parseAuth.mockRejectedValue(new Error('invalid'));
      const socket = buildSocket("tok-1");
      await gateway.handleConnection(socket as any);
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('caches the user and joins the user-email room on success', async () => {
      authService.parseAuth.mockResolvedValue({ uid: 'fb-uid' });
      userService.getUserByFirebaseId.mockResolvedValue({ userEntity: buildUser() });

      const socket = buildSocket("tok-1");
      await gateway.handleConnection(socket as any);

      expect(authService.parseAuth).toHaveBeenCalledWith('Bearer tok-1');
      expect(socket.join).toHaveBeenCalledWith('user:user@example.com');
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('lower-cases the email when joining the room', async () => {
      authService.parseAuth.mockResolvedValue({ uid: 'fb-uid' });
      userService.getUserByFirebaseId.mockResolvedValue({
        userEntity: buildUser({ email: 'User@Example.COM' }),
      });

      const socket = buildSocket("tok-1");
      await gateway.handleConnection(socket as any);

      expect(socket.join).toHaveBeenCalledWith('user:user@example.com');
    });
  });

  describe('handleSendMessage', () => {
    const connectAs = async (user: UserEntity) => {
      authService.parseAuth.mockResolvedValue({ uid: 'fb-uid' });
      userService.getUserByFirebaseId.mockResolvedValue({ userEntity: user });
      const socket = buildSocket("tok-1");
      await gateway.handleConnection(socket as any);
      return socket;
    };

    it('rejects when the socket has no cached session', async () => {
      const socket = buildSocket(undefined, 'unknown');
      await expect(
        gateway.handleSendMessage(socket as any, { text: 'hi' }),
      ).rejects.toBeInstanceOf(WsException);
      expect(frontChatService.sendChannelTextMessage).not.toHaveBeenCalled();
    });

    it('forwards the message to FrontChatService and acks ok', async () => {
      const user = buildUser();
      const socket = await connectAs(user);
      frontChatService.sendChannelTextMessage.mockResolvedValue(undefined);

      const result = await gateway.handleSendMessage(socket as any, { text: 'hi' });

      expect(frontChatService.sendChannelTextMessage).toHaveBeenCalledWith(user, 'hi');
      expect(result).toEqual({ ok: true });
    });

    it('wraps service failures in a WsException', async () => {
      const socket = await connectAs(buildUser());
      frontChatService.sendChannelTextMessage.mockRejectedValue(new Error('Front 500'));

      await expect(
        gateway.handleSendMessage(socket as any, { text: 'hi' }),
      ).rejects.toBeInstanceOf(WsException);
    });

    it('rate-limits after 20 messages within the 10s window', async () => {
      const socket = await connectAs(buildUser());
      frontChatService.sendChannelTextMessage.mockResolvedValue(undefined);

      for (let i = 0; i < 20; i++) {
        await gateway.handleSendMessage(socket as any, { text: `m${i}` });
      }
      expect(frontChatService.sendChannelTextMessage).toHaveBeenCalledTimes(20);

      await expect(
        gateway.handleSendMessage(socket as any, { text: 'spam' }),
      ).rejects.toThrow('Rate limit exceeded');
      expect(frontChatService.sendChannelTextMessage).toHaveBeenCalledTimes(20);
    });
  });

  describe('emitAgentReply', () => {
    it('emits to the recipient email room with a normalised key', () => {
      gateway.emitAgentReply('User@Example.COM', {
        body: 'hello',
        emittedAt: 1700000000,
      });
      expect(server.to).toHaveBeenCalledWith('user:user@example.com');
      expect(server.emit).toHaveBeenCalledWith(
        'agent_reply',
        expect.objectContaining({ body: 'hello' }),
      );
    });
  });

  describe('handleDisconnect', () => {
    it('clears the cached session and rate-limit history', async () => {
      authService.parseAuth.mockResolvedValue({ uid: 'fb-uid' });
      userService.getUserByFirebaseId.mockResolvedValue({ userEntity: buildUser() });
      const socket = buildSocket("tok-1");
      await gateway.handleConnection(socket as any);
      frontChatService.sendChannelTextMessage.mockResolvedValue(undefined);
      await gateway.handleSendMessage(socket as any, { text: 'hi' });

      gateway.handleDisconnect(socket as any);

      await expect(
        gateway.handleSendMessage(socket as any, { text: 'hi' }),
      ).rejects.toBeInstanceOf(WsException);
    });
  });
});
