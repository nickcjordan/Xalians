const contractListPromise = import("../web3-contracts/hardhat_contracts.json");
// @ts-ignore
const externalContractsPromise = import("../web3-contracts/external_contracts");

export const loadAppContracts = async () => {
  const config = {};
  config.deployedContracts = (await contractListPromise).default ?? {};
  config.externalContracts = (await externalContractsPromise).default ?? {};
  return config;
};
