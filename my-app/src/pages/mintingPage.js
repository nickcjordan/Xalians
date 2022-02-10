import React, { useCallback, useEffect, useState } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';
import axios from 'axios';
// import { Alert, Button, Card, Col, Input, List, Menu, Row } from "antd"; // use UI components from "react-bootstrap" instead of "antd"

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
// import "./App.css";
import { Account, Address, AddressInput, Contract, Faucet, GasGauge, Header, Ramp, ThemeSwitch } from "../components";
import { INFURA_ID, NETWORK, NETWORKS } from "../constants";
import { Transactor } from "./helpers";
import { useContractConfig } from "./hooks";
// import Hints from "./Hints";

const { BufferList } = require("bl");
const ipfsAPI = require("ipfs-http-client");
const ipfs = ipfsAPI({ host: "ipfs.infura.io", port: "5001", protocol: "https" });

const { ethers } = require("ethers");

// import Web3Modal from "web3modal";
// import WalletConnectProvider from "@walletconnect/web3-provider";



// const web3Modal = new Web3Modal({
//     network: "mainnet", // Optional. If using WalletConnect on xDai, change network to "xdai" and add RPC info below for xDai chain.
//     cacheProvider: true, // optional
//     theme: "light", // optional. Change to "dark" for a dark theme.
//     providerOptions: {
//       walletconnect: {
//         package: WalletConnectProvider, // required
//         options: {
//           bridge: "https://polygon.bridge.walletconnect.org",
//           infuraId: INFURA_ID,
//           rpc: {
//             1: `https://mainnet.infura.io/v3/${INFURA_ID}`, // mainnet // For more WalletConnect providers: https://docs.walletconnect.org/quick-start/dapps/web3-provider#required
//             42: `https://kovan.infura.io/v3/${INFURA_ID}`,
//             100: "https://dai.poa.network", // xDai
//           },
//         },
//       },
//       portis: {
//         display: {
//           logo: "https://user-images.githubusercontent.com/9419140/128913641-d025bc0c-e059-42de-a57b-422f196867ce.png",
//           name: "Portis",
//           description: "Connect to Portis App",
//         },
//         package: Portis,
//         options: {
//           id: "6255fb2b-58c8-433b-a2c9-62098c05ddc9",
//         },
//       },
//       fortmatic: {
//         package: Fortmatic, // required
//         options: {
//           key: "pk_live_5A7C91B2FC585A17", // required
//         },
//       },
//       "custom-walletlink": {
//         display: {
//           logo: "https://play-lh.googleusercontent.com/PjoJoG27miSglVBXoXrxBSLveV6e3EeBPpNY55aiUUBM9Q1RCETKCOqdOkX2ZydqVf0",
//           name: "Coinbase",
//           description: "Connect to Coinbase Wallet (not Coinbase App)",
//         },
//         package: walletLinkProvider,
//         connector: async (provider, _options) => {
//           await provider.enable();
//           return provider;
//         },
//       },
//       authereum: {
//         package: Authereum, // required
//       },
//     },
//   });


class MintingPage extends React.Component {

    state = {
        xalian: null,
        isLoading: true
    }
    

    componentDidMount() {
        this.getXalian();
    }

  
    render() {

        return <React.Fragment>

            <Container fluid className="content-background-container">
                <XalianNavbar></XalianNavbar>

                {(this.state.xalian == null) && <p>Thinking...</p>}

                <Container className="content-container">
                    <Row className="content-row">

                        <Col lg={8} className="topic-column">
                            <h1>Minting</h1>
                            <p> {
                                
                                this.state.xalian && <React.Fragment>
                                    <h1> {
                                        JSON.stringify(this.state.xalian, null, 2)

                                        
                                        } </h1>
                                
                                </React.Fragment>            
                                
                                } </p>

                        </Col>

                    </Row>

                </Container>
            </Container>
        </React.Fragment>


    }

    getXalian() {
        const url = "https://api.xalians.com/xalian";
        axios.get(url)
            .then(response => {
                var xalianObject = response.data;
                this.setState({
                    xalian: xalianObject,
                    isLoading: false
                })
                console.log(JSON.stringify(xalianObject, null, 2))
            }
            );
    }

    

}


export default MintingPage;