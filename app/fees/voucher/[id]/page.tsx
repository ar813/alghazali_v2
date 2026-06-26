"use client"

import { useEffect, useState } from 'react'
import { client } from '@/sanity/lib/client'
import { useParams } from 'next/navigation'

export default function FeeVoucher() {
  const params = useParams()
  const id = params.id as string
  const [fee, setFee] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFee() {
      try {
        const query = `*[_type == "fee" && _id == $id][0]{
          ...,
          student->{fullName, rollNumber, grNumber, admissionFor, fatherName}
        }`
        const data = await client.fetch(query, { id })
        setFee(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchFee()
  }, [id])

  if (loading) return <div className="p-10 text-center font-mono">Loading Voucher...</div>
  if (!fee) return <div className="p-10 text-center font-mono text-red-500">Voucher not found</div>

  const payable = fee.payableAmount || 0
  const arrears = fee.arrears || 0
  const concession = fee.concession || 0
  const lateFine = fee.lateFine || 0
  
  // Try to reconstruct monthly tuition from total if not stored
  const monthlyTuition = payable - arrears - lateFine + concession

  const renderSlip = (copyType: string) => (
    <div className="w-full max-w-[800px] border-2 border-black p-4 text-xs font-mono mb-8 print:mb-4 bg-white">
      <div className="text-center font-bold text-lg mb-2 border-b-2 border-black pb-2">
        AL-GHAZALI PUBLIC SCHOOL
        <div className="text-xs font-normal">FEE VOUCHER - {fee.month} {fee.year}</div>
        <div className="text-sm font-bold mt-1 bg-black text-white py-1">{copyType} COPY</div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div><span className="font-bold">Student Name:</span> {fee.student?.fullName}</div>
          <div><span className="font-bold">Father Name:</span> {fee.student?.fatherName}</div>
          <div><span className="font-bold">Class:</span> {fee.className}</div>
        </div>
        <div className="text-right">
          <div><span className="font-bold">GR Number:</span> {fee.student?.grNumber}</div>
          <div><span className="font-bold">Roll Number:</span> {fee.student?.rollNumber}</div>
          <div><span className="font-bold">Due Date:</span> {fee.dueDate || 'N/A'}</div>
        </div>
      </div>

      <table className="w-full border border-black text-left mb-4">
        <thead className="border-b border-black font-bold">
          <tr>
            <th className="p-2 border-r border-black">Description</th>
            <th className="p-2 w-32 text-right">Amount (Rs)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2 border-r border-black border-b border-dashed">Tuition Fee</td>
            <td className="p-2 text-right border-b border-dashed">{monthlyTuition}</td>
          </tr>
          {arrears > 0 && (
            <tr>
              <td className="p-2 border-r border-black border-b border-dashed">Arrears</td>
              <td className="p-2 text-right border-b border-dashed">{arrears}</td>
            </tr>
          )}
          {concession > 0 && (
            <tr>
              <td className="p-2 border-r border-black border-b border-dashed">Concession</td>
              <td className="p-2 text-right border-b border-dashed">-{concession}</td>
            </tr>
          )}
          {lateFine > 0 && (
            <tr>
              <td className="p-2 border-r border-black border-b border-dashed">Late Fine</td>
              <td className="p-2 text-right border-b border-dashed">{lateFine}</td>
            </tr>
          )}
          <tr className="font-bold bg-gray-100">
            <td className="p-2 border-r border-black">Total Payable</td>
            <td className="p-2 text-right">{payable}</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-between mt-8 text-[10px]">
        <div className="text-center">
          <div className="border-b border-black w-32 mb-1"></div>
          Authorized Signature
        </div>
        <div className="text-center">
          <div className="border-b border-black w-32 mb-1"></div>
          Bank / Cashier Signature
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <div className="mb-4 print:hidden flex gap-4">
        <button onClick={() => window.print()} className="bg-black text-white px-6 py-2 font-bold hover:bg-gray-800">
          PRINT VOUCHERS
        </button>
        <button onClick={() => window.history.back()} className="bg-white border border-gray-300 px-6 py-2 font-bold hover:bg-gray-50">
          BACK
        </button>
      </div>

      <div className="flex flex-col gap-4 w-full items-center">
        {renderSlip('BANK / SCHOOL')}
        <div className="border-b-2 border-dashed border-gray-400 w-full max-w-[800px] mb-8 relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-100 px-2 text-gray-500 print:bg-white text-[10px]">✂️ cut here ✂️</span>
        </div>
        {renderSlip('STUDENT')}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:mb-4 { margin-bottom: 1rem !important; }
        }
      `}} />
    </div>
  )
}
