import { defineField, defineType } from 'sanity'
import { GraduationCap } from 'lucide-react'

export default defineType({
  name: 'academicClass',
  title: 'Academic Class',
  type: 'document',
  icon: GraduationCap,
  fields: [
    defineField({
      name: 'name',
      title: 'Class Name',
      type: 'string',
      description: 'E.g. Class 1, KG',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'code',
      title: 'Class Code',
      type: 'string',
      description: 'Exact code used for matching students (e.g. 1, KG, SSCI). MUST match student admissionFor.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'group',
      title: 'Class Group',
      type: 'string',
      description: 'E.g. Primary School, Middle School',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'monthlyFee',
      title: 'Monthly Tuition Fee',
      type: 'number',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'admissionFee',
      title: 'Admission Fee (Legacy)',
      type: 'number',
      hidden: true,
    }),
    defineField({
      name: 'admissionFeeNew',
      title: 'Admission Fee (New Students)',
      type: 'number',
      description: 'One-time fee charged to newly enrolled students.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'admissionFeeOld',
      title: 'Admission Fee (Old Students)',
      type: 'number',
      description: 'Fee charged to returning/existing students on re-admission.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'annualFee',
      title: 'Annual Charges / Security Fee',
      type: 'number',
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Order in which this class appears on the frontend.',
    }),
    defineField({
      name: 'isPopular',
      title: 'Is Popular?',
      type: 'boolean',
      description: 'Highlight this class on the pricing page.',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'monthlyFee',
    },
    prepare({ title, subtitle }) {
      return {
        title,
        subtitle: `Monthly: Rs. ${subtitle}`,
      }
    },
  },
})
