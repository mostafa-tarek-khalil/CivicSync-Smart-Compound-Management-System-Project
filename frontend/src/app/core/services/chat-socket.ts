import { Injectable } from '@angular/core';

import {
  io,
  Socket
} from 'socket.io-client';

import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

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

    const token =
      this.getToken();

    if (!token) {
      console.error(
        'Chat socket: authentication token not found'
      );

      return;
    }

    this.socket = io(
      environment.apiBaseUrl,
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

    this.attachLifecycleHandlers('Chat');
  }

  /**
   * Connect as a VISITOR using the token the backend issued for a visit.
   * Visitors have no account, so they authenticate with
   * { visitId, visitorChatToken } instead of a JWT.
   */
  connectAsVisitor(visitId: string, visitorChatToken: string): void {
    if (!visitId || !visitorChatToken) {
      console.error('Visitor chat socket: visitId and token are required');
      return;
    }

    // Always start a clean visitor socket; the previous one (if any) was
    // authenticated as a different identity.
    this.disconnect();

    this.socket = io(environment.apiBaseUrl, {
      auth: {
        visitId,
        visitorChatToken
      },
      transports: ['websocket'],
      autoConnect: true
    });

    this.attachLifecycleHandlers('Visitor chat');
  }

  private attachLifecycleHandlers(label: string): void {
    this.socket?.on('connect', () => {
      this.connected = true;
      console.log(`${label} socket connected:`, this.socket?.id);
    });

    this.socket?.on('disconnect', () => {
      this.connected = false;
      console.log(`${label} socket disconnected`);
    });

    this.socket?.on('connect_error', (error) => {
      this.connected = false;
      console.error(`${label} socket connection error:`, error.message);
    });
  }

  // =========================================================
  // TOKEN
  // =========================================================

  private getToken(): string | null {
    // AuthService owns credential access; the socket must not re-read
    // localStorage (that is how the token key drifted before).
    return this.authService.getToken();
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