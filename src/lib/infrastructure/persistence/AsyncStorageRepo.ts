import AsyncStorage from "@react-native-async-storage/async-storage";
import { IStorage } from "../../domain/interfaces";
import { logger } from "../../utils/logger";

export class AsyncStorageRepo implements IStorage {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      if (!data) return null;
      try {
        return JSON.parse(data);
      } catch (parseError) {
        logger.error("AsyncStorageRepo", `Failed to parse JSON for key: ${key}`, parseError);
        // Remove corrupted data
        await AsyncStorage.removeItem(key);
        return null;
      }
    } catch (error) {
      logger.error("AsyncStorageRepo", `Failed to get key: ${key}`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await AsyncStorage.setItem(key, serialized);
    } catch (error) {
      logger.error("AsyncStorageRepo", `Failed to set key: ${key}`, error);
      throw error; // Re-throw - set failures are critical
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logger.error("AsyncStorageRepo", `Failed to remove key: ${key}`, error);
      // Don't throw - remove failures are non-critical
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys];
    } catch (error) {
      logger.error("AsyncStorageRepo", "Failed to get all keys", error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      logger.error("AsyncStorageRepo", "Failed to clear storage", error);
      throw error; // Re-throw - clear failures are critical
    }
  }
}
