import { OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JoinRoomDto } from './dto/join-room.dto';
import { LeaveRoomDto } from './dto/leave-room.dto';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../shared/guards/ws.guard';
import { StartRoomDto } from './dto/start-room.dto';
import { RoomService } from '../room/room.service';
import { PlayDto } from './dto/play.dto';
import { ExtractJWTFromWs } from '../shared/utilities/extract-jwt-ws.helper';
import { ExtractUserIdFromJWT } from '../shared/utilities/extract-user-id-from-jwt.helper';
import { UserService } from '../user/user.service';
import { Types } from 'mongoose';

@WebSocketGateway()
export class EventGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EventGateway.name);

  constructor(
    private readonly roomService: RoomService,
    private readonly userService: UserService,
  ) {
    this.listenToRoomService();
  }

  @WebSocketServer()
  private readonly server: Server;

  private listenToRoomService() {
    this.roomService.on('startNextRound', ({
     roomId,
     obfuscatedWord,
     obfuscatedDescription,
     currentPlayerId,
    }) => {
      this.startNextRound(roomId, obfuscatedWord, obfuscatedDescription, currentPlayerId);
    });

    this.roomService.on('timeout', ({
      roomId,
      playerId,
      nextPlayerId,
    }) => {
      this.timeout(roomId, playerId, nextPlayerId);
    });
  }

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
      this.sendError(socket, 'joinRoom', dto.roomId, err);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveRoom')
  async leaveRoom(socket: Socket, dto: LeaveRoomDto): Promise<void> {
    socket.leave(dto.roomId);

    this.server.to(dto.roomId).emit('playerRemoved', {
      id: dto.user._id,
    });

    setTimeout(() => {
      socket.disconnect(true);
    }, 1000);

    try {
      await this.roomService.removePlayer(dto);
    } catch (err) {
      this.sendError(socket, 'leaveRoom', dto.roomId, err);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('startRoom')
  async startRoom(socket: Socket, dto: StartRoomDto): Promise<void> {
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
    try {
      const [
        isCorrectProposal,
        playerScore,
        nextPlayerId,
      ] = await this.roomService.checkProposal(dto, dto.user);

      if (isCorrectProposal) {
        this.server.to(dto.roomId).emit('goodProposal', {
          playerId: dto.user._id,
          playerScore,
        });
      } else {
        this.server.to(dto.roomId).emit('wrongProposal', {
          playerId: dto.user._id,
          nextPlayerId,
          playerScore,
        });
      }
    } catch (err) {
      this.sendError(socket, 'play', dto.roomId, err);
    }
  }

  startNextRound(roomId: string, obfuscatedWord: Array<string|null>, obfuscatedDefinition: string, nextPlayerId: string): void {
    this.server.to(roomId).emit('newRound', {
      definition: obfuscatedDefinition,
      obfuscatedWord,
      nextPlayerId,
    });
  }

  timeout(roomId: string, playerId: string, nextPlayerId: string) {
    this.server.to(roomId).emit('timeout', {
      playerId,
      nextPlayerId,
    });
  }

  sendError(socket: Socket, event: string, roomId: string, error: Error) {
    this.logger.error('Error on room ' + roomId + ' by socket ' + socket.id, error.toString());

    socket.emit('gameError', {
      ...error,
      event,
      roomId,
    });
  }

  handleConnection(socket: Socket): any {
    socket.once('disconnecting', async (): Promise<void> => {
      try {
        const rooms = Object.values(socket.rooms).filter(Types.ObjectId.isValid);
        const token = ExtractJWTFromWs(socket);

        if (!token) {
          return;
        }

        const userId = ExtractUserIdFromJWT(token);
        const user = await this.userService.findById(userId);

        await Promise.all(rooms.map(async (room) => {
          await this.leaveRoom(socket, {
            roomId: room,
            user,
          });
        }));
      } catch (err) {
        this.logger.error('Error while disconnecting user with socket ' + socket.id, err.toString());
      }
    });
  }
}
