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
import { Word } from '../word/models/word.model';
import { EventGateway } from '../event/event.gateway';
import { WordService } from '../word/word.service';

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
      this.roomModel
        .aggregate()
        .match(match)
        .skip(skip)
        .limit(take)
        .exec(),
      this.roomModel.countDocuments(match),
    ]);

    return {
      rooms,
      count,
    };
  }

  createRoom(dto: CreateRoomDto, owner: User): Promise<Room> {
    return this.roomModel.create({
      ...dto,
      playersIds: [owner._id],
      ownerId: owner._id,
    });
  }

  async addPlayer(dto: JoinRoomDto): Promise<boolean> {
    const room = await this.roomModel.findByIdAndUpdate(dto.roomId, {
      $push: {
        playersIds: dto.user._id,
      },
      enteredAt: new Date(),
    }, {
      new: true,
    }).lean().exec();

    if (!room) {
      throw new WsException('Room not found');
    }

    return true;
  }

  async removePlayer(dto: LeaveRoomDto): Promise<boolean> {
    const room = await this.roomModel.findByIdAndUpdate(dto.roomId, {
      $pull: {
        playersIds: dto.user._id,
      },
      leavedAt: new Date(),
    }, {
      new: true,
    }).lean().exec();

    if (!room) {
      throw new WsException('Room not found');
    }

    return true;
  }

  async startRoom(dto: StartRoomDto): Promise<boolean> {
    const room = await this.roomModel.findByIdAndUpdate(dto.roomId, {
      status: RoomStatus.Started,
    }, {
      new: true,
    }).lean().exec();

    if (!room) {
      throw new WsException('Room not found');
    }

    return true;
  }

  async startNextRound(roomId: string): Promise<void> {
    const word = await this.wordService.getRandomWord();

    await this.roomModel.findByIdAndUpdate(roomId, {
      currentWord: word._id,
      currentPlayer: null,
      $push: {
        words: word._id,
      },
    }).lean().exec();

    await this.eventGateway.startNextRound(roomId, word);
  }

  async checkProposal(dto: PlayDto, player: User): Promise<boolean> {
    const room = await this.roomModel
      .findById(dto.roomId)
      .populate('currentWord')
      .lean()
      .exec();

    if (!room) {
      throw new WsException('Room not found');
    }

    if (BaseService.objectIdToString(room.currentPlayer) !== BaseService.objectIdToString(player._id)) {
      throw new WsException('This is not your turn to play');
    }

    const currentWord = (room.currentWord as Word).name.toLowerCase();
    const proposal = dto.proposal.toLowerCase();
    const wordFound = currentWord === proposal;

    if (wordFound) {
      await this.startNextRound(dto.roomId);
    }

    return wordFound;
  }

  async getNextPlayerId(dto: PlayDto): Promise<string> {
    const room = await this.roomModel
      .findById(dto.roomId)
      .lean()
      .exec();

    if (!room) {
      throw new WsException('Room not found');
    }

    const currentPlayerIndex = room.playersIds.findIndex(room.currentPlayer);
    return room.playersIds[currentPlayerIndex + 1 % room.playersIds.length];
  }
}
