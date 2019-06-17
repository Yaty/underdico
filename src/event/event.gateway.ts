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
    const playerAdded = await this.roomService.addPlayer(dto);

    if (playerAdded) {
      socket.join(dto.roomId);

      this.server.to(dto.roomId).emit('newPlayer', {
        id: dto.user._id,
        karma: dto.user.karma,
        username: dto.user.username,
      });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveRoom')
  async leaveRoom(socket: Socket, dto: LeaveRoomDto): Promise<void> {
    socket.leave(dto.roomId);

    this.server.to(dto.roomId).emit('playerRemoved', {
      id: dto.user._id,
    });

    await this.roomService.removePlayer(dto);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('startRoom')
  async startRoom(socket: Socket, dto: StartRoomDto): Promise<void> {
    const roomStarted = await this.roomService.startRoom(dto);

    if (roomStarted) {
      this.server.to(dto.roomId).emit('roomStarted');
      await wait(1000); // let some time for every players to prepare UI
      await this.roomService.startNextRound(dto.roomId);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('play')
  async play(socket: Socket, dto: PlayDto): Promise<void> {
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

  }

  // FIXME: Use events here to decouple from RoomService
  startNextRound(roomId: string, word: Word, nextPlayerId: string): void {
    this.server.to(roomId).emit('newRound', {
      definition: word.definition,
      nextPlayerId,
    });
  }

  stopRoom(roomId: string): void {
    this.server.to(roomId).emit('stop');
  }
}
