export type Conversation = {
  id: string;
  participantIds: string[];
  propertyId?: string;
  lastMessageText?: string;
  lastMessageAt?: number;
  unreadCountByUser?: Record<string, number>;
  updatedAt?: number;
};
