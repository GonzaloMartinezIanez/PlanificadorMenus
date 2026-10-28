export type RealtimeEventType =
  | 'resync'
  | 'menu.changed'
  | 'shopping_list.changed'
  | 'membership.requested'
  | 'membership.decided'
  | 'membership.changed'
  | 'membership.revoked'
  | 'group.updated'
  | 'group.deleted';

export interface RealtimeEvent {
  type: RealtimeEventType;
  group_code?: string | null;
  date?: string;
  status?: 'accepted' | 'rejected' | 'removed';
}
