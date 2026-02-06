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
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  getDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Property, User, Favorite, Viewing, Application, Payment, Document, SavedProperty } from '../../types/database';

// Timeout helper
const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timeoutHandle: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle);
    return result as T;
  } catch (err) {
    clearTimeout(timeoutHandle);
    throw err;
  }
};

// Collection names
const COLLECTIONS = {
  PROPERTIES: 'properties',
  USERS: 'users',
  FAVORITES: 'favorites',
  VIEWINGS: 'viewings',
  APPLICATIONS: 'applications',
  PAYMENTS: 'payments',
  DOCUMENTS: 'documents',
  SAVED_PROPERTIES: 'saved_properties',
} as const;

// Response types
interface FirestoreResponse<T> {
  data: T | null;
  error: string | null;
}

// Property CRUD Operations
export const propertyHelpers = {
  // Get all properties
  async getAllProperties(): Promise<FirestoreResponse<Property[]>> {
    try {
      const propertiesRef = collection(db, COLLECTIONS.PROPERTIES);
      const q = query(propertiesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const properties: Property[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        properties.push({
          id: doc.id,
          ...doc.data()
        } as Property);
      });
      
      return { data: properties, error: null };
    } catch (error: any) {
      console.error('Error getting properties:', error);
      return { data: null, error: error.message };
    }
  },

  // Get properties by owner
  async getPropertiesByOwner(ownerId: string): Promise<FirestoreResponse<Property[]>> {
    try {
      const propertiesRef = collection(db, COLLECTIONS.PROPERTIES);
      const q = query(
        propertiesRef, 
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const properties: Property[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        properties.push({
          id: doc.id,
          ...doc.data()
        } as Property);
      });
      
      return { data: properties, error: null };
    } catch (error: any) {
      console.error('Error getting properties by owner:', error);
      return { data: null, error: error.message };
    }
  },

  // Get property by ID
  async getPropertyById(propertyId: string): Promise<FirestoreResponse<Property>> {
    try {
      const propertyRef = doc(db, COLLECTIONS.PROPERTIES, propertyId);
      const propertyDoc = await getDoc(propertyRef);
      
      if (propertyDoc.exists()) {
        return { 
          data: { id: propertyDoc.id, ...propertyDoc.data() } as Property, 
          error: null 
        };
      } else {
        return { data: null, error: 'Property not found' };
      }
    } catch (error: any) {
      console.error('Error getting property:', error);
      return { data: null, error: error.message };
    }
  },

  // Add new property
  async addProperty(propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreResponse<Property>> {
    try {
      const propertiesRef = collection(db, COLLECTIONS.PROPERTIES);
      const docRef = await withTimeout(
        addDoc(propertiesRef, {
          ...propertyData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }),
        30000,
        'addProperty'
      );
      
      return { data: { id: docRef.id, ...propertyData } as Property, error: null };
    } catch (error: any) {
      console.error('Error adding property:', error);
      return { data: null, error: error.message };
    }
  },

  // Update property
  async updateProperty(propertyId: string, updateData: Partial<Property>): Promise<FirestoreResponse<Property>> {
    try {
      const propertyRef = doc(db, COLLECTIONS.PROPERTIES, propertyId);
      await withTimeout(
        updateDoc(propertyRef, {
          ...updateData,
          updatedAt: serverTimestamp()
        }),
        30000,
        'updateProperty'
      );
      
      return { data: { id: propertyId, ...updateData } as Property, error: null };
    } catch (error: any) {
      console.error('Error updating property:', error);
      return { data: null, error: error.message };
    }
  },

  // Delete property
  async deleteProperty(propertyId: string): Promise<FirestoreResponse<{ id: string }>> {
    try {
      const propertyRef = doc(db, COLLECTIONS.PROPERTIES, propertyId);
      await withTimeout(deleteDoc(propertyRef), 30000, 'deleteProperty');
      
      return { data: { id: propertyId }, error: null };
    } catch (error: any) {
      console.error('Error deleting property:', error);
      return { data: null, error: error.message };
    }
  },

  // Search properties with filters
  async searchProperties(filters: {
    city?: string;
    propertyType?: Property['propertyType'];
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    status?: Property['status'];
    limit?: number;
  } = {}): Promise<FirestoreResponse<Property[]>> {
    try {
      const propertiesRef = collection(db, COLLECTIONS.PROPERTIES);
      // Simplified query to avoid composite index: only status filter + createdAt ordering
      let q = query(propertiesRef);

      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      q = query(q, orderBy('createdAt', 'desc'));

      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      const querySnapshot = await withTimeout(getDocs(q), 30000, 'searchProperties');
      
      const properties: Property[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        properties.push({
          id: doc.id,
          ...doc.data()
        } as Property);
      });
      
      return { data: properties, error: null };
    } catch (error: any) {
      console.error('Error searching properties:', error);
      return { data: null, error: error.message };
    }
  }
};

