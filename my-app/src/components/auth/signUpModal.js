import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel'
import * as authUtil from '../../utils/authUtil';
import Spinner from 'react-bootstrap/Spinner';

class SignUpModal extends React.Component {

    state = {
        errorMessage: null,
        validated: false,
        alias: null,
        email: null,
        firstPassword: null,
        secondPassword: null,
        passwordsPassValidation: false
    }

    constructor(props) {
        super(props);
        // this.setState({
        //     firstPasswordForm: React.createRef(),
        //     secondPasswordForm: React.createRef()
        // });
        this.setState({
            errorMessage: this.props.errorMessage,
            hasSubmitted: this.props.hasSubmitted || false
        });
    }

    componentDidMount() {
        this.setValidated = this.setValidated.bind(this);
        this.handlePasswordChange = this.handlePasswordChange.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.passwordsAreEqual = this.passwordsAreEqual.bind(this);
    }

    handleChange(event) {
        this.setState({ value: event.target.value });
    }

    setValidated(isValidated) {
        this.setState({ validated: isValidated });
    }

    handleSubmit = event => {
        event.preventDefault();
        if (this.passwordsAreEqual()) {
            this.setState({isThinking: true});

            // authUtil.signUp(
            //     this.state.email,
            //     this.state.firstPassword
            authUtil.signUp(
                this.state.email,
                this.state.alias,
                this.state.firstPassword
            ).then(response => {
                this.setState({isThinking: false});
                // console.log(JSON.stringify(response, null, 2));
                this.props.callback(response);
                this.props.onHide()
            });

                // this.props.callback({user: { username: "njordan1017@gmail.com"}});
                // this.props.onHide()


        } else {
            this.setState({
                errorMessage: "Passwords do not match",
                passwordsPassValidation: false
            });
            return false;
        }
    }


    passwordsAreEqual() {
        return this.state.firstPassword && this.state.secondPassword && this.state.firstPassword === this.state.secondPassword
    }

    handlePasswordChange(val, json) {
        this.setState(json, function () {
            this.setState({ errorMessage: null });
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
                        Create a Xalians Account
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>

                    {/* <Form id='signupForm' noValidate validated={this.state.validated} onSubmit={this.handleSubmit}> */}
                    <Form id='signupForm' onSubmit={this.handleSubmit}>
                        
                         <Form.Group className="mb-3" controlId="formBasicUser">
                            <FloatingLabel controlId="floatingUser" label="User Alias">
                                <Form.Control
                                    required
                                    pattern="^[A-Za-z0-9\-_]+$"
                                    minLength={6}
                                    maxLength={30}
                                    type="text"
                                    value={this.state.alias}
                                    onChange={e => this.setState({ alias: e.target.value })}
                                    placeholder='User Alias'
                                    // ref={node => this.emailRef.current = node}
                                />
                                <Form.Text className="text-muted">
                                    Letters, numbers, '-', or '_'
                                </Form.Text>
                                <Form.Text className="text-muted">
                                    The name you want other people will see, must be unique
                                </Form.Text>
                            </FloatingLabel>
                        </Form.Group> 
                        
                        
                        <Form.Group className="mb-3" controlId="formBasicEmail">
                            <FloatingLabel controlId="floatingEmail" label="Email Address">
                                <Form.Control
                                    required
                                    type="email"
                                    value={this.state.email}
                                    onChange={e => this.setState({ email: e.target.value })}
                                    placeholder='Email Address'
                                    // ref={node => this.emailRef.current = node}
                                />
                                <Form.Text className="text-muted">
                                    The email address you will login with
                                </Form.Text>
                            </FloatingLabel>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formBasicPassword">
                            <FloatingLabel controlId="floatingPassword" label="Password">
                                <Form.Control
                                    required
                                    minLength={8}
                                    type="password"
                                    value={this.state.firstPassword}
                                    onChange={e => this.handlePasswordChange(e.target.value, { firstPassword: e.target.value })}
                                    // ref={node => this.componentRef1.current = node}
                                    placeholder='Password'
                                />
                            </FloatingLabel>
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="formBasicConfirmPassword">
                            <FloatingLabel controlId="floatingConfirmPassword" label="Confirm Password">
                                <Form.Control
                                    required
                                    minLength={8}
                                    type="password"
                                    placeholder='Confirm Password'
                                    value={this.state.secondPassword}
                                    onChange={e => this.handlePasswordChange(e.target.value, { secondPassword: e.target.value })}
                                    // ref={node => this.componentRef2.current = node}
                                />
                            </FloatingLabel>
                        </Form.Group>
                        <h3 className="error-message">{this.state.errorMessage}</h3>

                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={this.props.onHide}>Close</Button>
                    <Button type="submit" form='signupForm'>
                    {this.state.isThinking ? <Spinner variant='secondary' as="span" animation="border" size="sm" role="status" aria-hidden="true"/> : 'Submit'}
                    </Button>
                    
                </Modal.Footer>
            </Modal>
        );




    }

}

export default SignUpModal;