import { RegisterDto } from '../src/user/dto/register.dto';
import * as uuid from 'uuid/v4';
import { TokenResponseDto } from '../src/user/dto/token-response.dto';
import { WordDto } from '../src/word/dto/word.dto';
import { CreateWordDto } from '../src/word/dto/create-word.dto';
import { VoteDto } from '../src/vote/dto/vote.dto';
import { CreateRoomDto } from '../src/room/dto/create-room.dto';
import { CredentialsDto } from '../src/user/dto/credentials.dto';
import { UserDto } from '../src/user/dto/user.dto';

export default class TestUtils {
  constructor(private readonly api) {}

  createUser(): Promise<CredentialsDto & UserDto> {
    return new Promise((resolve, reject) => {
      const user: RegisterDto = {
        username: uuid().substr(0, 10),
        password: uuid().substr(0, 10),
        email: `${uuid()}@${uuid()}.fr`,
      };

      return this.api.post('/api/users')
        .send(user)
        .expect(201)
        .then((res) => {
          resolve({
            ...res.body,
            ...user,
          });
        })
        .catch(reject);
    });
  }

  login(user: CredentialsDto): Promise<TokenResponseDto> {
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

  createWord(token: string, locale?: string): Promise<WordDto> {
    return new Promise((resolve, reject) => {
      const word: CreateWordDto = {
        name: uuid().substr(0, 6),
        definition: uuid(),
        tags: [uuid()],
        locale,
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

  getWords(locale?: string): Promise<WordDto[]> {
    return new Promise((resolve, reject) => {
      let url = '/api/words';

      if (locale) {
        url += '?where={"locale": "' + locale + '"}';
      }

      this.api.get(url)
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

  createRoom(token: string, data: Partial<CreateRoomDto> = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const room: CreateRoomDto = {
        name: uuid(),
        ...data,
      };

      this.api.post('/api/rooms')
        .set('Authorization', 'Bearer ' + token)
        .send(room)
        .expect(201)
        .then((res) => {
          resolve(res.body.id);
        })
        .catch(reject);
    });
  }
}