// User CRUD Operations
export const userHelpers = {
  // Get user by ID
  async getUserById(userId: string): Promise<FirestoreResponse<User>> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return { 
          data: { id: userDoc.id, ...userDoc.data() } as User, 
          error: null 
        };
      } else {
        // Fallback for legacy users stored with a different document id
        const usersRef = collection(db, COLLECTIONS.USERS);
        const q = query(usersRef, where('uid', '==', userId), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          return {
            data: { id: docSnap.id, ...docSnap.data() } as User,
            error: null
          };
        }
        return { data: null, error: 'User not found' };
      }
    } catch (error: any) {
      // Only log unexpected errors, not offline
      if (!error.message?.includes('client is offline')) {
        console.error('Error getting user:', error);
      }
      return { data: null, error: error.message };
    }
  },

  // Add new user
  async addUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreResponse<User>> {
    try {
      const usersRef = collection(db, COLLECTIONS.USERS);
      const docRef = await addDoc(usersRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { data: { id: docRef.id, ...userData } as User, error: null };
    } catch (error: any) {
      console.error('Error adding user:', error);
      return { data: null, error: error.message };
    }
  },

  // Update user
  async updateUser(userId: string, updateData: Partial<User>): Promise<FirestoreResponse<User>> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      
      return { data: { id: userId, ...updateData } as User, error: null };
    } catch (error: any) {
      console.error('Error updating user:', error);
      return { data: null, error: error.message };
    }
  }
};

