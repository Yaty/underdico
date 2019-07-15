import * as socketIOClient from 'socket.io-client';
import TestUtils from './utils';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configure } from '../src/app.configuration';
import * as supertest from 'supertest';
import { INestApplication } from '@nestjs/common';
import * as pEvent from 'p-event';
import { RoomService } from '../src/room/room.service';
import { WordService } from '../src/word/word.service';
import * as uuid from 'uuid/v4';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Event (E2E)', () => {
  let app: INestApplication;
  let roomService: RoomService;
  let wordService: WordService;
  let utils: TestUtils;
  let api;

  const apps = [];

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configure(app);
    await app.init();
    roomService = moduleFixture.get<RoomService>(RoomService);
    wordService = moduleFixture.get<WordService>(WordService);
    api = supertest(app.getHttpServer());
    utils = new TestUtils(api);
    apps.push(app);
  });

  afterAll(async () => {
    await wait(35000);

    for (const a of apps) {
      await a.close();
    }
  });

  it('should connect', async () => {
    await app.listen(3005);
    const client = socketIOClient.connect('ws://localhost:3005');

    return new Promise((resolve, reject) => {
      client.once('connect', resolve);
      client.once('error', reject);
    });
  });

  it('should handle a game', async () => {
    const gameOwner = await utils.createUser();
    const player1 = await utils.createUser();

    const ownerAuth = await utils.login(gameOwner);
    const player1Auth = await utils.login(player1);

    const roomId = await utils.createRoom(ownerAuth.token);

    await app.listen(3006);

    const ownerSocketIOClient = socketIOClient.connect('ws://localhost:3006', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + ownerAuth.token,
      },
    });

    const player1SocketIOClient = socketIOClient.connect('ws://localhost:3006', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + player1Auth.token,
      },
    });

    player1SocketIOClient.emit('joinRoom', {
      roomId,
    });

    ownerSocketIOClient.emit('joinRoom', {
      roomId,
    });

    await pEvent(player1SocketIOClient, 'newPlayer');

    ownerSocketIOClient.emit('startRoom', {
      roomId,
    });

    await pEvent(player1SocketIOClient, 'roomStarted');

    for (let i = 0; i < 5; i++) {
      const [newRound] = await Promise.all([
        pEvent(ownerSocketIOClient, 'newRound'),
        pEvent(player1SocketIOClient, 'newRound'),
      ]);

      // @ts-ignore
      const player = ownerAuth.userId === newRound.nextPlayerId ? {
        socket: ownerSocketIOClient,
        userId: ownerAuth.userId,
      } : {
        socket: player1SocketIOClient,
        userId: player1Auth.userId,
      };

      const room = await roomService.findById(roomId);
      const goodWordId = room.rounds[room.rounds.length - 1].wordId as unknown as string;
      const goodWordName = (await wordService.findWordById(goodWordId)).name;

      player.socket.emit('play', {
        roomId,
        proposal: goodWordName,
      });

      const [play] = await Promise.all([
        pEvent(ownerSocketIOClient, 'goodProposal'),
        pEvent(ownerSocketIOClient, 'goodProposal'),
      ]);

      // @ts-ignore
      expect(play.playerId).toEqual(player.userId);
    }
  }, 60000);

  it('should handle timeout', async () => {
    const owner = await utils.createUser();
    const ownerAuth = await utils.login(owner);

    const roomId = await utils.createRoom(ownerAuth.token, {
      timeout: 5,
    });

    await app.listen(3007);

    const ownerClient = socketIOClient.connect('ws://localhost:3007', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + ownerAuth.token,
      },
    });

    ownerClient.emit('joinRoom', {
      roomId,
    });

    await pEvent(ownerClient, 'newPlayer');

    ownerClient.emit('startRoom', {
      roomId,
    });

    await pEvent(ownerClient, 'roomStarted');
    await pEvent(ownerClient, 'newRound');
    await pEvent(ownerClient, 'timeout');
  }, 30000);

  it('should handle timeout and allow the next player id to play', async () => {
    const owner = await utils.createUser();
    const ownerAuth = await utils.login(owner);

    const other = await utils.createUser();
    const otherAuth = await utils.login(other);

    const roomId = await utils.createRoom(ownerAuth.token, {
      timeout: 5,
    });

    await app.listen(3008);

    const ownerClient = socketIOClient.connect('ws://localhost:3008', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + ownerAuth.token,
      },
    });

    const otherClient = socketIOClient.connect('ws://localhost:3008', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + otherAuth.token,
      },
    });

    ownerClient.emit('joinRoom', {
      roomId,
    });

    otherClient.emit('joinRoom', {
      roomId,
    });

    await pEvent(ownerClient, 'newPlayer');

    ownerClient.emit('startRoom', {
      roomId,
    });

    let currentPlayerId;

    await pEvent(ownerClient, 'roomStarted');
    const newRound: any = await pEvent(ownerClient, 'newRound');
    currentPlayerId = newRound.nextPlayerId;

    const timeoutA: any = await pEvent(ownerClient, 'timeout');
    expect(timeoutA.playerId).toEqual(currentPlayerId);
    expect(timeoutA.nextPlayerId !== currentPlayerId).toBeTruthy();
    currentPlayerId = timeoutA.nextPlayerId;

    const timeoutB: any = await pEvent(ownerClient, 'timeout');
    expect(timeoutB.playerId).toEqual(currentPlayerId);
    expect(timeoutB.nextPlayerId !== currentPlayerId).toBeTruthy();
    currentPlayerId = timeoutB.nextPlayerId;

    const client = currentPlayerId === ownerAuth.userId ? ownerClient : otherClient;

    const room = await roomService.findById(roomId);
    const goodWordId = room.rounds[room.rounds.length - 1].wordId as unknown as string;
    const goodWordName = (await wordService.findWordById(goodWordId)).name;

    client.emit('play', {
      roomId,
      proposal: goodWordName,
    });

    await pEvent(otherClient, 'goodProposal');
  }, 30000);

  it('handles wrong proposals', async (): Promise<void> => {
    const owner = await utils.createUser();
    const ownerAuth = await utils.login(owner);
    const roomId = await utils.createRoom(ownerAuth.token);

    await app.listen(3009);

    const ownerClient = socketIOClient.connect('ws://localhost:3009', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + ownerAuth.token,
      },
    });

    ownerClient.emit('joinRoom', {
      roomId,
    });

    await pEvent(ownerClient, 'newPlayer');

    ownerClient.emit('startRoom', {
      roomId,
    });

    await pEvent(ownerClient, 'roomStarted');
    await pEvent(ownerClient, 'newRound');

    ownerClient.emit('play', {
      roomId,
      proposal: uuid(),
    });

    const payload: any = await pEvent(ownerClient, 'wrongProposal');
    expect(payload.playerId).toEqual(ownerAuth.userId);
    expect(payload.nextPlayerId).toEqual(ownerAuth.userId);
  });

  it('should give the nextPlayerId on wrongProposal', async (): Promise<void> => {
    const owner = await utils.createUser();
    const ownerAuth = await utils.login(owner);
    const roomId = await utils.createRoom(ownerAuth.token);

    const anotherPlayer = await utils.createUser();
    const anotherAuth = await utils.login(anotherPlayer);

    await app.listen(3010);

    const ownerClient = socketIOClient.connect('ws://localhost:3010', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + ownerAuth.token,
      },
    });

    const anotherClient = socketIOClient.connect('ws://localhost:3010', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + anotherAuth.token,
      },
    });

    ownerClient.emit('joinRoom', {
      roomId,
    });

    anotherClient.emit('joinRoom', {
      roomId,
    });

    await pEvent(ownerClient, 'newPlayer');

    ownerClient.emit('startRoom', {
      roomId,
    });

    const [, newRound]: any[] = await Promise.all([
      pEvent(ownerClient, 'roomStarted'),
      pEvent(ownerClient, 'newRound'),
      pEvent(anotherClient, 'roomStarted'),
      pEvent(anotherClient, 'newRound'),
    ]);

    const currentPlayer = newRound.nextPlayerId === ownerAuth.userId ? ownerClient : anotherClient;
    const otherPlayerId = newRound.nextPlayerId === ownerAuth.userId ?  anotherAuth.userId : ownerAuth.userId;

    currentPlayer.emit('play', {
      roomId,
      proposal: uuid(),
    });

    const payload: any = await pEvent(ownerClient, 'wrongProposal');
    expect(payload.playerId).toEqual(newRound.nextPlayerId);
    expect(payload.nextPlayerId).toEqual(otherPlayerId);
  });

  it('should start a new round with a different nextPlayerId on goodProposal', async (): Promise<void> => {
    const owner = await utils.createUser();
    const ownerAuth = await utils.login(owner);
    const roomId = await utils.createRoom(ownerAuth.token);

    const anotherPlayer = await utils.createUser();
    const anotherAuth = await utils.login(anotherPlayer);

    await app.listen(3011);

    const ownerClient = socketIOClient.connect('ws://localhost:3011', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + ownerAuth.token,
      },
    });

    const anotherClient = socketIOClient.connect('ws://localhost:3011', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + anotherAuth.token,
      },
    });

    ownerClient.emit('joinRoom', {
      roomId,
    });

    anotherClient.emit('joinRoom', {
      roomId,
    });

    await pEvent(ownerClient, 'newPlayer');

    ownerClient.emit('startRoom', {
      roomId,
    });

    const iterations = 50;
    let ownerTurns = 0;

    for (let i = 0; i < iterations; i++) {
      const currentRound: any = await pEvent(ownerClient, 'newRound');

      const currentPlayer = currentRound.nextPlayerId === ownerAuth.userId ? ownerClient : anotherClient;

      if (currentRound.nextPlayerId === ownerAuth.userId) {
        ownerTurns++;
      }

      const room = await roomService.findById(roomId);
      const goodWordId = room.rounds[room.rounds.length - 1].wordId as unknown as string;
      const goodWordName = (await wordService.findWordById(goodWordId)).name;

      currentPlayer.emit('play', {
        roomId,
        proposal: goodWordName,
      });

      await pEvent(ownerClient, 'goodProposal');
    }

    expect(ownerTurns / iterations).toBeGreaterThan(0.35);
    expect(ownerTurns / iterations).toBeLessThan(0.65);
  }, 20000);

  it('returns playerScore on goodProposal', async () => {
    const owner = await utils.createUser();
    const ownerAuth = await utils.login(owner);
    const roomId = await utils.createRoom(ownerAuth.token);

    await app.listen(3012);

    const ownerClient = socketIOClient.connect('ws://localhost:3012', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + ownerAuth.token,
      },
    });

    ownerClient.emit('joinRoom', {
      roomId,
    });

    await pEvent(ownerClient, 'newPlayer');

    ownerClient.emit('startRoom', {
      roomId,
    });

    await pEvent(ownerClient, 'newRound');

    const room = await roomService.findById(roomId);
    const goodWordId = room.rounds[room.rounds.length - 1].wordId as unknown as string;
    const goodWordName = (await wordService.findWordById(goodWordId)).name;

    ownerClient.emit('play', {
      roomId,
      proposal: goodWordName,
    });

    const res: any = await pEvent(ownerClient, 'goodProposal');
    expect(res.playerId).toEqual(ownerAuth.userId);
    expect(res.playerScore).toEqual(1);
  }, 20000);

  it('returns playerScore on wrongProposal', async () => {
    const owner = await utils.createUser();
    const ownerAuth = await utils.login(owner);
    const roomId = await utils.createRoom(ownerAuth.token);

    await app.listen(3013);

    const ownerClient = socketIOClient.connect('ws://localhost:3013', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + ownerAuth.token,
      },
    });

    ownerClient.emit('joinRoom', {
      roomId,
    });

    await pEvent(ownerClient, 'newPlayer');

    ownerClient.emit('startRoom', {
      roomId,
    });

    await pEvent(ownerClient, 'newRound');

    ownerClient.emit('play', {
      roomId,
      proposal: 'wrong',
    });

    const res: any = await pEvent(ownerClient, 'wrongProposal');
    expect(res.playerId).toEqual(ownerAuth.userId);
    expect(res.playerScore).toEqual(0);
  }, 20000);

  it('removes a player of room when brutal disconnection', async () => {
    const owner = await utils.createUser();
    const ownerAuth = await utils.login(owner);
    const roomId = await utils.createRoom(ownerAuth.token);

    const other = await utils.createUser();
    const otherAuth = await utils.login(other);

    await app.listen(3014);

    const ownerClient = socketIOClient.connect('ws://localhost:3014', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + ownerAuth.token,
      },
    });

    const otherClient = socketIOClient.connect('ws://localhost:3014', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + otherAuth.token,
      },
    });

    ownerClient.emit('joinRoom', {
      roomId,
    });

    otherClient.emit('joinRoom', {
      roomId,
    });

    await pEvent(ownerClient, 'newPlayer');

    otherClient.disconnect();

    const event: any = await pEvent(ownerClient, 'playerRemoved');
    expect(event.id).toEqual(otherAuth.userId);
  }, 20000);

  it('joins a private room', async () => {
    const owner = await utils.createUser();
    const ownerAuth = await utils.login(owner);
    const roomId = await utils.createRoom(ownerAuth.token, {
      isPrivate: true,
    });

    await app.listen(3015);

    const ownerClient = socketIOClient.connect('ws://localhost:3015', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + ownerAuth.token,
      },
    });

    const room = await roomService.findById(roomId);

    ownerClient.emit('joinRoom', {
      roomId,
      code: room.code,
    });

    const res: any = await pEvent(ownerClient, 'newPlayer');
    expect(res.id).toEqual(ownerAuth.userId);
  }, 20000);
});
