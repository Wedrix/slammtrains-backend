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
import addCourseDraft from './Services/addCourseDraft';
import createCompanyCustomPlan from './Services/createCompanyCustomPlan';
import setCompanyPlan from './Services/setCompanyPlan';
import sendSubscriptionReminders from './Services/sendSubscriptionReminders';
import enforceBilling from './Services/enforceBilling';
import addEmployeeCompletedLesson from './Services/addEmployeeCompletedLesson';
import addEmployeeAskedQuestion from './Services/addEmployeeAskedQuestion';
import fetchCompanyTransactions from './Services/fetchCompanyTransactions';
import requestCourse from './Services/requestCourse';
import removeCourseRequest from './Services/removeCourseRequest';
import generateCompanyEmployeeSignInLink from './Services/generateCompanyEmployeeSignInLink';
import blockCompany from './Services/blockCompany';
import unblockCompany from './Services/unblockCompany';
import broadcastEmail from './Services/broadcastEmail';
import requestCustomPlan from './Services/requestCustomPlan';
import removeCustomPlanRequest from './Services/removeCustomPlanRequest';
import updatePlan from './Services/updatePlan';
import deletePlan from './Services/deletePlan';
import addCourseReview from './Services/addCourseReview';
import updateCourseReview from './Services/updateCourseReview';

import * as Schema from 'zod';
import * as ResolveDocuments from './Helpers/ResolveDocuments';

import { 
    EmployeeData,
    PlanData,
    CompanyData,
    HRData,
    CourseData,
    CourseDraftData,
    CourseRequestData,
    CompletedLessonData,
    TransactionsPaginationData,
    EmailData,
    CustomPlanRequestData,
    AskedQuestionData,
    ReviewData,
} from './Schema/Data';

interface Auth {
    uid: string;
    token: admin.auth.DecodedIdToken;
}

const authorizeRequest = async (auth: Auth | undefined, accessLevel: 'admin' | 'hr' | 'employee' | boolean = true) => {
    if (!auth) {
        throw new functions.https.HttpsError('permission-denied', 'Unauthenticated');
    }

    const user = await admin.auth().getUser(auth.uid);

    if (!user.emailVerified) {
        throw new functions.https.HttpsError('permission-denied', 'Unauthenticated');
    }

    if (accessLevel !== true) {
        const customClaims = user.customClaims;
    
        if (customClaims?.accessLevel !== ((accessLevel === false) ? undefined : accessLevel)) {
            throw new functions.https.HttpsError('permission-denied', 'You are not authroized to call this function');
        }
    }
};

const resolveHRCompany = async (auth: Auth | undefined) => {
    if (!auth) {
        throw new functions.https.HttpsError('permission-denied', 'You are not authorized to call this function');
    }

    const customClaims = (await admin.auth().getUser(auth.uid)).customClaims;

    const companyId = customClaims?.companyId;

    if (!companyId) {
        throw new functions.https.HttpsError('invalid-argument', 'The account is not associated with any company');
    }

    const companyDocumentReference = await admin.firestore()
                                                .doc(`companies/${companyId}`)
                                                .get()
                                                .then(documentSnapshot => {
                                                    if (!documentSnapshot.data()) {
                                                        throw new functions.https.HttpsError('failed-precondition', 'There is no company associated with this user');
                                                    }

                                                    return documentSnapshot.ref;
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

    const customClaims = (await admin.auth().getUser(auth.uid)).customClaims;

    const companyId = customClaims?.companyId;

    if (!companyId) {
        throw new functions.https.HttpsError('invalid-argument', 'The account is not associated with any company');
    }

    const employeeDocumentReference = await admin.firestore()
                                                .doc(`companies/${companyId}/employees/${auth.uid}`)
                                                .get()
                                                .then(documentSnapshot => {
                                                    if (!documentSnapshot.data()) {
                                                        throw new functions.https.HttpsError('failed-precondition', 'There is no account associated with this user');
                                                    }

                                                    return documentSnapshot.ref;
                                                })
                                                .catch(error => {
                                                    throw new functions.https.HttpsError('internal', 'Error resolving employee', error);
                                                });

    return ResolveDocuments.resolveEmployee(employeeDocumentReference)
                            .catch(error => {
                                throw new functions.https.HttpsError('internal', 'Error resolving employee', error);
                            });
};

exports.resolveHRCompany = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'hr');

    const company = await resolveHRCompany(context.auth);

    return { company };
});

exports.resolveEmployee = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'employee');

    const employee = await resolveEmployee(context.auth);
    
    if (employee.company instanceof admin.firestore.DocumentReference) {
        employee.company = await ResolveDocuments.resolveCompany(employee.company);
    }

    return { employee };
});

exports.setAdmin = functions.https.onCall(async () => {
    await setAdmin();
});

exports.signUpHR = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, false);

    if (context.auth?.uid) {
        const hrData = await HRData.parseAsync(data.hrData)
                                .catch(error => {
                                    throw new functions.https.HttpsError('invalid-argument', 'The hr data is invalid.', error);
                                });
    
        await signUpHR(context.auth.uid, hrData);
    }
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

    const company = await resolveHRCompany(context.auth);

    await addCompanyEmployee(company, employeeData);
});

