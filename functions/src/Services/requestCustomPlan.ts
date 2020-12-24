import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { lower } from 'case';

import { CustomPlanRequestData } from '../Schema/Data';
import { Company } from '../Schema/Company';

export default async (company: Company, customPlanRequestData: CustomPlanRequestData) => {
    const hasExistingCustomPlanRequest = await admin.firestore()
                                                    .collection('customPlanRequests')
                                                    .where('company', '==', admin.firestore().doc(`companies/${company.id}`))
                                                    .get()
                                                    .then(querySnapshot => !querySnapshot.empty)
                                                    .catch(error => {
                                                        throw new functions.https.HttpsError('internal', 'Problem querying customPlanRequests collection', error);
                                                    });

    if (hasExistingCustomPlanRequest) {
        throw new functions.https.HttpsError('failed-precondition', 'The company already has an existing custom plan request');
    }

    const customPlanRequest: any = { 
        details: customPlanRequestData.details,
        essentialCourses: [],
    };

    customPlanRequestData.essentialCoursesIds.forEach(async courseId => {
        customPlanRequest.essentialCourses.push(
            admin.firestore().doc(`courses/${courseId}`)
        );
    });

    await admin.firestore()
                .collection('customPlanRequests')
                .add({
                    ...customPlanRequest,
                    __companyName: lower(company.name),
                    company: admin.firestore().doc(`companies/${company.id}`),
                    createdAt: new Date().valueOf(),
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'Could not add the course request document', error);
                });
};