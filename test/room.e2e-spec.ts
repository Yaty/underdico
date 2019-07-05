import * as supertest from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { configure } from '../src/app.configuration';
import TestUtils from './utils';
import { CreateRoomDto } from '../src/room/dto/create-room.dto';
import * as uuid from 'uuid/v4';

describe('RoomController (e2e)', () => {
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

  afterAll(async () => {
    await app.close();
  });

  it('/api/rooms (GET)', () => {
    return api.get('/api/rooms')
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBeTruthy();
      });
  });

  it('/api/rooms (GET) with usernames', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const roomId = await utils.createRoom(auth.token);

    return api.get('/api/rooms')
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body[0].id).toEqual(roomId);
        expect(Array.isArray(res.body[0].usernames)).toBeTruthy();
        expect(res.body[0].usernames[0]).toEqual(user.username);
      });
  });

  it('/api/rooms (POST)', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const room: CreateRoomDto = {
      name: uuid(),
    };

    await api.post('/api/rooms')
      .set('Authorization', 'Bearer ' + auth.token)
      .send(room)
      .expect(201)
      .then((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('createdAt');
        expect(res.body).toHaveProperty('updatedAt');
        expect(res.body.name).toEqual(room.name);
        expect(res.body.isPrivate).toEqual(false);
        expect(res.body.isRanked).toEqual(false);
        expect(res.body.status).toEqual('Created');
        expect(res.body.locale).toEqual('fr');
        expect(res.body.maxPlayers).toEqual(10);
        expect(res.body.ownerId).toEqual(auth.userId);
        expect(res.body.playersIds).toEqual([auth.userId]);
        expect(res.body.usernames[0]).toEqual(user.username);
      });
  });
});
