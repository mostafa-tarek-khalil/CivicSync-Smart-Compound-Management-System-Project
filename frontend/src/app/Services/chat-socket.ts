import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root'
})
export class ChatSocket {
  private socket: Socket | null = null;

  constructor(
    private authService: AuthService
  ) {}

  connect(): void {
    const token = this.authService.getToken();

    if (!token) {
      console.error(
        'No authentication token found.'
      );
      return;
    }

    if (this.socket) {
      return;
    }

    this.socket = io(
      'http://localhost:3000',
      {
        auth: {
          token
        }
      }
    );

    this.socket.on('connect', () => {
      console.log(
        'Chat Socket connected:',
        this.socket?.id
      );
    });

    this.socket.on(
      'connect_error',
      (error) => {
        console.error(
          'Chat Socket connection error:',
          error.message
        );
      }
    );

    this.socket.on(
      'disconnect',
      (reason) => {
        console.log(
          'Chat Socket disconnected:',
          reason
        );
      }
    );
  }

  joinConversation(
    conversationId: string
  ): void {
    if (!this.socket) {
      console.error(
        'Socket is not initialized.'
      );
      return;
    }

    const join = () => {
      this.socket?.emit(
        'conversation:join',
        conversationId
      );
    };

    if (this.socket.connected) {
      join();
      return;
    }

    this.socket.once(
      'connect',
      join
    );
  }

  sendMessage(
    conversationId: string,
    message: string
  ): void {
    if (
      !this.socket ||
      !this.socket.connected
    ) {
      console.error(
        'Socket is not connected.'
      );
      return;
    }

    this.socket.emit(
      'message:send',
      {
        conversationId,
        message
      }
    );
  }

  onConversationJoined(
    callback: (data: any) => void
  ): void {
    this.socket?.on(
      'conversation:joined',
      callback
    );
  }

  onNewMessage(
    callback: (data: any) => void
  ): void {
    this.socket?.on(
      'message:new',
      callback
    );
  }

  onChatError(
    callback: (error: any) => void
  ): void {
    this.socket?.on(
      'chat:error',
      callback
    );
  }

  markAsRead(
    conversationId: string
  ): void {
    if (
      !this.socket ||
      !this.socket.connected
    ) {
      console.error(
        'Socket is not connected.'
      );
      return;
    }

    this.socket.emit(
      'conversation:read',
      conversationId
    );
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}