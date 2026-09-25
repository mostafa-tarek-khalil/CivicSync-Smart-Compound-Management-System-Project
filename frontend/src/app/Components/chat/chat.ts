import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ChatService } from '../../Services/chat-service';
import { ChatSocket } from '../../core/services/chat-socket';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar';

interface Conversation {
  _id: string;
  type: string;
  groupType?: string | null;
  buildingId?: any;
  participants?: any[];
  relatedVisitId?: any;
  lastMessage?: any;
  lastMessageAt?: string | null;
  unreadCount?: number;
  deletedFor?: string[];
  /**
   * Set by the backend when this DIRECT conversation is a finished maintenance
   * thread. The composer is replaced with a notice; the server also rejects
   * any message sent anyway.
   */
  chatLocked?: boolean;
}

interface Message {
  _id: string;
  conversationId: string;
  senderType: 'USER' | 'VISITOR';
  senderId: any;
  message: string;
  isRead: boolean;
  readBy?: any[];
  deletedFor?: string[];
  isDeleted?: boolean;
  deletedBy?: 'ME' | 'EVERYONE';
  deletedAt?: string | null;
  createdAt: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AvatarComponent
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
  currentUserId = '';

  showGroupMembers = false;

  // =========================================================
  // NEW CHAT
  // =========================================================

  showNewChat = false;
  newChatPhone = '';
  newChatUsers: any[] = [];
  searchingUsers = false;
  creatingConversation = false;

  // =========================================================
  // MENUS
  // =========================================================

  conversationMenuId: string | null = null;
  messageMenuId: string | null = null;
  deletingMessageId: string | null = null;

  // =========================================================
  // DELETE MESSAGE MODAL
  // =========================================================

  showDeleteModal = false;
  messageToDelete: Message | null = null;

  // =========================================================
  // DELETE CONVERSATION MODAL
  // =========================================================

  showDeleteConversationModal = false;
  conversationToDelete: Conversation | null = null;

  @ViewChild('messagesEnd')
  messagesEnd?: ElementRef<HTMLElement>;

  // =========================================================
  // DARK MODE
  // =========================================================

  get isDarkMode(): boolean {
    return this.themeService.isDark;
  }

