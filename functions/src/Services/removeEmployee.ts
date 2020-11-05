import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { resolveCompany, resolveEmployee } from '../Helpers/ResolveDocuments';

export default async (employeeId: string, companyId: string) => {
    const company = await resolveCompany(`companies/${companyId}`);

    const employee = await resolveEmployee(`companies/${company.id}/employees/${employeeId}`);

    // Delete User
    await admin.auth()
            .deleteUser(employee.uid)
            .catch(error => {
                throw new functions.https.HttpsError('internal', 'The user could not be deleted', error);
            });

    // Delete Employee record
    await admin.firestore()
            .doc(`/companies/${company.id}/employees/${employeeId}`)
            .delete()
            .catch(error => {
                throw new functions.https.HttpsError('internal', 'The employee record could not be deleted', error);
            });

    // Send removal notification
    if (employee.email) {
        await admin.firestore()
                .collection('mail')
                .add({
                    to: employee.email,
                    message: {
                        subject: `You've been removed from ${company.name}.`,
                        html: `Sorry <strong>${employee.name}</strong>, you've been removed from ${functions.config().business.name} by an admin for <strong>${company.name}</strong>. 
                        <br/>Unfortunately, this means that you will no longer be able to sign in to your account and learn.
                        <br/>We hope to see you again in the near future.
                        <br/>Thank You.`,
                    },
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
                });
    }
};