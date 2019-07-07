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
  });

  afterEach(async () => {
    await app.close();
    await wait(1000);
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
    await pEvent(ownerClient, 'timeout');
  }, 30000);

  it('handles wrong proposals', async (): Promise<void> => {
    const owner = await utils.createUser();
    const ownerAuth = await utils.login(owner);
    const roomId = await utils.createRoom(ownerAuth.token);

    await app.listen(3008);

    const ownerClient = socketIOClient.connect('ws://localhost:3008', {
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

    await app.listen(3009);

    const ownerClient = socketIOClient.connect('ws://localhost:3009', {
      // @ts-ignore
      extraHeaders: {
        Authorization: 'Bearer ' + ownerAuth.token,
      },
    });

    const anotherClient = socketIOClient.connect('ws://localhost:3009', {
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
});
