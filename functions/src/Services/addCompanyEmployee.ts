import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { lower } from 'case';

import { EmployeeData } from '../Schema/Data';
import { Company } from '../Schema/Company';
import { Plan } from '../Schema/Plan';
import { resolveBusiness, resolvePlan } from '../Helpers/ResolveDocuments';

import generateCompanyEmployeeSignInLink from './generateCompanyEmployeeSignInLink';

export default async (company: Company, employeeData: EmployeeData) => {
    if (company.plan instanceof admin.firestore.DocumentReference) {
        company.plan = await resolvePlan(company.plan)
                                        .catch(error => {
                                            if (error.code === 'not-found') {
                                                return null;
                                            }

                                            throw error;
                                        });
    }

    if (!company.plan) {
        throw new functions.https.HttpsError('not-found', 'Your plan no longer exists, most likely because, it has removed by the Admin.');
    }

    if (!Plan.check(company.plan)) {
        throw new functions.https.HttpsError('invalid-argument', 'The plan data is invalid.');
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
            .setCustomUserClaims(user.uid, { 
                accessLevel: 'employee', 
                companyId: company.id,
            })
            .catch(error => {
                throw new functions.https.HttpsError('internal', 'The custom claims could not be set on this user', error);
            });

    // Add Employee record
    await admin.firestore()
            .doc(`companies/${company.id}/employees/${user.uid}`)
            .set({ 
                uid: user.uid,
                ...employeeData, 
                __name: lower(employeeData.name),
                enrolledCourses: {},
                company: admin.firestore().doc(`companies/${company.id}`),
                createdAt: new Date().valueOf(), 
            })
            .catch(error => {
                throw new functions.https.HttpsError('internal', 'The employee record could not be created', error);
            });

    // Generate passwordless sign-in link
    await generateCompanyEmployeeSignInLink(company, user.uid);

    // Send welcome email
    const business = await resolveBusiness();

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