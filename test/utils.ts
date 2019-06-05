import { RegisterDto } from '../src/user/dto/register.dto';
import * as uuid from 'uuid/v4';
import { TokenResponseDto } from '../src/user/dto/token-response.dto';
import { WordDto } from '../src/word/dto/word.dto';
import { CreateWordDto } from '../src/word/dto/create-word.dto';
import { VoteDto } from '../src/vote/dto/vote.dto';

export default class TestUtils {
  constructor(private readonly api) {}

  createUser(): Promise<RegisterDto> {
    return new Promise((resolve, reject) => {
      const user: RegisterDto = {
        username: uuid().substr(0, 10),
        password: uuid().substr(0, 10),
        email: `${uuid()}@${uuid()}.fr`,
      };

      return this.api.post('/api/users')
        .send(user)
        .expect(201)
        .then(() => {
          resolve(user);
        })
        .catch(reject);
    });
  }

  login(user: RegisterDto): Promise<TokenResponseDto> {
    return new Promise((resolve, reject) => {
      this.api.post('/api/users/token')
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

  createWord(token: string): Promise<WordDto> {
    return new Promise((resolve, reject) => {
      const word: CreateWordDto = {
        name: uuid().substr(0, 6),
        definition: uuid(),
        tags: [uuid()],
      };

      this.api.post('/api/words')
        .set('Authorization', 'Bearer ' + token)
        .send(word)
        .expect(201)
        .then((res) => {
          resolve(res.body);
        })
        .catch(reject);
    });
  }

  voteForAWord(token: string, wordId: string, voteValue: boolean): Promise<VoteDto> {
    return new Promise((resolve, reject) => {
      this.api.post('/api/words/' + wordId + '/votes')
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

  uploadAvatar(token: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.api.put('/api/users/' + userId + '/avatar')
        .set('Authorization', 'Bearer ' + token)
        .attach('file', './test/avatar.png')
        .expect(204)
        .then(() => resolve())
        .catch(reject);
    });
  }

  getWords(): Promise<WordDto[]> {
    return new Promise((resolve, reject) => {
      this.api.get('/api/words')
        .expect(200)
        .then((res) => {
          resolve(res.body);
        })
        .catch(reject);
    });
  }

  uploadAudio(token: string, wordId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.api.put('/api/words/' + wordId + '/audio')
        .set('Authorization', 'Bearer ' + token)
        .attach('file', './test/audio.mp3')
        .expect(204)
        .then(() => resolve(wordId))
        .catch(reject);
    });
  }
}
