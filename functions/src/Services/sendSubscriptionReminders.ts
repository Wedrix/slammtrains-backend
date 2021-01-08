import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as moment from 'moment';

import PromisePool = require('@supercharge/promise-pool');

import { resolveCompany } from '../Helpers/ResolveDocuments';

export default async () => {
    const now = moment().valueOf();
    const threeDaysFromNow = moment().add(3, 'days').valueOf();

    const batchSize = 200;

    const documents = await admin.firestore()
                                .collection('companies')
                                .where('subscription.expiresAt', '>', now)
                                .where('subscription.expiresAt', '<=', threeDaysFromNow)
                                .where('subscription.expiryReminderNotificationSentAt', '==', null)
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
                                    throw new functions.https.HttpsError('internal', 'The billable companies could not be retrieved.', error);
                                });

    await PromisePool.withConcurrency(10)
                    .for(documents)
                    .process(async (document) => {
                        const company = await resolveCompany(`companies/${document.id}`);

                        const daysLeft = moment(company.subscription?.expiresAt).diff(moment(), 'days');

                        await admin.firestore()
                                .collection('mail')
                                .add({
                                    to: company.hr.email,
                                    message: {
                                        subject: `Your subscription expires in ${daysLeft} days!`,
                                        html: `Hello ${company.hr.firstName},
                                            <br/>Your subscription will expire in ${daysLeft} day(s).
                                            <br/>
                                            <br/>To prevent any disruption of service, kindly take the following steps to renew your subscription:
                                            <br/>
                                            <ol>
                                                <li>Log in to your account</li>
                                                <li>Navigate to the billing page: Settings >> Billing</li>
                                                <li>Click on the 'Renew Subscription' button</li>
                                                <li>Make payment</li>
                                            </ol>
                                            <br/>
                                            <br/>Thank You.`,
                                    },
                                })
                                .catch(error => {
                                    throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
                                });
                
                        await admin.firestore()
                                    .collection(`companies/${company.id}/notifications`)
                                    .add({
                                        body: `Your subscription expires in ${daysLeft} days. Kindly navigate to the billing page to renew it.`,
                                        title: `Your subscription expires in ${daysLeft} days!`,
                                        read: false,
                                        createdAt: now,
                                    })
                                    .catch(error => {
                                        throw new functions.https.HttpsError('internal', 'The notification record could not be added', error);
                                    });

                        await admin.firestore()
                                    .doc(`companies/${document.id}`)
                                    .update({
                                        'subscription.expiryReminderNotificationSentAt': now,
                                    })
                                    .catch(error => {
                                        throw new functions.https.HttpsError('internal', 'The subscription could not be updated.', error);
                                    });
                    });
};