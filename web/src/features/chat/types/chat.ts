export type Conversation = {
  id: string;
  participantIds: string[];
  lastMessageText?: string;
  lastMessageAt?: number;
  unreadCountByUser?: Record<string, number>;
  updatedAt?: number;
};

