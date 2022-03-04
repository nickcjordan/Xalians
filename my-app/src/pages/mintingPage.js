import React, { useCallback, useEffect, useState } from "react";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';
import axios from 'axios';
import { Alert, Card, Input, List, Menu} from "antd";

//web3 imports below
import Portis from "@portis/web3";
import WalletConnectProvider from "@walletconnect/web3-provider";
import "antd/dist/antd.css";
import Authereum from "authereum";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
  useContractExistsAtAddress,
  useBlockNumber,
} from "eth-hooks";
import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
import { useEventListener } from "eth-hooks/events/useEventListener";
import Fortmatic from "fortmatic";
// https://www.npmjs.com/package/ipfs-http-client
// import { create } from "ipfs-http-client";
import ReactJson from "react-json-view";
import { BrowserRouter, Link, Route, Switch } from "react-router-dom";
//import Torus from "@toruslabs/torus-embed"
import WalletLink from "walletlink";
import Web3Modal from "web3modal";
//import "./App.css";
import { Account, Address, Balance, AddressInput, Contract, Faucet, GasGauge, Header, Ramp, ThemeSwitch } from "../web3-components";
import { INFURA_ID, NETWORK, NETWORKS } from "../web3-constants";
import { Transactor } from "../web3-helpers";
import { useContractConfig } from "../web3-hooks";
// import Hints from "./Hints";

// const { BufferList } = require("bl");
// const ipfsAPI = require("ipfs-http-client");
// const ipfs = ipfsAPI({ host: "ipfs.infura.io", port: "5001", protocol: "https" });

const { ethers } = require("ethers");

/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS.kovan; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 console logging
const DEBUG = true;
const NETWORKCHECK = true;

// 🛰 providers
if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
//
// attempt to connect to our own scaffold eth rpc and if that fails fall back to infura...
// Using StaticJsonRpcProvider as the chainId won't change see https://github.com/ethers-io/ethers.js/issues/901
const scaffoldEthProvider = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider("https://rpc.scaffoldeth.io:48544")
  : null;
const poktMainnetProvider = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider(
      "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
    )
  : null;
const mainnetInfura = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID)
  : null;
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_ID

// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if (DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new ethers.providers.StaticJsonRpcProvider(localProviderUrlFromEnv);


// 🔭 block explorer URL
const blockExplorer = targetNetwork.blockExplorer;

// Coinbase walletLink init
const walletLink = new WalletLink({
  appName: "coinbase",
});

// WalletLink provider
const walletLinkProvider = walletLink.makeWeb3Provider(`https://mainnet.infura.io/v3/${INFURA_ID}`, 1);

// Portis ID: 6255fb2b-58c8-433b-a2c9-62098c05ddc9
/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  network: "mainnet", // Optional. If using WalletConnect on xDai, change network to "xdai" and add RPC info below for xDai chain.
  cacheProvider: true, // optional
  theme: "light", // optional. Change to "dark" for a dark theme.
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        bridge: "https://polygon.bridge.walletconnect.org",
        infuraId: INFURA_ID,
        rpc: {
          1: `https://mainnet.infura.io/v3/${INFURA_ID}`, // mainnet // For more WalletConnect providers: https://docs.walletconnect.org/quick-start/dapps/web3-provider#required
          42: `https://kovan.infura.io/v3/${INFURA_ID}`,
          100: "https://dai.poa.network", // xDai
        },
      },
    },
    portis: {
      display: {
        logo: "https://user-images.githubusercontent.com/9419140/128913641-d025bc0c-e059-42de-a57b-422f196867ce.png",
        name: "Portis",
        description: "Connect to Portis App",
      },
      package: Portis,
      options: {
        id: "6255fb2b-58c8-433b-a2c9-62098c05ddc9",
      },
    },
    fortmatic: {
      package: Fortmatic, // required
      options: {
        key: "pk_live_5A7C91B2FC585A17", // required
      },
    },
    "custom-walletlink": {
      display: {
        logo: "https://play-lh.googleusercontent.com/PjoJoG27miSglVBXoXrxBSLveV6e3EeBPpNY55aiUUBM9Q1RCETKCOqdOkX2ZydqVf0",
        name: "Coinbase",
        description: "Connect to Coinbase Wallet (not Coinbase App)",
      },
      package: walletLinkProvider,
      connector: async (provider, _options) => {
        await provider.enable();
        return provider;
      },
    },
    authereum: {
      package: Authereum, // required
    },
  },
});


