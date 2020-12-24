import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { CompletedLessonData } from '../Schema/Data';
import { Employee } from '../Schema/Employee';

export default async (employee: Employee, completedLessonData: CompletedLessonData) => {
    if (!(employee.company instanceof admin.firestore.DocumentReference)) {
        throw new functions.https.HttpsError('invalid-argument', 'The reference is invalid');
    }

    const { courseId, moduleName, lessonTitle } = completedLessonData;

    const employeeDocRef = admin.firestore()
                                .doc(`companies/${employee.company.id}/employees/${employee.id}`);

    const enrolledCourse = employee.enrolledCourses[courseId];

    if (!enrolledCourse) {
        await employeeDocRef
                    .update({
                        [`enrolledCourses.${courseId}.${moduleName}`]: {
                            completedLessons: [],
                        },
                    })
                    .catch(error => {
                        throw new functions.https.HttpsError('internal', 'The employee document could not be updated.', error);
                    });
    }
    
    await employeeDocRef
                .update({
                    [`enrolledCourses.${courseId}.${moduleName}.completedLessons`]: admin.firestore.FieldValue.arrayUnion(lessonTitle),
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The employee document could not be updated.', error);
                });
};