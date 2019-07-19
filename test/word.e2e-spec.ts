import * as supertest from 'supertest';
import * as uuid from 'uuid/v4';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { WordDto } from '../src/word/dto/word.dto';
import { configure } from '../src/app.configuration';
import TestUtils from './utils';
import * as fs from 'fs';
import { CreateWordDto } from '../src/word/dto/create-word.dto';
import { Configuration } from '../src/shared/configuration/configuration.enum';
import { ConfigurationService } from '../src/shared/configuration/configuration.service';

describe('WordController (e2e)', () => {
  let app: INestApplication;
  let utils: TestUtils;
  let configService: ConfigurationService;
  let api;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    configure(app);
    await app.init();
    configService = app.get<ConfigurationService>(ConfigurationService);
    api = supertest(app.getHttpServer());
    utils = new TestUtils(api);
  });

  afterAll(async () => {
    await app.close();
  });

  function checkWord(expectedWord, word: WordDto, userId?: string) {
    expect(word).toHaveProperty('createdAt');
    expect(word).toHaveProperty('updatedAt');
    expect(word).toHaveProperty('id');

    if (expectedWord) {
      expect(word.name).toEqual(expectedWord.name);
      expect(word.definition).toEqual(expectedWord.definition);
      expect(word.tags[0]).toEqual(expectedWord.tags[0]);

      if (expectedWord.locale) {
        expect(word.locale).toEqual(expectedWord.locale);
      }
    }

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

    if (word.user) { // might not exists if the user is deleted
      expect(typeof word.user.id === 'string').toBeTruthy();
      expect(typeof word.user.karma === 'number').toBeTruthy();
    }

    expect(word).toHaveProperty('locale');
    expect(word).toHaveProperty('score');
  }

  it('/words (POST)', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);

    const word: CreateWordDto = {
      name: uuid().substr(0, 6),
      definition: uuid(),
      tags: [uuid()],
      locale: 'en',
    };

    await api.post('/api/words')
      .set('Authorization', 'Bearer ' + auth.token)
      .send(word)
      .expect(201)
      .then((res) => {
        checkWord(word, res.body, auth.userId);
      });
  });

  it('/words (POST) with example', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);

    const word: CreateWordDto = {
      name: uuid().substr(0, 6),
      definition: uuid(),
      tags: [uuid()],
      locale: 'en',
      example: '123',
    };

    await api.post('/api/words')
      .set('Authorization', 'Bearer ' + auth.token)
      .send(word)
      .expect(201)
      .then((res) => {
        checkWord(word, res.body, auth.userId);
        expect(res.body.example).toEqual(word.example);
      });
  });

  it('/words (POST) with validation', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);

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
        expect(res.body.errors[0].property).toEqual('definition');
        expect(res.body.errors[0].constraints).toHaveProperty('length');
        expect(res.body.errors[1].property).toEqual('tags');
        expect(res.body.errors[1].constraints).toHaveProperty('arrayUnique');
        expect(res.body.errors[1].constraints).toHaveProperty('isArray');
        expect(res.body.errors[2].property).toEqual('locale');
        expect(res.body.errors[2].constraints).toHaveProperty('customValidation');
      });
  });

  it('/words (GET)', () => {
    return api.get('/api/words')
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBeTruthy();

        for (const w of res.body) {
          checkWord(null, w);
        }
      });
  });

  it('/words (GET) with filter', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word1 = await utils.createWord(auth.token);
    await utils.createWord(auth.token);

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

  it('/words (GET) with filter on score', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);

    for (let i = 0; i < 5; i++) {
      const u = await utils.createUser();
      const a = await utils.login(u);
      await utils.voteForAWord(a.token, word.id, true);
    }

    await api.get('/api/words?where=' + JSON.stringify({
      score: 5,
    }))
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body.length).toBeGreaterThan(0);

        let found = false;

        for (const w of res.body) {
          if (w.id === word.id) {
            found = true;
          }

          expect(w.score).toEqual(5);
        }

        expect(found).toBeTruthy();
      });
  });

  it('/words (GET) with filter on a date', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);

    return api.get('/api/words?where=' + JSON.stringify({
      $expr: {
        $eq: ['$createdAt', {
          $dateFromString: {
            dateString: word.createdAt,
          },
        }],
      },
    }))
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body.length).toEqual(1);
        expect(res.body[0].id).toEqual(word.id);
      });
  });

  it('/words (GET) with filter on interval of a date', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);
    const createdAt = new Date(word.createdAt);
    const before = new Date(createdAt);
    const after = new Date(createdAt);

    before.setMilliseconds(createdAt.getMilliseconds() - 1);
    after.setMilliseconds(createdAt.getMilliseconds() + 1);

    return api.get('/api/words?where=' + JSON.stringify({
      $expr: {
        $and: [
          {
            $gt: ['$createdAt', {
              $dateFromString: {
                dateString: before.toISOString(),
              },
            }],
          },
          {
            $lt: ['$createdAt', {
              $dateFromString: {
                dateString: after.toISOString(),
              },
            }],
          },
        ],
      },
    }))
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body.length).toEqual(1);
        expect(res.body[0].id).toEqual(word.id);
      });
  });

  it('/words (GET) with sort on score', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word1 = await utils.createWord(auth.token);
    await utils.createWord(auth.token);
    await utils.voteForAWord(auth.token, word1.id, true);

    return api.get('/api/words?sort=score,desc')
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBeTruthy();
        let previous = res.body[0].score;

        for (const w of res.body) {
          expect(w.score).toBeLessThanOrEqual(previous);
          previous = w.score;
        }
      });
  });

  it('/words (GET) with pagination', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);

    for (let i = 0; i < 6; i++) {
      await utils.createWord(auth.token);
    }

    const words = await utils.getWords();

    await api.get('/api/words?range=0-2')
      .expect(200)
      .then((res) => {
        expect(res.body.length).toEqual(3);

        for (let i = 0; i < 3; i++) {
          expect(res.body[i].id).toEqual(words[i].id);
        }
      });

    await api.get('/api/words?range=3-5')
      .expect(200)
      .then((res) => {
        expect(res.body.length).toEqual(3);

        for (let i = 3; i < 6; i++) {
          expect(res.body[i - 3].id).toEqual(words[i].id);
        }
      });
  }, 10000);

  it('/words (GET) with vote information', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);
    const vote = await utils.voteForAWord(auth.token, word.id, true);

    const u2 = await utils.createUser();
    const a2 = await utils.login(u2);
    await utils.voteForAWord(a2.token, word.id, true);

    await api.get('/api/words')
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBeTruthy();

        let found = false;

        for (const w of res.body) {
          if (w.id === word.id) {
            expect(w.userVoteId).toEqual(vote.id);
            expect(w.score).toEqual(2);
            found = true;
          }
        }

        expect(found).toBeTruthy();
      });
  });

  it('/words (GET) with sort on votes and where on locale', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word1 = await utils.createWord(auth.token, 'ar');
    const word2 = await utils.createWord(auth.token, 'ar');
    const word3 = await utils.createWord(auth.token, 'fr');

    await utils.voteForAWord(auth.token, word1.id, true);

    await api.get('/api/words?sort=score,desc&where={"locale": "ar"}')
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBeTruthy();

        const w1Index = res.body.findIndex((w) => w.id === word1.id);
        const w2Index = res.body.findIndex((w) => w.id === word2.id);
        const w3Index = res.body.findIndex((w) => w.id === word3.id);

        expect(w1Index).toBeGreaterThanOrEqual(0);
        expect(w2Index).toBeGreaterThanOrEqual(1);
        expect(w2Index).toBeGreaterThan(w1Index);
        expect(w3Index).toEqual(-1);
      });
  });

  it('/words (GET) with insensitive search', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);

    await api.get('/api/words/?where=' + JSON.stringify({
      name: {
        $regex: word.name.toLowerCase(),
        $options: 'i',
      },
    }))
      .expect(200)
      .then((res) => {
        expect(res.body.length).toEqual(1);
        expect(res.body[0].id).toEqual(word.id);
      });

    await api.get('/api/words/?where=' + JSON.stringify({
      name: {
        $regex: word.name.toUpperCase(),
        $options: 'i',
      },
    }))
      .expect(200)
      .then((res) => {
        expect(res.body.length).toEqual(1);
        expect(res.body[0].id).toEqual(word.id);
      });
  });

  it('/words/{wordId} (DELETE) is not possible for a user', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const wordId = await utils.createWord(auth.token);

    await api.delete('/api/words/' + wordId)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(401);
  });

  it('/words/{wordId} (DELETE) with admin', async () => {
    const auth = await utils.login({
      username: 'admin',
      password: configService.get(Configuration.ADMIN_PASSWORD),
    });

    const word = await utils.createWord(auth.token);

    await api.delete('/api/words/' + word.id)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(204);
  });

  it('/words/{wordId} (GET)', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);

    await api.get('/api/words/' + word.id)
      .expect(200)
      .then((res) => {
        checkWord(word, res.body);
        expect(res.body.id).toEqual(word.id);
      });
  });

  it('/words/{wordId} (GET) returns 404 when word not found', async () => {
    await api.get('/api/words/blabla')
      .expect(404);
  });

  it('/words/{wordId} (GET) with the owner', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);

    await api.get('/api/words/' + word.id)
      .expect(200)
      .then((res) => {
        expect(res.body.user.id).toEqual(auth.userId);
      });
  });

  it('/words/{wordId} (GET) with upvotes', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);
    const vote = await utils.voteForAWord(auth.token, word.id, true);

    const u2 = await utils.createUser();
    const a2 = await utils.login(u2);
    await utils.voteForAWord(a2.token, word.id, true);

    await api.get('/api/words/' + word.id)
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(200)
      .then((res) => {
        expect(res.body.score).toEqual(2);
        expect(res.body.userUpVoted).toBeTruthy();
        expect(res.body.userDownVoted).toBeFalsy();
        expect(res.body.userVoteId).toEqual(vote.id);
      });
  });

  it('/words/{wordId} (GET) with a downvote', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);
    const vote = await utils.voteForAWord(auth.token, word.id, false);

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

  it('/words/{wordId} (PATCH)', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);

    await api.patch('/api/words/' + word.id)
      .set('Authorization', 'Bearer ' + auth.token)
      .send({
        name: 'new name',
        locale: 'en',
      })
      .expect(200)
      .then((res) => {
        checkWord({
          ...word,
          name: 'new name',
          locale: 'en',
        }, res.body, auth.userId);
      });
  });

  it('/words/random (GET)', async () => {
    const locations = [];

    for (let i = 0; i < 2; i++) {
      await api.get('/api/words/random')
        .expect(302)
        .then((res) => {
          expect(res.header.location).toMatch(/https:\/\/127\.0\.0\.1:[0-9]+\/api\/words\/[0-9a-z]{24}/);
          locations.push(res.header.location);
        });
    }

    expect([...new Set(locations)].length).toEqual(2);
  });

  it('/words/random (GET) with locale', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    await utils.createWord(auth.token, 'en');

    await api.get('/api/words/random?locale=en')
      .expect(302)
      .then((res) => {
        expect(res.header.location).toMatch(/https:\/\/127\.0\.0\.1:[0-9]+\/api\/words\/[0-9a-z]{24}/);
        return api.get('/api/words/' + res.header.location.split('/').pop()).expect(200);
      })
      .then((res) => {
        expect(res.body.locale).toEqual('en');
      });
  });

  it('/words/daily (GET)', async () => {
    const words = await utils.getWords();
    const bestWordScore = words.length > 0 ? Math.max(...words.map((w) => w.score)) : 0;
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const bestWord = await utils.createWord(auth.token);

    await utils.createWord(auth.token); // populate with random word

    for (let i = 0; i < bestWordScore + 1; i++) {
      const u = await utils.createUser();
      const a = await utils.login(u);
      await utils.voteForAWord(a.token, bestWord.id, true);
    }

    await api.get('/api/words/daily')
      .expect(302)
      .then((res) => {
        expect(res.header.location).toMatch(new RegExp('https:\/\/127\.0\.0\.1:[0-9]+\/api\/words\/' + bestWord.id));
      });
  });

  it('/words/daily (GET) with locale', async () => {
    const locale = 'lt';
    const words = await utils.getWords(locale);
    const bestWordScore = words.length > 0 ? Math.max(...words.map((w) => w.score)) : 0;
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const bestWordInCorrectLocale = await utils.createWord(auth.token, locale);
    const bestWorldInAnotherLocale = await utils.createWord(auth.token, 'pt');

    await utils.createWord(auth.token, locale); // populate with random word
    await utils.voteForAWord(auth.token, bestWorldInAnotherLocale.id, true);

    for (let i = 0; i < bestWordScore + 1; i++) {
      const u = await utils.createUser();
      const a = await utils.login(u);
      await utils.voteForAWord(a.token, bestWordInCorrectLocale.id, true);
      await utils.voteForAWord(a.token, bestWorldInAnotherLocale.id, true);
    }

    await api.get('/api/words/daily?locale=' + locale)
      .expect(302)
      .then((res) => {
        expect(res.header.location).toMatch(new RegExp('https:\/\/127\.0\.0\.1:[0-9]+\/api\/words\/' + bestWordInCorrectLocale.id));
      });
  });

  it('/words/{wordId}/votes (POST)', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);

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
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);
    const vote = await utils.voteForAWord(auth.token, word.id, true);

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
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);

    await api.put('/api/words/' + word.id + '/audio')
      .set('Authorization', 'Bearer ' + auth.token)
      .attach('file', './test/audio.mp3')
      .expect(204);
  });

  it('/words/{wordId}/audio (PUT) and set hasAudio to true', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);

    await api.put('/api/words/' + word.id + '/audio')
      .set('Authorization', 'Bearer ' + auth.token)
      .attach('file', './test/audio.mp3')
      .expect(204);

    await api.get('/api/words/' + word.id)
      .expect(200)
      .then((res) => {
        expect(res.body.hasAudio).toBeTruthy();
      });
  });

  it('/words/{wordId}/audio (GET)', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);
    await utils.uploadAudio(auth.token, word.id);

    await api.get('/api/words/' + word.id + '/audio')
      .expect(200)
      .then((res) => {
        const originalFile = fs.readFileSync('./test/audio.mp3').toString();
        expect(res.text).toEqual(originalFile);
      });
  });

  it('/words/{wordId}/audio (DELETE)', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);
    await utils.uploadAudio(auth.token, word.id);

    await api.delete('/api/words/' + word.id + '/audio')
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(204);
  });

  it('/words/{wordId}/audio (DELETE) and set hasAudio to false', async () => {
    const user = await utils.createUser();
    const auth = await utils.login(user);
    const word = await utils.createWord(auth.token);
    await utils.uploadAudio(auth.token, word.id);

    await api.delete('/api/words/' + word.id + '/audio')
      .set('Authorization', 'Bearer ' + auth.token)
      .expect(204);

    await api.get('/api/words/' + word.id)
      .expect(200)
      .then((res) => {
        expect(res.body.hasAudio).toBeFalsy();
      });
  });
});
