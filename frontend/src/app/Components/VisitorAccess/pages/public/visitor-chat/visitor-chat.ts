import { Component, OnDestroy, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ChatService } from '../../../../../Services/chat-service';
import { ChatSocket } from '../../../../../core/services/chat-socket';
import { VisitService } from '../../../../../Services/visit-service';
import { VisitorFlow } from '../../../services/visitor-flow';

interface VisitorMessage {
  _id?: string;
  senderId?: string;
  senderName?: string;
  message: string;
  createdAt?: string;
  isMine?: boolean;
}

/**
 * Visitor-side conversation with the resident who approved the visit.
 *
 * This page is the missing entry point for visitor chat: the backend has
 * always supported it, but nothing in the UI ever opened the conversation.
 * Access is gated on the visitorChatToken, which the visitor only receives
 * once their visit is approved.
 */
@Component({
  selector: 'app-visitor-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './visitor-chat.html',
  styleUrl: './visitor-chat.css'
})
export class VisitorChat implements OnInit, OnDestroy {

  visitorName = '';
  residentName = '';
  visitId = '';
  conversationId = '';
  chatToken = '';

  /**
   * Where "Back to visit" should return to, decided once when the page loads.
   * Chat can be opened from the request-status page (pre-check-in) or from the
   * in-progress page (post-check-in), and the visitor must land back where they
   * came from instead of always being sent to the status page.
   */
  private backRoute = '/visitor-request-status';

  messages: VisitorMessage[] = [];
  draft = '';
  loading = true;
  sending = false;
  errorMessage = '';
  unavailable = false;

  private readonly onMessage = (payload: any) => this.receiveMessage(payload);

  constructor(
    private chatService: ChatService,
    private chatSocket: ChatSocket,
    private visitService: VisitService,
    private visitorFlow: VisitorFlow,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) { }

  ngOnInit(): void {
    const visit = this.visitorFlow.getVisit();

    if (!visit.requestId || !visit.visitorEmail) {
      this.router.navigate(['/visitor-request']);
      return;
    }

    this.visitId = visit.requestId;
    this.visitorName = visit.visitorName;
    this.residentName = visit.residentName;

    // A checked-in visit lives on the in-progress page, so "Back to visit"
    // should return there; every earlier stage lives on the status page.
    this.backRoute =
      String(visit.status || '').toUpperCase() === 'CHECKED_IN'
        ? '/visit-in-progress'
        : '/visitor-request-status';

    // Re-read the visit so we always use a token the backend just validated,
    // rather than a stale one from sessionStorage.
    this.visitService.getVisitorStatus(this.visitId, visit.visitorEmail).subscribe({
      next: response => {
        const token = response.data?.visitorChatToken || '';

        if (!token) {
          this.loading = false;
          this.unavailable = true;
          this.errorMessage = 'Chat becomes available once the resident approves your visit.';
          this.cdr.detectChanges();
          return;
        }

        this.chatToken = token;
        this.residentName = this.residentName || this.resolveResidentName(response.data);
        this.visitorFlow.updateVisit({ visitorChatToken: token });
        this.openConversation();
      },
      error: error => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Could not open the conversation.';
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.chatSocket.off('message:new', this.onMessage);
  }

  private resolveResidentName(visit: any): string {
    const resident = visit?.residentId;
    return typeof resident === 'object' && resident ? resident.name || '' : '';
  }

  private openConversation(): void {
    this.chatService.createVisitorConversation(this.visitId, this.chatToken).subscribe({
      next: response => {
        // Backend contract: { success, conversation }
        const conversation = response?.conversation;
        this.conversationId = conversation?._id || '';

        if (!this.conversationId) {
          this.loading = false;
          this.errorMessage = 'The conversation could not be started.';
          this.cdr.detectChanges();
          return;
        }

        this.setupSocket();
        this.loadMessages();
      },
      error: error => {
        this.loading = false;
        this.unavailable = true;
        this.errorMessage = error?.error?.message || 'Visitor chat is not available for this visit.';
        this.cdr.detectChanges();
      }
    });
  }

  private setupSocket(): void {
    this.zone.runOutsideAngular(() => {
      this.chatSocket.connectAsVisitor(this.visitId, this.chatToken);
      this.chatSocket.on('message:new', this.onMessage);
      this.chatSocket.joinConversation(this.conversationId);
    });
  }

  loadMessages(): void {
    this.chatService
      .getVisitorMessages(this.visitId, this.conversationId, this.chatToken)
      .subscribe({
        next: response => {
          // Backend contract: { success, messages }
          const raw = response?.messages || [];
          this.messages = raw.map((message: any) => this.toMessage(message));
          this.loading = false;
          this.cdr.detectChanges();
          this.scrollToLatest();
        },
        error: error => {
          this.loading = false;
          this.errorMessage = error?.error?.message || 'Could not load the messages.';
          this.cdr.detectChanges();
        }
      });
  }

  private toMessage(raw: any): VisitorMessage {
    return {
      _id: raw._id,
      senderId: String(raw.senderId?._id || raw.senderId || ''),
      senderName: raw.senderId?.name || raw.senderName || '',
      message: raw.message,
      createdAt: raw.createdAt,
      isMine: !!raw.isVisitorMessage || raw.senderType === 'VISITOR'
    };
  }

  private receiveMessage(payload: any): void {
    const message = payload?.message || payload;

    if (!message || !message.message) {
      return;
    }

    this.zone.run(() => {
      this.messages = [...this.messages, this.toMessage(message)];
      this.cdr.detectChanges();
      this.scrollToLatest();
    });
  }

  send(): void {
    const text = this.draft.trim();

    if (!text || this.sending || !this.conversationId) {
      return;
    }

    this.sending = true;
    this.errorMessage = '';

    this.chatService
      .sendVisitorMessage(this.visitId, this.conversationId, this.chatToken, text)
      .subscribe({
        next: response => {
          // Backend contract: { success, message }
          const saved = response?.message;

          if (saved) {
            this.messages = [...this.messages, this.toMessage(saved)];
          }

          this.draft = '';
          this.sending = false;
          this.cdr.detectChanges();
          this.scrollToLatest();
        },
        error: error => {
          this.sending = false;
          this.errorMessage = error?.error?.message || 'The message could not be sent.';
          this.cdr.detectChanges();
        }
      });
  }

  backToVisit(): void {
    this.router.navigate([this.backRoute]);
  }

  private scrollToLatest(): void {
    setTimeout(() => {
      const list = document.querySelector('.chat-thread');
      if (list) {
        list.scrollTop = list.scrollHeight;
      }
    });
  }

  formatTime(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
