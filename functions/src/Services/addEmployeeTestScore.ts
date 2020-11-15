import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { TestScoreData } from '../Schema/Data';
import { Employee } from '../Schema/Employee';

export default async (employee: Employee, testScoreData: TestScoreData) => {
    if (!employee.company) {
        throw new functions.https.HttpsError('failed-precondition', 'The employee account is not associated with any company');
    }

    const { courseId, moduleName, testScore } = testScoreData;

    const employeeDocRef = admin.firestore()
                                .doc(`companies/${employee.company.id}/employees/${employee.id}`);

    const enrolledCourse = employee.enrolledCourses[courseId];

    if (!enrolledCourse) {
        await employeeDocRef
                    .update({
                        [`enrolledCourses.${courseId}.${moduleName}`]: {
                            completedLessons: [],
                            testScoreHistory: [],
                        },
                    })
                    .catch(error => {
                        throw new functions.https.HttpsError('internal', 'The employee document could not be updated.', error);
                    });
    }

    await employeeDocRef
                .update({
                    [`enrolledCourses.${courseId}.${moduleName}.testScoreHistory`]: admin.firestore.FieldValue.arrayUnion(testScore),
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The employee document could not be updated.', error);
                });
};