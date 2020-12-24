import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { resolveBusiness, resolveCompany } from '../Helpers/ResolveDocuments';

export default async (companyId: string) => {
    const supportEmail = (await resolveBusiness()).supportEmail;

    const company = await resolveCompany(`companies/${companyId}`);

    await admin.firestore()
                .doc(`/companies/${companyId}`)
                .update({
                    accessToCoursesBlockedAt: new Date().valueOf(),
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The company document could not be updated.', error);
                });

    await admin.firestore()
            .collection('mail')
            .add({
                to: company.hr.email,
                message: {
                    subject: `Your access to courses has been blocked!`,
                    html: `Hello ${company.hr.name},
                        <br/>Your access to courses has been blocked due to subscription expiry. 
                        Unfortunately, this means your employees will no longer have access to the courses in your plan.
                        <br/>To restore access, kindly proceed with the following steps:
                        <br/>
                        <ol>
                            <li>Log in to your account</li>
                            <li>Navigate to the billing page: Settings >> Billing</li>
                            <li>Click on the 'Renew Subscription' button</li>
                            <li>Make payment</li>
                        </ol>
                        <br/>
                        <br/>In case you need assistance, kindly contact our support team by sending an email to ${supportEmail}. 
                        <br/>Thank You.`,
                },
            })
            .catch(error => {
                throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
            });
};