exports.generateCompanyEmployeeSignInLink = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'hr');

    const employeeId = await Schema.string()
                                    .parseAsync(data.employeeId)
                                    .catch(error => {
                                        throw new functions.https.HttpsError('invalid-argument', 'The employee Id is invalid', error);
                                    });

    const company = await resolveHRCompany(context.auth);

    await generateCompanyEmployeeSignInLink(company, employeeId);
});

exports.removeCompanyEmployee = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'hr');

    const employeeId = await Schema.string()
                                    .parseAsync(data.employeeId)
                                    .catch(error => {
                                        throw new functions.https.HttpsError('invalid-argument', 'The employee Id is invalid', error);
                                    });

    const company = await resolveHRCompany(context.auth);

    await removeCompanyEmployee(company, employeeId);
});

exports.setCompanyPlan = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'hr');

    const planId = await Schema.string()
                                .parseAsync(data.planId)
                                .catch(error => {
                                    throw new functions.https.HttpsError('invalid-argument', 'The plan Id is invalid', error);
                                });

    const company = await resolveHRCompany(context.auth);

    await setCompanyPlan(company, planId);
});

exports.requestCourse = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'hr');

    const courseRequestData = await CourseRequestData.parseAsync(data.courseRequestData)
                                                    .catch(error => {
                                                        throw new functions.https.HttpsError('invalid-argument', 'The course request data is invalid', error);
                                                    });

    const company = await resolveHRCompany(context.auth);

    await requestCourse(company, courseRequestData);
});

exports.requestCustomPlan = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'hr');

    const customPlanRequestData = await CustomPlanRequestData.parseAsync(data.customPlanRequestData)
                                                            .catch(error => {
                                                                throw new functions.https.HttpsError('invalid-argument', 'The custom plan request data is invalid', error);
                                                            });

    const company = await resolveHRCompany(context.auth);

    await requestCustomPlan(company, customPlanRequestData);
});

exports.addPlan = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'admin');

    const planData = await PlanData.parseAsync(data.planData)
                                    .catch(error => {
                                        throw new functions.https.HttpsError('invalid-argument', 'The plan data is invalid', error);
                                    });

    await addPlan(planData);
});

exports.updatePlan = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'admin');

    const planData = await PlanData.parseAsync(data.planData)
                                    .catch(error => {
                                        throw new functions.https.HttpsError('invalid-argument', 'The plan data is invalid', error);
                                    });

    const planId = await Schema.string()
                                .parseAsync(data.planId)
                                .catch(error => {
                                    throw new functions.https.HttpsError('invalid-argument', 'The plan id is invalid', error);
                                });

    await updatePlan(planId, planData);
});

exports.deletePlan = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'admin');

    const planId = await Schema.string()
                                .parseAsync(data.planId)
                                .catch(error => {
                                    throw new functions.https.HttpsError('invalid-argument', 'The plan id is invalid', error);
                                });

    await deletePlan(planId);
});

exports.removeCourseRequest = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'admin');

    const courseRequestId = await Schema.string()
                                        .parseAsync(data.courseRequestId)
                                        .catch(error => {
                                            throw new functions.https.HttpsError('invalid-argument', 'The requested course id is ivalid', error);
                                        });

    await removeCourseRequest(courseRequestId);
});

exports.removeCustomPlanRequest = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'admin');

    const customPlanRequestId = await Schema.string()
                                            .parseAsync(data.customPlanRequestId)
                                            .catch(error => {
                                                throw new functions.https.HttpsError('invalid-argument', 'The custom plan request id is invalid', error);
                                            });

    await removeCustomPlanRequest(customPlanRequestId);
});

exports.createCompanyCustomPlan = functions.https.onCall(async (data, context) => {
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

    await createCompanyCustomPlan(planData, companyId);
});

exports.addCourse = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'admin');

    const courseData = await CourseData.parseAsync(data.courseData)
                                        .catch(error => {
                                            throw new functions.https.HttpsError('invalid-argument', 'The course data is invalid', error);
                                        });

    await addCourse(courseData);
});

exports.addCourseDraft = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'admin');

    const courseDraftData = await CourseDraftData.parseAsync(data.draftCourseData)
                                                .catch(error => {
                                                    throw new functions.https.HttpsError('invalid-argument', 'The draft course data is invalid', error);
                                                });

    await addCourseDraft(courseDraftData);
});

exports.blockCompany = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'admin');

    const companyId = await Schema.string()
                                .parseAsync(data.companyId)
                                .catch(error => {
                                    throw new functions.https.HttpsError('invalid-argument', 'The company id is invalid', error);
                                });

    await blockCompany(companyId);
});

exports.unblockCompany = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'admin');

    const companyId = await Schema.string()
                                .parseAsync(data.companyId)
                                .catch(error => {
                                    throw new functions.https.HttpsError('invalid-argument', 'The company id is invalid', error);
                                });

    await unblockCompany(companyId);
});

