import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { lower } from 'case';

import axios from 'axios';

import { CompanyData } from '../Schema/Data';

export default async (uid: string, companyData: CompanyData) => {
    const user = await admin.auth()
                            .getUser(uid);

    const $config = functions.config();

    // Register User
    const companyId = admin.firestore()
                            .collection('companies')
                            .doc()
                            .id;

    const companyDomain = functions.config().app.domain;

    const emailId = (`${companyId}@${companyDomain}`).toLowerCase();

    await admin.firestore()
                .doc(`companies/${companyId}`)
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
                    accessBlockedAt: null,
                    createdAt: new Date().valueOf(),
                });

    // Send Welcome Email
    if (user.email) {
        const businessName = $config.business.name;

        await admin.firestore()
                    .collection('mail')
                    .add({
                        to: user.email,
                        message: {
                            subject: `Welcome to ${businessName}!`,
                            text:   `Welcome to ${businessName}! We hope you find great value in our products and services.`,
                        },
                    })
                    .catch(error => {
                        throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
                    });
    }

    // Create Paystack Customer
    const paystack = functions.config().paystack;

    await axios.post(`${paystack.base_uri}/customer`, {
                    email: emailId,
                }, {
                    headers: {
                        Authorization: `Bearer ${paystack.secret_key}`,
                    },
                })
                .catch(error => {
                    throw new functions.https.HttpsError('unknown', 'Error creating paystack user for company', error);
                });
};