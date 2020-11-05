import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { EmployeeData } from '../Schema/Data';
import { resolveCompany } from '../Helpers/ResolveDocuments';

export default async (employeeData: EmployeeData, companyId: string) => {
    const company = await resolveCompany(`companies/${companyId}`);

    if (!company.plan) {
        throw new functions.https.HttpsError('failed-precondition', 'The plan no longer exists, most likely because, it has been removed by the Admin.');
    }

    if (company.plan.licensedNumberOfEmployees <= company.employeesTotalCount) {
        throw new functions.https.HttpsError('failed-precondition', 'All the employee licenses have been exausted for the plan.');
    }

    // Create User
    const user = await admin.auth()
                        .createUser({
                            email: employeeData.email,
                            displayName: employeeData.name,
                        })
                        .catch(error => {
                            if (error.code === 'auth/email-already-exists') {
                                throw new functions.https.HttpsError('failed-precondition', error.message);
                            }

                            throw error;
                        });

    // Set Claims 
    await admin.auth()
            .setCustomUserClaims(user.uid, { accessLevel: 'employee', accessBlocked: false })
            .catch(error => {
                throw new functions.https.HttpsError('internal', 'The custom claims could not be set on this user', error);
            });

    // Add Employee record
    await admin.firestore()
            .collection(`companies/${company.id}/employees`)
            .add({ 
                uid: user.uid,
                ...employeeData, 
                enrolledCourses: [],
                company: admin.firestore().doc(`companies/${companyId}`),
                createdAt: new Date().valueOf(), 
            })
            .catch(error => {
                throw new functions.https.HttpsError('internal', 'The employee record could not be created', error);
            });

    // Send passwordless sign-in link
    if (user.email) {
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
                        subject: `Welcome to ${functions.config().business.name}!`,
                        html: `<b>Welcome ${employeeData.name}!</b> <br/><br/>Kindly use <a href="${signInLink}">this link</a> to sign in anytime you want to learn!<br/><br/>Cheers!`,
                    },
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
                });
    }
};