import { useMemo } from "react";
import { getDeps } from "../di";

export const useServices = () => {
  const deps = useMemo(() => getDeps(), []);

  return {
    navigationService: deps.navigationService,
    playerUIService: deps.playerUIService,
  };
};
