import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  writeBatch,
  arrayUnion,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Message, Conversation, Inquiry } from '../../types/database';

// Collection names
const COLLECTIONS = {
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  INQUIRIES: 'inquiries'
} as const;

// Response types
interface FirestoreResponse<T> {
  data: T | null;
  error: string | null;
}

// Conversation CRUD Operations
export const conversationHelpers = {
  // Get conversations by user
  async getConversationsByUser(userId: string): Promise<FirestoreResponse<Conversation[]>> {
    try {
      console.log('[getConversationsByUser] Fetching conversations for user:', userId);

      const conversationsRef = collection(db, COLLECTIONS.CONVERSATIONS);

      // Query conversations where user is in participants array
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', userId)
      );

      console.log('[getConversationsByUser] Executing query with userId:', userId);
      const querySnapshot = await getDocs(q);

      console.log('[getConversationsByUser] Query returned', querySnapshot.size, 'documents');

      const conversations: Conversation[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        console.log('[getConversationsByUser] Conversation ID:', doc.id, 'participants:', data.participants);

        // Validate participants array structure
        if (!data.participants || !Array.isArray(data.participants)) {
          console.warn('[getConversationsByUser] Conversation', doc.id, 'missing or invalid participants array:', data.participants);
        }

        conversations.push({
          id: doc.id,
          ...data
        } as Conversation);
      });

      // Sort by last message time
      conversations.sort((a, b) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      console.log('[getConversationsByUser] Returning', conversations.length, 'conversations');
      return { data: conversations, error: null };
    } catch (error: any) {
      console.error('[getConversationsByUser] Error getting conversations:', error);
      return { data: null, error: error.message };
    }
  },

  // Create new conversation
  async createConversation(conversationData: Omit<Conversation, 'id' | 'created_at'>): Promise<FirestoreResponse<Conversation>> {
    try {
      const conversationsRef = collection(db, COLLECTIONS.CONVERSATIONS);
      const docRef = await addDoc(conversationsRef, {
        ...conversationData,
        last_message_at: serverTimestamp(),
        created_at: serverTimestamp()
      });
      
      return { data: { id: docRef.id, ...conversationData } as Conversation, error: null };
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      return { data: null, error: error.message };
    }
  },

  // Find conversation by property and participants
  async findConversationByPropertyAndParticipants(propertyId: string, participant1Id: string, participant2Id: string): Promise<FirestoreResponse<Conversation | null>> {
    try {
      console.log('[findConversationByPropertyAndParticipants] Searching for conversation with propertyId:', propertyId, 'participants:', [participant1Id, participant2Id]);

      const conversationsRef = collection(db, COLLECTIONS.CONVERSATIONS);
      const q = query(
        conversationsRef,
        where('property_id', '==', propertyId),
        where('participants', 'array-contains', participant1Id)
      );

      const querySnapshot = await getDocs(q);
      console.log('[findConversationByPropertyAndParticipants] Query returned', querySnapshot.size, 'documents');

      // Find conversation that contains both participants
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        console.log('[findConversationByPropertyAndParticipants] Checking conversation', doc.id, 'participants:', data.participants);

        if (data.participants &&
            Array.isArray(data.participants) &&
            data.participants.includes(participant1Id) &&
            data.participants.includes(participant2Id)) {
          console.log('[findConversationByPropertyAndParticipants] Found matching conversation:', doc.id);
          return { data: { id: doc.id, ...data } as Conversation, error: null };
        }
      }

      console.log('[findConversationByPropertyAndParticipants] No matching conversation found');
      return { data: null, error: null };
    } catch (error: any) {
      console.error('[findConversationByPropertyAndParticipants] Error finding conversation:', error);
      return { data: null, error: error.message };
    }
  },

  // Update conversation last message time
  async updateConversationLastMessage(conversationId: string): Promise<FirestoreResponse<Conversation>> {
    try {
      const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
      await updateDoc(conversationRef, {
        last_message_at: serverTimestamp()
      });

      return { data: { id: conversationId } as Conversation, error: null };
    } catch (error: any) {
      console.error('Error updating conversation:', error);
      return { data: null, error: error.message };
    }
  },

  async addConversationPropertyReference(conversationId: string, propertyId: string): Promise<FirestoreResponse<Conversation>> {
    try {
      const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
      await updateDoc(conversationRef, {
        propertyReferences: arrayUnion(propertyId),
        last_message_at: serverTimestamp(),
      });

      return { data: { id: conversationId } as Conversation, error: null };
    } catch (error: any) {
      console.error('[addConversationPropertyReference] Error updating conversation:', error);
      return { data: null, error: error.message };
    }
  },
};

