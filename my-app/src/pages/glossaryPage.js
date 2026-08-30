import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
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
            <div className="g-record" key={row.word}>
                <dt className="g-record-term">{row.word}</dt>
                <dd className="g-record-body">{row.definition}</dd>
            </div>
        ));
    }

    render() {
        let entries = this.getMatchingEntries();
        let total = this.getSortedEntries().length;

        return (
            <div className="g-console">
                <XalianNavbar />

                <div className="g-shell page-shell">
                    <header className="page-header">
                        <p className="g-kicker">Vallerii Archive</p>
                        <h1 className="g-title">Glossary</h1>
                    </header>

                    <Row>
                        <Col md={7} lg={5}>
                            {/* the search field is a screen, so it reads as phosphor on glass */}
                            <Form.Control
                                type="search"
                                placeholder="SEARCH TERMS"
                                aria-label="Search glossary terms"
                                value={this.state.query}
                                onChange={(e) => this.setState({ query: e.target.value })}
                                className="g-input"
                            />
                            <p className="glossary-result-count g-kicker">
                                {this.state.query
                                    ? `${entries.length} of ${total} terms`
                                    : `${total} terms`}
                            </p>
                        </Col>
                    </Row>

                    <div className="g-panel g-panel--recessed glossary-wrapper">
                        {entries.length > 0
                            ? <dl className="glossary-list">{this.buildDictionary(entries)}</dl>
                            : <p className="g-empty">No terms match “{this.state.query}”</p>
                        }
                    </div>
                </div>
            </div>
        );
    }

}


export default GlossaryPage;
