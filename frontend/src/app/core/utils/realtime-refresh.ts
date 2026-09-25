import { ChatSocket } from '../../core/services/chat-socket';

/**
 * Refreshes a list whenever a relevant realtime notification arrives.
 *
 * Admin tables used to show stale data until the operator manually reloaded or
 * re-applied a filter. A screen can now subscribe in one line and be told to
 * re-fetch the moment somebody else on the compound changes something.
 *
 * Only notifications whose `type` is in `types` trigger a reload, so an admin
 * watching invoices is not re-fetching on every chat message.
 *
 * The component passes its own DI-managed `ChatSocket` in, which is why this is
 * a plain class rather than an injectable: it is a per-screen concern with a
 * per-screen refresh callback, not a shared singleton. The owning component is
 * responsible for calling `stop()` in its own `ngOnDestroy`.
 *
 * Usage:
 * ```ts
 * private readonly realtime: RealtimeRefresh;
 *
 * constructor(..., private chatSocket: ChatSocket) {
 *   this.realtime = new RealtimeRefresh(
 *     this.chatSocket,
 *     ['INVOICE_CREATED', 'INVOICE_DUE'],
 *     () => this.load()
 *   );
 * }
 *
 * ngOnInit() { this.load(); this.realtime.start(); }
 * ngOnDestroy() { this.realtime.stop(); }
 * ```
 */
export class RealtimeRefresh {
  constructor(
    private readonly socket: ChatSocket,
    private readonly types: string[],
    private readonly refresh: () => void
  ) {}

  private readonly onNotification = (notification: {
    type?: string;
    relatedId?: string;
  }): void => {
    if (!notification?.type) {
      return;
    }

    if (this.types.length > 0 && !this.types.includes(notification.type)) {
      return;
    }

    this.refresh();
  };

  start(): void {
    this.socket.connect();
    this.socket.on('notification:new', this.onNotification);
  }

  stop(): void {
    this.socket.off('notification:new', this.onNotification);
  }
}