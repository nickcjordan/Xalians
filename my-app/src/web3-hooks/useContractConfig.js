import { useState, useEffect } from "react";
import { loadAppContracts } from "../web3-helpers/loadAppContracts";

export const useContractConfig = () => {
  const [contractsConfig, setContractsConfig] = useState({});

  useEffect(() => {
    const loadFunc = async () => {
      const result = await loadAppContracts();
      setContractsConfig(result);
    };
    void loadFunc();
  }, []);
  return contractsConfig;
};
