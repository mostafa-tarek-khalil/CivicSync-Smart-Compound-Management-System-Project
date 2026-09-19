import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly apiUrl = 'http://localhost:3000/api/chat';

  constructor(private http: HttpClient) {}

  getMyConversations(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/conversations`
    );
  }

  getConversationMessages(
    conversationId: string
  ): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/conversations/${conversationId}/messages`
    );
  }

  sendMessage(
    conversationId: string,
    message: string
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/conversations/${conversationId}/messages`,
      {
        message
      }
    );
  }

  markMessagesAsRead(
    conversationId: string
  ): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/conversations/${conversationId}/read`,
      {}
    );
  }
}