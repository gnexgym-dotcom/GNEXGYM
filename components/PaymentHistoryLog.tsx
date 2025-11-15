import React, { useState, useMemo } from 'react';
import { Member, WalkinClient } from '../types';
import { CashIcon } from './icons/Icons';
import { getTodayYMD, parseDate } from '../utils/dateUtils';

interface PaymentHistoryLogProps {
    members: Member[];
    walkinClients: WalkinClient[];
}

interface PaymentRecord {
    memberId: string;
    memberName: string;
    timestamp: string;
    title: string;
    details?: string;
    amount: number;
}

export const PaymentHistoryLog: React.FC<PaymentHistoryLogProps> = ({ members, walkinClients }) => {
    const today = getTodayYMD();
    const firstDayOfMonth = today.substring(0, 8) + '01';
    
    const [startDate, setStartDate] = useState(firstDayOfMonth);
    const [endDate, setEndDate] = useState(today);

    const { paymentRecords, totalPayments } = useMemo(() => {
        const records: PaymentRecord[] = [];
        let total = 0;

        const start = parseDate(startDate);
        const end = parseDate(endDate);

        if (!start || !end) {
            return { paymentRecords: [], totalPayments: 0 };
        }

        // Set end date to the end of the day for inclusive filtering
        end.setHours(23, 59, 59, 999);

        // Process members
        members.forEach(member => {
            member.history?.forEach(entry => {
                if (entry.type === 'payment' && typeof entry.paymentAmount === 'number' && entry.paymentAmount > 0) {
                    const entryDate = new Date(entry.timestamp);
                    if (entryDate >= start && entryDate <= end) {
                        records.push({
                            memberId: member.id,
                            memberName: member.name,
                            timestamp: entry.timestamp,
                            title: entry.title,
                            details: entry.details,
                            amount: entry.paymentAmount,
                        });
                        total += entry.paymentAmount;
                    }
                }
            });
        });

        // Process walk-in clients
        walkinClients.forEach(client => {
            client.history?.forEach(entry => {
                if (entry.type === 'payment' && typeof entry.paymentAmount === 'number' && entry.paymentAmount > 0) {
                    const entryDate = new Date(entry.timestamp);
                    if (entryDate >= start && entryDate <= end) {
                        records.push({
                            memberId: client.id,
                            memberName: client.name,
                            timestamp: entry.timestamp,
                            title: entry.title,
                            details: entry.details,
                            amount: entry.paymentAmount,
                        });
                        total += entry.paymentAmount;
                    }
                }
            });
        });

        // Sort all records together by timestamp, most recent first
        records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        return { paymentRecords: records, totalPayments: total };
    }, [members, walkinClients, startDate, endDate]);

    return (
        <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Payment History Log</h1>
                    <p className="text-gray-400">Review all recorded payments within a specific timeframe.</p>
                </div>
                <div className="flex items-center gap-4">
                     <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        max={endDate}
                        className="bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        min={startDate}
                        max={today}
                        className="bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white"
                    />
                </div>
            </div>

             <div className="bg-gray-800 p-6 rounded-xl flex items-center shadow-lg border border-gray-700">
                <div className="p-4 rounded-full mr-6 bg-green-500/20">
                    <CashIcon className="w-8 h-8 text-green-400" />
                </div>
                <div>
                    <p className="text-sm text-gray-400 uppercase font-semibold tracking-wider">Total Payments in Period</p>
                    <p className="text-4xl font-extrabold text-green-400">₱{totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
            </div>

            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="border-b border-gray-700">
                            <tr>
                                <th className="p-4 font-semibold">Date & Time</th>
                                <th className="p-4 font-semibold">Client</th>
                                <th className="p-4 font-semibold">Details</th>
                                <th className="p-4 font-semibold text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentRecords.map((record, index) => (
                                <tr key={`${record.timestamp}-${index}`} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <td className="p-4 text-gray-400">{new Date(record.timestamp).toLocaleString()}</td>
                                    <td className="p-4 font-medium text-white">
                                        {record.memberName}
                                        <span className="block text-xs text-gray-500 font-mono">{record.memberId}</span>
                                    </td>
                                    <td className="p-4 text-gray-300 whitespace-normal max-w-md">
                                        <p className="font-semibold">{record.title}</p>
                                        {record.details && <p className="text-sm text-gray-400">{record.details}</p>}
                                    </td>
                                    <td className="p-4 text-brand-primary font-bold text-right">₱{record.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {paymentRecords.length === 0 && <p className="text-center p-8 text-gray-400">No payment records found for the selected date range.</p>}
                </div>
            </div>
        </div>
    );
};