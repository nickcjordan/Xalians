import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

class GamePageGameFinishedModal extends React.Component {

    state = {
    }

    constructor(props) {
        super(props);
    }

    componentDidMount() {
    }

    render() {

        return (
            <Modal
                show={this.props.show} onHide={this.props.onHide}
                size="md"
                aria-labelledby="contained-modal-title-vcenter"
                centered
                className={this.props.light ? "themed-modal light-themed-modal" : "themed-modal dark-themed-modal"}
                scrollable={this.props.scrollable || false}
                fullscreen="sm-down"
            >
                <Modal.Header closeButton closeVariant={this.props.light ? '' : 'white'}>
                { this.props.title && 
                    <Modal.Title id="contained-modal-title-vcenter">
                        {this.props.title}
                    </Modal.Title>
                }
                </Modal.Header>
                {this.props.body && 
                    <Modal.Body>
                    {this.props.body}
                    </Modal.Body>
                }
                {this.props.footer &&
                    <Modal.Footer>
                        {this.props.footer}
                        {this.props.actions}
                        {/* <Button onClick={this.props.onHide}>Cancel</Button> */}
                    </Modal.Footer>
                }
            </Modal>
        );




    }

}

export default GamePageGameFinishedModal;