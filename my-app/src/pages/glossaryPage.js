import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';
import glossary from '../json/glossary.json';


class GlossaryPage extends React.Component {

    buildDictionary() {
        var list = [];
        glossary.sort(function(a, b) {
            var nameA = a.word.toUpperCase(); // ignore upper and lowercase
            var nameB = b.word.toUpperCase(); // ignore upper and lowercase
            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }
          
            return 0;
          });
        glossary.forEach(row => {
            if (row.word) {
                list.push(
                    <Row className="glossary-word-row vertically-center-contents">
                        <Col sm={4}>
                            <h3 className="glossary-title">{row.word}</h3>
                        </Col>
                        <Col sm={true}>
                            <h5>{row.definition}</h5>
                        </Col>
                    </Row>
                );
            }
        });
        return list;
    }

    render() {

        return <React.Fragment>

            <Container fluid className="content-background-container">
                <XalianNavbar></XalianNavbar>

                <Container>
                    <Row className="glossary-wrapper">
                        <Col className="">
                            {this.buildDictionary()}
                        </Col>
                    </Row>
                </Container>
            </Container>
        </React.Fragment>


    }

}


export default GlossaryPage;