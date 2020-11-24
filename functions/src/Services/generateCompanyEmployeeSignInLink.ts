import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { Company } from '../Schema/Company';
import { resolveEmployee } from '../Helpers/ResolveDocuments';

export default async (company: Company, employeeId: string) => {
    const employee = await resolveEmployee(`companies/${company.id}/employees/${employeeId}`);

    const user = await admin.auth()
                            .getUser(employee.uid)
                            .catch(error => {
                                throw new functions.https.HttpsError('internal', 'The user could not be retrieved', error);
                            });

    if (!user.email) {
        throw new functions.https.HttpsError('failed-precondition', 'The user has no email');
    }

    const actionCodeSettings = {
        url: functions.config().auth.employee_app_domain,
        handleCodeInApp: true,
    };

    const signInLink = await admin.auth()
                                .generateSignInWithEmailLink(user.email, actionCodeSettings)
                                .catch(error => {
                                    throw new functions.https.HttpsError('internal', 'The sign-in link could not be generated', error);
                                });

    await admin.firestore()
            .collection('mail').add({
                to: user.email,
                message: {
                    subject: 'Sign In Link',
                    html: `<b>Hi ${employee.name}!</b> <br/><br/>Kindly use <a href="${signInLink}">this link</a> to sign in anytime you want to learn!<br/><br/>Cheers!`,
                },
            })
            .catch(error => {
                throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
            });
};