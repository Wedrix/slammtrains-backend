import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { resolvePlan } from '../Helpers/ResolveDocuments';
import { Company } from '../Schema/Company';

export default async (company: Company, planId: string) => {
    const plan = await resolvePlan(`plans/${planId}`);

    if (!plan) {
        throw new functions.https.HttpsError('failed-precondition', 'The plan no longer exists, most likely because, it has been removed by the Admin.');
    }

    if (plan.licensedNumberOfEmployees < company.employeesTotalCount) {
        throw new functions.https.HttpsError('failed-precondition', 'The new plan does not have enough licenses for all the company\'s employees.');
    }

    const subscription = null;

    await admin.firestore()
                .doc(`companies/${company.id}`)
                .update({ 
                    plan: admin.firestore().doc(`plans/${planId}`),
                    subscription,
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The company plan could not be updated.', error);
                });
};