import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { lower } from 'case';

import { RequestedCourseData } from '../Schema/Data';
import { Company } from '../Schema/Company';

export default async (company: Company, requestedCourseData: RequestedCourseData) => {
    await admin.firestore()
                .collection('requestedCourses')
                .add({
                    ...requestedCourseData,
                    __name: lower(requestedCourseData.name),
                    company: admin.firestore().doc(`/companies/${company.id}`),
                    createdAt: new Date().valueOf(),
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'Could not add the requested course document', error);
                });
};