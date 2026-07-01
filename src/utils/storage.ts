import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "./logger";

/** Simple typed wrapper around AsyncStorage. */
class Storage {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      if (data == null) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error("Storage", `Failed to get key: ${key}`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error("Storage", `Failed to set key: ${key}`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logger.error("Storage", `Failed to remove key: ${key}`, error);
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      return [...(await AsyncStorage.getAllKeys())];
    } catch (error) {
      logger.error("Storage", "Failed to get all keys", error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      logger.error("Storage", "Failed to clear storage", error);
      throw error;
    }
  }
}

export const storage = new Storage();
