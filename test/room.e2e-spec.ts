import * as supertest from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { configure } from '../src/app.configuration';
import TestUtils from './utils';
import { CreateRoomDto } from '../src/room/dto/create-room.dto';
import * as uuid from 'uuid/v4';
import { RoomService } from '../src/room/room.service';
import { UserService } from '../src/user/user.service';

describe('RoomController (e2e)', () => {
  let app: INestApplication;
  let utils: TestUtils;
  let roomService: RoomService;
  let userService: UserService;
  let api;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configure(app);
    await app.init();
    roomService = moduleFixture.get<RoomService>(RoomService);
    userService = moduleFixture.get<UserService>(UserService);
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

  it('/api/rooms (GET) with filter', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const roomName = uuid();

    await utils.createRoom(auth.token, {
      name: roomName,
    });

    await utils.createRoom(auth.token);

    return api.get('/api/rooms?where=' + JSON.stringify({
      name: roomName,
    }))
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body.length).toEqual(1);
        expect(res.body[0].name).toEqual(roomName);
      });
  });

  it('/api/rooms (GET) with usernames', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const roomId = await utils.createRoom(auth.token);

    await roomService.addPlayer({
      user: await userService.findUserById(auth.userId),
      roomId,
    });

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
        expect(res.body.usernames.length).toEqual(0);
        expect(res.body.connectedPlayersIds.length).toEqual(0);
        expect(typeof res.body.code === 'undefined').toBeTruthy();
      });
  });

  it('/api/rooms (POST) a private room', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const room: CreateRoomDto = {
      name: uuid(),
      isPrivate: true,
    };

    await api.post('/api/rooms')
      .set('Authorization', 'Bearer ' + auth.token)
      .send(room)
      .expect(201)
      .then((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toEqual(room.name);
        expect(res.body.isPrivate).toEqual(true);
        expect(typeof res.body.code === 'string').toBeTruthy();
      });
  });

  it('/apis/rooms/private (GET)', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);

    const roomId = await utils.createRoom(auth.token, {
      isPrivate: true,
    });

    const room = await roomService.findById(roomId);

    await api.get('/api/rooms/private?code=' + room.code)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        expect(res.body.id).toEqual(roomId);
      });
  });
});
