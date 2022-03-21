import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import * as dbApi from '../utils/dbApi';
import * as alertUtil from '../utils/alertUtil';
import Spinner from 'react-bootstrap/Spinner';

class VerifyRemoveXalianModal extends React.Component {

    state = {
    }

    constructor(props) {
        super(props);
    }

    componentDidMount() {
    }

    deleteXalian = () => {
        this.setState({ isThinking: true, verificationMessage: null });
        dbApi.callUpdateUserRemoveXalian(this.props.username, this.props.xalian.xalianId).then(x => {
            this.setState({ isThinking: false });
            // this.props.callback();
            alertUtil.sendAlert('Xalian Deleted', null, 'success');
            this.props.onXalianDelete();
        }).catch(error => {
            console.log(JSON.stringify(error, null, 2));
            this.setState({
                isLoading: false
            });
        });
    }

    getXalianName = () => {
        return this.props.xalian.species.name;
    }

    render() {

        return (
            <Modal
                show={this.props.show} onHide={this.props.onHide}
                size="lg"
                aria-labelledby="contained-modal-title-vcenter"
                centered
                className={this.props.light ? "light-themed-modal" : "dark-themed-modal"}
            >
                <Modal.Header closeButton  closeVariant={this.props.light ? '' : 'white'}>
                    <Modal.Title id="contained-modal-title-vcenter">
                        Delete this {this.getXalianName} Xalian?
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                   You will no longer own this Xalian, this cannot be undone.
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={this.props.onHide}>Cancel</Button>
                    <Button onClick={this.deleteXalian} >
                        {this.state.isThinking ? <Spinner variant='secondary' as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Delete Xalian'}
                    </Button>
                </Modal.Footer>
            </Modal>
        );




    }

}

export default VerifyRemoveXalianModal;