// Favorites CRUD Operations
export const favoriteHelpers = {
  // Get favorites by user
  async getFavoritesByUser(userId: string): Promise<FirestoreResponse<Property[]>> {
    try {
      const favoritesPath = `users/${userId}/favorites`;
      console.log('🔍 favoriteHelpers: Getting favorites for user:', userId);
      console.log('🔍 favoriteHelpers: Using Firestore path:', favoritesPath);

      const favoritesRef = collection(db, favoritesPath);
      const q = query(
        favoritesRef,
        orderBy('created_at', 'desc')
      );

      console.log('🔍 favoriteHelpers: Executing favorites query...');
      const querySnapshot = await getDocs(q);
      console.log('🔍 favoriteHelpers: Query returned', querySnapshot.size, 'documents');

      const favoriteIds: string[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        console.log('🔍 favoriteHelpers: Favorite doc:', doc.id, '->', data);
        favoriteIds.push(data.property_id);
      });

      console.log('🔍 favoriteHelpers: Found favorite property IDs:', favoriteIds);

      // Get the actual property data for each favorite
      const properties: Property[] = [];
      for (const propertyId of favoriteIds) {
        console.log('🔍 favoriteHelpers: Fetching property:', propertyId);
        const propertyResult = await propertyHelpers.getPropertyById(propertyId);
        if (propertyResult.data) {
          console.log('🔍 favoriteHelpers: Property found:', propertyResult.data.title);
          properties.push(propertyResult.data);
        } else {
          console.log('🔍 favoriteHelpers: Property NOT found:', propertyId);
        }
      }

      console.log('🔍 favoriteHelpers: Returning', properties.length, 'properties');
      return { data: properties, error: null };
    } catch (error: any) {
      console.error('🔍 favoriteHelpers: Error getting favorites:', error);
      return { data: null, error: error.message };
    }
  },

  // Add favorite
  async addFavorite(favoriteData: { userId: string; propertyId: string }): Promise<FirestoreResponse<Favorite>> {
    try {
      const favoritesPath = `users/${favoriteData.userId}/favorites`;
      console.log('🔍 favoriteHelpers: Adding favorite for user:', favoriteData.userId);
      console.log('🔍 favoriteHelpers: Using Firestore path:', favoritesPath);

      const favoritesRef = collection(db, favoritesPath);
      const docRef = await addDoc(favoritesRef, {
        property_id: favoriteData.propertyId,
        created_at: serverTimestamp()
      });

      console.log('🔍 favoriteHelpers: Created favorite document:', docRef.id);

      // Mirror to saved_properties collection for profile stats
      // Note: If rules don't allow this collection yet, we ignore the error
      try {
        await addDoc(collection(db, COLLECTIONS.SAVED_PROPERTIES), {
          userId: favoriteData.userId,
          propertyId: favoriteData.propertyId,
          createdAt: serverTimestamp(),
        });
      } catch (mirrorError: any) {
        console.warn('favoriteHelpers: saved_properties mirror failed:', mirrorError?.message || mirrorError);
      }

      return { data: {
        id: docRef.id,
        user_id: favoriteData.userId, // Keep for compatibility
        property_id: favoriteData.propertyId,
        created_at: new Date().toISOString()
      } as Favorite, error: null };
    } catch (error: any) {
      console.error('🔍 favoriteHelpers: Error adding favorite:', error);
      return { data: null, error: error.message };
    }
  },

  // Remove favorite
  async removeFavorite(userId: string, propertyId: string): Promise<FirestoreResponse<{ id: string }>> {
    try {
      const favoritesRef = collection(db, `users/${userId}/favorites`);
      const q = query(favoritesRef, where('property_id', '==', propertyId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0];
        await deleteDoc(docRef.ref);
      }

      const savedRef = collection(db, COLLECTIONS.SAVED_PROPERTIES);
      const savedQuery = query(
        savedRef,
        where('userId', '==', userId),
        where('propertyId', '==', propertyId)
      );
      const savedSnapshot = await getDocs(savedQuery);
      if (!savedSnapshot.empty) {
        await deleteDoc(savedSnapshot.docs[0].ref);
      }

      return { data: querySnapshot.empty ? null : { id: querySnapshot.docs[0].id }, error: null };
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      return { data: null, error: error.message };
    }
  },

  // Check if property is favorited
  async isFavorite(userId: string, propertyId: string): Promise<FirestoreResponse<boolean>> {
    try {
      const favoritesRef = collection(db, COLLECTIONS.FAVORITES);
      const q = query(
        favoritesRef,
        where('user_id', '==', userId),
        where('property_id', '==', propertyId)
      );
      const querySnapshot = await getDocs(q);
      
      return { data: !querySnapshot.empty, error: null };
    } catch (error: any) {
      console.error('Error checking favorite:', error);
      return { data: null, error: error.message };
    }
  }
};

