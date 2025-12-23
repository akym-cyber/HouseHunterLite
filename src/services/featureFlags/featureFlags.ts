import { doc, getDoc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  conditions?: {
    platform?: 'ios' | 'android' | 'web';
    version?: string;
    userIds?: string[];
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      const flagsRef = collection(db, 'feature_flags');
      const flagsSnapshot = await getDoc(doc(flagsRef, 'flags'));

      if (flagsSnapshot.exists()) {
        const flagsData = flagsSnapshot.data();
        Object.entries(flagsData).forEach(([key, value]) => {
          this.flags.set(key, value as FeatureFlag);
        });
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize feature flags:', error);
      // Fallback to default flags
      this.setDefaultFlags();
    }
  }

  private setDefaultFlags() {
    const defaultFlags: FeatureFlag[] = [
      {
        id: 'voice_messages',
        name: 'Voice Messages',
        description: 'Enable voice message recording and playback',
        enabled: true,
        rolloutPercentage: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system'
      },
      {
        id: 'image_sharing',
        name: 'Image Sharing',
        description: 'Allow users to share images in chat',
        enabled: true,
        rolloutPercentage: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system'
      },
      {
        id: 'message_reactions',
        name: 'Message Reactions',
        description: 'Allow users to react to messages with emojis',
        enabled: true,
        rolloutPercentage: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system'
      },
      {
        id: 'typing_indicators',
        name: 'Typing Indicators',
        description: 'Show when users are typing',
        enabled: true,
        rolloutPercentage: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system'
      }
    ];

    defaultFlags.forEach(flag => {
      this.flags.set(flag.id, flag);
    });
  }

  async isEnabled(flagId: string, userId?: string, context?: {
    platform?: string;
    version?: string;
  }): Promise<boolean> {
    await this.initialize();

    const flag = this.flags.get(flagId);
    if (!flag) return false;

    if (!flag.enabled) return false;

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const userHash = userId ? this.hashString(userId) : Math.random();
      const userPercentage = (userHash % 100) + 1;
      if (userPercentage > flag.rolloutPercentage) {
        return false;
      }
    }

    // Check conditions
    if (flag.conditions) {
      if (flag.conditions.platform && context?.platform) {
        if (flag.conditions.platform !== context.platform) {
          return false;
        }
      }

      if (flag.conditions.version && context?.version) {
        if (!this.versionMatches(flag.conditions.version, context.version)) {
          return false;
        }
      }

      if (flag.conditions.userIds && userId) {
        if (!flag.conditions.userIds.includes(userId)) {
          return false;
        }
      }
    }

    return true;
  }

  async setFlag(flagId: string, enabled: boolean, userId: string) {
    const flag = this.flags.get(flagId);
    if (!flag) {
      throw new Error(`Feature flag ${flagId} not found`);
    }

    const updatedFlag: FeatureFlag = {
      ...flag,
      enabled,
      updatedAt: new Date().toISOString(),
      createdBy: userId
    };

    this.flags.set(flagId, updatedFlag);

    // Persist to Firestore
    try {
      const flagsRef = collection(db, 'feature_flags');
      const flagsData = Object.fromEntries(this.flags);
      await setDoc(doc(flagsRef, 'flags'), flagsData);
    } catch (error) {
      console.error('Failed to persist feature flag:', error);
      throw error;
    }
  }

  async updateRollout(flagId: string, percentage: number, userId: string) {
    const flag = this.flags.get(flagId);
    if (!flag) {
      throw new Error(`Feature flag ${flagId} not found`);
    }

    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    const updatedFlag: FeatureFlag = {
      ...flag,
      rolloutPercentage: percentage,
      updatedAt: new Date().toISOString(),
      createdBy: userId
    };

    this.flags.set(flagId, updatedFlag);

    // Persist to Firestore
    try {
      const flagsRef = collection(db, 'feature_flags');
      const flagsData = Object.fromEntries(this.flags);
      await setDoc(doc(flagsRef, 'flags'), flagsData);
    } catch (error) {
      console.error('Failed to persist feature flag:', error);
      throw error;
    }
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private versionMatches(required: string, current: string): boolean {
    // Simple version comparison (can be enhanced)
    const requiredParts = required.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < Math.max(requiredParts.length, currentParts.length); i++) {
      const req = requiredParts[i] || 0;
      const cur = currentParts[i] || 0;

      if (cur > req) return true;
      if (cur < req) return false;
    }

    return true;
  }
}

export const featureFlagService = new FeatureFlagService();
