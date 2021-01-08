import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as csvParse from 'csv-parse/lib/sync';
import * as fs from 'fs';

import { EmployeeData } from '../Schema/Data';
import { resolveCompany } from '../Helpers/ResolveDocuments';

import addCompanyEmployee from './addCompanyEmployee';

import PromisePool = require('@supercharge/promise-pool');
import { now } from 'moment';

export default async (filePath: string, companyId: string) => {
    const company = await resolveCompany(`companies/${companyId}`);

    const csvFilePath = filePath;
    const csvParseOptions = {
        columns: true,
        skip_empty_lines: true,
        skip_lines_with_error: true,
    };

    const CSV = fs.readFileSync(csvFilePath);

    const employeesData: EmployeeData[] = csvParse(CSV, csvParseOptions);

    const missedEmployees: any[] = [];

    await PromisePool.withConcurrency(10)
                    .for(employeesData)
                    .process(async (employeeData) => {
                        try {
                            const employee = await EmployeeData.parseAsync(employeeData)
                                                            .catch(error => {
                                                                throw new functions.https.HttpsError('internal', 'The employeeId is invalid', error);
                                                            });
                    
                            await addCompanyEmployee(company, employee);
                        } catch (error) {
                            const errorMessage = (error.code === 'failed-precondition') ? error.message : 'INTERNAL ERROR';

                            const missedEmployee = {
                                ...employeeData,
                                error: errorMessage,
                            };

                            missedEmployees.push(missedEmployee);

                            functions.logger.error('Error adding employee record: ', errorMessage);
                        }
                    });

    if (missedEmployees.length > 0) {
        const table = missedEmployees.reduce((tabularData, missedEmployee) => {
            return tabularData + `<tr>
                                        <td>${missedEmployee.name}</td>
                                        <td>${missedEmployee.email}</td>
                                        <td>${missedEmployee.error}</td>
                                    </tr>`;
        });

        await admin.firestore()
                .collection('mail')
                .add({
                    to: company.hr.email,
                    message: {
                        subject: `Some records could not be imported`,
                        html: `Hello ${company.hr.firstName},
                            <br/>Your recent employees import failed on some records. Kindly view the breakdown below:
                            <br/>
                            <br/>
                            <table>
                                <tr>
                                    <th>Employee Name</th>
                                    <th>Employee Email</th>
                                    <th>Error</th>
                                </tr>
                                ${table}
                            </table>`,
                    },
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
                });

        await admin.firestore()
                .collection(`companies/${company.id}/notifications`)
                .add({
                    body: 'The import task did not successfully complete for all records. Kindly check your email for a detailed breakdown of the failed records.',
                    title: 'Some of the imports failed',
                    read: false,
                    createdAt: now(),
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The notification record could not be added', error);
                });
    }
};