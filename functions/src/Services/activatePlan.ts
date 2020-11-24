import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as moment from 'moment';

import * as Paystack from '../Schema/Paystack';
import { Company } from '../Schema/Company';
import { BillingIntervals, BillingInterval } from '../Schema/Billing';

import unblockCompanyAccess from './unblockCompanyAccess';
import { resolvePlan } from '../Helpers/ResolveDocuments';

export default async (transaction: Paystack.Transaction) => {
    const company = await admin.firestore()
                                .collection('companies')
                                .where('emailId', '==', transaction.customer.email)
                                .get()
                                .then(async documentsSnapshot => {
                                    const document = documentsSnapshot.docs[0];

                                    if (!document) {
                                        throw new functions.https.HttpsError('internal', 'The associated company for the subscription could not be resolved.');
                                    }

                                    const documentData = Object.assign(document.data(), { id: document.id });

                                    return Company.parseAsync(documentData);
                                });

    company.plan = await resolvePlan(company.plan);

    if (!company.plan) {
        throw new functions.https.HttpsError('failed-precondition', 'The plan no longer exists, most likely because, it has removed by the Admin.');
    }

    if (transaction.metadata.planId !== company.plan.id) {
        throw new functions.https.HttpsError('failed-precondition', 'The plan associated with this payment does not match.');
    }

    if (!company.plan.billing) {
        throw new functions.https.HttpsError('failed-precondition', 'Billing is not enabled for the plan.');
    }

    if ((transaction.amount / 100) !== company.plan.billing.price) {
        throw new functions.https.HttpsError('failed-precondition', 'The plan has not been paid for in full.');
    }

    if (company.accessBlockedAt) {
        await unblockCompanyAccess(company.id);
    }

    const billingInterval: BillingInterval = company.plan.billing.interval;
    
    await admin.firestore()
                .doc(`companies/${company.id}`)
                .update({ 
                    subscription: {
                        createdAt: moment().valueOf(),
                        expiresAt: moment().add(BillingIntervals[billingInterval], 'days').valueOf(),
                        expiryReminderNotificationSentAt: null,
                        transaction,
                    },
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The subscription could not be updated for the company', error);
                });
};