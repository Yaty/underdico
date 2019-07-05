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

describe('UserController (e2e)', () => {
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

  function checkUser(expectedUser, user: UserDto) {
    expect(user.username).toEqual(expectedUser.username);
    expect(user.email).toEqual(expectedUser.email);
    expect(user.role).toEqual('User');
    expect((user as any).password).toBeUndefined();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');

    if (expectedUser.locale) {
      expect(user.locale).toEqual(expectedUser.locale);
    } else {
      expect(user).toHaveProperty('locale');
    }
  }

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
});
