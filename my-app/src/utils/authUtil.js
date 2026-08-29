import { Hub, Logger } from 'aws-amplify';
import { Auth } from 'aws-amplify';
import {store} from 'state-pool';
// import Amplify from 'aws-amplify';
// import awsconfig from '../aws-exports';

// Amplify.configure(awsconfig);
// const listener = (data) => {
//     console.log('inbound event data:\n' + JSON.stringify(data.payload, null, 2));
//     switch (data.payload.event) {
//         case 'signIn':
//             logger.info('LISTENER :: user signed in');
//             // setAuthenticatedUser(data.payload.data)
//             break;
//         case 'signUp':
//             logger.info('LISTENER :: user signed up');
//             break;
//         case 'signOut':
//             logger.info('LISTENER :: user signed out');
//             break;
//         case 'signIn_failure':
//             logger.error('LISTENER :: user sign in failed');
//             break;
//         case 'tokenRefresh':
//             logger.info('LISTENER :: token refresh succeeded');
//             break;
//         case 'tokenRefresh_failure':
//             logger.error('LISTENER :: token refresh failed');
//             break;
//         case 'configured':
//             logger.info('LISTENER :: the Auth module is configured');
//     }
// }

// Hub.listen('auth', listener);

// const setAuthenticatedUser = (data) => {
//     store.setState('authenticatedUser', {
//         username: data.username,
//         attributes: data.attributes
//     });
// }

export const buildAuthState = (data) => {
    return { 
        userId: data.attributes.sub,
        username: data.username,
        email: data.attributes.email,
        hasVerifiedEmail: data.attributes.email_verified
    }
}

export const signUp = (email, user, pass) => {
    // export const signUp = (email, pass) => {
    return new Promise((resolve, reject) => {
        try {
            Auth.signUp({
                username: user,
                password: pass,
                attributes: {
                    email: email
                }
                }).then(response => {
                console.log(JSON.stringify(response, null, 2));
                resolve(response);
            }).catch(error => {
                // console.log('error signing up:', error);
                // if (error.code === 'UsernameExistsException') {
                //     this.setState({});



                // }
                reject(error)
            });
        } catch (error) {
            console.log('error signing up:', error);
        }
    });
}

export const confirmSignUp = (user, code) => {
    return Auth.confirmSignUp(user, code);
}

export const resendConfirmationCode = (user) => {
    return Auth.resendSignUp(user);
}

export const signIn = (user, pass) => {
    return Auth.signIn(user, pass);
}

export const signOut = () => {
    return Auth.signOut().then(() => true);
}

