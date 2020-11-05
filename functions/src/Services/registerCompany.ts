import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

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

    const hr = {
        name: user.displayName,
        email: user.email,
        uid: user.uid,
    };

    const subscription = null;

    const accessBlockedAt = null;

    const plan = admin.firestore().doc(`plans/${companyData.plan}`);

    await admin.firestore()
                .doc(`companies/${companyId}`)
                .set({
                    ...companyData,
                    emailId,
                    hr,
                    plan,
                    employeesTotalCount: 0,
                    subscription,
                    accessBlockedAt,
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
};