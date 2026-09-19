import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ChatService } from '../../Services/chat-service';
import { ChatSocket } from '../../Services/chat-socket';
import { AuthService } from '../../Services/auth-service';

interface Conversation {
  _id: string;
  type: string;
  groupType?: string | null;
  buildingId?: string | null;
  participants?: any[];
  relatedVisitId?: string | null;
  lastMessage?: any;
  lastMessageAt?: string | null;
}

interface Message {
  _id: string;
  conversationId: string;
  senderType: 'USER' | 'VISITOR';
  senderId: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-chat-test',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './chat-test.html',
  styleUrl: './chat-test.css'
})
export class ChatTest
  implements OnInit, OnDestroy {

  conversations: Conversation[] = [];

  messages: Message[] = [];

  selectedConversation:
    Conversation | null = null;

  newMessage = '';

  loadingConversations = false;

  loadingMessages = false;

  sendingMessage = false;

  errorMessage = '';

  currentUserId: string | null = null;

  constructor(
    private chatService: ChatService,
    private chatSocket: ChatSocket,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user =
      this.authService.getUser();

    if (user) {
      this.currentUserId =
        user.id;
    }

    this.setupSocket();

    this.loadConversations();
  }

  setupSocket(): void {
    this.chatSocket.connect();

    this.chatSocket.onConversationJoined(
      (data) => {
        console.log(
          'Conversation joined:',
          data
        );

        this.cdr.detectChanges();
      }
    );

    this.chatSocket.onNewMessage(
      (data) => {
        console.log(
          'New socket message:',
          data
        );

        if (
          data?.message &&
          this.selectedConversation &&
          data.message.conversationId ===
            this.selectedConversation._id
        ) {
          const exists =
            this.messages.some(
              (message) =>
                message._id ===
                data.message._id
            );

          if (!exists) {
            this.messages.push(
              data.message
            );

            this.cdr.detectChanges();
          }
        }
      }
    );

    this.chatSocket.onChatError(
      (error) => {
        console.error(
          'Chat error:',
          error
        );

        this.errorMessage =
          error?.message ||
          'Chat error occurred.';

        this.cdr.detectChanges();
      }
    );
  }

  loadConversations(): void {
    this.loadingConversations = true;

    this.errorMessage = '';

    this.chatService
      .getMyConversations()
      .subscribe({
        next: (response) => {
          console.log(
            'Conversations response:',
            response
          );

          this.conversations =
            response?.conversations || [];

          console.log(
            'Conversations loaded into component:',
            this.conversations
          );

          this.loadingConversations =
            false;

          /*
           * Force Angular to update
           * the UI after the HTTP response.
           */
          this.cdr.detectChanges();

          if (
            this.conversations.length > 0
          ) {
            this.selectConversation(
              this.conversations[0]
            );
          }
        },

        error: (error) => {
          console.error(
            'Failed to load conversations:',
            error
          );

          this.errorMessage =
            error?.error?.message ||
            'Failed to load conversations.';

          this.loadingConversations =
            false;

          this.cdr.detectChanges();
        }
      });
  }

  selectConversation(
    conversation: Conversation
  ): void {
    this.selectedConversation =
      conversation;

    this.messages = [];

    this.loadingMessages = true;

    this.cdr.detectChanges();

    this.loadMessages(
      conversation._id
    );

    this.chatSocket.joinConversation(
      conversation._id
    );
  }

  loadMessages(
    conversationId: string
  ): void {
    this.loadingMessages = true;

    this.errorMessage = '';

    this.chatService
      .getConversationMessages(
        conversationId
      )
      .subscribe({
        next: (response) => {
          console.log(
            'Messages response:',
            response
          );

          /*
           * Backend response:
           *
           * {
           *   success: true,
           *   messages: [...]
           * }
           */

          this.messages =
            response?.messages || [];

          this.loadingMessages =
            false;

          console.log(
            'Messages loaded into component:',
            this.messages
          );

          /*
           * This is the important fix.
           */
          this.cdr.detectChanges();

          this.chatService
            .markMessagesAsRead(
              conversationId
            )
            .subscribe({
              next: () => {
                console.log(
                  'Messages marked as read.'
                );

                this.cdr.detectChanges();
              },

              error: (error) => {
                console.error(
                  'Failed to mark messages as read:',
                  error
                );
              }
            });

          this.chatSocket.markAsRead(
            conversationId
          );
        },

        error: (error) => {
          console.error(
            'Failed to load messages:',
            error
          );

          this.errorMessage =
            error?.error?.message ||
            'Failed to load messages.';

          this.loadingMessages =
            false;

          this.cdr.detectChanges();
        }
      });
  }

  sendMessage(): void {
    const message =
      this.newMessage.trim();

    if (
      !message ||
      !this.selectedConversation ||
      this.sendingMessage
    ) {
      return;
    }

    this.sendingMessage = true;

    const conversationId =
      this.selectedConversation._id;

    this.chatSocket.sendMessage(
      conversationId,
      message
    );

    this.newMessage = '';

    this.cdr.detectChanges();

    setTimeout(() => {
      this.sendingMessage = false;

      this.cdr.detectChanges();
    }, 300);
  }

  isMyMessage(
    message: Message
  ): boolean {
    return (
      message.senderType === 'USER' &&
      message.senderId ===
        this.currentUserId
    );
  }

  ngOnDestroy(): void {
    this.chatSocket.disconnect();
  }
} 