// Message CRUD Operations
export const messageHelpers = {
  // Get messages by conversation
  async getMessagesByConversation(conversationId: string): Promise<FirestoreResponse<Message[]>> {
    try {
      console.log('[getMessagesByConversation] Fetching messages for conversation:', conversationId);
      const messagesPath = `conversations/${conversationId}/messages`;
      console.log('[getMessagesByConversation] Using Firestore path:', messagesPath);

      const messagesRef = collection(db, messagesPath);
      const q = query(
        messagesRef,
        orderBy('created_at', 'asc')
      );

      const querySnapshot = await getDocs(q);
      console.log('[getMessagesByConversation] Query returned', querySnapshot.size, 'messages');

      const messages: Message[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        messages.push({
          id: doc.id,
          conversation_id: conversationId, // Ensure conversation_id is set
          ...doc.data()
        } as Message);
      });

      return { data: messages, error: null };
    } catch (error: any) {
      console.error('[getMessagesByConversation] Error getting messages:', error);
      return { data: null, error: error.message };
    }
  },

  // Add new message
  async addMessage(messageData: Omit<Message, 'id' | 'created_at'>): Promise<FirestoreResponse<Message>> {
    try {
      console.log('[addMessage] Adding message to conversation:', messageData.conversation_id);
      const messagesPath = `conversations/${messageData.conversation_id}/messages`;
      console.log('[addMessage] Using Firestore path:', messagesPath);

      const messagesRef = collection(db, messagesPath);

      // Clean the data - remove undefined values and only include defined fields
      const cleanMessageData: any = {
        sender_id: messageData.sender_id,
        content: messageData.content,
        message_type: messageData.message_type || 'text',
        is_read: false,
        deleted_for: [],
        deleted_for_everyone: false,
        status: messageData.status ?? 'sent',
        created_at: serverTimestamp()
      };

      // Only add optional fields if they are defined and not null
      if (messageData.attachment_url != null) {
        cleanMessageData.attachment_url = messageData.attachment_url;
      }

      if (messageData.property_offer_id != null) {
        cleanMessageData.property_offer_id = messageData.property_offer_id;
      }


      if (messageData.reply_to != null) {
        cleanMessageData.reply_to = messageData.reply_to;
      }

      if (messageData.reactions != null) {
        cleanMessageData.reactions = messageData.reactions;
      }

      if (messageData.edited_at != null) {
        cleanMessageData.edited_at = messageData.edited_at;
      }

      if (messageData.deleted_at != null) {
        cleanMessageData.deleted_at = messageData.deleted_at;
      }

      if (messageData.deleted_for != null) {
        cleanMessageData.deleted_for = messageData.deleted_for;
      }

      if (messageData.deleted_for_everyone != null) {
        cleanMessageData.deleted_for_everyone = messageData.deleted_for_everyone;
      }

      if (messageData.deleted_by != null) {
        cleanMessageData.deleted_by = messageData.deleted_by;
      }

      if (messageData.media != null) {
        cleanMessageData.media = messageData.media;
      }

      if (messageData.link_preview != null) {
        cleanMessageData.link_preview = messageData.link_preview;
      }

      if (messageData.location != null) {
        cleanMessageData.location = messageData.location;
      }

      if (messageData.contact != null) {
        cleanMessageData.contact = messageData.contact;
      }

      if (messageData.poll != null) {
        cleanMessageData.poll = messageData.poll;
      }

      if (messageData.mentions != null) {
        cleanMessageData.mentions = messageData.mentions;
      }

      const docRef = await addDoc(messagesRef, cleanMessageData);
      console.log('[addMessage] Created message document:', docRef.id);

      // Update conversation last message time (fire and forget for better performance)
      conversationHelpers.updateConversationLastMessage(messageData.conversation_id).catch(error => {
        console.warn('Failed to update conversation last message time:', error);
      });

      return {
        data: {
          id: docRef.id,
          conversation_id: messageData.conversation_id,
          ...cleanMessageData,
          created_at: new Date() // Temporary client-side timestamp for immediate display
        } as Message,
        error: null
      };
    } catch (error: any) {
      console.error('[addMessage] Error adding message:', error);
      return { data: null, error: error.message };
    }
  },

  // Mark message as read
  async markMessageAsRead(conversationId: string, messageId: string): Promise<FirestoreResponse<Message>> {
    try {
      console.log('[markMessageAsRead] Marking message as read:', { conversationId, messageId });
      const messagePath = `conversations/${conversationId}/messages/${messageId}`;
      console.log('[markMessageAsRead] Using Firestore path:', messagePath);

      const messageRef = doc(db, messagePath);
      await updateDoc(messageRef, {
        is_read: true,
        status: 'read'
      });

      return { data: { id: messageId, is_read: true, status: 'read' } as Message, error: null };
    } catch (error: any) {
      console.error('[markMessageAsRead] Error marking message as read:', error);
      return { data: null, error: error.message };
    }
  },

  // Delete message
  async deleteMessage(conversationId: string, messageId: string): Promise<FirestoreResponse<{ id: string }>> {
    try {
      console.log('[deleteMessage] Deleting message:', { conversationId, messageId });
      const messagePath = `conversations/${conversationId}/messages/${messageId}`;
      console.log('[deleteMessage] Using Firestore path:', messagePath);

      const messageRef = doc(db, messagePath);
      await deleteDoc(messageRef);

      return { data: { id: messageId }, error: null };
    } catch (error: any) {
      console.error('[deleteMessage] Error deleting message:', error);
      return { data: null, error: error.message };
    }
  },

  // Mark message as delivered (receiver device has received it)
  async markMessageAsDelivered(conversationId: string, messageId: string): Promise<FirestoreResponse<Message>> {
    try {
      const messagePath = `conversations/${conversationId}/messages/${messageId}`;
      const messageRef = doc(db, messagePath);
      await updateDoc(messageRef, {
        status: 'delivered'
      });

      return { data: { id: messageId, status: 'delivered' } as Message, error: null };
    } catch (error: any) {
      console.error('[markMessageAsDelivered] Error marking message as delivered:', error);
      return { data: null, error: error.message };
    }
  },

  // Find conversation by owner and participants
  async findConversationByOwnerAndParticipants(ownerId: string, participant1Id: string, participant2Id: string): Promise<FirestoreResponse<Conversation | null>> {
    try {
      const conversationsRef = collection(db, COLLECTIONS.CONVERSATIONS);
      const q = query(
        conversationsRef,
        where('ownerId', '==', ownerId),
        where('participants', 'array-contains', participant1Id)
      );

      const querySnapshot = await getDocs(q);

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        if (data.participants &&
            Array.isArray(data.participants) &&
            data.participants.includes(participant1Id) &&
            data.participants.includes(participant2Id)) {
          return { data: { id: docSnap.id, ...data } as Conversation, error: null };
        }
      }

      return { data: null, error: null };
    } catch (error: any) {
      console.error('[findConversationByOwnerAndParticipants] Error finding conversation:', error);
      return { data: null, error: error.message };
    }
  },

  async deleteMessageForMe(conversationId: string, messageId: string, userId: string): Promise<FirestoreResponse<Message>> {
    try {
      const messagePath = `conversations/${conversationId}/messages/${messageId}`;
      const messageRef = doc(db, messagePath);
      await updateDoc(messageRef, {
        deleted_for: arrayUnion(userId),
        deleted_at: serverTimestamp(),
      });

      return { data: { id: messageId, deleted_for: [userId] } as Message, error: null };
    } catch (error: any) {
      console.error('[deleteMessageForMe] Error deleting message for me:', error);
      return { data: null, error: error.message };
    }
  },

  async deleteMessageForEveryone(conversationId: string, messageId: string, userId: string): Promise<FirestoreResponse<Message>> {
    try {
      const messagePath = `conversations/${conversationId}/messages/${messageId}`;
      const messageRef = doc(db, messagePath);
      await updateDoc(messageRef, {
        deleted_for_everyone: true,
        deleted_by: userId,
        deleted_at: serverTimestamp(),
        content: '',
        attachment_url: null,
        media: [],
      });

      return { data: { id: messageId, deleted_for_everyone: true, deleted_by: userId } as Message, error: null };
    } catch (error: any) {
      console.error('[deleteMessageForEveryone] Error deleting message for everyone:', error);
      return { data: null, error: error.message };
    }
  },

  async deleteConversation(conversationId: string): Promise<FirestoreResponse<{ id: string }>> {
    try {
      const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
      const messagesPath = `conversations/${conversationId}/messages`;
      const messagesRef = collection(db, messagesPath);
      const snapshot = await getDocs(messagesRef);

      const batch = writeBatch(db);
      snapshot.docs.forEach((messageDoc) => {
        batch.delete(messageDoc.ref);
      });
      batch.delete(conversationRef);
      await batch.commit();

      return { data: { id: conversationId }, error: null };
    } catch (error: any) {
      console.error('[deleteConversation] Error deleting conversation:', error);
      return { data: null, error: error.message };
    }
  },

  // Get conversations by user (alias for conversationHelpers)
  getConversationsByUser: conversationHelpers.getConversationsByUser,

  // Create conversation (alias for conversationHelpers)
  createConversation: conversationHelpers.createConversation,

  // Find conversation by property and participants
  findConversationByPropertyAndParticipants: conversationHelpers.findConversationByPropertyAndParticipants,

  // Find conversation by owner and participants
  findConversationByOwnerAndParticipants: conversationHelpers.findConversationByOwnerAndParticipants,

  // Add property reference
  addConversationPropertyReference: conversationHelpers.addConversationPropertyReference,

  // Add new inquiry
  async addInquiry(inquiryData: Omit<Inquiry, 'id' | 'created_at' | 'updated_at'>): Promise<FirestoreResponse<Inquiry>> {
    try {
      const inquiriesRef = collection(db, COLLECTIONS.INQUIRIES);

      // Clean the data - remove undefined values and only include defined fields
      const cleanInquiryData: any = {
        property_id: inquiryData.property_id,
        tenant_id: inquiryData.tenant_id,
        owner_id: inquiryData.owner_id,
        subject: inquiryData.subject,
        message: inquiryData.message,
        status: 'pending',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      // Only add optional fields if they are defined and not null
      if (inquiryData.move_in_date != null) {
        cleanInquiryData.move_in_date = inquiryData.move_in_date;
      }

      if (inquiryData.budget != null) {
        cleanInquiryData.budget = inquiryData.budget;
      }

      const docRef = await addDoc(inquiriesRef, cleanInquiryData);

      return {
        data: {
          id: docRef.id,
          ...cleanInquiryData,
          created_at: new Date(),
          updated_at: new Date()
        } as Inquiry,
        error: null
      };
    } catch (error: any) {
      console.error('Error adding inquiry:', error);
      return { data: null, error: error.message };
    }
  },
};

