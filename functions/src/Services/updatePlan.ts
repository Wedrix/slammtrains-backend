import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { PlanData } from '../Schema/Data';

export default async (planId: string, planData: PlanData) => {
    const courses = planData.courseIds.map(courseId => {
        return admin.firestore().doc(`courses/${courseId}`);
    });

    await admin.firestore()
                .doc(`plans/${planId}`)
                .update({
                    name: planData.name,
                    description: planData.description,
                    licensedNumberOfEmployees: planData.licensedNumberOfEmployees,
                    billing: planData.billing,
                    courses,
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The plan record could not be updated', error);
                });
};