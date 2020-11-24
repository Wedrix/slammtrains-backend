import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export default async (requestedCourseId: string) => {
    await admin.firestore()
                .doc(`requestedCourses/${requestedCourseId}`)
                .delete()
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The requested course document could not be deleted', error);
                });
};