import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import * as path from 'path';
import * as os from 'os';

admin.initializeApp(functions.config().firebase);

import setAdmin from './Services/setAdmin';
import signUpHR from './Services/signUpHR';
import registerCompany from './Services/registerCompany';
import addCompanyEmployee from './Services/addCompanyEmployee';
import importEmployees from './Services/importEmployees';
import removeCompanyEmployee from './Services/removeCompanyEmployee';
import processPaystackEvents from './processPaystackEvents';
import addPlan from './Services/addPlan';
import addCourse from './Services/addCourse';
import addDraftCourse from './Services/addDraftCourse';
import setCustomPlanForCompany from './Services/setCustomPlanForCompany';
import setCompanyPlan from './Services/setCompanyPlan';
import sendSubscriptionReminders from './Services/sendSubscriptionReminders';
import blockAccessForCompaniesWithExpiredSubscriptions from './Services/blockAccessForCompaniesWithExpiredSubscriptions';
import addEmployeeTestScore from './Services/addEmployeeTestScore';
import addEmployeeCompletedLesson from './Services/addEmployeeCompletedLesson';
import fetchCompanyTransactions from './Services/fetchCompanyTransactions';
import requestCourse from './Services/requestCourse';
import removeRequestedCourse from './Services/removeRequestedCourse';
import generateCompanyEmployeeSignInLink from './Services/generateCompanyEmployeeSignInLink';

import * as Schema from 'zod';
import * as ResolveDocuments from './Helpers/ResolveDocuments';

import { 
    EmployeeData,
    PlanData,
    CompanyData,
    HRData,
    CourseData,
    DraftCourseData,
    CompletedLessonData,
    TestScoreData,
    TransactionsPaginationData,
    RequestedCourseData,
} from './Schema/Data';

interface Auth {
    uid: string;
    token: admin.auth.DecodedIdToken;
}

const authorizeRequest = async (auth: Auth | undefined, accessLevel: 'admin' | 'hr' | 'employee') => {
    if (!auth) {
        throw new functions.https.HttpsError('permission-denied', 'You are not authorized to call this function');
    }

    const authUserRecord = await admin.auth().getUser(auth.uid);
    const customClaims = authUserRecord.customClaims; 

    if (!customClaims) {
        throw new functions.https.HttpsError('permission-denied', 'You are not authorized to call this function');     
    }

    if (customClaims.accessLevel !== accessLevel) {
        throw new functions.https.HttpsError('permission-denied', 'You are not authroized to call this function');
    }
};

const resolveCompanyForHr = async (auth: Auth | undefined) => {
    if (!auth) {
        throw new functions.https.HttpsError('permission-denied', 'You are not authorized to call this function');
    }

    const uid = auth.uid;

    const companyDocumentReference = await admin.firestore()
                                                .collection('companies')
                                                .where('hr.uid','==',uid)
                                                .select()
                                                .get()
                                                .then(documentsSnapshot => {
                                                    const document = documentsSnapshot.docs[0];

                                                    if (!document) {
                                                        throw new functions.https.HttpsError('failed-precondition', 'There is no company associated with this user');
                                                    }

                                                    return document.ref;
                                                })
                                                .catch(error => {
                                                    throw new functions.https.HttpsError('internal', 'Error resolving company', error);
                                                });

    return ResolveDocuments.resolveCompany(companyDocumentReference)
                            .catch(error => {
                                throw new functions.https.HttpsError('internal', 'Error resolving company', error);
                            });
};

