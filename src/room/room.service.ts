import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ModelType } from 'typegoose';
import { BaseService } from '../shared/base.service';
import { Room } from './models/room.model';
import { RoomDto } from './dto/room.dto';
import { RoomMapper } from '../shared/mappers/room.mapper';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomStatus } from './models/room-status.enum';
import { User } from '../user/models/user.model';
import { JoinRoomDto } from '../event/dto/join-room.dto';
import { LeaveRoomDto } from '../event/dto/leave-room.dto';
import { StartRoomDto } from '../event/dto/start-room.dto';
import { PlayDto } from '../event/dto/play.dto';
import { WordService } from '../word/word.service';
import { Types } from 'mongoose';
import { Sort } from '../shared/decorators/sort.decorator';
import * as randomatic from 'randomatic';

@Injectable()
export class RoomService extends BaseService<Room, RoomDto> {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    @InjectModel(Room.modelName) private readonly roomModel: ModelType<Room>,
    mapper: RoomMapper,
    private readonly wordService: WordService,
  ) {
    super(roomModel, mapper);
  }

  async findRoomById(roomId: string): Promise<Room> {
    const {
      rooms,
    } = await this.getRooms(0, 1, {
      _id: RoomService.toObjectId(roomId),
    });

    const room = rooms[0];

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async findRoomByCode(code: string): Promise<Room> {
    const {
      rooms,
    } = await this.getRooms(0, 1, {
      code: code.trim().toLowerCase(),
      isPrivate: true,
    });

    const room = rooms[0];

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async getRooms(skip: number, take: number, where = {}, sort?: Sort): Promise<{
    rooms: Room[],
    count: number,
  }> {
    const pipeline: object[] = [{
      $match: where,
    }];

    if (sort) {
      pipeline.push({
        $sort: {
          [sort.field]: sort.ordering === 'asc' ? 1 : -1,
        },
      });
    } else {
      pipeline.push({
        $sort: {
          createdAt: -1,
        },
      });
    }

    if (typeof skip === 'number' && skip > 0) {
      pipeline.push({
        $skip: skip,
      });
    }

    if (typeof take === 'number' && take > 0 && take !== Infinity) {
      pipeline.push({
        $limit: take,
      });
    }

    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'connectedPlayersIds',
        foreignField: '_id',
        as: 'users',
      },
    }, {
      $addFields: {
        usernames: {
          $map: {
            input: '$users',
            as: 'user',
            in: '$$user.username',
          },
        },
      },
    });

    const [rooms, count] = await Promise.all([
      this.roomModel.aggregate(pipeline).exec(),
      this.roomModel.countDocuments(where).exec(),
    ]);

    return  {
      rooms,
      count,
    };
  }

  async createRoom(dto: CreateRoomDto, owner: User): Promise<Room> {
    const payload: Partial<Room> = {
      ...dto,
      // @ts-ignore
      playersIds: [owner._id],
      // @ts-ignore
      ownerId: owner._id,
    };

    if (payload.isPrivate) {
      payload.code = randomatic('a0', 5);
    }

    const createdRoom = await this.roomModel.create(payload);
    return this.findRoomById(createdRoom._id);
  }

  async getRoomStatus(roomId: string): Promise<RoomStatus> {
    const room = await this.findRoomById(roomId);
    return room.status;
  }

  async addPlayer(dto: JoinRoomDto): Promise<void> {
    const roomStatus = await this.getRoomStatus(dto.roomId);

    if (roomStatus === RoomStatus.Terminated) {
      throw new BadRequestException('Room needs to be in started or created state');
    }

    const room = await this.roomModel.findById(dto.roomId).lean().exec();

    if (room.connectedPlayersIds.find((playerId) => playerId.toString() === dto.user._id.toString())) {
      return;
    }

    if (room.isPrivate && (typeof dto.code !== 'string' || dto.code.trim().toLowerCase() !== room.code)) {
      throw new UnauthorizedException('This room is private, wrong code');
    }

    if (room.connectedPlayersIds.length >= room.maxPlayers) {
      throw new ForbiddenException('Max player reached');
    }

    await this.roomModel.updateOne({
      _id: dto.roomId,
    }, {
      $addToSet: {
        playersIds: dto.user._id,
        connectedPlayersIds: dto.user._id,
      },
    }).exec();
  }

  async removePlayer(dto: LeaveRoomDto): Promise<void> {
    const roomStatus = await this.getRoomStatus(dto.roomId);

    if (roomStatus === RoomStatus.Terminated) {
      throw new BadRequestException('Room needs to be in started or created state');
    }

    const room = await this.roomModel.findByIdAndUpdate(dto.roomId, {
      $pull: {
        connectedPlayersIds: dto.user._id,
      },
    }, {
      new: true,
    }).lean().exec();

    if (room.connectedPlayersIds.length === 0) {
      await this.stop(dto.roomId);
    }
  }

  async addTimeout(timeout: () => void, ms: number, roomId: string): Promise<void> {
    setTimeout(timeout, ms);
  }

  async startRoom(dto: StartRoomDto): Promise<void> {
    const room = await this.findRoomById(dto.roomId);

    if (room.status !== RoomStatus.Created) {
      throw new BadRequestException('Room needs to be in created state');
    }

    if (dto.user._id.toString() !== room.ownerId.toString()) {
      throw new ForbiddenException('You are not the owner');
    }

    await this.roomModel.updateOne({
      _id: dto.roomId,
    }, {
      status: RoomStatus.Started,
    }).exec();

    await this.addTimeout(async () => {
      try {
        await this.startNextRound(dto.roomId);
      } catch (err) {
        this.logger.error('Error while launching first round', err.toString());
      }
    }, 100, dto.roomId);
  }

  async startNextRound(roomId: string): Promise<void> {
    const roomStatus = await this.getRoomStatus(roomId);

    if (roomStatus !== RoomStatus.Started) {
      throw new BadRequestException('Room needs to be in started state');
    }

    const room = await this.findRoomById(roomId);
    const word = await this.wordService.getRandomWord(room.locale);

    if (!word) {
      throw new NotFoundException('No word');
    }

    const currentPlayerId = RoomService.toObjectId(
      room.connectedPlayersIds[Math.floor(Math.random() * room.connectedPlayersIds.length)].toString(),
    );

    const updatedRoom: Room = await this.roomModel.findOneAndUpdate({
      _id: roomId,
    }, {
      $push: {
        rounds: {
          wordId: word._id,
          currentPlayerId,
          createdAt: new Date(),
        },
      },
    }, {
      new: true,
    }).exec();

    const newRoundId = updatedRoom.rounds[updatedRoom.rounds.length - 1]._id;
    const SEPARATORS = [' ', '-', '\''];
    const obfuscatedWord: Array<string|null> = [];

    for (const char of word.name) {
      if (SEPARATORS.includes(char)) {
        obfuscatedWord.push(char);
      } else {
        obfuscatedWord.push(null);
      }
    }

    const obfuscatedDescription = word.definition.replace(
      new RegExp(
        word.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'ig',
      ),
      '[X]',
    );

    this.emit('startNextRound', {
      roomId,
      obfuscatedWord,
      obfuscatedDescription,
      currentPlayerId: currentPlayerId.toString(),
    });

    await this.handleTimeout(
      roomId,
      newRoundId,
      currentPlayerId,
    );
  }

  async checkProposal(dto: PlayDto, player: User): Promise<[boolean, number, string?]> {
    const roomStatus = await this.getRoomStatus(dto.roomId);

    if (roomStatus !== RoomStatus.Started) {
      throw new BadRequestException('Room needs to be in started state');
    }

    const room = await this.findRoomById(dto.roomId);
    const round = room.rounds[room.rounds.length - 1];

    if (round.currentPlayerId.toString() !== player._id.toString()) {
      throw new ForbiddenException('This is not your turn to play');
    }

    const currentWord = await this.wordService.findWordById(round.wordId.toString());
    const currentWordName = currentWord.name.toLowerCase();
    const proposal = dto.proposal.toLowerCase();
    const proposalResultIsCorrect = currentWordName === proposal;

    const playerScore = room.rounds.reduce((score, r) => {
      if (r.winnerId && r.winnerId.toString() === player._id.toString()) {
        return score + 1;
      }

      return score;
    }, 0);

    if (proposalResultIsCorrect) {
      await this.roomModel.updateOne({
        '_id': dto.roomId,
        'rounds._id': round._id,
      }, {
        $set: {
          'rounds.$.winnerId': player._id,
          'rounds.$.terminatedAt': new Date(),
          'rounds.$.currentPlayerId': null,
        },
      }).exec();

      await this.addTimeout(async () => {
        try {
          await this.startNextRound(dto.roomId);
        } catch (err) {
          this.logger.error('Error while starting next round after good proposal.', err.toString());
        }
      }, 100, dto.roomId);

      return [
        true,
        playerScore + 1,
      ];
    }

    return [
      false,
      playerScore,
      await this.getNextPlayerId(dto.roomId),
    ];
  }

  async getNextPlayerId(roomId: string): Promise<string> {
    const roomStatus = await this.getRoomStatus(roomId);

    if (roomStatus !== RoomStatus.Started) {
      throw new BadRequestException('Room needs to be in started state');
    }

    const room = await this.findRoomById(roomId);

    const currentPlayerIndex = room.connectedPlayersIds.findIndex(
      (playerId) => playerId.toString() === room.rounds[room.rounds.length - 1].currentPlayerId.toString(),
    );

    const nextPlayerId = room.connectedPlayersIds[(currentPlayerIndex + 1) % room.connectedPlayersIds.length];
    const key: string = `rounds.${room.rounds.length - 1}.currentPlayerId`;

    await this.roomModel.updateOne({
      _id: roomId,
    }, {
      [key]: nextPlayerId,
    }).exec();

    return nextPlayerId.toString();
  }

  async handleTimeout(roomId: string, roundId: Types.ObjectId, playerId: Types.ObjectId): Promise<void> {
    let room = await this.findRoomById(roomId);

    await this.addTimeout(async () => {
      try {
        room = await this.findRoomById(roomId);

        if (room.status === RoomStatus.Terminated) {
          return;
        }

        const round = room.rounds.find((r) => r._id.toString() === roundId.toString());

        if (round.currentPlayerId && round.currentPlayerId.toString() === playerId.toString() && !round.terminatedAt) {
          const nextPlayerId = await this.getNextPlayerId(roomId);

          this.emit('timeout', {
            roomId,
            playerId: playerId.toString(),
            nextPlayerId,
          });

          if (room.connectedPlayersIds.length > 1) {
            await this.handleTimeout(roomId, roundId, RoomService.toObjectId(nextPlayerId));
          }
        }
      } catch (err) {
        this.logger.error('Error while handling round timeout', err.toString());
      }
    }, room.timeout * 1000, roomId);
  }

  async stop(roomId: string): Promise<void> {
    const roomStatus = await this.getRoomStatus(roomId);

    if (roomStatus === RoomStatus.Terminated) {
      throw new BadRequestException('Room is already terminated');
    }

    await this.roomModel.updateOne({
      _id: roomId,
    }, {
      status: RoomStatus.Terminated,
    }).exec();
  }

  async findUserRooms(userId: string, status?: RoomStatus): Promise<Room[]> {
    const where = {
      playersIds: RoomService.toObjectId(userId),
    };

    if (status) {
      // @ts-ignore
      where.status = status;
    }

    const {rooms} = await this.getRooms(0, Infinity, where);
    return rooms;
  }

  async getUserScore(userId: string): Promise<number> {
    const userRooms = await this.findUserRooms(userId);

    return userRooms.reduce((totalScore, room) =>
      totalScore +
      room.rounds.reduce((roundScore, round) =>
          round.winnerId && round.winnerId.toString() === userId
            ? roundScore + 1
            : roundScore,
          0,
    ), 0);
  }
}
