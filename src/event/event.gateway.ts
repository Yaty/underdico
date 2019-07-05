// tslint:disable:no-console

import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Client, Server, Socket } from 'socket.io';
import { JoinRoomDto } from './dto/join-room.dto';
import { LeaveRoomDto } from './dto/leave-room.dto';
import { forwardRef, Inject, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../shared/guards/ws.guard';
import { StartRoomDto } from './dto/start-room.dto';
import { RoomService } from '../room/room.service';
import { PlayDto } from './dto/play.dto';

@WebSocketGateway()
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @Inject(forwardRef(() => RoomService)) private readonly roomService: RoomService,
  ) {}

  @WebSocketServer()
  private readonly server: Server;

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinRoom')
  async joinRoom(socket: Socket, dto: JoinRoomDto): Promise<void> {
    console.log('joinRoom', socket.id, dto.roomId);

    try {
      await this.roomService.addPlayer(dto);

      socket.join(dto.roomId);

      this.server.to(dto.roomId).emit('newPlayer', {
        id: dto.user._id,
        karma: dto.user.karma,
        username: dto.user.username,
      });
    } catch (err) {
      this.sendError(socket, 'joinRoom', dto.roomId, err);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveRoom')
  async leaveRoom(socket: Socket, dto: LeaveRoomDto): Promise<void> {
    console.log('leaveRoom', socket.id, dto.roomId);

    socket.leave(dto.roomId);

    this.server.to(dto.roomId).emit('playerRemoved', {
      id: dto.user._id,
    });

    try {
      await this.roomService.removePlayer(dto);
    } catch (err) {
      this.sendError(socket, 'leaveRoom', dto.roomId, err);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('startRoom')
  async startRoom(socket: Socket, dto: StartRoomDto): Promise<void> {
    console.log('startRoom', socket.id, dto.roomId);

    try {
      await this.roomService.startRoom(dto);
      this.server.to(dto.roomId).emit('roomStarted');
    } catch (err) {
      this.sendError(socket, 'startRoom', dto.roomId, err);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('play')
  async play(socket: Socket, dto: PlayDto): Promise<void> {
    console.log('play', socket.id, dto.roomId, dto.proposal);

    try {
      const [
        isCorrectProposal,
        nextPlayerId,
      ] = await this.roomService.checkProposal(dto, dto.user);

      if (isCorrectProposal) {
        this.server.to(dto.roomId).emit('goodProposal', {
          playerId: dto.user._id,
        });
      } else {
        this.server.to(dto.roomId).emit('wrongProposal', {
          playerId: dto.user._id,
          nextPlayerId,
        });
      }
    } catch (err) {
      this.sendError(socket, 'play', dto.roomId, err);
    }
  }

  // FIXME: Use events here to decouple from RoomService
  startNextRound(roomId: string, obfuscatedWord: Array<string|null>, obfuscatedDefinition: string, nextPlayerId: string): void {
    console.log('new round', roomId, obfuscatedWord, obfuscatedDefinition, nextPlayerId);

    this.server.to(roomId).emit('newRound', {
      definition: obfuscatedDefinition,
      obfuscatedWord,
      nextPlayerId,
    });
  }

  timeout(roomId: string, playerId: string, nextPlayerId: string) {
    console.log('timeout', roomId, playerId, nextPlayerId);

    this.server.to(roomId).emit('timeout', {
      playerId,
      nextPlayerId,
    });
  }

  sendError(socket: Socket, event: string, roomId: string, error: Error) {
    socket.emit('gameError', {
      ...error,
      event,
      roomId,
    });
  }

  stopRoom(roomId: string): void {
    this.server.to(roomId).emit('stop');
  }

  handleConnection(client: Client): any {
    console.log('New websocket client', client.id);
  }

  handleDisconnect(client: Client): any {
    console.log('Websocket client disconnected', client.id);
  }
}
