import {
    confirmSignUp as amplifyConfirmSignUp,
    fetchAuthSession,
    fetchUserAttributes,
    getCurrentUser,
    resendSignUpCode,
    signIn as amplifySignIn,
    signOut as amplifySignOut,
    signUp as amplifySignUp,
} from 'aws-amplify/auth';

function isSignedOutError(error) {
    return error && (
        error.name === 'UserUnAuthenticatedException' ||
        error.name === 'NotAuthorizedException'
    );
}

/**
 * Return a v4-compatible user shape to the existing UI, or null when signed
 * out. Keeping this normalization at one edge lets the rest of the site move
 * to Amplify 6 without spreading Cognito's new functional response shapes
 * through every page.
 */
export const currentUser = async () => {
    if (import.meta.env.VITE_USE_CACHE_AUTH === 'true') {
        return {
            id: 'sample',
            userId: 'sample',
            username: 'sample',
            attributes: { sub: 'sample', email: 'sample@xalians.com', email_verified: true },
        };
    }

    try {
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        return {
            ...user,
            id: user.userId,
            attributes: {
                ...attributes,
                sub: attributes.sub || user.userId,
                email_verified: attributes.email_verified === true || attributes.email_verified === 'true',
            },
        };
    } catch (error) {
        if (isSignedOutError(error)) return null;
        throw error;
    }
};

export const buildAuthState = (data) => ({
    userId: data.id || data.userId || data.attributes.sub,
    username: data.username,
    email: data.attributes.email,
    hasVerifiedEmail: data.attributes.email_verified === true || data.attributes.email_verified === 'true',
});

export const getIdToken = async () => {
    const session = await fetchAuthSession();
    if (!session.tokens?.idToken) {
        throw new Error('The signed-in session did not include an ID token.');
    }
    return session.tokens.idToken.toString();
};

export const signUp = (email, user, pass) => amplifySignUp({
    username: user,
    password: pass,
    options: { userAttributes: { email } },
});

export const confirmSignUp = (user, code) => amplifyConfirmSignUp({
    username: user,
    confirmationCode: code,
});

export const resendConfirmationCode = (user) => resendSignUpCode({ username: user });

export const signIn = (user, pass) => amplifySignIn({ username: user, password: pass });

export const signOut = () => amplifySignOut().then(() => true);
