import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export default async (customPlanRequestId: string) => {
    await admin.firestore()
                .doc(`customPlanRequests/${customPlanRequestId}`)
                .delete()
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The custom plan request document could not be deleted', error);
                });
};