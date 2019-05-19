import * as supertest from 'supertest';
import * as uuid from 'uuid/v4';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { RegisterDto } from '../src/user/dto/register.dto';
import { TokenResponseDto } from '../src/user/dto/token-response.dto';
import { CreateWordDto } from '../src/word/dto/create-word.dto';
import { WordDto } from '../src/word/dto/word.dto';
import { VoteDto } from '../src/vote/dto/vote.dto';
import './mongodb-memory';
import { UserDto } from '../src/user/dto/user.dto';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let api;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    api = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  function createUser(): Promise<RegisterDto> {
    return new Promise((resolve, reject) => {
      const user: RegisterDto = {
        username: uuid(),
        password: uuid(),
        email: `${uuid()}@${uuid()}.fr`,
      };

      return api.post('/users')
        .send(user)
        .expect(201)
        .then(() => {
          resolve(user);
        })
        .catch(reject);
    });
  }

  function login(user: RegisterDto): Promise<TokenResponseDto> {
    return new Promise((resolve, reject) => {
      api.post('/users/token')
        .send({
          username: user.username,
          password: user.password,
        })
        .expect(201)
        .then((res) => {
          resolve(res.body);
        })
        .catch(reject);
    });
  }

  function createWord(token: string): Promise<WordDto> {
    return new Promise((resolve, reject) => {
      const word: CreateWordDto = {
        name: uuid().substr(0, 6),
        definition: uuid(),
        tags: [uuid()],
      };

      api.post('/words')
        .set('Authorization', 'Bearer ' + token)
        .send(word)
        .expect(201)
        .then((res) => {
          resolve(res.body);
        })
        .catch(reject);
    });
  }

  function voteForAWord(token: string, wordId: string, voteValue: boolean): Promise<VoteDto> {
    return new Promise((resolve, reject) => {
       api.post('/words/' + wordId + '/votes')
        .set('Authorization', 'Bearer ' + token)
        .send({
          value: voteValue,
        })
        .expect(201)
        .then((res) => {
          resolve(res.body);
        })
        .catch(reject);
    });
  }

  function checkWord(word: WordDto, userId?: string) {
    expect(word).toHaveProperty('createdAt');
    expect(word).toHaveProperty('updatedAt');
    expect(word).toHaveProperty('id');
    expect(word.name).toEqual(word.name);
    expect(word.definition).toEqual(word.definition);
    expect(word.tags[0]).toEqual(word.tags[0]);
    expect(typeof word.score === 'number').toBeTruthy();
    expect(word.userVoteId).toBeUndefined();

    if (userId) {
      expect(word.userId).toEqual(userId);
      expect(word.userUpVoted).toEqual(false);
      expect(word.userDownVoted).toEqual(false);
    } else {
      expect(typeof word.userId === 'string').toBeTruthy();
      expect(word.userUpVoted).toBeUndefined();
      expect(word.userDownVoted).toBeUndefined();
    }
  }

  it('/ (GET)', () => {
    return api.get('/')
      .expect(200)
      .then((res) => {
        expect(res.body).toHaveProperty('startedAt');
        expect(res.body).toHaveProperty('uptime');
      });
  });

  function checkUser(expectedUser, user: UserDto) {
    expect(user.username).toEqual(expectedUser.username);
    expect(user.email).toEqual(expectedUser.email);
    expect(user.role).toEqual('User');
    expect((user as any).password).toBeUndefined();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');
  }

  it('/users (POST)', () => {
    const user: RegisterDto = {
      username: uuid(),
      password: uuid(),
      email: `${uuid()}@${uuid()}.fr`,
    };

    return api.post('/users')
      .send(user)
      .expect(201)
      .then((res) => {
        checkUser(user, res.body);
      });
  });

  it('/users/{userId} (GET)', async () => {
    const user = await createUser();
    const auth = await login(user);

    await api.get('/users/' + auth.userId)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        checkUser(user, res.body);
      });
  });

  it('/users/{userId} (PATCH)', async () => {
    const user = await createUser();
    const auth = await login(user);

    await api.patch('/users/' + auth.userId)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .send({
        email: 'new@email.fr',
      })
      .then((res) => {
        expect(res.body.email).toEqual('new@email.fr');
      });
  });

  it('/users/token (POST)', async () => {
    const user = await createUser();

    await api.post('/users/token')
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

  it('/words (POST)', async () => {
    const user = await createUser();
    const auth = await login(user);

    const word: CreateWordDto = {
      name: uuid().substr(0, 6),
      definition: uuid(),
      tags: [uuid()],
    };

    await api.post('/words')
      .set('Authorization', 'Bearer ' + auth.token)
      .send(word)
      .expect(201)
      .then((res) => {
        checkWord(res.body, auth.userId);
      });
  });

  it('/words (GET)', () => {
    return api.get('/words')
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBeTruthy();

        for (const w of res.body) {
          checkWord(w);
        }
      });
  });

  it('/words/{wordId} (GET)', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word = await createWord(auth.token);

    await api.get('/words/' + word.id)
      .expect(200)
      .then((res) => {
        checkWord(res.body);
        expect(res.body.id).toEqual(word.id);
      });
  });

  it('/words/{wordId} (GET) with an upvote', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word = await createWord(auth.token);
    await voteForAWord(auth.token, word.id, true);

    await api.get('/words/' + word.id)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        expect(res.body.score).toEqual(1);
        expect(res.body.userUpVoted).toBeTruthy();
        expect(res.body.userDownVoted).toBeFalsy();
      });
  });

  it('/words/{wordId} (GET) with a downvote', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word = await createWord(auth.token);
    await voteForAWord(auth.token, word.id, false);

    await api.get('/words/' + word.id)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        expect(res.body.score).toEqual(-1);
        expect(res.body.userUpVoted).toBeFalsy();
        expect(res.body.userDownVoted).toBeTruthy();
      });
  });

  it('/words/random (GET)', async () => {
    await api.get('/words/random')
      .expect(302)
      .then((res) => {
        expect(res.header.location).toMatch(/http:\/\/127\.0\.0\.1:[0-9]+\/api\/words\/[0-9a-z]{24}/);
      });
  });

  it('/words/{wordId}/votes (POST)', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word = await createWord(auth.token);

    await api.post('/words/' + word.id + '/votes')
      .set('Authorization', 'Bearer ' + auth.token)
      .send({
        value: true,
      })
      .expect(201)
      .then((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.value).toBeTruthy();
        expect(res.body.userId).toEqual(auth.userId);
      });
  });

  it('/words/{wordId}/votes/{voteId} (PATCH)', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word = await createWord(auth.token);
    const vote = await voteForAWord(auth.token, word.id, true);

    await api.patch('/words/' + word.id + '/votes/' + vote.id)
      .set('Authorization', 'Bearer ' + auth.token)
      .send({
        value: false,
      })
      .expect(200)
      .then((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.value).toBeFalsy();
        expect(res.body.userId).toEqual(auth.userId);
      });
  });
});
