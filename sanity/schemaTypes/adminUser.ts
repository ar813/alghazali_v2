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
