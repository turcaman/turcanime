import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { logger } from '../utils/logger';

export type ConnectionType = 'wifi' | 'cellular' | 'none' | 'unknown' | null;

export interface NetworkStatus {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  connectionType: ConnectionType;
}

export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const [connectionType, setConnectionType] = useState<ConnectionType>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const newType = (state.type === 'wifi' || state.type === 'cellular')
        ? state.type as ConnectionType
        : 'unknown';

      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? false);
      setConnectionType(newType);
    });

    NetInfo.fetch().then(state => {
      const initialType = (state.type === 'wifi' || state.type === 'cellular')
        ? state.type as ConnectionType
        : 'unknown';

      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? false);
      setConnectionType(initialType);
    }).catch(error => {
      logger.error('useNetworkStatus', 'Failed to fetch network status', error);
      setIsConnected(false);
      setIsInternetReachable(false);
    });

    return () => { unsubscribe(); };
  }, []);

  return { isConnected, isInternetReachable, connectionType };
}
