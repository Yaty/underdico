import * as socketIOClient from 'socket.io-client';
import TestUtils from './utils';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configure } from '../src/app.configuration';
import * as supertest from 'supertest';
import { INestApplication } from '@nestjs/common';
import * as pEvent from 'p-event';
import { RoomService } from '../src/room/room.service';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Event (E2E)', () => {
  let app: INestApplication;
  let roomService: RoomService;
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
      token: ownerAuth.token,
    });

    await pEvent(player1SocketIOClient, 'roomStarted');

    const [newRound] = await Promise.all([
      pEvent(ownerSocketIOClient, 'newRound'),
      pEvent(player1SocketIOClient, 'newRound'),
    ]);

    // @ts-ignore
    const playerSocket = ownerAuth.userId === newRound.nextPlayerId ? ownerSocketIOClient : player1SocketIOClient;

    const room = await roomService.findById(roomId);
    const goodWord = room.wordsIds[room.wordsIds.length - 1];

    playerSocket.emit('play', {
      roomId,
      proposal: goodWord,
    });

    const [play] = await Promise.all([
      pEvent(ownerSocketIOClient, 'goodProposal'),
      pEvent(ownerSocketIOClient, 'goodProposal'),
    ]);

    // @ts-ignore
    expect(play.playerId).toEqual(player);
  }, 60000);
});
