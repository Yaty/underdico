import * as supertest from 'supertest';
import * as uuid from 'uuid/v4';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { RegisterDto } from '../src/user/dto/register.dto';
import { UserDto } from '../src/user/dto/user.dto';
import { configure } from '../src/app.configuration';
import TestUtils from './utils';
import * as fs from 'fs';
import { RoomService } from '../src/room/room.service';
import { UserService } from '../src/user/user.service';
import * as pEvent from 'p-event';
import { WordService } from '../src/word/word.service';
import { ConfigurationService } from '../src/shared/configuration/configuration.service';
import { Configuration } from '../src/shared/configuration/configuration.enum';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let roomService: RoomService;
  let userService: UserService;
  let wordService: WordService;
  let configService: ConfigurationService;
  let utils: TestUtils;
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
    wordService = moduleFixture.get<WordService>(WordService);
    configService = moduleFixture.get<ConfigurationService>(ConfigurationService);
    api = supertest(app.getHttpServer());
    utils = new TestUtils(api);
  });

  afterAll(async () => {
    await app.close();
  });

  function checkUser(expectedUser, user: UserDto) {
    expect(user.username).toEqual(expectedUser.username);
    expect(user.email).toEqual(expectedUser.email);
    expect(user.role).toEqual('User');
    expect((user as any).password).toBeUndefined();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');
    expect(user).toHaveProperty('score');

    if (expectedUser.locale) {
      expect(user.locale).toEqual(expectedUser.locale);
    } else {
      expect(user).toHaveProperty('locale');
    }
  }

  it('/users (GET)', async () => {
    const auth = await utils.login({
      username: 'admin',
      password: configService.get(Configuration.ADMIN_PASSWORD),
    });

    await utils.createUser();

    await api.get('/api/users')
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        for (const user of res.body) {
          expect(user).toHaveProperty('id');
        }
      });
  });

  it('/users (POST)', () => {
    const user: RegisterDto = {
      username: uuid().substr(0, 10),
      password: uuid().substr(0, 10),
      email: `${uuid()}@${uuid()}.fr`,
      locale: 'en',
    };

    return api.post('/api/users')
      .send(user)
      .expect(201)
      .then((res) => {
        checkUser(user, res.body);
      });
  });

  it('/users (POST) with validation', () => {
    const user = {
      username: uuid() + uuid(),
      password: 444,
      email: uuid(),
      locale: 'fff',
    };

    return api.post('/api/users')
      .send(user)
      .expect(422)
      .then((res) => {
        expect(res.body.statusCode).toEqual(422);
        expect(res.body.error).toEqual('Validation Error');
        expect(res.body.message).toEqual('Validation Error');
        expect(Array.isArray(res.body.errors)).toBeTruthy();
        expect(res.body.errors[0].property).toEqual('email');
        expect(res.body.errors[0].constraints.isEmail).toBeTruthy();
        expect(res.body.errors[1].property).toEqual('locale');
        expect(res.body.errors[1].constraints.customValidation).toEqual('The locale must respect ISO-639-1 standard');
        expect(res.body.errors[2].property).toEqual('username');
        expect(res.body.errors[2].constraints.length).toBeTruthy();
        expect(res.body.errors[3].property).toEqual('password');
        expect(res.body.errors[3].constraints.length).toBeTruthy();
      });
  });

  it('/users/{userId} (DELETE)', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);

    await api.delete('/api/users/' + user.id)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(204);
  });

  it('/users/{userId} (DELETE) and not delete related models', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);
    const roomId = await utils.createRoom(auth.token);

    await api.delete('/api/users/' + user.id)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(204);

    await api.get('/api/words/' + word.id)
      .expect(200)
      .then((res) => {
        expect(res.body.user).toBeUndefined();
      });

    await api.get('/api/words')
      .expect(200)
      .then((res) => {
        const i  = res.body.findIndex((w) => w.id === word.id);
        expect(i !== -1).toBeTruthy();
      });

    await api.get('/api/rooms')
      .expect(200)
      .then((res) => {
        const i = res.body.findIndex((r) => r.id === roomId);
        expect(i !== -1).toBeTruthy();
      });
  });

  it('/users/{userId} (DELETE) with admin', async () => {
    const auth = await utils.login({
      username: 'admin',
      password: configService.get(Configuration.ADMIN_PASSWORD),
    });

    const user = await utils.createUser();

    await api.delete('/api/users/' + user.id)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(204);
  });

  it('/users/{userId} (GET)', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);

    await api.get('/api/users/' + auth.userId)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        checkUser(user, res.body);
      });
  });

  it('/users/{userId} (GET) returns 404 when not found', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);

    await api.get('/api/users/blabla')
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(404);
  });

  it('/users/{userId} (GET) with karma', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);
    await utils.voteForAWord(auth.token, word.id, true);

    const user2 = await utils.createUser();
    const auth2 = await utils.login(user2);
    await utils.voteForAWord(auth2.token, word.id, true);

    await api.get('/api/users/' + auth.userId)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        expect(res.body.karma).toEqual(2);
      });
  });

  it('/users/{userId}/avatar (PUT)', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);

    await api.put('/api/users/' + auth.userId + '/avatar')
      .set('Authorization', 'Bearer ' + auth.token)
      .attach('file', './test/avatar.png')
      .expect(204);
  });

  it('/users/{userId}/avatar (GET)', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    await utils.uploadAvatar(auth.token, auth.userId);

    await api.get('/api/users/' + auth.userId + '/avatar')
      .expect(200)
      .then((res) => {
        const originalFile = fs.readFileSync('./test/avatar.png').toString();
        expect(res.body.toString()).toEqual(originalFile);
      });
  });

  it('/users/{userId}/avatar (DELETE)', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    await utils.uploadAvatar(auth.token, auth.userId);

    await api.delete('/api/users/' + auth.userId + '/avatar')
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(204);
  });

  it('/users/{userId} (PATCH)', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);

    await api.patch('/api/users/' + auth.userId)
      .set('Authorization', 'Bearer ' + auth.token)
      .send({
        email: 'new@email.fr',
        locale: 'de',
      })
      .expect(200)
      .then((res) => {
        checkUser({
          ...user,
          email: 'new@email.fr',
          locale: 'de',
        }, res.body);
      });
  });

  it('/users/token (POST)', async () => {
    const user = await utils.createUser();

    await api.post('/api/users/token')
      .send({
        username: user.username,
        password: user.password,
      })
      .expect(201)
      .then((res) => {
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('userId');
        expect(res.body).toHaveProperty('expiresIn');
        expect(res.body).toHaveProperty('createdAt');
      });
  });

  it('/users/:userId/summary (GET)', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);
    const vote = await utils.voteForAWord(auth.token, word.id, true);
    const roomId = await utils.createRoom(auth.token);

    await roomService.stop(roomId);

    await api.get('/api/users/' + auth.userId + '/summary')
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        expect(res.body.user.id).toEqual(auth.userId);
        expect(res.body.words[0].id).toEqual(word.id);
        expect(res.body.votes[0].id).toEqual(vote.id);
        expect(res.body.rooms[0].id).toEqual(roomId);
      });
  });

  it('/users/:userId (GET) with score', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const userInstance = await userService.findUserById(auth.userId);
    const roomId = await utils.createRoom(auth.token);

    await roomService.addPlayer({
      roomId,
      user: userInstance,
    });

    await roomService.startRoom({
      roomId,
      user: userInstance,
    });

    await pEvent(roomService, 'startNextRound');

    const room = await roomService.findById(roomId);
    const goodWordId = room.rounds[room.rounds.length - 1].wordId as unknown as string;
    const goodWordName = (await wordService.findWordById(goodWordId)).name;

    await roomService.checkProposal({
      roomId,
      user: userInstance,
      proposal: goodWordName,
    }, userInstance);

    await pEvent(roomService, 'startNextRound');

    await roomService.stop(roomId);

    await api.get('/api/users/' + auth.userId)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        expect(res.body.score).toEqual(1);
      });
  });
});
