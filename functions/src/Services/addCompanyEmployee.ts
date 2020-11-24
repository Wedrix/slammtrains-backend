import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { lower } from 'case';

import { EmployeeData } from '../Schema/Data';
import { Company } from '../Schema/Company';
import { resolvePlan } from '../Helpers/ResolveDocuments';

import generateCompanyEmployeeSignInLink from './generateCompanyEmployeeSignInLink';

export default async (company: Company, employeeData: EmployeeData) => {
    company.plan = await resolvePlan(company.plan);

    if (!company.plan) {
        throw new functions.https.HttpsError('failed-precondition', 'You do not have any plan. Kindly pick a plan to proceed.');
    }

    if (company.plan.licensedNumberOfEmployees <= company.employeesTotalCount) {
        throw new functions.https.HttpsError('failed-precondition', 'You have exhausted all the available employee licenses for you plan. Kindly upgrade to proceed.');
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
    const employeeId = await admin.firestore()
                                    .collection(`companies/${company.id}/employees`)
                                    .add({ 
                                        uid: user.uid,
                                        ...employeeData, 
                                        __name: lower(employeeData.name),
                                        enrolledCourses: {},
                                        company: admin.firestore().doc(`companies/${company.id}`),
                                        createdAt: new Date().valueOf(), 
                                    })
                                    .then(employeeDocumentReference => employeeDocumentReference.id)
                                    .catch(error => {
                                        throw new functions.https.HttpsError('internal', 'The employee record could not be created', error);
                                    });

    // Generate passwordless sign-in link
    await generateCompanyEmployeeSignInLink(company, employeeId);

    // Send welcome email
    const business = functions.config().business.name;

    await admin.firestore()
                .collection('mail').add({
                    to: user.email,
                    message: {
                        subject: `Welcome to ${business.name}!`,
                        html: `<b>Hello ${employeeData.name}, welcome to ${business.name}!</b> 
                            <br/><br/>You should receive a sign in link shorlty. Kindly use it to sign in anytime you want to learn.<br/><br/>Cheers!`,
                    },
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
                });
};