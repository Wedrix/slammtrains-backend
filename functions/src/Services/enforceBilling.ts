import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import PromisePool = require('@supercharge/promise-pool');

import blockCompanyAccessToCourses from './blockCompanyAccessToCourses';

export default async () => {
    const now = new Date().valueOf();

    const batchSize = 200;

    const companies = await admin.firestore()
                                .collection('companies')
                                .where('subscription.expiresAt', '<=', now)
                                .where('accessToCoursesBlockedAt', '==', null)
                                .where('blockedAt', '==', null)
                                .select()
                                .limit(batchSize)
                                .get()
                                .then(querySnapshot => {
                                    const documentSnapshots: admin.firestore.DocumentSnapshot[] = [];

                                    querySnapshot.forEach(documentSnapshot => {
                                        documentSnapshots.push(documentSnapshot);
                                    });

                                    return documentSnapshots;
                                })
                                .catch(error => {
                                    throw new functions.https.HttpsError('internal', 'The companies with expired subscriptions could not be retrieved.', error);
                                });

    await PromisePool.withConcurrency(10)
                    .for(companies)
                    .process(async (company) => {
                        const companyId = company.id;

                        await blockCompanyAccessToCourses(companyId);
                    });
};