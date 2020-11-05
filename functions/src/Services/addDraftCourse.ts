import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { DraftCourseData } from '../Schema/Data';

export default async (draftCourseData: DraftCourseData) => {
    await admin.firestore()
                .collection('draftCourses')
                .add(draftCourseData)
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The draft course record could not be added', error);
                });
};