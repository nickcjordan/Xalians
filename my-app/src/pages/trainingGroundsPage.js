import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';


class TrainingGroundsPage extends React.Component {

    state = {
        games: []
    }

    componentDidMount() {
        this.buildGamesList()
    }

    buildGamesList = () => {
        let list = []
        
        list.push(<a href="/games/match"> <h1>Xalian Match</h1></a>);
        list.push(<a href="/games/match"> <h1>Xalian Match</h1></a>);

        this.setState({ games: list });
    }

    render() {

        return <React.Fragment>

            <Container fluid className="content-background-container">
                <XalianNavbar></XalianNavbar>

                    <Row className="">
                        <Col >
                        {this.state.games}
                        </Col>
                    </Row>

            </Container>
        </React.Fragment>


    }

}


export default TrainingGroundsPage;