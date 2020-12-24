import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { resolveCompany } from '../Helpers/ResolveDocuments';

export default async (companyId: string) => {
    const company = await resolveCompany(`companies/${companyId}`);

    await admin.firestore()
                .doc(`/companies/${company.id}`)
                .update({
                    accessToCoursesBlockedAt: null,
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The company document could not be updated.', error);
                });

    await admin.firestore()
            .collection('mail')
            .add({
                to: company.hr.email,
                message: {
                    subject: `Your access to courses has been restored!`,
                    html: `Hello ${company.hr.name},
                        <br/>Your access to courses has been restored. Your employees can now freely access the courses in your plan anytime. 
                        <br/>Cheers!`,
                },
            })
            .catch(error => {
                throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
            });
};