import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { lower } from 'case';

import { CourseData } from '../Schema/Data';

export default async (courseData: CourseData) => {
    await admin.firestore()
                .collection('courses')
                .add({
                    ...courseData,
                    __name: lower(courseData.name),
                    createdAt: new Date().valueOf(),
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The course record could not be added', error);
                });
};