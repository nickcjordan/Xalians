import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel'
import * as authUtil from '../../utils/authUtil';
import * as dbApi from '../../utils/dbApi';
import Spinner from 'react-bootstrap/Spinner';

class SignUpModal extends React.Component {

    state = {
        errorMessage: null,
        validated: false,
        username: null,
        email: null,
        firstPassword: null,
        secondPassword: null,
        errors: {}
    }

    constructor(props) {
        super(props);
        // this.setState({
        //     errorMessage: this.props.errorMessage,
        //     hasSubmitted: this.props.hasSubmitted || false
        // });
    }

    componentDidMount() {
        this.setValidated = this.setValidated.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event) {
        this.setState({ value: event.target.value });
    }

    setValidated(isValidated) {
        this.setState({ validated: isValidated });
    }

    setError = (key, val) => {
        let e = this.state.errors;
        e[key] = val;
        this.setState({ errors: e });
    }

    clearErrors = () => {
        this.setState({ errors: {} });
    }
 
    handleSubmit = event => {
        event.preventDefault();
        this.clearErrors();
        if (this.passwordsAreEqual()) {
            this.setState({isThinking: true});

            authUtil.signUp(
                this.state.email,
                this.state.username,
                this.state.firstPassword
            ).then(response => {
                this.setState({isThinking: false});
                console.log(JSON.stringify(response, null, 2));
                this.props.callback(this.state.username, this.state.email, this.state.firstPassword);
                this.props.onHide();

                // dbApi.callCreateUser()
            }).catch(error => {
                this.setState({isThinking: false});
                console.log('error signing up:', error);
                if (error.code === 'UsernameExistsException') {
                    this.setState({isThinking: false});
                    this.setError('username', 'Username already exists');


                }
            });

        } else {
            this.setError('password', 'Passwords do not match');
            return false;
        }
    }


    passwordsAreEqual = () => {
        return this.state.firstPassword && this.state.secondPassword && this.state.firstPassword === this.state.secondPassword
    }

    handlePasswordChange = (updatedState) => {
        this.clearErrors();
        this.setState(updatedState);
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
                        Create a Xalians Account
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>

                    {/* <Form id='signupForm' noValidate validated={this.state.validated} onSubmit={this.handleSubmit}> */}
                    <Form id='signupForm' onSubmit={this.handleSubmit}>
                        
                         <Form.Group className="mb-3" controlId="formBasicUser">
                            <FloatingLabel controlId="floatingUser" label="Username">
                                <Form.Control
                                    required
                                    pattern="^[A-Za-z0-9\-_]+$"
                                    minLength={6}
                                    maxLength={30}
                                    type="text"
                                    value={this.state.username}
                                    onChange={e => this.setState({ username: e.target.value })}
                                    placeholder='Username'
                                />
                                <Form.Text className="text-muted">
                                    Must be unique - can contain letters, numbers, '-', or '_'
                                </Form.Text>
                            </FloatingLabel>
                        </Form.Group> 
                            <h4 className="error-message">{this.state.errors.username}</h4>
                        
                        
                        <Form.Group className="mb-3" controlId="formBasicEmail">
                            <FloatingLabel controlId="floatingEmail" label="Email Address">
                                <Form.Control
                                    required
                                    type="email"
                                    value={this.state.email}
                                    onChange={e => this.setState({ email: e.target.value })}
                                    placeholder='Email Address'
                                />
                            </FloatingLabel>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formBasicPassword">
                            <FloatingLabel controlId="floatingPassword" label="Password">
                                <Form.Control
                                    required
                                    minLength={8}
                                    type="password"
                                    value={this.state.firstPassword}
                                    onChange={e => this.handlePasswordChange({ firstPassword: e.target.value })}
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
                                    value={this.state.secondPassword}
                                    onChange={e => this.handlePasswordChange({ secondPassword: e.target.value })}
                                    placeholder='Confirm Password'
                                />
                            </FloatingLabel>
                        </Form.Group>
                        <h4 className="error-message">{this.state.errors.password}</h4>
                        <h4 className="error-message">{this.state.errors.general}</h4>

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