function App (props) {
  
  const mainnetProvider =
    poktMainnetProvider && poktMainnetProvider._isProvider
      ? poktMainnetProvider
      : scaffoldEthProvider && scaffoldEthProvider._network
      ? scaffoldEthProvider
      : mainnetInfura;

const address = '0x1b8Bfc9EC2729E3bEB5302Ac3EC6F7eA8AF3A289'
const provider = new ethers.providers.JsonRpcProvider('https://kovan.infura.io/v3/54db8d77410745c2b76b33773b6938e6','kovan', );
const price = useGasPrice(targetNetwork, "fast");
const contractCheck = useContractExistsAtAddress(provider,address);
console.log('gasprice: ' + price)
console.log('contractcheck:' + contractCheck)


const contractConfig = useContractConfig();


const [injectedProvider, setInjectedProvider] = useState();
// const [address, setAddress] = useState();

// Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider);
const userSigner = userProviderAndSigner.signer;

// useEffect(() => {
//   async function getAddress() {
//     if (userSigner) {
//       const newAddress = await userSigner.getAddress();
//       setAddress(newAddress);
//     }
//   }
//   getAddress();
// }, [userSigner]);




console.log('blockexplorer: ' + blockExplorer)
  
return (
  <React.Fragment>

    <Container fluid className="content-background-container">
        <XalianNavbar></XalianNavbar>

        {/* {(this.state.xalian == null) && <p>Thinking...</p>} */}

        <Container className="content-container">
            <Row className="content-row">

                <Col lg={8} className="topic-column">
                    <h1>View NFT Contract</h1>
                    <p> {
                        
                        // this.state.xalian && 
                        <React.Fragment>
                            <h1> {
                                // JSON.stringify(this.state.xalian, null, 2)
                                String(contractCheck)
                                
                                } </h1>
                            <h1> {
                            
                              price
                              
                            
                            } </h1>
                           
                            <h1>
                              Local PC Kovan Adress_____   

                              <Address address={'0x0e53C614204B43f8B2c4235ebf240cC1C62281E6'} ensProvider={mainnetProvider} blockExplorer={blockExplorer} />
                              <Balance address='0x0e53C614204B43f8B2c4235ebf240cC1C62281E6' provider={provider} price={price} />
                            </h1>
                            <h1>
                              XaliansNFT Address____

                              <Address address={address} ensProvider={mainnetProvider} blockExplorer={blockExplorer} />
                              <Balance address={address} provider={provider} price={price} />
                            </h1>

                    <h1>----------------------------</h1>
                      <Contract
                        name="XaliansNFT"
                        //signer={userSigner}
                        provider={provider}
                        address={address}
                        blockExplorer={blockExplorer}
                        contractConfig={contractConfig}
                      />
                      {/* <Contract
                        name="XaliansNFT"
                        signer={userSigner}
                        provider={provider}
                        address={address}//'0x1b8Bfc9EC2729E3bEB5302Ac3EC6F7eA8AF3A289'
                        blockExplorer= {blockExplorer}//'https://kovan.etherscan.io/'
                        contractConfig={contractConfig}
                      /> */}

                    
                    

                    <h1>----------------------------</h1>







                
                        </React.Fragment>            
                        
                        } </p>

                </Col>

            </Row>

        </Container>
    </Container>
  </React.Fragment>
);
}

export default App;