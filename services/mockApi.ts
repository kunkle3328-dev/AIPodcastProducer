import type { User, Episode, Subscription, PlanType } from '../types';

// This file simulates a backend (Firebase/Stripe).
// User and subscription data persists in localStorage, but episode data is stored
// in-memory to prevent exceeding localStorage quotas with large base64 strings.

const MOCK_USER: User = {
  id: 'user-123',
  name: 'Alex Doe',
  email: 'alex.doe@example.com',
  credits: 15,
  plan: 'pro',
};

const MOCK_SUBSCRIPTION: Subscription = {
    id: 'sub-abc',
    userId: 'user-123',
    stripeId: 'stripe-id-xyz',
    planType: 'pro',
    renewalDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    status: 'active',
};

// In-memory store for episodes to avoid localStorage quota errors. Resets on page refresh.
// Note: In a real app with persistent storage, we would delete from DB.
let MOCK_EPISODES: Episode[] = [];

const getFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

const saveToStorage = <T,>(key: string, value: T) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error writing to localStorage key “${key}”:`, error);
    }
};

export const api = {
  async getCurrentUser(): Promise<User> {
    // Simulate fetching the logged-in user
    return new Promise(resolve => setTimeout(() => resolve(getFromStorage('user', MOCK_USER)), 500));
  },

  async getUserEpisodes(userId: string): Promise<Episode[]> {
    // Simulate fetching episodes for a user from the in-memory store
    return new Promise(resolve => setTimeout(() => resolve(MOCK_EPISODES.filter(ep => ep.userId === userId)), 500));
  },

  async saveEpisode(episode: Omit<Episode, 'id' | 'createdAt'>): Promise<Episode> {
    // Simulate saving a new episode to the in-memory store
    const user = await this.getCurrentUser();
    const newEpisode: Episode = {
      ...episode,
      id: `ep-${Date.now()}`,
      createdAt: Date.now(),
    };
    MOCK_EPISODES.unshift(newEpisode); // Add to the beginning of the array
    
    // Deduct credits from user profile in localStorage
    const minutesUsed = newEpisode.lengthInMinutes;
    user.credits -= minutesUsed;
    saveToStorage('user', user);

    return new Promise(resolve => setTimeout(() => resolve(newEpisode), 500));
  },
  
  async getSubscription(userId: string): Promise<Subscription> {
      return new Promise(resolve => setTimeout(() => resolve(getFromStorage(`subscription_${userId}`, MOCK_SUBSCRIPTION)), 500));
  },

  async updateSubscription(userId: string, newPlan: PlanType): Promise<Subscription> {
      const sub = await this.getSubscription(userId);
      sub.planType = newPlan;
      saveToStorage(`subscription_${userId}`, sub);
      const user = await this.getCurrentUser();
      user.plan = newPlan;
      saveToStorage('user', user);
      return new Promise(resolve => setTimeout(() => resolve(sub), 500));
  },

  async clearAllData(): Promise<void> {
    // Clear in-memory episodes
    MOCK_EPISODES = [];
    // Clear relevant localStorage items (excluding API key if stored there by system)
    localStorage.removeItem('user');
    localStorage.removeItem('default_options');
    // Note: We deliberately don't clear subscription to avoid breaking the app flow completely
    return new Promise(resolve => setTimeout(resolve, 500));
  }
};