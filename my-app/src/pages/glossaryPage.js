import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import XalianNavbar from '../components/navbar';
import glossary from '../json/glossary.json';


class GlossaryPage extends React.Component {

    state = {
        query: ''
    }

    // glossary.json is a shared module import - sorting a copy keeps this page
    // from reordering the array for anything else that imports it
    getSortedEntries() {
        return glossary
            .filter((row) => row.word)
            .slice()
            .sort((a, b) => a.word.toUpperCase().localeCompare(b.word.toUpperCase()));
    }

    getMatchingEntries() {
        let query = this.state.query.trim().toLowerCase();
        let entries = this.getSortedEntries();
        if (!query) {
            return entries;
        }
        return entries.filter((row) =>
            row.word.toLowerCase().includes(query) ||
            (row.definition && row.definition.toLowerCase().includes(query))
        );
    }

    // a glossary is a description list. This was previously an <h3> per term and
    // an <h5> per definition, which announced ~130 consecutive headings to a
    // screen reader and conveyed none of the term-to-definition relationship.
    buildDictionary(entries) {
        return entries.map((row) => (
            <Row className="glossary-word-row vertically-center-contents" key={row.word} as="div">
                <Col sm={3}>
                    <dt className="glossary-title">{row.word}</dt>
                </Col>
                <Col sm={true}>
                    <dd className="glossary-definition">{row.definition}</dd>
                </Col>
            </Row>
        ));
    }

    render() {
        let entries = this.getMatchingEntries();
        let total = this.getSortedEntries().length;

        return <React.Fragment>

            <Container fluid className="content-background-container">
                <XalianNavbar></XalianNavbar>

                <Container>
                    <h1 className="page-title-text template-col-wrapper" style={{ textAlign: 'center' }}>Glossary</h1>

                    <Row className="justify-content-center">
                        <Col md={7} lg={6}>
                            <InputGroup className="glossary-search">
                                <InputGroup.Text className="glossary-search-icon">
                                    <i className="bi bi-search" />
                                </InputGroup.Text>
                                <Form.Control
                                    type="search"
                                    placeholder="Search the galaxy's terms..."
                                    aria-label="Search glossary terms"
                                    value={this.state.query}
                                    onChange={(e) => this.setState({ query: e.target.value })}
                                    className="glossary-search-input"
                                />
                            </InputGroup>
                            <p className="glossary-result-count">
                                {this.state.query
                                    ? `${entries.length} of ${total} terms`
                                    : `${total} terms`}
                            </p>
                        </Col>
                    </Row>

                    <Row className="glossary-wrapper">
                        <Col className="">
                            {entries.length > 0
                                ? <dl className="glossary-list">{this.buildDictionary(entries)}</dl>
                                : <p className="glossary-empty">No terms match “{this.state.query}”.</p>
                            }
                        </Col>
                    </Row>
                </Container>
            </Container>
        </React.Fragment>


    }

}


export default GlossaryPage;
