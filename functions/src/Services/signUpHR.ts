import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { HRData } from '../Schema/Data';

export default async (hrData: HRData) => {
    // Create User
    const user = await admin.auth()
                            .createUser({ 
                                email: hrData.email,
                                password: hrData.password,
                                displayName: hrData.displayName,
                            })
                            .catch(error => {
                                if (error.code === 'auth/email-already-exists') {
                                    throw new functions.https.HttpsError('failed-precondition', error.message);
                                }

                                throw error;
                            });;

    // Set Claims 
    await admin.auth()
                .setCustomUserClaims(user.uid, { accessLevel: 'hr', accessBlocked: false })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The custom claims could not be set on this user', error);
                });

    // Send email verification link
    if (user.email) {
        const emailVerificationLink = await admin.auth()
                                                .generateEmailVerificationLink(user.email);

        await admin.firestore()
                    .collection('mail')
                    .add({
                        to: user.email,
                        message: {
                            subject: 'Verify your email',
                            html: `Kindly verify your email <a href="${emailVerificationLink}">Here</a>.`,
                        },
                    })
                    .catch(error => {
                        throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
                    });
    }
};