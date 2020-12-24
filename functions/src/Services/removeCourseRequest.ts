import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export default async (courseRequestId: string) => {
    await admin.firestore()
                .doc(`courseRequests/${courseRequestId}`)
                .delete()
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The course request document could not be deleted', error);
                });
};