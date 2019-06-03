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
import { UserDto } from '../src/user/dto/user.dto';
import { configure } from '../src/app.configuration';
import * as request from 'request-promise-native';
import * as fs from 'fs';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let api;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configure(app);
    await app.init();
    api = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  function createUser(): Promise<RegisterDto> {
    return new Promise((resolve, reject) => {
      const user: RegisterDto = {
        username: uuid().substr(0, 10),
        password: uuid().substr(0, 10),
        email: `${uuid()}@${uuid()}.fr`,
      };

      return api.post('/api/users')
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
      api.post('/api/users/token')
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

      api.post('/api/words')
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
       api.post('/api/words/' + wordId + '/votes')
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

  function getWords(): Promise<WordDto[]> {
    return new Promise((resolve, reject) => {
      api.get('/api/words')
        .expect(200)
        .then((res) => {
          resolve(res.body);
        })
        .catch(reject);
    });
  }

  async function uploadAudio(token: string, wordId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      api.put('/api/words/' + wordId + '/audio')
        .set('Authorization', 'Bearer ' + token)
        .attach('file', './test/audio.mp3')
        .expect(204)
        .then(() => resolve(wordId))
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

    expect(typeof word.user.id === 'string').toBeTruthy();
  }

  function checkUser(expectedUser, user: UserDto) {
    expect(user.username).toEqual(expectedUser.username);
    expect(user.email).toEqual(expectedUser.email);
    expect(user.role).toEqual('User');
    expect((user as any).password).toBeUndefined();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');
    expect(user).toHaveProperty('locale');
  }

  it('/ (GET)', () => {
    return api.get('/api')
      .expect(200)
      .then((res) => {
        expect(res.body).toHaveProperty('startedAt');
        expect(res.body).toHaveProperty('uptime');
      });
  });

  it('/users (POST)', () => {
    const user: RegisterDto = {
      username: uuid().substr(0, 10),
      password: uuid().substr(0, 10),
      email: `${uuid()}@${uuid()}.fr`,
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
    const user = await createUser();
    const auth = await login(user);

    await api.get('/api/users/' + auth.userId)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        checkUser(user, res.body);
      });
  });

  it('/users/{userId} (GET) with karma', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word = await createWord(auth.token);
    await voteForAWord(auth.token, word.id, true);

    const user2 = await createUser();
    const auth2 = await login(user2);
    await voteForAWord(auth2.token, word.id, true);

    await api.get('/api/users/' + auth.userId)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        expect(res.body.karma).toEqual(2);
      });
  });

  it('/users/{userId} (PATCH)', async () => {
    const user = await createUser();
    const auth = await login(user);

    await api.patch('/api/users/' + auth.userId)
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

  it('/words (POST)', async () => {
    const user = await createUser();
    const auth = await login(user);

    const word: CreateWordDto = {
      name: uuid().substr(0, 6),
      definition: uuid(),
      tags: [uuid()],
    };

    await api.post('/api/words')
      .set('Authorization', 'Bearer ' + auth.token)
      .send(word)
      .expect(201)
      .then((res) => {
        checkWord(res.body, auth.userId);
      });
  });

  it('/words (POST) with validation', async () => {
    const user = await createUser();
    const auth = await login(user);

    const word: CreateWordDto = {
      name: uuid(),
      definition: uuid().repeat(100),
      // @ts-ignore
      tags: 123,
      locale: 'fffff',
    };

    await api.post('/api/words')
      .set('Authorization', 'Bearer ' + auth.token)
      .send(word)
      .expect(422)
      .then((res) => {
        expect(res.body.errors[0].property).toEqual('name');
        expect(res.body.errors[0].constraints).toHaveProperty('isAlphanumeric');
        expect(res.body.errors[1].property).toEqual('definition');
        expect(res.body.errors[1].constraints).toHaveProperty('length');
        expect(res.body.errors[2].property).toEqual('tags');
        expect(res.body.errors[2].constraints).toHaveProperty('arrayUnique');
        expect(res.body.errors[2].constraints).toHaveProperty('isArray');
        expect(res.body.errors[3].property).toEqual('locale');
        expect(res.body.errors[3].constraints).toHaveProperty('customValidation');
      });
  });

  it('/words (GET)', () => {
    return api.get('/api/words')
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBeTruthy();

        for (const w of res.body) {
          checkWord(w);
        }
      });
  });

  it('/words (GET) with filter', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word1 = await createWord(auth.token);
    await createWord(auth.token);

    return api.get('/api/words?where=' + JSON.stringify({
      name: word1.name,
    }))
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body.length).toEqual(1);
        expect(res.body[0].name).toEqual(word1.name);
      });
  });

  it('/words (GET) with pagination', async () => {
    const user = await createUser();
    const auth = await login(user);

    for (let i = 0; i < 6; i++) {
      await createWord(auth.token);
    }

    const words = await getWords();

    await api.get('/api/words?range=0-2')
      .expect(200)
      .then((res) => {
        for (let i = 0; i < 3; i++) {
          expect(res.body[i].id).toEqual(words[i].id);
        }
      });

    await api.get('/api/words?range=3-5')
      .expect(200)
      .then((res) => {
        for (let i = 3; i < 6; i++) {
          expect(res.body[i - 3].id).toEqual(words[i].id);
        }
      });
  });

  it('/words (GET) with vote information', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word = await createWord(auth.token);
    const vote = await voteForAWord(auth.token, word.id, true);

    await api.get('/api/words')
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBeTruthy();

        let found = false;

        for (const w of res.body) {
          if (w.id === word.id) {
            expect(w.userVoteId).toEqual(vote.id);
            found = true;
          }
        }

        expect(found).toBeTruthy();
      });
  });

  it('/words/{wordId} (GET)', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word = await createWord(auth.token);

    await api.get('/api/words/' + word.id)
      .expect(200)
      .then((res) => {
        checkWord(res.body);
        expect(res.body.id).toEqual(word.id);
      });
  });

  it('/words/{wordId} (GET) with the owner', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word = await createWord(auth.token);

    await api.get('/api/words/' + word.id)
      .expect(200)
      .then((res) => {
        expect(res.body.user.id).toEqual(auth.userId);
      });
  });

  it('/words/{wordId} (GET) with an upvote', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word = await createWord(auth.token);
    const vote = await voteForAWord(auth.token, word.id, true);

    await api.get('/api/words/' + word.id)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        expect(res.body.score).toEqual(1);
        expect(res.body.userUpVoted).toBeTruthy();
        expect(res.body.userDownVoted).toBeFalsy();
        expect(res.body.userVoteId).toEqual(vote.id);
      });
  });

  it('/words/{wordId} (GET) with a downvote', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word = await createWord(auth.token);
    const vote = await voteForAWord(auth.token, word.id, false);

    await api.get('/api/words/' + word.id)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        expect(res.body.score).toEqual(-1);
        expect(res.body.userUpVoted).toBeFalsy();
        expect(res.body.userDownVoted).toBeTruthy();
        expect(res.body.userVoteId).toEqual(vote.id);
      });
  });

  it('/words/random (GET)', async () => {
    await api.get('/api/words/random')
      .expect(302)
      .then((res) => {
        expect(res.header.location).toMatch(/http:\/\/127\.0\.0\.1:[0-9]+\/api\/words\/[0-9a-z]{24}/);
      });
  });

  it('/words/daily (GET)', async () => {
    const words = await getWords();
    const bestWordScore = words.length > 0 ? Math.max(...words.map((w) => w.score)) : 0;
    const user = await createUser();
    const auth = await login(user);
    const bestWord = await createWord(auth.token);

    await createWord(auth.token); // populate with random word

    for (let i = 0; i < bestWordScore + 1; i++) {
      await voteForAWord(auth.token, bestWord.id, true);
    }

    await api.get('/api/words/daily')
      .expect(302)
      .then((res) => {
        expect(res.header.location).toMatch(new RegExp('http:\/\/127\.0\.0\.1:[0-9]+\/api\/words\/' + bestWord.id));
      });
  });

  it('/words/{wordId}/votes (POST)', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word = await createWord(auth.token);

    await api.post('/api/words/' + word.id + '/votes')
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

    await api.patch('/api/words/' + word.id + '/votes/' + vote.id)
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

  it('/words/{wordId}/audio (PUT)', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word = await createWord(auth.token);

    await api.put('/api/words/' + word.id + '/audio')
      .set('Authorization', 'Bearer ' + auth.token)
      .attach('file', './test/audio.mp3')
      .expect(204);
  });

  it('/words/{wordId}/audio (GET)', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word = await createWord(auth.token);
    await uploadAudio(auth.token, word.id);

    await api.get('/api/words/' + word.id + '/audio')
      .expect(302)
      .then((res) => request.get(res.header.location))
      .then((body) => {
        const originalFile = fs.readFileSync('./test/audio.mp3').toString();
        expect(body).toEqual(originalFile);
      });
  });

  it('/words/{wordId}/audio (DELETE)', async () => {
    const user = await createUser();
    const auth = await login(user);
    const word = await createWord(auth.token);
    await uploadAudio(auth.token, word.id);

    await api.delete('/api/words/' + word.id + '/audio')
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(204);
  });
});
