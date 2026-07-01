import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { useCallback, useEffect, useState } from "react";
import { logger } from "../utils/logger";

export type ConnectionType = "wifi" | "cellular" | "none" | "unknown" | null;

export interface NetworkStatus {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  connectionType: ConnectionType;
}

function toConnectionType(type: string): ConnectionType {
  return type === "wifi" || type === "cellular" ? (type as ConnectionType) : "unknown";
}

export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const [connectionType, setConnectionType] = useState<ConnectionType>(null);

  const applyNetworkState = useCallback((state: NetInfoState) => {
    setIsConnected(state.isConnected ?? false);
    setIsInternetReachable(state.isInternetReachable ?? false);
    setConnectionType(toConnectionType(state.type));
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(applyNetworkState);
    NetInfo.fetch()
      .then(applyNetworkState)
      .catch((error) => {
        logger.error("useNetworkStatus", "Failed to fetch network status", error);
        setIsConnected(false);
        setIsInternetReachable(false);
      });
    return () => unsubscribe();
  }, [applyNetworkState]);

  return { isConnected, isInternetReachable, connectionType };
}
