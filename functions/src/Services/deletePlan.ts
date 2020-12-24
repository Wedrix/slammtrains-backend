import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export default async (planId: string) => {
    await admin.firestore()
                .doc(`plans/${planId}`)
                .delete()
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The plan could not be deleted', error);
                });
};