exports.broadcastEmail = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'admin');

    const emailData = await EmailData.parseAsync(data.emailData)
                                    .catch(error => {
                                        throw new functions.https.HttpsError('invalid-argument', 'The email data is invalid', error);                                        
                                    });

    await broadcastEmail(emailData);
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
                        : await resolveHRCompany(context.auth);

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

exports.addEmployeeAskedQuestion = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'employee');

    const employee = await resolveEmployee(context.auth);

    const askedQuestionData = await AskedQuestionData.parseAsync(data.askedQuestionData)
                                                    .catch(error => {
                                                        throw new functions.https.HttpsError('invalid-argument', 'The asked question data is invalid', error);
                                                    });

    await addEmployeeAskedQuestion(employee, askedQuestionData);
});

exports.addCourseReview = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'employee');

    const employee = await resolveEmployee(context.auth);

    const reviewData = await ReviewData.parseAsync(data.reviewData)
                                        .catch(error => {
                                            throw new functions.https.HttpsError('invalid-argument', 'The review data is invalid', error);
                                        });
    
    await addCourseReview(employee, reviewData);
});

exports.updateCourseReview = functions.https.onCall(async (data, context) => {
    await authorizeRequest(context.auth, 'employee');

    const employee = await resolveEmployee(context.auth);

    const reviewData = await ReviewData.parseAsync(data.reviewData)
                                            .catch(error => {
                                                throw new functions.https.HttpsError('invalid-argument', 'The updated review data is invalid', error);
                                            });
    
    await updateCourseReview(employee, reviewData);
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

exports.enforceBillingEveryTenMinutes = functions.pubsub
                                                .schedule('every 10 minutes from 03:00 to 07:00')
                                                .onRun(async (context) => {
                                                    await enforceBilling();
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
                                                                    .doc(`documentCounters/index`)
                                                                    .update('companies', admin.firestore.FieldValue.increment(1));
                                                        });

exports.decrementCompaniesTotalCountOnDelete = functions.firestore
                                                        .document(`/companies/{companyId}`)
                                                        .onDelete(async () => {
                                                            await admin.firestore()
                                                                    .doc(`documentCounters/index`)
                                                                    .update('companies', admin.firestore.FieldValue.increment(-1));
                                                        });

exports.incrementCoursesTotalCountOnCreate = functions.firestore
                                                    .document(`/courses/{courseId}`)
                                                    .onCreate(async () => {
                                                        await admin.firestore()
                                                                .doc(`documentCounters/index`)
                                                                .update('courses', admin.firestore.FieldValue.increment(1));
                                                    });

exports.decrementCoursesTotalCountOnDelete = functions.firestore
                                                    .document(`/courses/{courseId}`)
                                                    .onDelete(async () => {
                                                        await admin.firestore()
                                                                .doc(`documentCounters/index`)
                                                                .update('courses', admin.firestore.FieldValue.increment(-1));
                                                    });

exports.incrementPlansTotalCountOnCreate = functions.firestore
                                                    .document(`/plans/{planId}`)
                                                    .onCreate(async () => {
                                                        await admin.firestore()
                                                                .doc(`documentCounters/index`)
                                                                .update('plans', admin.firestore.FieldValue.increment(1));
                                                    });

exports.decrementPlansTotalCountOnDelete = functions.firestore
                                                    .document(`/plans/{planId}`)
                                                    .onDelete(async () => {
                                                        await admin.firestore()
                                                                .doc(`documentCounters/index`)
                                                                .update('plans', admin.firestore.FieldValue.increment(-1));
                                                    });

exports.incrementCourseRequestsTotalCountOnCreate = functions.firestore
                                                            .document(`/courseRequests/{courseRequestId}`)
                                                            .onCreate(async () => {
                                                                await admin.firestore()
                                                                        .doc(`documentCounters/index`)
                                                                        .update('courseRequests', admin.firestore.FieldValue.increment(1));
                                                            });

exports.decrementCourseRequestsTotalCountOnDelete = functions.firestore
                                                            .document(`/courseRequests/{courseRequestId}`)
                                                            .onDelete(async () => {
                                                                await admin.firestore()
                                                                        .doc(`documentCounters/index`)
                                                                        .update('courseRequests', admin.firestore.FieldValue.increment(-1));
                                                            });

exports.incrementCustomPlanRequestsTotalCountOnCreate = functions.firestore
                                                            .document(`/customPlanRequests/{customPlanRequestId}`)
                                                            .onCreate(async () => {
                                                                await admin.firestore()
                                                                        .doc(`documentCounters/index`)
                                                                        .update('customPlanRequests', admin.firestore.FieldValue.increment(1));
                                                            });

exports.decrementCustomPlanRequestsTotalCountOnDelete = functions.firestore
                                                            .document(`/customPlanRequests/{customPlanRequestId}`)
                                                            .onDelete(async () => {
                                                                await admin.firestore()
                                                                        .doc(`documentCounters/index`)
                                                                        .update('customPlanRequests', admin.firestore.FieldValue.increment(-1));
                                                            });
                            