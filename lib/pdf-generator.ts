import jsPDF from 'jspdf';

export const generateFeePDF = (data: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(6, 78, 59); // Emerald Green
    doc.text('AL GHAZALI HIGH SCHOOL', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139); // Slate
    doc.text('Fee Structure & Admission Policy - Academic Year 2025', 105, 30, { align: 'center' });
    
    // Horizontal Line
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 35, 190, 35);
    
    // Admission Fees Section
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text('Admission Fees (One-time)', 20, 50);
    
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85); // Slate 700
    doc.text('New Student Admission:', 20, 60);
    doc.text('Rs. 4,000', 150, 60);
    
    doc.text('Old Student Re-admission:', 20, 68);
    doc.text('Rs. 2,500', 150, 68);

    doc.text('Annual Security/Registration Fee:', 20, 76);
    doc.text('Rs. 500', 150, 76);

    // Monthly Tuition Fees Table
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('Monthly Tuition Fees', 20, 95);
    
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    
    const tuitionFees = [
        { class: 'Class 1 - 2', fee: 'Rs. 900' },
        { class: 'Class 3 - 4', fee: 'Rs. 1,000' },
        { class: 'Class 5', fee: 'Rs. 1,100' },
        { class: 'Class 6 - 8', fee: 'Rs. 1,200' },
        { class: 'SSC I & II (Class 9 & 10)', fee: 'Rs. 1,300' },
    ];

    let yPos = 105;
    tuitionFees.forEach((item) => {
        doc.text(item.class, 20, yPos);
        doc.text(item.fee, 150, yPos);
        yPos += 8;
    });

    // Important Notes
    doc.setFontSize(14);
    doc.setTextColor(6, 78, 59);
    doc.text('Terms & Conditions:', 20, 160);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const notes = [
        '1. Fees must be paid by the 10th of every month.',
        '2. A late fee of Rs. 100 will be charged after the due date.',
        '3. Scholarship packages are available for deserving students based on merit and financial need.',
        '4. Laboratory and computer charges may apply for senior classes as per actual usage.',
        '5. Fees are subject to an annual increment of 10-15% as per management decision.'
    ];

    notes.forEach((note, index) => {
        doc.text(note, 20, 170 + (index * 6));
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Generated from Al Ghazali High School Portal | ' + new Date().toLocaleDateString(), 105, 280, { align: 'center' });
    
    // Save the PDF
    doc.save('Al_Ghazali_Fee_Structure_2025.pdf');
};
