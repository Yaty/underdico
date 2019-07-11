// tslint:disable:no-console

import { forwardRef, Inject, Injectable } from '@nestjs/common';
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
import { WsException } from '@nestjs/websockets';
import { EventGateway } from '../event/event.gateway';
import { WordService } from '../word/word.service';
import { Types } from 'mongoose';

@Injectable()
export class RoomService extends BaseService<Room, RoomDto> {
  constructor(
    @InjectModel(Room.modelName) private readonly roomModel: ModelType<Room>,
    mapper: RoomMapper,
    @Inject(forwardRef(() => EventGateway)) private readonly eventGateway: EventGateway,
    private readonly wordService: WordService,
  ) {
    super(roomModel, mapper);
  }

  async getRooms(skip: number, take: number): Promise<{
    rooms: Room[],
    count: number,
  }> {
    const match = {
      isPrivate: false,
      status: RoomStatus.Created,
    };

    const [rooms, count] = await Promise.all([
      this.roomModel.aggregate([{
        $match: match,
      }, {
        $sort: {
          createdAt: -1,
        },
      }, {
        $skip: skip,
      }, {
        $limit: take,
      }, {
        $lookup: {
          from: 'users',
          localField: 'playersIds',
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
      }]).exec(),
      this.roomModel.countDocuments(match).exec(),
    ]);

    return  {
      rooms,
      count,
    };
  }

  async createRoom(dto: CreateRoomDto, owner: User): Promise<Room> {
    const createdRoom = await this.roomModel.create({
      ...dto,
      playersIds: [owner._id],
      ownerId: owner._id,
    });

    return {
      ...createdRoom.toJSON(),
      usernames: [owner.username],
    };
  }

  async addPlayer(dto: JoinRoomDto): Promise<void> {
    const room = await this.roomModel.findByIdAndUpdate(dto.roomId, {
      $addToSet: {
        playersIds: dto.user._id,
      },
    }, {
      new: true,
    }).lean().exec();

    if (!room) {
      throw new WsException('Room not found');
    }
  }

  async removePlayer(dto: LeaveRoomDto): Promise<void> {
    const room = await this.roomModel.findByIdAndUpdate(dto.roomId, {
      $pull: {
        playersIds: dto.user._id,
      },
    }, {
      new: true,
    }).lean().exec();

    if (!room) {
      throw new WsException('Room not found');
    }
  }

  async startRoom(dto: StartRoomDto): Promise<void> {
    const room = await this.roomModel.findByIdAndUpdate(dto.roomId, {
      status: RoomStatus.Started,
    }, {
      new: true,
    }).lean().exec();

    if (!room) {
      throw new WsException('Room not found');
    }

    setTimeout(async () => {
      try {
        await this.startNextRound(dto.roomId);
      } catch (err) {
        console.error(err, 'Error while launching first round');
      }
    }, 100);
  }

  async startNextRound(roomId: string): Promise<void> {
    const room = await this.findById(roomId);

    if (!room) {
      throw new WsException('Room not found');
    }

    const word = await this.wordService.getRandomWord(room.locale);

    if (!word) {
      throw new WsException('No word');
    }

    const currentPlayerId = RoomService.toObjectId(
      room.playersIds[Math.floor(Math.random() * room.playersIds.length)].toString(),
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
        'i',
      ),
      'X',
    );

    await this.eventGateway.startNextRound(
      roomId,
      obfuscatedWord,
      obfuscatedDescription,
      currentPlayerId.toString(),
    );

    await this.handleTimeout(
      roomId,
      newRoundId,
      currentPlayerId,
    );
  }

  async checkProposal(dto: PlayDto, player: User): Promise<[boolean, string?]> {
    const room = await this.roomModel
      .findById(dto.roomId)
      .lean()
      .exec();

    if (!room) {
      throw new WsException('Room not found');
    }

    const round = room.rounds[room.rounds.length - 1];

    if (round.currentPlayerId.toString() !== player._id.toString()) {
      throw new WsException('This is not your turn to play');
    }

    const currentWord = await this.wordService.findWordById(round.wordId);
    const currentWordName = currentWord.name.toLowerCase();
    const proposal = dto.proposal.toLowerCase();
    const proposalResultIsCorrect = currentWordName === proposal;

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

      setTimeout(async () => {
        try {
          await this.startNextRound(dto.roomId);
        } catch (err) {
          console.error(err, 'Error while starting next round after good proposal.');
        }
      }, 100);

      return [true];
    }

    return [
      false,
      await this.getNextPlayerId(dto.roomId),
    ];
  }

  async getNextPlayerId(roomId: string): Promise<string> {
    const room = await this.findById(roomId);

    if (!room) {
      throw new WsException('Room not found');
    }

    const currentPlayerIndex = room.playersIds.findIndex(
      (playerId) => playerId.toString() === room.rounds[room.rounds.length - 1].currentPlayerId.toString(),
    );

    const nextPlayerId = room.playersIds[(currentPlayerIndex + 1) % room.playersIds.length];
    const key: string = `rounds.${room.rounds.length - 1}.currentPlayerId`;

    await this.roomModel.updateOne({
      _id: roomId,
    }, {
      [key]: nextPlayerId,
    }).exec();

    return nextPlayerId.toString();
  }

  async handleTimeout(roomId: string, roundId: Types.ObjectId, playerId: Types.ObjectId): Promise<void> {
    let room = await this.roomModel.findById(roomId).lean().exec();

    setTimeout(async () => {
      try {
        room = await this.roomModel.findById(roomId).lean().exec();
        const round = room.rounds.find((r) => r._id.toString() === roundId.toString());

        if (round.currentPlayerId.toString() === playerId.toString() && !round.terminatedAt) {
          const nextPlayerId = await this.getNextPlayerId(roomId);

          this.eventGateway.timeout(
            roomId,
            playerId.toString(),
            nextPlayerId,
          );

          await this.handleTimeout(roomId, roundId, RoomService.toObjectId(nextPlayerId));
        }
      } catch (err) {
        console.error(err, 'Error while handling round timeout');
      }
    }, room.timeout * 1000);
  }
}
