import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { HRData } from '../Schema/Data';

export default async (uid: string, hrData: HRData) => {
    // Create User
    const user = await admin.auth()
                            .updateUser(uid, {
                                displayName: `${hrData.firstName} ${hrData.lastName}`,
                            })
                            .catch(error => {
                                throw new functions.https.HttpsError('internal', 'Error updating the user', error);
                            });;

    // Set Claims 
    await admin.auth()
                .setCustomUserClaims(user.uid, { 
                    accessLevel: 'hr', 
                    companyId: user.uid, // Use HR uid
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The custom claims could not be set on this user', error);
                });
};