const resolveEmployee = async (auth: Auth | undefined) => {
    if (!auth) {
        throw new functions.https.HttpsError('permission-denied', 'You are not authorized to call this function');
    }

    const uid = auth.uid;

    const employeeDocumentReference = await admin.firestore()
                                                .collectionGroup('employees')
                                                .where('uid','==',uid)
                                                .select()
                                                .get()
                                                .then(documentsSnapshot => {
                                                    const document = documentsSnapshot.docs[0];

                                                    if (!document) {
                                                        throw new functions.https.HttpsError('failed-precondition', 'There is no account associated with this user');
                                                    }

                                                    return document.ref;
                                                })
                                                .catch(error => {
                                                    throw new functions.https.HttpsError('internal', 'Error resolving employee', error);
                                                });

    return ResolveDocuments.resolveEmployee(employeeDocumentReference)
                            .catch(error => {
                                throw new functions.https.HttpsError('internal', 'Error resolving employee', error);
                            });
};

exports.setAdmin = functions.https.onCall(async () => {
    await setAdmin();
});

exports.signUpHR = functions.https.onCall(async data => {
    const hrData = await HRData.parseAsync(data.hrData)
                            .catch(error => {
                                throw new functions.https.HttpsError('invalid-argument', 'The hr data is invalid.', error);
                            });

    await signUpHR(hrData);
});

exports.registerCompany = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'hr');
    
    if (context.auth) {
        const uid = context.auth.uid;

        const companyData = await CompanyData.parseAsync(data.companyData)
                                            .catch(error => {
                                                throw new functions.https.HttpsError('invalid-argument', 'The company data is invalid.', error);
                                            });
    
        await registerCompany(uid, companyData);
    }
});

exports.addCompanyEmployee = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'hr');

    const employeeData = await EmployeeData.parseAsync(data.employeeData)
                                            .catch(error => {
                                                throw new functions.https.HttpsError('invalid-argument', 'The employee data is invalid', error);
                                            });

    const company = await resolveCompanyForHr(context.auth);

    await addCompanyEmployee(company, employeeData);
});

exports.generateCompanyEmployeeSignInLink = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'hr');

    const employeeId = await Schema.string()
                                    .parseAsync(data.employeeId)
                                    .catch(error => {
                                        throw new functions.https.HttpsError('invalid-argument', 'The employee Id is invalid', error);
                                    });

    const company = await resolveCompanyForHr(context.auth);

    await generateCompanyEmployeeSignInLink(company, employeeId);
});

exports.removeCompanyEmployee = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'hr');

    const employeeId = await Schema.string()
                                    .parseAsync(data.employeeId)
                                    .catch(error => {
                                        throw new functions.https.HttpsError('invalid-argument', 'The employee Id is invalid', error);
                                    });

    const company = await resolveCompanyForHr(context.auth);

    await removeCompanyEmployee(company, employeeId);
});

exports.setCompanyPlan = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'hr');

    const planId = await Schema.string()
                                .parseAsync(data.planId)
                                .catch(error => {
                                    throw new functions.https.HttpsError('invalid-argument', 'The plan Id is invalid', error);
                                });

    const company = await resolveCompanyForHr(context.auth);

    await setCompanyPlan(company, planId);
});

exports.requestCourse = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'hr');

    const requestedCourseData = await RequestedCourseData.parseAsync(data.requestedCourseData)
                                                        .catch(error => {
                                                            throw new functions.https.HttpsError('invalid-argument', 'The requested course data is invalid', error);
                                                        });

    const company = await resolveCompanyForHr(context.auth);

    await requestCourse(company, requestedCourseData);
});

exports.addPlan = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'admin');

    const planData = await PlanData.parseAsync(data.planData)
                                    .catch(error => {
                                        throw new functions.https.HttpsError('invalid-argument', 'The plan data is invalid', error);
                                    });

    await addPlan(planData);
});

exports.removeRequestedCourse = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'admin');

    const requestedCourseId = await Schema.string()
                                        .parseAsync(data.requestedCourseId)
                                        .catch(error => {
                                            throw new functions.https.HttpsError('invalid-argument', 'The requested course id is ivalid', error);
                                        });

    await removeRequestedCourse(requestedCourseId);
});

