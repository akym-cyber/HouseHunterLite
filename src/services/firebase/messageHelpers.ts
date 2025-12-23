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
  limit,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  getDoc
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
      const conversationsRef = collection(db, COLLECTIONS.CONVERSATIONS);
      const q = query(
        conversationsRef,
        where('participant1_id', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      const conversations: Conversation[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        conversations.push({
          id: doc.id,
          ...doc.data()
        } as Conversation);
      });

      // Also get conversations where user is participant2
      const q2 = query(
        conversationsRef,
        where('participant2_id', '==', userId)
      );
      const querySnapshot2 = await getDocs(q2);
      
      querySnapshot2.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        conversations.push({
          id: doc.id,
          ...doc.data()
        } as Conversation);
      });

      // Sort by last message time
      conversations.sort((a, b) => 
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
      
      return { data: conversations, error: null };
    } catch (error: any) {
      console.error('Error getting conversations:', error);
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
};

// Message CRUD Operations
export const messageHelpers = {
  // Get messages by conversation
  async getMessagesByConversation(conversationId: string): Promise<FirestoreResponse<Message[]>> {
    try {
      const messagesRef = collection(db, COLLECTIONS.MESSAGES);
      const q = query(
        messagesRef,
        where('conversation_id', '==', conversationId),
        orderBy('created_at', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      const messages: Message[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        } as Message);
      });
      
      return { data: messages, error: null };
    } catch (error: any) {
      console.error('Error getting messages:', error);
      return { data: null, error: error.message };
    }
  },

  // Add new message
  async addMessage(messageData: Omit<Message, 'id' | 'created_at'>): Promise<FirestoreResponse<Message>> {
    try {
      const messagesRef = collection(db, COLLECTIONS.MESSAGES);

      // Clean the data - remove undefined values and only include defined fields
      const cleanMessageData: any = {
        conversation_id: messageData.conversation_id,
        sender_id: messageData.sender_id,
        content: messageData.content,
        message_type: messageData.message_type || 'text',
        is_read: false,
        created_at: serverTimestamp()
      };

      // Only add optional fields if they are defined and not null
      if (messageData.attachment_url != null) {
        cleanMessageData.attachment_url = messageData.attachment_url;
      }

      if (messageData.status != null) {
        cleanMessageData.status = messageData.status;
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

      // Update conversation last message time (fire and forget for better performance)
      conversationHelpers.updateConversationLastMessage(messageData.conversation_id).catch(error => {
        console.warn('Failed to update conversation last message time:', error);
      });

      return {
        data: {
          id: docRef.id,
          ...cleanMessageData,
          created_at: new Date() // Temporary client-side timestamp for immediate display
        } as Message,
        error: null
      };
    } catch (error: any) {
      console.error('Error adding message:', error);
      return { data: null, error: error.message };
    }
  },

  // Mark message as read
  async markMessageAsRead(messageId: string): Promise<FirestoreResponse<Message>> {
    try {
      const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
      await updateDoc(messageRef, {
        is_read: true
      });
      
      return { data: { id: messageId, is_read: true } as Message, error: null };
    } catch (error: any) {
      console.error('Error marking message as read:', error);
      return { data: null, error: error.message };
    }
  },

  // Delete message
  async deleteMessage(messageId: string): Promise<FirestoreResponse<{ id: string }>> {
    try {
      const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
      await deleteDoc(messageRef);
      
      return { data: { id: messageId }, error: null };
    } catch (error: any) {
      console.error('Error deleting message:', error);
      return { data: null, error: error.message };
    }
  },

  // Get conversations by user (alias for conversationHelpers)
  getConversationsByUser: conversationHelpers.getConversationsByUser,

  // Create conversation (alias for conversationHelpers)
  createConversation: conversationHelpers.createConversation,

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
