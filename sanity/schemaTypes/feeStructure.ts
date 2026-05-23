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
            description: 'E.g. Nursery to Prep, Class 1 to 5',
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
