import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import * as authUtil from '../../utils/authUtil';
import Spinner from 'react-bootstrap/Spinner';

class VerifyEmailModal extends React.Component {

    state = {
        username: null,
        code: null,
        errorMessage: null,
        verificationMessage: null
    }

    constructor(props) {
        super(props);
    }

    componentDidMount() {
    }

    handleSubmit = event => {
        this.setState({ isThinking: true, verificationMessage: null });
        event.preventDefault();
        authUtil.confirmSignUp(
            this.state.username || this.props.username,
            this.state.code
        ).then(response => {
            this.setState({ isThinking: false });
            this.props.callback();
            // this.props.onHide();
        });
    }

    sendVerificationCode = event => {
        var user = this.state.username || this.props.username
        if (user) {
            authUtil.resendConfirmationCode(user).then(response => {
                console.log(JSON.stringify(response, null, 2));
                this.props.callback(response);
                this.setState({ verificationMessage: 'Email sent!' });
            });
        } else {
            this.setState({ errorMessage: 'Please enter your username' })
        }
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
                <Modal.Header closeButton closeVariant={this.props.light ? '' : 'white'}>
                    <Modal.Title id="contained-modal-title-vcenter">
                        Verify Email Address
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>

                    <Form id='verifyEmailForm' onSubmit={this.handleSubmit}>


                        <Form.Group className="mb-3" controlId="formBasicUsername">
                            <FloatingLabel controlId="floatingUsername" label="Username">
                                <Form.Control
                                    disabled={this.props.username && this.props.email}
                                    type="text"
                                    value={this.state.username || this.props.username}
                                    onChange={e => this.setState({ username: e.target.value, errorMessage: null })}
                                    placeholder='Username'
                                />
                            </FloatingLabel>
                        </Form.Group>
                        {this.props.email && this.props.username && 
                            <Form.Group className="mb-3" controlId="formBasicEmail">
                                <FloatingLabel controlId="floatingEmail" label="Email Address">
                                    <Form.Control
                                        disabled={true}
                                        type="email"
                                        value={this.props.email}
                                        placeholder='Email Address'
                                    />
                                </FloatingLabel>
                            </Form.Group>
                        }

                        <Form.Group className="mb-3" controlId="formBasicCode">
                            <FloatingLabel controlId="floatingCode" label="Verification Code">
                                <Form.Control
                                    required
                                    type="text"
                                    value={this.state.code}
                                    onChange={e => this.setState({ code: e.target.value, errorMessage: null, verificationMessage: null })}
                                    placeholder='Verification Code'
                                />
                                <Form.Text className="text-muted">
                                    You should have received an email with a verification code
                                </Form.Text>
                            </FloatingLabel>
                        </Form.Group>

                        <div className='resend-verification-link-wrapper'>
                            <p>
                                Don't see the email? <a className='verification-link' onClick={this.sendVerificationCode}>Send another verification code</a>
                            </p>
                        </div>

                        <h3 className="error-message">{this.state.errorMessage}</h3>
                        <h3 className="verification-message"></h3>
                        <Form.Text className="text-muted">
                            {this.state.verificationMessage}
                        </Form.Text>

                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={this.props.onHide}>Close</Button>
                    <Button type="submit" form='verifyEmailForm'>
                        {this.state.isThinking ? <Spinner variant='secondary' as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Verify Email'}
                    </Button>
                </Modal.Footer>
            </Modal>
        );




    }

}

export default VerifyEmailModal;