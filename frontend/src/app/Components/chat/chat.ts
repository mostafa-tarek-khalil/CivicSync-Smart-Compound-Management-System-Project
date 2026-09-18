import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
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
  relatedVisitId?: any;
  lastMessage?: any;
  lastMessageAt?: string | null;
  unreadCount?: number;
}

interface Message {
  _id: string;
  conversationId: string;
  senderType: 'USER' | 'VISITOR';
  senderId: any;
  message: string;
  isRead: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class Chat implements OnInit, OnDestroy {

  conversations: Conversation[] = [];

  filteredConversations: Conversation[] = [];

  messages: Message[] = [];

  selectedConversation: Conversation | null = null;

  newMessage = '';

  searchQuery = '';

  loadingConversations = false;

  loadingMessages = false;

  sendingMessage = false;

  errorMessage = '';

  currentUserId: string | null = null;

  showGroupMembers = false;

  @ViewChild('messagesEnd')
  messagesEnd?: ElementRef<HTMLElement>;

  constructor(
    private chatService: ChatService,
    private chatSocket: ChatSocket,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();

    if (user) {
      this.currentUserId = String(user.id);
    }

    this.setupSocket();

    this.loadConversations();
  }

  setupSocket(): void {
    this.chatSocket.connect();

    this.chatSocket.onConversationJoined((data) => {
      console.log(
        'Conversation joined:',
        data
      );

      this.cdr.detectChanges();
    });

    this.chatSocket.onNewMessage((data) => {
      console.log(
        'New socket message:',
        data
      );

      if (!data?.message) {
        return;
      }

      const incomingMessage =
        data.message;

      const conversation =
        this.conversations.find(
          (item) =>
            item._id ===
            incomingMessage.conversationId
        );

      if (!conversation) {
        return;
      }

      conversation.lastMessage =
        incomingMessage;

      conversation.lastMessageAt =
        incomingMessage.createdAt;

      const isSelectedConversation =
        this.selectedConversation?._id ===
        incomingMessage.conversationId;

      const senderId =
        incomingMessage.senderId?._id ||
        incomingMessage.senderId ||
        null;

      const isMyMessage =
        incomingMessage.senderType === 'USER' &&
        senderId &&
        String(senderId) ===
          String(this.currentUserId);

      if (isSelectedConversation) {

        const exists =
          this.messages.some(
            (message) =>
              message._id ===
              incomingMessage._id
          );

        if (!exists) {
          this.messages.push(
            incomingMessage
          );
        }

        conversation.unreadCount = 0;

        this.chatService
          .markMessagesAsRead(
            conversation._id
          )
          .subscribe({
            next: () => {
              console.log(
                'Incoming message marked as read.'
              );
            },
            error: (error) => {
              console.error(
                'Failed to mark incoming message as read:',
                error
              );
            }
          });

        this.chatSocket.markAsRead(
          conversation._id
        );

        this.cdr.detectChanges();

        this.scrollToBottom();

      } else {

        if (!isMyMessage) {
          conversation.unreadCount =
            (conversation.unreadCount || 0) + 1;
        }

        this.filterConversations();

        this.cdr.detectChanges();
      }
    });

    this.chatSocket.onChatError((error) => {
      console.error(
        'Chat error:',
        error
      );

      this.errorMessage =
        error?.message ||
        'Chat error occurred.';

      this.cdr.detectChanges();
    });
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

          this.filteredConversations =
            [...this.conversations];

          this.loadingConversations =
            false;

          this.cdr.detectChanges();

          if (
            this.conversations.length === 0
          ) {
            return;
          }

          if (
            this.selectedConversation
          ) {

            const current =
              this.conversations.find(
                (conversation) =>
                  conversation._id ===
                  this.selectedConversation?._id
              );

            if (current) {

              this.selectedConversation =
                current;

              this.loadMessages(
                current._id
              );

              this.chatSocket.joinConversation(
                current._id
              );
            }
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

  filterConversations(): void {
    const query =
      this.searchQuery
        .trim()
        .toLowerCase();

    if (!query) {
      this.filteredConversations =
        [...this.conversations];

      return;
    }

    this.filteredConversations =
      this.conversations.filter(
        (conversation) => {

          const title =
            this.getConversationTitle(
              conversation
            ).toLowerCase();

          const subtitle =
            this.getConversationSubtitle(
              conversation
            ).toLowerCase();

          const lastMessage =
            conversation.lastMessage
              ?.message
              ?.toLowerCase() || '';

          const lastMessagePreview =
            this.getLastMessagePreview(
              conversation
            ).toLowerCase();

          return (
            title.includes(query) ||
            subtitle.includes(query) ||
            lastMessage.includes(query) ||
            lastMessagePreview.includes(query)
          );
        }
      );
  }

  selectConversation(
    conversation: Conversation
  ): void {

    this.selectedConversation =
      conversation;

    this.showGroupMembers = false;

    conversation.unreadCount = 0;

    this.messages = [];

    this.loadingMessages = true;

    this.errorMessage = '';

    this.filterConversations();

    this.cdr.detectChanges();

    this.loadMessages(
      conversation._id
    );

    this.chatSocket.joinConversation(
      conversation._id
    );
  }

  backToConversations(): void {

    this.selectedConversation =
      null;

    this.showGroupMembers =
      false;

    this.messages = [];

    this.newMessage = '';

    this.errorMessage = '';

    this.loadingMessages =
      false;

    this.cdr.detectChanges();
  }

  loadMessages(
    conversationId: string
  ): void {

    this.loadingMessages = true;

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

          this.messages =
            response?.messages || [];

          this.loadingMessages =
            false;

          const conversation =
            this.conversations.find(
              (item) =>
                item._id ===
                conversationId
            );

          if (conversation) {
            conversation.unreadCount = 0;
          }

          this.filterConversations();

          this.cdr.detectChanges();

          this.scrollToBottom();

          this.chatService
            .markMessagesAsRead(
              conversationId
            )
            .subscribe({

              next: () => {
                console.log(
                  'Messages marked as read.'
                );
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

  private scrollToBottom(): void {

    setTimeout(() => {

      const element =
        this.messagesEnd
          ?.nativeElement;

      if (!element) {
        return;
      }

      element.scrollIntoView({
        behavior: 'auto',
        block: 'end'
      });

    }, 0);
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

  handleMessageKeydown(
    event: KeyboardEvent
  ): void {

    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {

      event.preventDefault();

      this.sendMessage();
    }
  }

  getSenderId(
    message: Message
  ): string | null {

    if (!message.senderId) {
      return null;
    }

    if (
      typeof message.senderId ===
      'string'
    ) {
      return message.senderId;
    }

    if (message.senderId._id) {
      return String(
        message.senderId._id
      );
    }

    return null;
  }

  isMyMessage(
    message: Message
  ): boolean {

    if (
      message.senderType !== 'USER'
    ) {
      return false;
    }

    if (!this.currentUserId) {
      return false;
    }

    const senderId =
      this.getSenderId(message);

    if (!senderId) {
      return false;
    }

    return (
      String(senderId) ===
      String(this.currentUserId)
    );
  }

  getMessageSenderName(
    message: Message
  ): string {

    if (
      this.isMyMessage(message)
    ) {
      return 'You';
    }

    if (
      message.senderType ===
      'VISITOR'
    ) {
      return 'Visitor';
    }

    if (
      message.senderId &&
      typeof message.senderId ===
        'object' &&
      message.senderId.name
    ) {
      return message.senderId.name;
    }

    const senderId =
      this.getSenderId(message);

    if (!senderId) {
      return 'User';
    }

    for (
      const conversation
      of this.conversations
    ) {

      const participant =
        conversation.participants?.find(
          (item: any) =>
            String(item._id) ===
            String(senderId)
        );

      if (participant?.name) {
        return participant.name;
      }
    }

    return 'User';
  }

  getMessageSenderRole(
    message: Message
  ): string {

    if (
      message.senderType ===
      'VISITOR'
    ) {
      return 'VISITOR';
    }

    if (
      message.senderId &&
      typeof message.senderId ===
        'object' &&
      message.senderId.role
    ) {
      return message.senderId.role;
    }

    const senderId =
      this.getSenderId(message);

    if (!senderId) {
      return '';
    }

    for (
      const conversation
      of this.conversations
    ) {

      const participant =
        conversation.participants?.find(
          (item: any) =>
            String(item._id) ===
            String(senderId)
        );

      if (participant?.role) {
        return participant.role;
      }
    }

    return '';
  }

  getLastMessagePreview(
    conversation: Conversation
  ): string {

    const lastMessage =
      conversation.lastMessage;

    if (!lastMessage) {
      return 'No messages yet';
    }

    const messageText =
      lastMessage.message || '';

    if (!messageText) {
      return 'No messages yet';
    }

    if (
      lastMessage.senderType ===
      'VISITOR'
    ) {
      return `Visitor: ${messageText}`;
    }

    const senderId =
      lastMessage.senderId?._id ||
      lastMessage.senderId ||
      null;

    if (
      senderId &&
      this.currentUserId &&
      String(senderId) ===
        String(this.currentUserId)
    ) {
      return `You: ${messageText}`;
    }

    if (
      lastMessage.senderId &&
      typeof lastMessage.senderId ===
        'object' &&
      lastMessage.senderId.name
    ) {
      return `${lastMessage.senderId.name}: ${messageText}`;
    }

    if (senderId) {

      const participant =
        conversation.participants?.find(
          (item: any) =>
            String(item._id) ===
            String(senderId)
        );

      if (participant?.name) {
        return `${participant.name}: ${messageText}`;
      }
    }

    return `User: ${messageText}`;
  }

  getConversationTitle(
    conversation: Conversation
  ): string {

    if (
      conversation.type ===
      'GROUP'
    ) {

      if (
        conversation.groupType ===
        'COMPOUND'
      ) {
        return 'Compound';
      }

      if (
        conversation.groupType ===
        'BUILDING'
      ) {
        return 'My Building';
      }
    }

    if (
      conversation.type ===
      'VISITOR'
    ) {
      return (
        conversation.relatedVisitId
          ?.visitorName ||
        'Visitor'
      );
    }

    const otherParticipant =
      conversation.participants?.find(
        (participant: any) =>
          String(participant._id) !==
          String(this.currentUserId)
      );

    return (
      otherParticipant?.name ||
      'Conversation'
    );
  }

  getConversationSubtitle(
    conversation: Conversation
  ): string {

    if (
      conversation.type ===
      'GROUP'
    ) {

      const memberCount =
        conversation.participants
          ?.length || 0;

      if (
        conversation.groupType ===
        'COMPOUND'
      ) {
        return `Compound Group · ${memberCount} members`;
      }

      return `Building Group · ${memberCount} members`;
    }

    if (
      conversation.type ===
      'VISITOR'
    ) {
      return 'Visitor chat';
    }

    const otherParticipant =
      conversation.participants?.find(
        (participant: any) =>
          String(participant._id) !==
          String(this.currentUserId)
      );

    if (!otherParticipant) {
      return 'Direct conversation';
    }

    const phone =
      otherParticipant.phone || '';

    const role =
      otherParticipant.role || '';

    if (
      phone &&
      role
    ) {
      return `${role} · ${phone}`;
    }

    return (
      role ||
      phone ||
      'Direct conversation'
    );
  }

  getConversationAvatar(
    conversation: Conversation
  ): string {

    if (
      conversation.type ===
      'VISITOR'
    ) {
      return 'V';
    }

    if (
      conversation.type ===
      'GROUP'
    ) {

      if (
        conversation.groupType ===
        'COMPOUND'
      ) {
        return 'C';
      }

      return 'B';
    }

    const title =
      this.getConversationTitle(
        conversation
      );

    return (
      title
        .charAt(0)
        .toUpperCase() ||
      'U'
    );
  }

  getGroupMembers(
    conversation:
      Conversation | null
  ): any[] {

    if (
      !conversation ||
      conversation.type !==
        'GROUP'
    ) {
      return [];
    }

    return (
      conversation.participants ||
      []
    );
  }

  getGroupMemberRole(
    member: any
  ): string {

    return (
      member?.role ||
      'USER'
    );
  }

  isCurrentUser(
    userId: any
  ): boolean {

    return (
      String(userId) ===
      String(this.currentUserId)
    );
  }

  toggleGroupMembers(): void {

    if (
      this.selectedConversation?.type !==
      'GROUP'
    ) {
      return;
    }

    this.showGroupMembers =
      !this.showGroupMembers;
  }

  ngOnDestroy(): void {
    this.chatSocket.disconnect();
  }
}