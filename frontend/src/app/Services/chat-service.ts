import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private readonly apiUrl =
    `${environment.apiUrl}/chat`;

  constructor(
    private http: HttpClient
  ) {}

  // =========================================================
  // USERS
  // =========================================================

  searchUsers(
    phone: string
  ): Observable<any> {

    const params =
      new HttpParams().set(
        'phone',
        phone.trim()
      );

    return this.http.get(
      `${this.apiUrl}/users/search`,
      {
        params
      }
    );
  }

  createDirectConversation(
    receiverId: string
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/direct`,
      {
        receiverId
      }
    );
  }

  // =========================================================
  // GROUPS
  // =========================================================

  getCompoundGroup(): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/groups/compound`
    );
  }

  getBuildingGroup(
    buildingId: string
  ): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/groups/building/${buildingId}`
    );
  }

  // =========================================================
  // CONVERSATIONS
  // =========================================================

  getMyConversations(): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/conversations`
    );
  }

  getConversation(
    conversationId: string
  ): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/conversations/${conversationId}`
    );
  }

  // =========================================================
  // MESSAGES
  // =========================================================

  getMessages(
    conversationId: string
  ): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/conversations/${conversationId}/messages`
    );
  }

  sendMessage(
    conversationId: string,
    message: string
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/conversations/${conversationId}/messages`,
      {
        message
      }
    );
  }

  markMessagesAsRead(
    conversationId: string
  ): Observable<any> {

    return this.http.patch(
      `${this.apiUrl}/conversations/${conversationId}/read`,
      {}
    );
  }

  // =========================================================
  // DELETE
  // =========================================================

  deleteMessageForMe(
    messageId: string
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/messages/${messageId}/me`
    );
  }

  deleteMessageForEveryone(
    messageId: string
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/messages/${messageId}/everyone`
    );
  }

  deleteConversationForMe(
    conversationId: string
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/conversations/${conversationId}/me`
    );
  }

  // =========================================================
  // VISITOR CHAT
  // =========================================================

  createVisitorConversation(
    visitId: string,
    token: string
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/visitor/${visitId}/conversation`,
      {
        token
      }
    );
  }

  getVisitorMessages(
    visitId: string,
    conversationId: string,
    token: string
  ): Observable<any> {

    const params =
      new HttpParams().set(
        'token',
        token
      );

    return this.http.get(
      `${this.apiUrl}/visitor/${visitId}/conversations/${conversationId}/messages`,
      {
        params
      }
    );
  }

  sendVisitorMessage(
    visitId: string,
    conversationId: string,
    token: string,
    message: string
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/visitor/${visitId}/conversations/${conversationId}/messages`,
      {
        token,
        message
      }
    );
  }

  markVisitorMessagesAsRead(
    visitId: string,
    conversationId: string,
    token: string
  ): Observable<any> {

    return this.http.patch(
      `${this.apiUrl}/visitor/${visitId}/conversations/${conversationId}/read`,
      {
        token
      }
    );
  }
}