exports.setCompanyCustomPlan = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'admin');

    const planData = await PlanData.parseAsync(data.planData)
                                    .catch(error => {
                                        throw new functions.https.HttpsError('invalid-argument', 'The plan data is invalid', error);
                                    });

    const companyId = await Schema.string()
                                .parseAsync(data.companyId)
                                .catch(error => {
                                    throw new functions.https.HttpsError('invalid-argument', 'The company Id is invalid', error);
                                });

    await setCustomPlanForCompany(planData, companyId);
});

exports.addCourse = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'admin');

    const courseData = await CourseData.parseAsync(data.courseData)
                                        .catch(error => {
                                            throw new functions.https.HttpsError('invalid-argument', 'The course data is invalid', error);
                                        });

    await addCourse(courseData);
});

exports.addDraftCourse = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'admin');

    const draftCourseData = await DraftCourseData.parseAsync(data.draftCourseData)
                                                .catch(error => {
                                                    throw new functions.https.HttpsError('invalid-argument', 'The draft course data is invalid', error);
                                                });

    await addDraftCourse(draftCourseData);
});

exports.fetchCompanyTransactions = functions.https.onCall(async (data, context) => {
    const transactionsPaginationData = await TransactionsPaginationData.parseAsync(data.transactionsPaginationData)
                                                                        .catch(error => {
                                                                            throw new functions.https.HttpsError('invalid-argument', 'The pagination data is invalid', error);
                                                                        });

    if (transactionsPaginationData.companyId) {
        await authorizeRequest(context.auth, 'admin');
    } 
    else {
        await authorizeRequest(context.auth, 'hr');
    }

    const company = transactionsPaginationData.companyId 
                        ? await ResolveDocuments.resolveCompany(`companies/${transactionsPaginationData.companyId}`)
                        : await resolveCompanyForHr(context.auth);

    return fetchCompanyTransactions(company, transactionsPaginationData);
});

exports.addEmployeeCompletedLesson = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'employee');

    const employee = await resolveEmployee(context.auth);

    const completedLessonData = await CompletedLessonData.parseAsync(data.completedLesson)
                                                        .catch(error => {
                                                            throw new functions.https.HttpsError('invalid-argument', 'The completed lesson data is invalid', error);
                                                        });

    await addEmployeeCompletedLesson(employee, completedLessonData);
});

exports.addEmployeeTestScore = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'employee');

    const employee = await resolveEmployee(context.auth);

    const testScoreData = await TestScoreData.parseAsync(data.testScore)
                                                        .catch(error => {
                                                            throw new functions.https.HttpsError('invalid-argument', 'The test score data is invalid', error);
                                                        });

    await addEmployeeTestScore(employee, testScoreData);
});

exports.importEmployeesOnCSVUpload = functions.storage.object().onFinalize(async object => {
    // Run the function
    const fileBucket = object.bucket;
    const filePath = object.name;

    if (filePath) {
        // Get the file name.
        const fileName = path.basename(filePath); 
        const dirName = path.dirname(filePath);

        // Return if this is triggered on a file that is not a csv
        if (!fileName.match(/.csv/gi)) {
            return;
        }

        // Return if this is triggered on a csv that does not contain employee data
        if (!dirName.endsWith('/employees')) {
            return;
        }
    
        // Download file from bucket.
        const bucket = admin.storage().bucket(fileBucket);
        const tempFilePath = path.join(os.tmpdir(), fileName);
    
        try {
            await bucket.file(filePath).download({destination: tempFilePath}); 
        } catch (error) {
            throw new functions.https.HttpsError('internal', 'Error downloading CSV file', error);
        }

        const companyId = dirName.split('/')[1];

        await importEmployees(tempFilePath, companyId);
    }
});

exports.processPaystackEvents = functions.https.onRequest(processPaystackEvents);

exports.sendSubscriptionRemindersEveryTenMinutes = functions.pubsub
                                                            .schedule('every 10 minutes from 03:00 to 07:00')
                                                            .onRun(async (context) => {
                                                                await sendSubscriptionReminders();
                                                            });

