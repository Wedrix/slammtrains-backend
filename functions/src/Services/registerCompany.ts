import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { lower } from 'case';

import axios from 'axios';

import { CompanyData } from '../Schema/Data';
import { resolveBusiness } from '../Helpers/ResolveDocuments';

export default async (uid: string, companyData: CompanyData) => {
    const $config = functions.config();

    const user = await admin.auth()
                            .getUser(uid);

    if (!user.customClaims?.companyId) {
        throw new functions.https.HttpsError('failed-precondition', 'The user is not associated with any company.');
    }

    const emailId = (`${user.customClaims.companyId}@${$config.app.domain}`).toLowerCase();

    await admin.firestore()
                .doc(`companies/${user.customClaims.companyId}`)
                .set({
                    ...companyData,
                    __name: lower(companyData.name),
                    emailId,
                    hr: {
                        name: user.displayName,
                        email: user.email,
                        uid: user.uid,
                    },
                    plan: admin.firestore().doc(`plans/${companyData.plan}`),
                    employeesTotalCount: 0,
                    subscription: null,
                    revenue: {},
                    blockedAt: null,
                    accessToCoursesBlockedAt: null,
                    createdAt: new Date().valueOf(),
                });

    // Send Welcome Email
    if (user.email) {
        const business = await resolveBusiness();

        await admin.firestore()
                    .collection('mail')
                    .add({
                        to: user.email,
                        message: {
                            subject: `Welcome to ${business.name}!`,
                            text:   `Welcome to ${business.name}! We hope you find great value in our products and services.`,
                        },
                    })
                    .catch(error => {
                        throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
                    });
    }

    // Create Paystack Customer
    await axios.post(`${$config.paystack.base_uri}/customer`, {
                    email: emailId,
                }, {
                    headers: {
                        Authorization: `Bearer ${$config.paystack.secret_key}`,
                    },
                })
                .catch(error => {
                    throw new functions.https.HttpsError('unknown', 'Error creating paystack user for company', error);
                });
};