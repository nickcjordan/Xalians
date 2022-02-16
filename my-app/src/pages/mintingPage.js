import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';
import axios from 'axios';

//web3 imports below
import { Account, Address, AddressInput, Contract, Faucet, GasGauge, Header, Ramp, ThemeSwitch } from "../web3-components";




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
                            <h1>Testing</h1>
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