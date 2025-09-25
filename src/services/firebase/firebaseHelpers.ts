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
import { Property, User, Favorite } from '../../types/database';

// Collection names
const COLLECTIONS = {
  PROPERTIES: 'properties',
  USERS: 'users',
  FAVORITES: 'favorites'
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
      const docRef = await addDoc(propertiesRef, {
        ...propertyData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
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
      await updateDoc(propertyRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      
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
      await deleteDoc(propertyRef);
      
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
      let q = query(propertiesRef);

      // Apply filters
      if (filters.city) {
        q = query(q, where('city', '==', filters.city));
      }
      if (filters.propertyType) {
        q = query(q, where('propertyType', '==', filters.propertyType));
      }
      if (filters.minPrice !== undefined) {
        q = query(q, where('price', '>=', filters.minPrice));
      }
      if (filters.maxPrice !== undefined) {
        q = query(q, where('price', '<=', filters.maxPrice));
      }
      if (filters.bedrooms) {
        q = query(q, where('bedrooms', '>=', filters.bedrooms));
      }
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      // Order by creation date
      q = query(q, orderBy('createdAt', 'desc'));

      // Apply limit if specified
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

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
      const favoritesRef = collection(db, COLLECTIONS.FAVORITES);
      const q = query(
        favoritesRef,
        where('user_id', '==', userId),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const favoriteIds: string[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        favoriteIds.push(doc.data().property_id);
      });

      // Get the actual property data for each favorite
      const properties: Property[] = [];
      for (const propertyId of favoriteIds) {
        const propertyResult = await propertyHelpers.getPropertyById(propertyId);
        if (propertyResult.data) {
          properties.push(propertyResult.data);
        }
      }
      
      return { data: properties, error: null };
    } catch (error: any) {
      console.error('Error getting favorites:', error);
      return { data: null, error: error.message };
    }
  },

  // Add favorite
  async addFavorite(favoriteData: { userId: string; propertyId: string }): Promise<FirestoreResponse<Favorite>> {
    try {
      const favoritesRef = collection(db, COLLECTIONS.FAVORITES);
      const docRef = await addDoc(favoritesRef, {
        user_id: favoriteData.userId,
        property_id: favoriteData.propertyId,
        created_at: serverTimestamp()
      });
      
      return { data: { 
        id: docRef.id, 
        user_id: favoriteData.userId,
        property_id: favoriteData.propertyId,
        created_at: new Date().toISOString()
      } as Favorite, error: null };
    } catch (error: any) {
      console.error('Error adding favorite:', error);
      return { data: null, error: error.message };
    }
  },

  // Remove favorite
  async removeFavorite(userId: string, propertyId: string): Promise<FirestoreResponse<{ id: string }>> {
    try {
      const favoritesRef = collection(db, COLLECTIONS.FAVORITES);
      const q = query(
        favoritesRef,
        where('user_id', '==', userId),
        where('property_id', '==', propertyId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0];
        await deleteDoc(docRef.ref);
        return { data: { id: docRef.id }, error: null };
      } else {
        return { data: null, error: 'Favorite not found' };
      }
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

// Export all helpers
export default {
  propertyHelpers,
  userHelpers,
  favoriteHelpers
}; 