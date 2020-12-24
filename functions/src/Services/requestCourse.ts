import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { lower } from 'case';

import { CourseRequestData } from '../Schema/Data';
import { Company } from '../Schema/Company';

export default async (company: Company, courseRequestData: CourseRequestData) => {
    await admin.firestore()
                .collection('courseRequests')
                .add({
                    ...courseRequestData,
                    __companyName: lower(company.name),
                    __courseName: lower(courseRequestData.courseName),
                    company: admin.firestore().doc(`/companies/${company.id}`),
                    createdAt: new Date().valueOf(),
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'Could not add the course request document', error);
                });
};