import { defineField, defineType } from 'sanity'
import { CreditCard } from 'lucide-react'

export default defineType({
    name: 'feeStructure',
    title: 'Fee Structure',
    type: 'document',
    icon: CreditCard,
    fields: [
        defineField({
            name: 'classGroup',
            title: 'Class Group',
            type: 'string',
            description: 'E.g. Pre-Primary, Primary, Middle, Secondary',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'classesIncluded',
            title: 'Classes Included',
            type: 'string',
            description: 'Display text for public site. E.g. Nursery to Prep, Class 1 to 5',
        }),
        defineField({
            name: 'classCodes',
            title: 'Class Codes (for matching)',
            type: 'array',
            of: [{ type: 'string' }],
            description: 'Exact class codes that map to this fee group. E.g. KG, 1, 2, 3. Must match student admissionFor values.',
            options: {
                list: [
                    { title: 'KG', value: 'KG' },
                    { title: 'Class 1', value: '1' },
                    { title: 'Class 2', value: '2' },
                    { title: 'Class 3', value: '3' },
                    { title: 'Class 4', value: '4' },
                    { title: 'Class 5', value: '5' },
                    { title: 'Class 6', value: '6' },
                    { title: 'Class 7', value: '7' },
                    { title: 'Class 8', value: '8' },
                    { title: 'SSC I', value: 'SSCI' },
                    { title: 'SSC II', value: 'SSCII' },
                ],
            },
        }),
        defineField({
            name: 'admissionFee',
            title: 'Admission Fee (One time)',
            type: 'number',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'monthlyTuition',
            title: 'Monthly Tuition Fee',
            type: 'number',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'annualCharges',
            title: 'Annual Charges',
            type: 'number',
        }),
        defineField({
            name: 'lateFeeFine',
            title: 'Late Fee Fine',
            type: 'number',
            description: 'Fixed fine amount applied if fee is paid after due date',
            initialValue: 0
        }),
        defineField({
            name: 'order',
            title: 'Display Order',
            type: 'number',
            description: 'Determines the order this appears on the website (e.g. 1, 2, 3)',
        })
    ],
    preview: {
        select: {
            title: 'classGroup',
            subtitle: 'monthlyTuition',
        },
        prepare({ title, subtitle }) {
            return {
                title,
                subtitle: `Monthly: Rs. ${subtitle}`
            }
        }
    }
})
