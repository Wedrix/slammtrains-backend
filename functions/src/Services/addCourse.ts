import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { CourseData } from '../Schema/Data';

export default async (courseData: CourseData) => {
    await admin.firestore()
                .collection('courses')
                .add({
                    ...courseData,
                    createdAt: new Date().valueOf(),
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The course record could not be added', error);
                });
};