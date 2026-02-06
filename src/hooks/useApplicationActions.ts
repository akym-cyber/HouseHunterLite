import { serverTimestamp } from 'firebase/firestore';
import { conversationHelpers, messageHelpers } from '../services/firebase/messageHelpers';
import { applicationHelpers } from '../services/firebase/firebaseHelpers';
import { applicationNotifications } from '../services/applicationNotifications';
import { Application } from '../types/database';

const ensureConversation = async (propertyId: string, ownerId: string, tenantId: string) => {
  const existing = await conversationHelpers.findConversationByOwnerAndParticipants(ownerId, ownerId, tenantId);
  if (existing.data) {
    await conversationHelpers.addConversationPropertyReference(existing.data.id, propertyId);
    return existing.data.id;
  }
  const created = await conversationHelpers.createConversation({
    property_id: propertyId,
    ownerId,
    propertyReferences: [propertyId],
    participants: [ownerId, tenantId],
    participant1_id: ownerId,
    participant2_id: tenantId,
  } as any);
  return created.data?.id || null;
};

export const useApplicationActions = () => {
  const approveApplication = async (application: Application) => {
    const result = await applicationHelpers.updateApplication(application.id, {
      status: 'approved',
      decisionDate: serverTimestamp(),
      decisionNotes: 'Approved',
    });

    if (!result.error) {
      await applicationNotifications.create({
        userId: application.tenantId,
        actorId: application.ownerId,
        title: 'Application approved',
        body: 'Your application has been approved.',
        applicationId: application.id,
        propertyId: application.propertyId,
      });

      await ensureConversation(application.propertyId, application.ownerId, application.tenantId);
    }

    return result;
  };

  const rejectApplication = async (application: Application, reason?: string) => {
    const result = await applicationHelpers.updateApplication(application.id, {
      status: 'rejected',
      decisionDate: serverTimestamp(),
      decisionNotes: reason || 'Rejected',
    });

    if (!result.error) {
      await applicationNotifications.create({
        userId: application.tenantId,
        actorId: application.ownerId,
        title: 'Application update',
        body: reason ? `Application rejected: ${reason}` : 'Your application was not approved.',
        applicationId: application.id,
        propertyId: application.propertyId,
      });
    }

    return result;
  };

  const requestMoreInfo = async (application: Application, message: string) => {
    const result = await applicationHelpers.updateApplication(application.id, {
      status: 'needs_info',
      decisionDate: serverTimestamp(),
      decisionNotes: message,
    });

    if (!result.error) {
      await applicationNotifications.create({
        userId: application.tenantId,
        actorId: application.ownerId,
        title: 'More information requested',
        body: message || 'The owner requested more information about your application.',
        applicationId: application.id,
        propertyId: application.propertyId,
      });

      const conversationId = await ensureConversation(application.propertyId, application.ownerId, application.tenantId);
      if (conversationId && message) {
        await messageHelpers.addMessage({
          conversation_id: conversationId,
          sender_id: application.ownerId,
          content: message,
          message_type: 'text',
          is_read: false,
        } as any);
      }
    }

    return result;
  };

  return {
    approveApplication,
    rejectApplication,
    requestMoreInfo,
  };
};
