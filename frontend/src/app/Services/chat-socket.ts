import { Injectable } from '@angular/core';

import {
  io,
  Socket
} from 'socket.io-client';

import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root'
})
export class ChatSocket {

  private socket?: Socket;

  private connected = false;

  constructor(
    private authService: AuthService
  ) {}

  // =========================================================
  // CONNECT
  // =========================================================

  connect(): void {

    if (
      this.socket?.connected ||
      this.connected
    ) {
      return;
    }

    const user =
      this.authService.getUser();

    const token =
      this.getToken();

    if (!token) {
      console.error(
        'Chat socket: authentication token not found'
      );

      return;
    }

    this.socket = io(
      'http://localhost:3000',
      {
        auth: {
          token
        },

        transports: [
          'websocket'
        ],

        autoConnect: true
      }
    );

    this.socket.on(
      'connect',
      () => {
        this.connected = true;

        console.log(
          'Chat socket connected:',
          this.socket?.id
        );
      }
    );

    this.socket.on(
      'disconnect',
      () => {
        this.connected = false;

        console.log(
          'Chat socket disconnected'
        );
      }
    );

    this.socket.on(
      'connect_error',
      (error) => {
        this.connected = false;

        console.error(
          'Chat socket connection error:',
          error.message
        );
      }
    );
  }

  // =========================================================
  // TOKEN
  // =========================================================

  private getToken(): string | null {

    const authService =
      this.authService as any;

    if (
      typeof authService.getToken ===
      'function'
    ) {
      return authService.getToken();
    }

    const token =
      localStorage.getItem(
        'token'
      );

    if (token) {
      return token;
    }

    return localStorage.getItem(
      'accessToken'
    );
  }

  // =========================================================
  // DISCONNECT
  // =========================================================

  disconnect(): void {

    if (!this.socket) {
      return;
    }

    this.socket.disconnect();

    this.socket = undefined;

    this.connected = false;
  }

  // =========================================================
  // JOIN
  // =========================================================

  joinConversation(
    conversationId: string
  ): void {

    this.socket?.emit(
      'conversation:join',
      conversationId
    );
  }

  // =========================================================
  // LEAVE
  // =========================================================

  leaveConversation(
    conversationId: string
  ): void {

    this.socket?.emit(
      'conversation:leave',
      conversationId
    );
  }

  // =========================================================
  // SEND
  // =========================================================

  sendMessage(
    conversationId: string,
    message: string
  ): void {

    this.socket?.emit(
      'message:send',
      {
        conversationId,
        message
      }
    );
  }

  // =========================================================
  // READ
  // =========================================================

  markAsRead(
    conversationId: string
  ): void {

    this.socket?.emit(
      'conversation:read',
      conversationId
    );
  }

  // =========================================================
  // DELETE MESSAGE FOR ME
  // =========================================================

  deleteMessageForMe(
    messageId: string
  ): void {

    this.socket?.emit(
      'message:delete:me',
      {
        messageId
      }
    );
  }

  // =========================================================
  // DELETE MESSAGE FOR EVERYONE
  // =========================================================

  deleteMessageForEveryone(
    messageId: string
  ): void {

    this.socket?.emit(
      'message:delete:everyone',
      {
        messageId
      }
    );
  }

  // =========================================================
  // DELETE CONVERSATION FOR ME
  // =========================================================

  deleteConversationForMe(
    conversationId: string
  ): void {

    this.socket?.emit(
      'conversation:delete:me',
      conversationId
    );
  }

  // =========================================================
  // EVENT LISTENER
  // =========================================================

  on(
    event: string,
    callback: (
      data: any
    ) => void
  ): void {

    this.socket?.on(
      event,
      callback
    );
  }

  // =========================================================
  // REMOVE LISTENER
  // =========================================================

  off(
    event: string,
    callback?: (
      ...args: any[]
    ) => void
  ): void {

    if (!this.socket) {
      return;
    }

    if (callback) {
      this.socket.off(
        event,
        callback
      );

      return;
    }

    this.socket.off(event);
  }
}