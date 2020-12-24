import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { CourseDraftData } from '../Schema/Data';

export default async (courseDraftData: CourseDraftData) => {
    await admin.firestore()
                .collection('draftCourses')
                .add(courseDraftData)
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The draft course record could not be added', error);
                });
};