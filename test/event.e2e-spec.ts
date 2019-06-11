import * as socketIOClient from 'socket.io-client';
import TestUtils from './utils';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configure } from '../src/app.configuration';
import * as supertest from 'supertest';
import { INestApplication } from '@nestjs/common';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe.skip('Event (E2E)', () => {
  let app: INestApplication;
  let utils: TestUtils;
  let api;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configure(app);
    await app.init();
    api = supertest(app.getHttpServer());
    utils = new TestUtils(api);
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

    await app.listen(3005);
    const ownerSocketIOClient = socketIOClient.connect('ws://localhost:3005');
    const player1SocketIOClient = socketIOClient.connect('ws://localhost:3005');

    player1SocketIOClient.emit('joinRoom', {
      roomId,
      token: player1Auth.token,
    });

    ownerSocketIOClient.emit('joinRoom', {
      roomId,
      token: ownerAuth.token,
    });

    await wait(100);

    return new Promise(async (resolve, reject) => {
      ownerSocketIOClient.emit('startRoom', {
        roomId,
        token: ownerAuth.token,
      });

      player1SocketIOClient.once('roomStarted', (message) => {
        // TODO
        resolve();
      });
    });
  });
});
