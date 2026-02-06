import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase/firebaseConfig';

export type ApplicationNotificationPayload = {
  userId: string;
  actorId?: string;
  title: string;
  body: string;
  applicationId?: string;
  propertyId?: string;
  type?: string;
  data?: Record<string, any>;
};

export const applicationNotifications = {
  async create(payload: ApplicationNotificationPayload) {
    try {
      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        userId: payload.userId,
        actorId: payload.actorId || null,
        title: payload.title,
        body: payload.body,
        applicationId: payload.applicationId || null,
        propertyId: payload.propertyId || null,
        type: payload.type || 'application_update',
        data: payload.data || null,
        createdAt: serverTimestamp(),
        read: false,
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  },
};
