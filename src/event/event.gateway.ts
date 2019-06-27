import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JoinRoomDto } from './dto/join-room.dto';
import { LeaveRoomDto } from './dto/leave-room.dto';
import { forwardRef, Inject, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../shared/guards/ws.guard';
import { StartRoomDto } from './dto/start-room.dto';
import { RoomService } from '../room/room.service';
import { PlayDto } from './dto/play.dto';
import { Word } from '../word/models/word.model';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

@WebSocketGateway()
export class EventGateway {
  constructor(
    @Inject(forwardRef(() => RoomService)) private readonly roomService: RoomService,
  ) {}

  @WebSocketServer()
  private readonly server: Server;

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinRoom')
  async joinRoom(socket: Socket, dto: JoinRoomDto): Promise<void> {
    try {
      await this.roomService.addPlayer(dto);

      socket.join(dto.roomId);

      this.server.to(dto.roomId).emit('newPlayer', {
        id: dto.user._id,
        karma: dto.user.karma,
        username: dto.user.username,
      });
    } catch (err) {
      this.sendError(socket, 'joinRoom', err);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveRoom')
  async leaveRoom(socket: Socket, dto: LeaveRoomDto): Promise<void> {
    socket.leave(dto.roomId);

    this.server.to(dto.roomId).emit('playerRemoved', {
      id: dto.user._id,
    });

    try {
      await this.roomService.removePlayer(dto);
    } catch (err) {
      this.sendError(socket, 'leaveRoom', err);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('startRoom')
  async startRoom(socket: Socket, dto: StartRoomDto): Promise<void> {
    try {
      await this.roomService.startRoom(dto);
      this.server.to(dto.roomId).emit('roomStarted');
      await wait(1000); // let some time for every players to prepare UI
      await this.roomService.startNextRound(dto.roomId);
    } catch (err) {
      this.sendError(socket, 'startRoom', err);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('play')
  async play(socket: Socket, dto: PlayDto): Promise<void> {
    try {
      const isCorrectProposal = await this.roomService.checkProposal(dto, dto.user);

      if (isCorrectProposal) {
        this.server.to(dto.roomId).emit('goodProposal', {
          playerId: dto.user._id,
        });

        await this.roomService.startNextRound(dto.roomId);
      } else {
        this.server.to(dto.roomId).emit('wrongProposal', {
          playerId: dto.user._id,
          nextPlayerId: await this.roomService.getNextPlayerId(dto),
        });
      }
    } catch (err) {
      this.sendError(socket, 'play', err);
    }
  }

  // FIXME: Use events here to decouple from RoomService
  startNextRound(roomId: string, word: Word, nextPlayerId: string): void {
    this.server.to(roomId).emit('newRound', {
      definition: word.definition,
      nextPlayerId,
    });
  }

  sendError(socket: Socket, event: string, error: Error) {
    socket.emit('error', {
      ...error,
      event,
    });
  }

  stopRoom(roomId: string): void {
    this.server.to(roomId).emit('stop');
  }
}
