import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { logger } from '../utils/logger';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? false);
    });

    // Initial check
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? false);
    }).catch(error => {
      logger.error('useNetworkStatus', 'Failed to fetch network status', error);
      setIsConnected(false);
      setIsInternetReachable(false);
    });

    return () => unsubscribe();
  }, []);

  return { isConnected, isInternetReachable };
}
