import { defineField, defineType } from 'sanity'
import { UserCog } from 'lucide-react'

export default defineType({
    name: 'adminUser',
    title: 'Admin Users (Backup)',
    type: 'document',
    icon: UserCog,
    fields: [
        defineField({
            name: 'displayName',
            title: 'Display Name',
            type: 'string',
        }),
        defineField({
            name: 'email',
            title: 'Email Address',
            type: 'string',
        }),
        defineField({
            name: 'uid',
            title: 'Firebase UID',
            type: 'string',
            description: 'The unique identifier from Firebase Authentication',
            readOnly: true,
        }),
        defineField({
            name: 'role',
            title: 'Role',
            type: 'string',
            options: {
                list: [
                    { title: 'Admin', value: 'admin' },
                    { title: 'Super Admin', value: 'super_admin' },
                ],
            },
        }),
        defineField({
            name: 'designation',
            title: 'Designation',
            type: 'string',
            options: {
                list: [
                    { title: 'Admin', value: 'Admin' },
                    { title: 'Principal', value: 'Principal' },
                    { title: 'Teacher', value: 'Teacher' },
                    { title: 'Staff', value: 'Staff' },
                ],
            },
        }),
        defineField({
            name: 'assignedClass',
            title: 'Assigned Class (Class Teacher)',
            type: 'string',
            description: 'Optional: If this user is a class teacher, specify the class.',
        }),
        defineField({
            name: 'employeeId',
            title: 'Employee ID',
            type: 'string',
            description: 'Optional internal staff identifier, e.g. EMP-014.',
        }),
        defineField({
            name: 'fatherName',
            title: "Father's Name",
            type: 'string',
            description: 'Optional. Used on letters and record exports.',
        }),
        defineField({
            name: 'cnic',
            title: 'CNIC',
            type: 'string',
            description: 'Optional. National identity number, 13 digits, e.g. 42101-1234567-1.',
        }),
        defineField({
            name: 'phoneNumber',
            title: 'Phone Number',
            type: 'string',
            description: 'Optional contact number, e.g. 0300-1234567.',
        }),
        defineField({
            name: 'gender',
            title: 'Gender',
            type: 'string',
            options: {
                list: [
                    { title: 'Male', value: 'male' },
                    { title: 'Female', value: 'female' },
                ],
            },
        }),
        defineField({
            name: 'photoURL',
            title: 'Profile Photo',
            type: 'string',
            description: 'Data URL or remote URL of the admin avatar.',
        }),
        defineField({
            name: 'lastSyncedAt',
            title: 'Last Synced At',
            type: 'datetime',
            readOnly: true,
        })
    ],
    preview: {
        select: {
            title: 'displayName',
            subtitle: 'email',
        },
        prepare(selection) {
            const { title, subtitle } = selection
            return {
                title: title || 'Unnamed Admin',
                subtitle: subtitle,
            }
        },
    },
})