// Viewings CRUD Operations
export const viewingHelpers = {
  async createViewing(data: Omit<Viewing, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreResponse<Viewing>> {
    try {
      const viewingsRef = collection(db, COLLECTIONS.VIEWINGS);
      const payload = {
        ...data,
        scheduledAt: data.scheduledAt instanceof Date ? Timestamp.fromDate(data.scheduledAt) : data.scheduledAt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await withTimeout(addDoc(viewingsRef, payload), 30000, 'createViewing');
      return { data: { id: docRef.id, ...data } as Viewing, error: null };
    } catch (error: any) {
      console.error('Error creating viewing:', error);
      return { data: null, error: error.message };
    }
  },

  async updateViewing(viewingId: string, updateData: Partial<Viewing>): Promise<FirestoreResponse<Viewing>> {
    try {
      const viewingRef = doc(db, COLLECTIONS.VIEWINGS, viewingId);
      const payload: Record<string, any> = {
        ...updateData,
        updatedAt: serverTimestamp(),
      };
      if (updateData.scheduledAt instanceof Date) {
        payload.scheduledAt = Timestamp.fromDate(updateData.scheduledAt);
      }
      await withTimeout(updateDoc(viewingRef, payload), 30000, 'updateViewing');
      return { data: { id: viewingId, ...updateData } as Viewing, error: null };
    } catch (error: any) {
      console.error('Error updating viewing:', error);
      return { data: null, error: error.message };
    }
  },

  async getViewingById(viewingId: string): Promise<FirestoreResponse<Viewing>> {
    try {
      const viewingRef = doc(db, COLLECTIONS.VIEWINGS, viewingId);
      const viewingDoc = await getDoc(viewingRef);

      if (viewingDoc.exists()) {
        return {
          data: { id: viewingDoc.id, ...viewingDoc.data() } as Viewing,
          error: null
        };
      }
      return { data: null, error: 'Viewing not found' };
    } catch (error: any) {
      console.error('Error getting viewing:', error);
      return { data: null, error: error.message };
    }
  },

  async getViewingsForTenant(tenantId: string): Promise<FirestoreResponse<Viewing[]>> {
    try {
      const viewingsRef = collection(db, COLLECTIONS.VIEWINGS);
      const q = query(
        viewingsRef,
        where('tenantId', '==', tenantId),
        orderBy('scheduledAt', 'asc')
      );
      const snapshot = await getDocs(q);
      const viewings: Viewing[] = [];
      snapshot.forEach((docSnap) => {
        viewings.push({ id: docSnap.id, ...docSnap.data() } as Viewing);
      });
      return { data: viewings, error: null };
    } catch (error: any) {
      console.error('Error getting tenant viewings:', error);
      return { data: null, error: error.message };
    }
  },

  async getViewingsForOwner(ownerId: string): Promise<FirestoreResponse<Viewing[]>> {
    try {
      const viewingsRef = collection(db, COLLECTIONS.VIEWINGS);
      const q = query(
        viewingsRef,
        where('ownerId', '==', ownerId),
        orderBy('scheduledAt', 'asc')
      );
      const snapshot = await getDocs(q);
      const viewings: Viewing[] = [];
      snapshot.forEach((docSnap) => {
        viewings.push({ id: docSnap.id, ...docSnap.data() } as Viewing);
      });
      return { data: viewings, error: null };
    } catch (error: any) {
      console.error('Error getting owner viewings:', error);
      return { data: null, error: error.message };
    }
  }
};

// Applications CRUD Operations
export const applicationHelpers = {
  async createApplication(data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreResponse<Application>> {
    try {
      const applicationsRef = collection(db, COLLECTIONS.APPLICATIONS);
      const payload = {
        ...data,
        status: data.status || 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await withTimeout(addDoc(applicationsRef, payload), 30000, 'createApplication');
      return { data: { id: docRef.id, ...data } as Application, error: null };
    } catch (error: any) {
      console.error('Error creating application:', error);
      return { data: null, error: error.message };
    }
  },

  async getApplicationById(applicationId: string): Promise<FirestoreResponse<Application>> {
    try {
      const applicationRef = doc(db, COLLECTIONS.APPLICATIONS, applicationId);
      const snapshot = await getDoc(applicationRef);
      if (snapshot.exists()) {
        return { data: { id: snapshot.id, ...snapshot.data() } as Application, error: null };
      }
      return { data: null, error: 'Application not found' };
    } catch (error: any) {
      console.error('Error getting application:', error);
      return { data: null, error: error.message };
    }
  },

  async updateApplication(applicationId: string, updates: Partial<Application>): Promise<FirestoreResponse<Application>> {
    try {
      const applicationRef = doc(db, COLLECTIONS.APPLICATIONS, applicationId);
      await withTimeout(
        updateDoc(applicationRef, {
          ...updates,
          updatedAt: serverTimestamp(),
        }),
        30000,
        'updateApplication'
      );

      return { data: { id: applicationId, ...updates } as Application, error: null };
    } catch (error: any) {
      console.error('Error updating application:', error);
      return { data: null, error: error.message };
    }
  },

  async getApplicationsForTenant(tenantId: string): Promise<FirestoreResponse<Application[]>> {
    try {
      const applicationsRef = collection(db, COLLECTIONS.APPLICATIONS);
      const q = query(applicationsRef, where('tenantId', '==', tenantId));
      const snapshot = await getDocs(q);
      const applications: Application[] = [];
      snapshot.forEach((docSnap) => {
        applications.push({ id: docSnap.id, ...docSnap.data() } as Application);
      });
      return { data: applications, error: null };
    } catch (error: any) {
      console.error('Error getting tenant applications:', error);
      return { data: null, error: error.message };
    }
  },

  async getApplicationsForOwner(ownerId: string): Promise<FirestoreResponse<Application[]>> {
    try {
      const applicationsRef = collection(db, COLLECTIONS.APPLICATIONS);
      const q = query(applicationsRef, where('ownerId', '==', ownerId));
      const snapshot = await getDocs(q);
      const applications: Application[] = [];
      snapshot.forEach((docSnap) => {
        applications.push({ id: docSnap.id, ...docSnap.data() } as Application);
      });
      return { data: applications, error: null };
    } catch (error: any) {
      console.error('Error getting owner applications:', error);
      return { data: null, error: error.message };
    }
  },
};

// Payments CRUD Operations
export const paymentHelpers = {
  async createPayment(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreResponse<Payment>> {
    try {
      const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
      const payload = {
        ...data,
        status: data.status || 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await withTimeout(addDoc(paymentsRef, payload), 30000, 'createPayment');
      return { data: { id: docRef.id, ...data } as Payment, error: null };
    } catch (error: any) {
      console.error('Error creating payment:', error);
      return { data: null, error: error.message };
    }
  },

  async getPaymentsForTenant(tenantId: string): Promise<FirestoreResponse<Payment[]>> {
    try {
      const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
      const q = query(paymentsRef, where('tenantId', '==', tenantId));
      const snapshot = await getDocs(q);
      const payments: Payment[] = [];
      snapshot.forEach((docSnap) => {
        payments.push({ id: docSnap.id, ...docSnap.data() } as Payment);
      });
      return { data: payments, error: null };
    } catch (error: any) {
      console.error('Error getting tenant payments:', error);
      return { data: null, error: error.message };
    }
  },

  async getPaymentsForOwner(ownerId: string): Promise<FirestoreResponse<Payment[]>> {
    try {
      const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
      const q = query(paymentsRef, where('ownerId', '==', ownerId));
      const snapshot = await getDocs(q);
      const payments: Payment[] = [];
      snapshot.forEach((docSnap) => {
        payments.push({ id: docSnap.id, ...docSnap.data() } as Payment);
      });
      return { data: payments, error: null };
    } catch (error: any) {
      console.error('Error getting owner payments:', error);
      return { data: null, error: error.message };
    }
  },
};

// Documents CRUD Operations
export const documentHelpers = {
  async createDocument(data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreResponse<Document>> {
    try {
      const documentsRef = collection(db, COLLECTIONS.DOCUMENTS);
      const payload = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await withTimeout(addDoc(documentsRef, payload), 30000, 'createDocument');
      return { data: { id: docRef.id, ...data } as Document, error: null };
    } catch (error: any) {
      console.error('Error creating document:', error);
      return { data: null, error: error.message };
    }
  },

  async getDocumentsForUser(userId: string): Promise<FirestoreResponse<Document[]>> {
    try {
      const documentsRef = collection(db, COLLECTIONS.DOCUMENTS);
      const q = query(documentsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const documents: Document[] = [];
      snapshot.forEach((docSnap) => {
        documents.push({ id: docSnap.id, ...docSnap.data() } as Document);
      });
      return { data: documents, error: null };
    } catch (error: any) {
      console.error('Error getting documents:', error);
      return { data: null, error: error.message };
    }
  },
};

// Saved properties (tenant favorites mirror)
export const savedPropertyHelpers = {
  async addSavedProperty(data: { userId: string; propertyId: string }): Promise<FirestoreResponse<SavedProperty>> {
    try {
      const savedRef = collection(db, COLLECTIONS.SAVED_PROPERTIES);
      const payload = {
        userId: data.userId,
        propertyId: data.propertyId,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(savedRef, payload);
      return { data: { id: docRef.id, ...data } as SavedProperty, error: null };
    } catch (error: any) {
      console.error('Error adding saved property:', error);
      return { data: null, error: error.message };
    }
  },

  async removeSavedProperty(userId: string, propertyId: string): Promise<FirestoreResponse<{ id: string }>> {
    try {
      const savedRef = collection(db, COLLECTIONS.SAVED_PROPERTIES);
      const q = query(
        savedRef,
        where('userId', '==', userId),
        where('propertyId', '==', propertyId)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return { data: null, error: 'Saved property not found' };
      }
      const docRef = snapshot.docs[0].ref;
      await deleteDoc(docRef);
      return { data: { id: snapshot.docs[0].id }, error: null };
    } catch (error: any) {
      console.error('Error removing saved property:', error);
      return { data: null, error: error.message };
    }
  },
};

// Export all helpers
export default {
  propertyHelpers,
  userHelpers,
  favoriteHelpers,
  viewingHelpers,
  applicationHelpers,
  paymentHelpers,
  documentHelpers,
  savedPropertyHelpers,
};

