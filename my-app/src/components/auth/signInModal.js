import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel'
import * as authUtil from '../../utils/authUtil';
import Spinner from 'react-bootstrap/Spinner'
import { Hub } from 'aws-amplify';

class SignInModal extends React.Component {

    state = {
        errorMessage: null,
        email: null,
        password: null,
        isThinking: false
    }

    constructor(props) {
        super(props);
        this.setState({
            errorMessage: this.props.errorMessage,
            hasSubmitted: this.props.hasSubmitted || false
        });
    }

    componentDidMount() {
        Hub.listen('auth', (data) => {
            if (data.payload.event === 'signIn_failure') {
                if (data.payload.data.code === 'UserNotConfirmedException') {
                    this.props.verifyEmailCallback(this.state.email);
                    this.exit();
                }
                if (data.payload.data.code === 'UserNotFoundException') {
                    this.setState({errorMessage: 'User not found'});
                }
                this.setState({isThinking: false})
            }
        })
    }

    handleSubmit = event => {
        this.setState({isThinking: true, errorMessage: null});
        authUtil.signIn(
            this.state.email,
            this.state.password
        ).then(() => {
            this.setState({isThinking: false});
            this.props.callback();
            this.exit();
        });
        event.preventDefault();
    }

    exit = () => {
        this.setState({errorMessage: null}, () => {
            this.props.onHide();
        });
    }


    render() {

        return (
            <Modal
                show={this.props.show} onHide={this.props.onHide}
                size="lg"
                aria-labelledby="contained-modal-title-vcenter"
                centered
                className="themed-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title id="contained-modal-title-vcenter">
                        Sign In
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>

                    <Form id='signInForm' onSubmit={this.handleSubmit}>

                        {/* <Form.Group className="mb-3" controlId="formBasicEmail">
                            <FloatingLabel controlId="floatingEmail" label="Email Address">
                                <Form.Control
                                    required
                                    type="email"
                                    value={this.state.email}
                                    onChange={e => this.setState({ email: e.target.value, errorMessage: null })}
                                    placeholder='Email Address'
                                    className="text-input"
                                />
                            </FloatingLabel>
                        </Form.Group> */}

                        <Form.Group className="mb-3" controlId="formBasicUsername">
                            <FloatingLabel controlId="floatingUser" label="Username">
                                <Form.Control
                                    required
                                    type="text"
                                    value={this.state.email}
                                    onChange={e => this.setState({ email: e.target.value, errorMessage: null })}
                                    placeholder='Username'
                                    className="text-input"
                                />
                            </FloatingLabel>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formBasicPassword">
                            <FloatingLabel controlId="floatingPassword" label="Password">
                                <Form.Control
                                    required
                                    minLength={8}
                                    type="password"
                                    value={this.state.password}
                                    onChange={e => this.setState({ password: e.target.value })}
                                    placeholder='Password'
                                />
                            </FloatingLabel>
                        </Form.Group>

                        <h3 className="error-message">{this.state.errorMessage}</h3>

                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button className="themed-modal-button" onClick={this.exit}>Close</Button>
                    <Button className="themed-modal-button" type="submit" form='signInForm'>
                        {this.state.isThinking ? <Spinner variant='secondary' as="span" animation="border" size="sm" role="status" aria-hidden="true"/> : 'Submit'}
                    </Button>
                </Modal.Footer>
            </Modal>
        );




    }

}

export default SignInModal;