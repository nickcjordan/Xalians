import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

class TextReaderModal extends React.Component {

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
                size="xl"
                aria-labelledby="contained-modal-title-vcenter"
                centered
                className="themed-modal"
                scrollable
            >
                <Modal.Header closeButton closeVariant='white'>
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
                        {/* <Button onClick={this.props.onHide}>Cancel</Button> */}
                    </Modal.Footer>
                }
            </Modal>
        );




    }

}

export default TextReaderModal;