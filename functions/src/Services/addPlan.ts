import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { PlanData } from '../Schema/Data';

export default async (planData: PlanData) => {
    const courses = planData.courses.map(courseId => {
        return admin.firestore().doc(`courses/${courseId}`);
    });

    await admin.firestore()
                .collection('plans')
                .add({
                    name: planData.name,
                    description: planData.description,
                    licensedNumberOfEmployees: planData.licensedNumberOfEmployees,
                    billing: planData.billing,
                    courses,
                    createdAt: new Date().valueOf(),
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The plan record could not be added', error);
                });
};