  constructor(
    private chatService: ChatService,
    private chatSocket: ChatSocket,
    private authService: AuthService,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {}

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {

    const user = this.authService.getUser();

    if (user) {
      this.currentUserId = String(
        user.id ??
        user._id ??
        ''
      );
    }

    this.setupSocket();
    this.loadConversations();
  }

  // =========================================================
  // DARK MODE
  // =========================================================

  toggleDarkMode(): void {
    this.themeService.toggleTheme();
  }

  // =========================================================
  // GLOBAL CLICK
  // =========================================================

  @HostListener('document:click')
  closeMenus(): void {
    this.conversationMenuId = null;
    this.messageMenuId = null;
  }

  // =========================================================
  // SOCKET
  // =========================================================

  private setupSocket(): void {

    this.chatSocket.connect();

    // -------------------------------------------------------
    // Conversation joined
    // -------------------------------------------------------

    this.chatSocket.on(
      'conversation:joined',
      () => {
        // Nothing required here.
      }
    );

    // -------------------------------------------------------
    // New message
    // -------------------------------------------------------

    this.chatSocket.on(
      'message:new',
      (data: any) => {

        const message = data?.message;

        if (!message) {
          return;
        }

        const conversationId =
          String(message.conversationId);

        const conversation =
          this.conversations.find(
            item =>
              String(item._id) === conversationId
          );

        if (conversation) {
          conversation.lastMessage = message;
          conversation.lastMessageAt =
            message.createdAt;
        }

        if (
          this.selectedConversation &&
          String(
            this.selectedConversation._id
          ) === conversationId
        ) {

          const exists =
            this.messages.some(
              item =>
                String(item._id) ===
                String(message._id)
            );

          if (!exists) {
            this.messages.push(message);
          }

          this.selectedConversation =
            conversation ??
            this.selectedConversation;

          if (conversation) {
            conversation.unreadCount = 0;
          }

          this.chatService
            .markMessagesAsRead(
              conversationId
            )
            .subscribe({
              error: () => {}
            });

          this.chatSocket.markAsRead(
            conversationId
          );

          this.cdr.detectChanges();
          this.scrollToBottom();

          return;
        }

        const senderId =
          this.getSenderId(message);

        if (
          senderId &&
          senderId !== this.currentUserId
        ) {
          if (conversation) {
            conversation.unreadCount =
              (conversation.unreadCount ?? 0) + 1;
          }
        }

        this.filteredConversations =
          this.filterConversationList(
            this.conversations,
            this.searchQuery
          );

        this.cdr.detectChanges();
      }
    );

    // -------------------------------------------------------
    // Message deleted for me
    // -------------------------------------------------------

    this.chatSocket.on(
      'message:deletedForMe',
      (data: any) => {

        if (!data?.messageId) {
          return;
        }

        const message =
          this.messages.find(
            item =>
              String(item._id) ===
              String(data.messageId)
          );

        if (message) {

          message.isDeleted = true;

          message.deletedBy = 'ME';

          message.message =
            'This message was deleted from me';

          message.deletedAt =
            new Date().toISOString();
        }

        const conversation =
          this.findConversationByMessageId(
            data.messageId,
            data.conversationId
          );

        if (
          conversation?.lastMessage &&
          String(
            conversation.lastMessage._id
          ) === String(data.messageId)
        ) {

          conversation.lastMessage.message =
            'This message was deleted from me';

          conversation.lastMessage.isDeleted = true;

          conversation.lastMessage.deletedBy =
            'ME';

          conversation.lastMessage.deletedAt =
            new Date().toISOString();

          conversation.lastMessageAt =
            conversation.lastMessage.createdAt;
        }

        this.deletingMessageId = null;
        this.messageMenuId = null;

        this.filteredConversations =
          this.filterConversationList(
            this.conversations,
            this.searchQuery
          );

        this.cdr.detectChanges();
      }
    );

    // -------------------------------------------------------
    // Message deleted for everyone
    // -------------------------------------------------------

    this.chatSocket.on(
      'message:deleted',
      (data: any) => {

        if (!data?.messageId) {
          return;
        }

        const message =
          this.messages.find(
            item =>
              String(item._id) ===
              String(data.messageId)
          );

        if (message) {

          message.isDeleted = true;

          message.deletedBy = 'EVERYONE';

          message.message =
            'This message was deleted for everyone';

          message.deletedAt =
            new Date().toISOString();
        }

        const conversation =
          this.findConversationByMessageId(
            data.messageId,
            data.conversationId
          );

        if (
          conversation?.lastMessage &&
          String(
            conversation.lastMessage._id
          ) === String(data.messageId)
        ) {

          conversation.lastMessage.message =
            'This message was deleted for everyone';

          conversation.lastMessage.isDeleted = true;

          conversation.lastMessage.deletedBy =
            'EVERYONE';

          conversation.lastMessage.deletedAt =
            new Date().toISOString();

          conversation.lastMessageAt =
            conversation.lastMessage.createdAt;
        }

        this.deletingMessageId = null;
        this.messageMenuId = null;

        this.filteredConversations =
          this.filterConversationList(
            this.conversations,
            this.searchQuery
          );

        this.cdr.detectChanges();
      }
    );

    // -------------------------------------------------------
    // Conversation deleted
    // -------------------------------------------------------

    this.chatSocket.on(
      'conversation:deleted',
      (data: any) => {

        if (!data?.conversationId) {
          return;
        }

        const conversationId =
          String(data.conversationId);

        this.conversations =
          this.conversations.filter(
            conversation =>
              String(conversation._id) !==
              conversationId
          );

        this.filteredConversations =
          this.filteredConversations.filter(
            conversation =>
              String(conversation._id) !==
              conversationId
          );

        if (
          this.selectedConversation &&
          String(
            this.selectedConversation._id
          ) === conversationId
        ) {

          this.selectedConversation = null;
          this.messages = [];
          this.newMessage = '';
          this.showGroupMembers = false;
        }

        if (
          this.conversationToDelete &&
          String(
            this.conversationToDelete._id
          ) === conversationId
        ) {
          this.cancelDeleteConversation();
        }

        this.conversationMenuId = null;

        this.cdr.detectChanges();
      }
    );

    // -------------------------------------------------------
    // Chat error
    // -------------------------------------------------------

    this.chatSocket.on(
      'chat:error',
      (data: any) => {

        this.errorMessage =
          data?.message ||
          'Chat error';

        this.deletingMessageId = null;

        this.showDeleteModal = false;
        this.messageToDelete = null;

        this.showDeleteConversationModal = false;
        this.conversationToDelete = null;

        this.cdr.detectChanges();
      }
    );
  }

  // =========================================================
  // LOAD CONVERSATIONS
  // =========================================================

  loadConversations(): void {

    this.loadingConversations = true;

    this.chatService
      .getMyConversations()
      .subscribe({

        next: (response: any) => {

          this.conversations =
            response?.conversations ?? [];

          this.filteredConversations =
            this.filterConversationList(
              this.conversations,
              this.searchQuery
            );

          this.loadingConversations = false;

          if (this.selectedConversation) {

            const updatedConversation =
              this.conversations.find(
                conversation =>
                  String(conversation._id) ===
                  String(
                    this.selectedConversation?._id
                  )
              );

            if (updatedConversation) {

              this.selectedConversation =
                updatedConversation;

              this.loadMessages(
                updatedConversation._id
              );

              this.chatSocket.joinConversation(
                updatedConversation._id
              );
            }
          }

          this.cdr.detectChanges();
        },

        error: (error) => {

          this.loadingConversations = false;

          this.errorMessage =
            error?.error?.message ||
            'Failed to load conversations';

          this.cdr.detectChanges();
        }
      });
  }

  // =========================================================
  // FILTER
  // =========================================================

  filterConversations(): void {

    this.filteredConversations =
      this.filterConversationList(
        this.conversations,
        this.searchQuery
      );
  }

  private filterConversationList(
    conversations: Conversation[],
    query: string
  ): Conversation[] {

    const value =
      query.trim().toLowerCase();

    if (!value) {
      return [...conversations];
    }

    return conversations.filter(
      conversation => {

        const title =
          this.getConversationTitle(
            conversation
          ).toLowerCase();

        const subtitle =
          this.getConversationSubtitle(
            conversation
          ).toLowerCase();

        const preview =
          this.getLastMessagePreview(
            conversation
          ).toLowerCase();

        return (
          title.includes(value) ||
          subtitle.includes(value) ||
          preview.includes(value)
        );
      }
    );
  }

  clearConversationSearch(): void {
    this.searchQuery = '';
    this.filterConversations();
  }

  // =========================================================
  // SELECT CONVERSATION
  // =========================================================

  selectConversation(
    conversation: Conversation
  ): void {

    if (
      this.selectedConversation &&
      String(
        this.selectedConversation._id
      ) !== String(conversation._id)
    ) {

      this.chatSocket.leaveConversation(
        this.selectedConversation._id
      );
    }

    this.selectedConversation =
      conversation;

    this.showGroupMembers = false;

    this.conversationMenuId = null;
    this.messageMenuId = null;
    this.deletingMessageId = null;

    this.cancelDeleteMessage();
    this.cancelDeleteConversation();

    conversation.unreadCount = 0;

    this.messages = [];
    this.newMessage = '';
    this.errorMessage = '';

    this.chatSocket.joinConversation(
      conversation._id
    );

    this.loadMessages(
      conversation._id
    );
  }

  // =========================================================
  // BACK
  // =========================================================

  backToConversations(): void {

    if (this.selectedConversation) {

      this.chatSocket.leaveConversation(
        this.selectedConversation._id
      );
    }

    this.selectedConversation = null;
    this.messages = [];
    this.newMessage = '';

    this.showGroupMembers = false;

    this.messageMenuId = null;
    this.conversationMenuId = null;
    this.deletingMessageId = null;

    this.cancelDeleteMessage();
    this.cancelDeleteConversation();

    this.errorMessage = '';
  }

  // =========================================================
  // LOAD MESSAGES
  // =========================================================

  loadMessages(
    conversationId: string
  ): void {

    this.loadingMessages = true;

    this.chatService
      .getMessages(conversationId)
      .subscribe({

        next: (response: any) => {

          this.messages =
            response?.messages ?? [];

          this.loadingMessages = false;

          const conversation =
            this.conversations.find(
              item =>
                String(item._id) ===
                String(conversationId)
            );

          if (conversation) {
            conversation.unreadCount = 0;
          }

          this.chatService
            .markMessagesAsRead(
              conversationId
            )
            .subscribe({
              error: () => {}
            });

          this.chatSocket.markAsRead(
            conversationId
          );

          this.cdr.detectChanges();

          this.scrollToBottom();
        },

        error: (error) => {

          this.loadingMessages = false;

          this.errorMessage =
            error?.error?.message ||
            'Failed to load messages';

          this.cdr.detectChanges();
        }
      });
  }

  // =========================================================
  // SCROLL
  // =========================================================

  private scrollToBottom(): void {

    setTimeout(() => {

      this.messagesEnd
        ?.nativeElement
        ?.scrollIntoView({
          behavior: 'auto',
          block: 'end'
        });

    });
  }

  // =========================================================
  // SEND MESSAGE
  // =========================================================

  sendMessage(): void {

    const message =
      this.newMessage.trim();

    if (
      !message ||
      !this.selectedConversation ||
      this.sendingMessage ||
      this.isConversationLocked
    ) {
      return;
    }

    this.sendingMessage = true;

    this.chatSocket.sendMessage(
      this.selectedConversation._id,
      message
    );

    this.newMessage = '';

    setTimeout(() => {

      this.sendingMessage = false;

      this.cdr.detectChanges();

    }, 300);
  }

  // =========================================================
  // KEYDOWN
  // =========================================================

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

  // =========================================================
  // NEW CHAT
  // =========================================================

  openNewChat(): void {

    this.showNewChat = true;
    this.newChatPhone = '';
    this.newChatUsers = [];

    this.errorMessage = '';

    this.conversationMenuId = null;
    this.messageMenuId = null;
  }

  closeNewChat(): void {

    this.showNewChat = false;
    this.newChatPhone = '';
    this.newChatUsers = [];

    this.searchingUsers = false;
    this.creatingConversation = false;
  }

  searchNewChatUsers(): void {

    const phone =
      this.newChatPhone.trim();

    if (!phone) {

      this.newChatUsers = [];

      return;
    }

    this.searchingUsers = true;
    this.newChatUsers = [];

    this.errorMessage = '';

    this.chatService
      .searchUsers(phone)
      .subscribe({

        next: (response: any) => {

          this.newChatUsers =
            response?.users ?? [];

          this.searchingUsers = false;

          this.cdr.detectChanges();
        },

        error: (error) => {

          this.searchingUsers = false;

          this.errorMessage =
            error?.error?.message ||
            'Failed to search users';

          this.cdr.detectChanges();
        }
      });
  }

  startDirectChat(
    user: any
  ): void {

    if (
      !user?._id ||
      this.creatingConversation
    ) {
      return;
    }

    this.creatingConversation = true;
    this.errorMessage = '';

    this.chatService
      .createDirectConversation(
        user._id
      )
      .subscribe({

        next: (response: any) => {

          const conversation =
            response?.conversation;

          this.creatingConversation = false;

          this.closeNewChat();

          if (!conversation) {

            this.loadConversations();

            return;
          }

          this.loadConversations();

          this.selectConversation(
            conversation
          );

          this.cdr.detectChanges();
        },

        error: (error) => {

          this.creatingConversation = false;

          this.errorMessage =
            error?.error?.message ||
            'Failed to create conversation';

          this.cdr.detectChanges();
        }
      });
  }

  // =========================================================
  // DELETE MESSAGE FOR ME
  // =========================================================

  deleteMessageForMe(
    message: Message
  ): void {

    if (
      !message?._id ||
      this.deletingMessageId ||
      message.isDeleted
    ) {
      return;
    }

    this.deletingMessageId =
      message._id;

    this.messageMenuId = null;

    this.chatSocket.deleteMessageForMe(
      message._id
    );
  }

  // =========================================================
  // DELETE MESSAGE FOR EVERYONE
  // =========================================================

  deleteMessageForEveryone(
    message: Message
  ): void {

    if (
      !message?._id ||
      message.isDeleted ||
      !this.isMyMessage(message)
    ) {
      return;
    }

    this.messageToDelete = message;

    this.showDeleteModal = true;

    this.messageMenuId = null;
    this.conversationMenuId = null;
  }

  cancelDeleteMessage(): void {

    this.showDeleteModal = false;
    this.messageToDelete = null;
  }

  confirmDeleteMessageForEveryone(): void {

    if (
      !this.messageToDelete?._id
    ) {
      return;
    }

    this.deletingMessageId =
      this.messageToDelete._id;

    this.chatSocket.deleteMessageForEveryone(
      this.messageToDelete._id
    );

    this.showDeleteModal = false;
    this.messageToDelete = null;
  }

  closeDeleteModal(): void {
    this.cancelDeleteMessage();
  }

  // =========================================================
  // DELETE CONVERSATION
  // =========================================================

  deleteConversation(
    conversation: Conversation
  ): void {

    if (!conversation?._id) {
      return;
    }

    this.conversationToDelete =
      conversation;

    this.showDeleteConversationModal = true;

    this.conversationMenuId = null;
    this.messageMenuId = null;
  }

  cancelDeleteConversation(): void {

    this.showDeleteConversationModal = false;
    this.conversationToDelete = null;
  }

  confirmDeleteConversation(): void {

    if (
      !this.conversationToDelete?._id
    ) {
      return;
    }

    const conversationId =
      this.conversationToDelete._id;

    this.conversationMenuId = null;

    this.chatSocket.deleteConversationForMe(
      conversationId
    );
  }

  // =========================================================
  // MESSAGE MENU
  // =========================================================

  toggleMessageMenu(
    messageId: string
  ): void {

    if (
      this.messageMenuId === messageId
    ) {

      this.messageMenuId = null;

    } else {

      this.messageMenuId = messageId;
    }

    this.conversationMenuId = null;
  }

  // =========================================================
  // CONVERSATION MENU
  // =========================================================

  toggleConversationMenu(
    conversationId: string
  ): void {

    if (
      this.conversationMenuId ===
      conversationId
    ) {

      this.conversationMenuId = null;

    } else {

      this.conversationMenuId =
        conversationId;
    }

    this.messageMenuId = null;
  }

  // =========================================================
  // MESSAGE HELPERS
  // =========================================================

  getSenderId(
    message: Message
  ): string {

    if (!message.senderId) {
      return '';
    }

    if (
      typeof message.senderId === 'string'
    ) {

      return String(
        message.senderId
      );
    }

    return String(
      message.senderId._id ??
      message.senderId.id ??
      ''
    );
  }

  isMyMessage(
    message: Message
  ): boolean {

    if (
      message.senderType !== 'USER'
    ) {
      return false;
    }

    return (
      this.getSenderId(message) ===
      this.currentUserId
    );
  }

  getMessageSenderName(
    message: Message
  ): string {

    if (
      message.senderType === 'VISITOR'
    ) {
      return 'Visitor';
    }

    if (
      message.senderId &&
      typeof message.senderId === 'object'
    ) {

      return (
        message.senderId.name ||
        'User'
      );
    }

    return 'User';
  }

  getMessageSenderRole(
    message: Message
  ): string {

    if (
      message.senderType === 'VISITOR'
    ) {
      return 'VISITOR';
    }

    if (
      message.senderId &&
      typeof message.senderId === 'object'
    ) {

      return (
        message.senderId.role ||
        ''
      );
    }

    return '';
  }

  // =========================================================
  // FIND CONVERSATION BY MESSAGE
  // =========================================================

  private findConversationByMessageId(
    messageId: string,
    conversationId?: string
  ): Conversation | undefined {

    if (conversationId) {

      const directMatch =
        this.conversations.find(
          conversation =>
            String(conversation._id) ===
            String(conversationId)
        );

      if (directMatch) {
        return directMatch;
      }
    }

    return this.conversations.find(
      conversation =>
        String(
          conversation.lastMessage?._id
        ) === String(messageId)
    );
  }

  // =========================================================
  // CONVERSATION HELPERS
  // =========================================================

  getConversationTitle(
    conversation: Conversation
  ): string {

    if (
      conversation.type === 'GROUP'
    ) {

      if (
        conversation.groupType ===
        'COMPOUND'
      ) {
        return 'Compound Group';
      }

      if (
        conversation.groupType ===
        'BUILDING'
      ) {

        if (
          conversation.buildingId &&
          typeof conversation.buildingId === 'object'
        ) {

          return (
            conversation.buildingId.name ||
            `Building ${
              conversation.buildingId.buildingNumber ||
              ''
            }`
          );
        }

        return 'Building Group';
      }

      return 'Group';
    }

    if (
      conversation.type === 'VISITOR'
    ) {

      if (
        conversation.relatedVisitId &&
        typeof conversation.relatedVisitId === 'object'
      ) {

        return (
          conversation.relatedVisitId.visitorName ||
          'Visitor'
        );
      }

      return 'Visitor';
    }

    const participants =
      conversation.participants ?? [];

    const otherUser =
      participants.find(
        participant =>
          String(
            participant?._id ??
            participant?.id
          ) !==
          this.currentUserId
      );

    return (
      otherUser?.name ||
      otherUser?.phone ||
      'Conversation'
    );
  }

  getConversationSubtitle(
    conversation: Conversation
  ): string {

    if (
      conversation.type === 'GROUP'
    ) {

      const count =
        conversation.participants?.length ??
        0;

      return `${count} members`;
    }

    if (
      conversation.type === 'VISITOR'
    ) {
      return 'Visitor chat';
    }

    const participants =
      conversation.participants ?? [];

    const otherUser =
      participants.find(
        participant =>
          String(
            participant?._id ??
            participant?.id
          ) !==
          this.currentUserId
      );

    return (
      otherUser?.role ||
      ''
    );
  }

  getConversationAvatar(
    conversation: Conversation
  ): string {

    const title =
      this.getConversationTitle(
        conversation
      );

    return (
      title
        ?.charAt(0)
        ?.toUpperCase() ||
      '?'
    );
  }

  /**
   * True when the open conversation is a finished maintenance thread.
   *
   * Drives the read-only composer: the server rejects these messages anyway, so
   * the UI stops the user from typing one in the first place.
   */
  get isConversationLocked(): boolean {
    return !!this.selectedConversation?.chatLocked;
  }

  /**
   * Profile picture of the other participant in a DIRECT chat.
   *
   * Groups have no single owner, so they keep their initial. Returns null when
   * the peer has not uploaded a picture (the avatar then shows initials).
   */
  getConversationAvatarImage(
    conversation: Conversation
  ): string | null {

    if (conversation.type !== 'DIRECT') {
      return null;
    }

    const participants = conversation.participants || [];

    const peer = participants.find(
      participant =>
        String(participant?._id ?? participant) !==
        this.currentUserId
    );

    return peer?.profileImage ?? null;
  }

  getLastMessagePreview(
    conversation: Conversation
  ): string {

    if (
      !conversation.lastMessage
    ) {
      return 'No messages yet';
    }

    if (
      conversation.lastMessage.isDeleted
    ) {

      return (
        conversation.lastMessage.deletedBy ===
        'ME'
          ? 'This message was deleted from me'
          : 'This message was deleted for everyone'
      );
    }

    return (
      conversation.lastMessage.message ||
      'No messages yet'
    );
  }

  // =========================================================
  // GROUP MEMBERS
  // =========================================================

  getGroupMembers(
    conversation: Conversation
  ): any[] {

    if (
      conversation.type !== 'GROUP'
    ) {
      return [];
    }

    return (
      conversation.participants ??
      []
    );
  }

  getGroupMemberRole(
    member: any
  ): string {

    return (
      member?.role ||
      ''
    );
  }

  isCurrentUser(
    member: any
  ): boolean {

    return (
      String(
        member?._id ??
        member?.id ??
        ''
      ) ===
      this.currentUserId
    );
  }

  toggleGroupMembers(): void {

    this.showGroupMembers =
      !this.showGroupMembers;
  }

  // =========================================================
  // DESTROY
  // =========================================================

  ngOnDestroy(): void {

    if (this.selectedConversation) {

      this.chatSocket.leaveConversation(
        this.selectedConversation._id
      );
    }

    this.chatSocket.disconnect();
  }
}