exports.blockAccessForCompaniesWithExpiredSubscriptionsEveryTenMinutes = functions.pubsub
                                                                                .schedule('every 10 minutes from 03:00 to 07:00')
                                                                                .onRun(async (context) => {
                                                                                    await blockAccessForCompaniesWithExpiredSubscriptions();
                                                                                });

exports.incrementEmployeesTotalCountOnCreate = functions.firestore
                                                        .document(`/companies/{companyId}/employees/{employeeId}`)
                                                        .onCreate(async (documentSnapshot, context) => {
                                                            const companyId = context.params.companyId;

                                                            await admin.firestore()
                                                                    .doc(`companies/${companyId}`)
                                                                    .update('employeesTotalCount', admin.firestore.FieldValue.increment(1));
                                                        });

exports.decrementEmployeesTotalCountOnDelete = functions.firestore
                                                        .document(`/companies/{companyId}/employees/{employeeId}`)
                                                        .onDelete(async (documentSnapshot, context) => {
                                                            const companyId = context.params.companyId;

                                                            await admin.firestore()
                                                                    .doc(`companies/${companyId}`)
                                                                    .update('employeesTotalCount', admin.firestore.FieldValue.increment(-1));
                                                        });

exports.incrementCompaniesTotalCountOnCreate = functions.firestore
                                                        .document(`/companies/{companyId}`)
                                                        .onCreate(async () => {
                                                            await admin.firestore()
                                                                    .doc(`__documentCounters/companies`)
                                                                    .update('totalCount', admin.firestore.FieldValue.increment(1));
                                                        });

exports.decrementCompaniesTotalCountOnDelete = functions.firestore
                                                        .document(`/companies/{companyId}`)
                                                        .onDelete(async () => {
                                                            await admin.firestore()
                                                                    .doc(`__documentCounters/companies`)
                                                                    .update('totalCount', admin.firestore.FieldValue.increment(-1));
                                                        });

exports.incrementCoursesTotalCountOnCreate = functions.firestore
                                                    .document(`/courses/{courseId}`)
                                                    .onCreate(async () => {
                                                        await admin.firestore()
                                                                .doc(`__documentCounters/courses`)
                                                                .update('totalCount', admin.firestore.FieldValue.increment(1));
                                                    });

exports.decrementCoursesTotalCountOnDelete = functions.firestore
                                                    .document(`/courses/{courseId}`)
                                                    .onDelete(async () => {
                                                        await admin.firestore()
                                                                .doc(`__documentCounters/courses`)
                                                                .update('totalCount', admin.firestore.FieldValue.increment(-1));
                                                    });

exports.incrementPlansTotalCountOnCreate = functions.firestore
                                                    .document(`/plans/{planId}`)
                                                    .onCreate(async () => {
                                                        await admin.firestore()
                                                                .doc(`__documentCounters/plans`)
                                                                .update('totalCount', admin.firestore.FieldValue.increment(1));
                                                    });

exports.decrementPlansTotalCountOnDelete = functions.firestore
                                                    .document(`/plans/{planId}`)
                                                    .onDelete(async () => {
                                                        await admin.firestore()
                                                                .doc(`__documentCounters/plans`)
                                                                .update('totalCount', admin.firestore.FieldValue.increment(-1));
                                                    });

exports.incrementRequestedCoursesTotalCountOnCreate = functions.firestore
                                                                .document(`/requestedCourses/{requestedCourseId}`)
                                                                .onCreate(async () => {
                                                                    await admin.firestore()
                                                                            .doc(`__documentCounters/requestedCourses`)
                                                                            .update('totalCount', admin.firestore.FieldValue.increment(1));
                                                                });

exports.decrementRequestedCoursesTotalCountOnDelete = functions.firestore
                                                                .document(`/requestedCourses/{requestedCoursesId}`)
                                                                .onDelete(async () => {
                                                                    await admin.firestore()
                                                                            .doc(`__documentCounters/requestedCourses`)
                                                                            .update('totalCount', admin.firestore.FieldValue.increment(-1));
                                                                });
                            