// Inquiry CRUD Operations
export const inquiryHelpers = {
  // Get inquiries by property
  async getInquiriesByProperty(propertyId: string): Promise<FirestoreResponse<Inquiry[]>> {
    try {
      const inquiriesRef = collection(db, COLLECTIONS.INQUIRIES);
      const q = query(
        inquiriesRef,
        where('property_id', '==', propertyId),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const inquiries: Inquiry[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        inquiries.push({
          id: doc.id,
          ...doc.data()
        } as Inquiry);
      });
      
      return { data: inquiries, error: null };
    } catch (error: any) {
      console.error('Error getting inquiries:', error);
      return { data: null, error: error.message };
    }
  },

  // Get inquiries by user
  async getInquiriesByUser(userId: string, role: 'tenant' | 'owner'): Promise<FirestoreResponse<Inquiry[]>> {
    try {
      const inquiriesRef = collection(db, COLLECTIONS.INQUIRIES);
      const field = role === 'tenant' ? 'tenant_id' : 'owner_id';
      const q = query(
        inquiriesRef,
        where(field, '==', userId),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const inquiries: Inquiry[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        inquiries.push({
          id: doc.id,
          ...doc.data()
        } as Inquiry);
      });
      
      return { data: inquiries, error: null };
    } catch (error: any) {
      console.error('Error getting inquiries:', error);
      return { data: null, error: error.message };
    }
  },

  // Add new inquiry
  async addInquiry(inquiryData: Omit<Inquiry, 'id' | 'created_at' | 'updated_at'>): Promise<FirestoreResponse<Inquiry>> {
    try {
      const inquiriesRef = collection(db, COLLECTIONS.INQUIRIES);

      // Clean the data - remove undefined values and only include defined fields
      const cleanInquiryData: any = {
        property_id: inquiryData.property_id,
        tenant_id: inquiryData.tenant_id,
        owner_id: inquiryData.owner_id,
        subject: inquiryData.subject,
        message: inquiryData.message,
        status: 'pending',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      // Only add optional fields if they are defined and not null
      if (inquiryData.move_in_date != null) {
        cleanInquiryData.move_in_date = inquiryData.move_in_date;
      }

      if (inquiryData.budget != null) {
        cleanInquiryData.budget = inquiryData.budget;
      }

      const docRef = await addDoc(inquiriesRef, cleanInquiryData);

      return {
        data: {
          id: docRef.id,
          ...cleanInquiryData,
          created_at: new Date(),
          updated_at: new Date()
        } as Inquiry,
        error: null
      };
    } catch (error: any) {
      console.error('Error adding inquiry:', error);
      return { data: null, error: error.message };
    }
  },

  // Update inquiry status
  async updateInquiryStatus(inquiryId: string, status: Inquiry['status']): Promise<FirestoreResponse<Inquiry>> {
    try {
      const inquiryRef = doc(db, COLLECTIONS.INQUIRIES, inquiryId);
      await updateDoc(inquiryRef, {
        status,
        updated_at: serverTimestamp()
      });
      
      return { data: { id: inquiryId, status } as Inquiry, error: null };
    } catch (error: any) {
      console.error('Error updating inquiry:', error);
      return { data: null, error: error.message };
    }
  },
};
