import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export default async () => {
    // Create User
    const user = await admin.auth()
                            .createUser({
                                email: 'wedamja@gmail.com',
                                emailVerified: true,
                                phoneNumber: '+233509297419',
                                password: 'password',
                                displayName: 'Wedam Anewenah',
                                disabled: false,
                            });

    // Set Admin Claims 
    admin.auth()
        .setCustomUserClaims(user.uid, {accessLevel: 'admin'})
        .catch(error => {
            throw new functions.https.HttpsError('internal', 'The custom claims could not be set on this user', error);
        });
};