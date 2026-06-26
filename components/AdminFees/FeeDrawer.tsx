"use client";

import React, { useState, useEffect } from 'react';
import {
    Save, Calendar, BookOpen, Hash,
    GraduationCap, Coins, Info
} from 'lucide-react';
import type { Student } from '@/types/student';

/* Hide number input spinners */
const noSpinnerStyle = `
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }
`;
import {
    Drawer,
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    VStack,
    Box,
    Text,
    SimpleGrid,
    Input,
    Select,
    Textarea,
    Button,
    InputGroup,
    InputLeftElement,
    FormControl,
    FormLabel,
    InputRightElement,
} from "@chakra-ui/react";

interface FeeDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
    students: Student[];
    academicClasses?: any[];
    MONTHS: readonly string[];
    submitting: boolean;
}

const FeeDrawer = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    students,
    academicClasses = [],
    MONTHS,
    submitting
}: FeeDrawerProps) => {
    const [form, setForm] = useState({
        studentId: '',
        className: '',
        month: MONTHS[new Date().getMonth() + 1],
        year: new Date().getFullYear(),
        amountPaid: '' as number | '',
        payableAmount: '' as number | '',
        arrears: '' as number | '',
        lateFine: '' as number | '',
        concession: '' as number | '',
        dueDate: '',
        paidDate: new Date().toISOString().slice(0, 10),
        receiptNumber: '',
        bookNumber: '',
        notes: '',
    });

    const [studentQuickFilter, setStudentQuickFilter] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setForm({
                    studentId: initialData.student?._id || initialData.student?._ref || '',
                    className: initialData.className || '',
                    month: initialData.month,
                    year: initialData.year,
                    amountPaid: initialData.amountPaid || '',
                    payableAmount: initialData.payableAmount || '',
                    arrears: initialData.arrears || '',
                    lateFine: initialData.lateFine || '',
                    concession: initialData.concession || '',
                    dueDate: initialData.dueDate || '',
                    paidDate: initialData.paidDate || new Date().toISOString().slice(0, 10),
                    receiptNumber: initialData.receiptNumber || '',
                    bookNumber: initialData.bookNumber || '',
                    notes: initialData.notes || '',
                });
            } else {
                setForm({
                    studentId: '',
                    className: '',
                    month: MONTHS[new Date().getMonth() + 1],
                    year: new Date().getFullYear(),
                    amountPaid: '',
                    payableAmount: '',
                    arrears: '',
                    lateFine: '',
                    concession: '',
                    dueDate: '',
                    paidDate: new Date().toISOString().slice(0, 10),
                    receiptNumber: '',
                    bookNumber: '',
                    notes: '',
                });
            }
            setStudentQuickFilter('');
        }
    }, [isOpen, initialData, MONTHS]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(form);
    };

    const filteredStudents = students.filter(s => {
        const q = studentQuickFilter.trim().toLowerCase();
        if (!q) return true;
        return (s.rollNumber || '').toLowerCase().includes(q) ||
            (s.grNumber || '').toLowerCase().includes(q) ||
            (s.fullName || '').toLowerCase().includes(q);
    }).slice(0, 50);

    // Auto-select logic for student Quick Filter
    useEffect(() => {
        const query = studentQuickFilter.trim().toLowerCase();
        if (query !== '' && filteredStudents.length === 1) {
            const student = filteredStudents[0];
            if (form.studentId !== student._id) {
                setForm(prev => ({
                    ...prev,
                    studentId: student._id || '',
                    className: student.admissionFor || prev.className
                }));
            }
        }
    }, [studentQuickFilter, filteredStudents, form.studentId]);

    // Auto-populate amount based on class and month
    useEffect(() => {
        if (!initialData && form.className && form.month && academicClasses.length > 0) {
            const matchedClass = academicClasses.find(c => c.code === form.className || c.name === form.className);
            if (matchedClass) {
                const amount = form.month.toLowerCase() === 'admission' 
                    ? (matchedClass.admissionFee || 0) 
                    : (matchedClass.monthlyFee || 0);
                
                // Fetch student concession if available
                const student = students.find(s => s._id === form.studentId);
                const concession = (student as any)?.feeConcession || 0;
                
                const payable = Math.max(0, amount - concession);

                setForm(prev => ({ 
                    ...prev, 
                    amountPaid: prev.amountPaid || payable,
                    payableAmount: payable,
                    concession: concession
                }));
            }
        }
    }, [form.className, form.month, academicClasses, initialData, form.studentId, students]);

    return (
        <Drawer
            isOpen={isOpen}
            placement="right"
            onClose={onClose}
            size="md"
            closeOnOverlayClick={false}
            closeOnEsc={false}
        >
            <DrawerOverlay backdropFilter="blur(4px)" bg="blackAlpha.300" />
            <DrawerContent bg="white" _dark={{ bg: "gray.900", borderColor: "gray.800" }} borderLeft="1px">
                <DrawerCloseButton top="4" />

                <DrawerHeader borderBottomWidth="1px" borderColor="gray.100" _dark={{ borderColor: "gray.800", bg: "gray.900" }} py="4">
                    <Box>
                        <Text fontSize="lg" fontWeight="800" color="gray.900" _dark={{ color: "white" }}>
                            {initialData ? 'Edit Fee Record' : 'Add New Fee'}
                        </Text>
                        <Text fontSize="xs" fontWeight="medium" color="gray.500" mt="0.5">
                            {initialData ? 'Update details for this transaction.' : 'Record a new fee payment from a student.'}
                        </Text>
                    </Box>
                </DrawerHeader>

                <DrawerBody py="5">
                    <style>{noSpinnerStyle}</style>
                    <form id="fee-form" onSubmit={handleSubmit}>
                        <VStack spacing="5" align="stretch">
                            {/* Student Selection */}
                            <FormControl>
                                <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.500">
                                    Student
                                </FormLabel>
                                <InputGroup size="md" mb="2">
                                    <InputLeftElement pointerEvents="none">
                                        <Hash size={16} className="text-gray-400" />
                                    </InputLeftElement>
                                    <Input
                                        value={studentQuickFilter}
                                        onChange={e => setStudentQuickFilter(e.target.value)}
                                        placeholder="Search by Name, Roll, or GR..."
                                        rounded="xl"
                                        fontSize="sm"
                                        bg="gray.50"
                                        _dark={{ bg: "gray.800" }}
                                    />
                                </InputGroup>
                                <Select
                                    value={form.studentId}
                                    onChange={e => {
                                        const s = students.find(st => st._id === e.target.value);
                                        setForm(prev => ({
                                            ...prev,
                                            studentId: e.target.value,
                                            className: s?.admissionFor || prev.className
                                        }));
                                    }}
                                    rounded="xl"
                                    fontSize="sm"
                                    placeholder="Select Student"
                                    bg="gray.50"
                                    _dark={{ bg: "gray.800" }}
                                    isRequired
                                >
                                    {filteredStudents.map(s => (
                                        <option key={s._id} value={s._id}>
                                            {s.fullName} (Roll: {s.rollNumber}, GR: {s.grNumber})
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>

                            {/* Class */}
                            <FormControl isRequired>
                                <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.500">
                                    Class
                                </FormLabel>
                                <InputGroup size="md">
                                    <InputLeftElement pointerEvents="none">
                                        <GraduationCap size={16} className="text-gray-400" />
                                    </InputLeftElement>
                                    <Input
                                        value={form.className}
                                        onChange={e => setForm({ ...form, className: e.target.value })}
                                        rounded="xl"
                                        fontSize="sm"
                                        bg="gray.50"
                                        _dark={{ bg: "gray.800" }}
                                    />
                                </InputGroup>
                            </FormControl>

                            {/* Month & Year */}
                            <Box>
                                <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.500">
                                    Billing Period
                                </FormLabel>
                                <SimpleGrid columns={2} spacing="3">
                                    <Select
                                        value={form.month}
                                        onChange={e => setForm({ ...form, month: e.target.value })}
                                        rounded="xl"
                                        fontSize="sm"
                                    >
                                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </Select>
                                    <Input
                                        type="number"
                                        value={form.year}
                                        onChange={e => setForm({ ...form, year: Number(e.target.value) })}
                                        rounded="xl"
                                        fontSize="sm"
                                    />
                                </SimpleGrid>
                            </Box>

                            {/* Fee Breakdown Section */}
                            <Box pt={3} pb={1} borderTopWidth="1px" borderColor="gray.100" _dark={{ borderColor: "gray.800" }}>
                                <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="emerald.500" mb={3}>
                                    Fee Breakdown
                                </Text>
                                <SimpleGrid columns={2} spacing="3" mb={3}>
                                    <FormControl>
                                        <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
                                            <span className="flex items-center gap-1">
                                                Total Fee
                                                <span className="relative group/tip cursor-help">
                                                    <Info size={12} className="text-gray-400" />
                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">Total amount to be paid this month</span>
                                                </span>
                                            </span>
                                        </FormLabel>
                                        <InputGroup size="sm">
                                            <InputLeftElement pointerEvents="none"><Coins size={14} className="text-emerald-500" /></InputLeftElement>
                                            <Input type="number" value={form.payableAmount} placeholder="e.g. 1500" onChange={e => setForm({ ...form, payableAmount: e.target.value === '' ? '' : Number(e.target.value) })} rounded="xl" fontSize="sm" fontFamily="mono" />
                                        </InputGroup>
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
                                            <span className="flex items-center gap-1">
                                                Previous Dues
                                                <span className="relative group/tip cursor-help">
                                                    <Info size={12} className="text-gray-400" />
                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">Unpaid amount from previous months</span>
                                                </span>
                                            </span>
                                        </FormLabel>
                                        <InputGroup size="sm">
                                            <InputLeftElement pointerEvents="none"><Coins size={14} className="text-orange-500" /></InputLeftElement>
                                            <Input type="number" value={form.arrears} placeholder="e.g. 500" onChange={e => setForm({ ...form, arrears: e.target.value === '' ? '' : Number(e.target.value) })} rounded="xl" fontSize="sm" fontFamily="mono" />
                                        </InputGroup>
                                    </FormControl>
                                </SimpleGrid>
                                <SimpleGrid columns={2} spacing="3">
                                    <FormControl>
                                        <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
                                            <span className="flex items-center gap-1">
                                                Discount
                                                <span className="relative group/tip cursor-help">
                                                    <Info size={12} className="text-gray-400" />
                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">Special discount or fee waiver given</span>
                                                </span>
                                            </span>
                                        </FormLabel>
                                        <InputGroup size="sm">
                                            <InputLeftElement pointerEvents="none"><Coins size={14} className="text-blue-500" /></InputLeftElement>
                                            <Input type="number" value={form.concession} placeholder="e.g. 200" onChange={e => setForm({ ...form, concession: e.target.value === '' ? '' : Number(e.target.value) })} rounded="xl" fontSize="sm" fontFamily="mono" />
                                        </InputGroup>
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
                                            <span className="flex items-center gap-1">
                                                Late Charges
                                                <span className="relative group/tip cursor-help">
                                                    <Info size={12} className="text-gray-400" />
                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">Extra charge for paying after due date</span>
                                                </span>
                                            </span>
                                        </FormLabel>
                                        <InputGroup size="sm">
                                            <InputLeftElement pointerEvents="none"><Coins size={14} className="text-red-500" /></InputLeftElement>
                                            <Input type="number" value={form.lateFine} placeholder="e.g. 100" onChange={e => setForm({ ...form, lateFine: e.target.value === '' ? '' : Number(e.target.value) })} rounded="xl" fontSize="sm" fontFamily="mono" />
                                        </InputGroup>
                                    </FormControl>
                                </SimpleGrid>
                            </Box>

                            {/* Amount Paid */}
                            <FormControl isRequired>
                                <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.500">
                                    Amount Paid
                                </FormLabel>
                                <InputGroup size="lg">
                                    <InputLeftElement pointerEvents="none">
                                        <Coins size={18} className="text-emerald-500" />
                                    </InputLeftElement>
                                    <Input
                                        type="number"
                                        value={form.amountPaid}
                                        placeholder="Enter amount"
                                        onChange={e => setForm({ ...form, amountPaid: e.target.value === '' ? '' : Number(e.target.value) })}
                                        rounded="xl"
                                        fontSize="md"
                                        fontWeight="bold"
                                        fontFamily="mono"
                                        bg="gray.50"
                                        _dark={{ bg: "gray.800" }}
                                    />
                                    <InputRightElement width="4.5rem">
                                        <Text fontSize="xs" fontWeight="bold" color="gray.400">PKR</Text>
                                    </InputRightElement>
                                </InputGroup>
                                <Box display="flex" flexWrap="wrap" gap="2" mt="3">
                                    {[800, 1000, 1200, 1500, 2000].map(amt => (
                                        <Button
                                            key={amt}
                                            size="xs"
                                            variant="outline"
                                            onClick={() => setForm(prev => ({ ...prev, amountPaid: amt }))}
                                            rounded="md"
                                            _hover={{ bg: "gray.50", _dark: { bg: "gray.800" } }}
                                        >
                                            {amt}
                                        </Button>
                                    ))}
                                </Box>
                            </FormControl>

                            {/* Payment Date & Due Date */}
                            <SimpleGrid columns={2} spacing="3">
                                <FormControl isRequired>
                                    <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.500">
                                        Payment Date
                                    </FormLabel>
                                    <InputGroup>
                                        <InputLeftElement pointerEvents="none">
                                            <Calendar size={16} className="text-gray-400" />
                                        </InputLeftElement>
                                        <Input
                                            type="date"
                                            value={form.paidDate}
                                            onChange={e => setForm({ ...form, paidDate: e.target.value })}
                                            rounded="xl"
                                            fontSize="sm"
                                            fontFamily="mono"
                                        />
                                    </InputGroup>
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.500">
                                        Due Date
                                    </FormLabel>
                                    <InputGroup>
                                        <InputLeftElement pointerEvents="none">
                                            <Calendar size={16} className="text-gray-400" />
                                        </InputLeftElement>
                                        <Input
                                            type="date"
                                            value={form.dueDate}
                                            onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                            rounded="xl"
                                            fontSize="sm"
                                            fontFamily="mono"
                                        />
                                    </InputGroup>
                                </FormControl>
                            </SimpleGrid>

                            {/* Receipt & Book */}
                            <SimpleGrid columns={2} spacing="4">
                                <FormControl isRequired>
                                    <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.500">
                                        Receipt No.
                                    </FormLabel>
                                    <InputGroup>
                                        <InputLeftElement pointerEvents="none">
                                            <Hash size={16} className="text-gray-400" />
                                        </InputLeftElement>
                                        <Input
                                            value={form.receiptNumber}
                                            onChange={e => setForm({ ...form, receiptNumber: e.target.value })}
                                            rounded="xl"
                                            fontSize="sm"
                                            fontFamily="mono"
                                        />
                                    </InputGroup>
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.500">
                                        Book No.
                                    </FormLabel>
                                    <InputGroup>
                                        <InputLeftElement pointerEvents="none">
                                            <BookOpen size={16} className="text-gray-400" />
                                        </InputLeftElement>
                                        <Input
                                            value={form.bookNumber}
                                            onChange={e => setForm({ ...form, bookNumber: e.target.value })}
                                            rounded="xl"
                                            fontSize="sm"
                                            fontFamily="mono"
                                        />
                                    </InputGroup>
                                </FormControl>
                            </SimpleGrid>

                            {/* Notes */}
                            <FormControl>
                                <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.500">
                                    Notes (Optional)
                                </FormLabel>
                                <Textarea
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    rounded="xl"
                                    fontSize="sm"
                                    rows={3}
                                    resize="none"
                                />
                            </FormControl>
                        </VStack>
                    </form>
                </DrawerBody>

                <DrawerFooter borderTopWidth="1px" borderColor="gray.100" bg="white" _dark={{ borderColor: "gray.800", bg: "gray.900" }} py="4">
                    <Button
                        variant="ghost"
                        mr={2}
                        onClick={onClose}
                        rounded="lg"
                        fontSize="xs"
                        fontWeight="bold"
                        size="sm"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="fee-form"
                        isLoading={submitting}
                        loadingText="Saving..."
                        bg="gray.900"
                        color="white"
                        _hover={{ bg: "gray.800" }}
                        _dark={{ bg: "white", color: "gray.900", _hover: { bg: "gray.100" } }}
                        rounded="lg"
                        px="6"
                        fontSize="xs"
                        fontWeight="bold"
                        size="sm"
                        leftIcon={!submitting ? <Save size={16} /> : undefined}
                    >
                        Save Transaction
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
};

export default FeeDrawer;
