import { useMemo } from "react";
import { getDeps } from "../di";

export const useServices = () => {
  const deps = useMemo(() => getDeps(), []);

  return {
    playerUIService: deps.playerUIService,
  };
};
