import React, { useMemo } from 'react';
import { CheckinRecord, Member } from '../types';
import { CashIcon, UserIcon } from './icons/Icons';
import { formatDate } from '../utils/dateUtils';

interface UnsettledPaymentsLogProps {
    checkinRecords: CheckinRecord[];
    members: Member[];
}

interface UnsettledRecord {
    recordId: string;
    details: string;
    balance: number;
    dueDate?: string;
    amountDue: number;
    amountPaid: number;
    timestamp: string;
}

interface UnsettledClient {
    clientId: string;
    name: string;
    photoUrl?: string;
    totalBalance: number;
    unsettledRecords: UnsettledRecord[];
}

export const UnsettledPaymentsLog: React.FC<UnsettledPaymentsLogProps> = ({ checkinRecords, members }) => {

    const { unsettledClients, totalReceivables } = useMemo(() => {
        const clientMap = new Map<string, UnsettledClient>();

        for (const record of checkinRecords) {
            if (record.balance <= 0) continue;

            const clientId = record.gymNumber || record.walkinClientId;
            if (!clientId) continue;

            if (!clientMap.has(clientId)) {
                 const member = members.find(m => m.id === clientId);
                 clientMap.set(clientId, {
                    clientId,
                    name: record.name,
                    photoUrl: record.photoUrl || member?.photoUrl,
                    totalBalance: 0,
                    unsettledRecords: [],
                });
            }
            
            const client = clientMap.get(clientId)!;
            client.totalBalance += record.balance;

            const detailsParts = [];
            if(record.paymentDetails?.plan) detailsParts.push(record.paymentDetails.plan);
            if(record.productsPurchased?.length) {
                detailsParts.push(record.productsPurchased.map(p => `${p.name} (x${p.quantity})`).join(', '));
            }
            
            client.unsettledRecords.push({
                recordId: record.id,
                details: detailsParts.join(' + ') || 'Daily Tab Balance',
                balance: record.balance,
                dueDate: record.balanceDueDate,
                amountDue: record.amountDue,
                amountPaid: record.amountPaid,
                timestamp: record.timestamp,
            });
        }
        
        const clientsArray = Array.from(clientMap.values()).sort((a,b) => b.totalBalance - a.totalBalance);
        const total = clientsArray.reduce((sum, client) => sum + client.totalBalance, 0);

        return { unsettledClients: clientsArray, totalReceivables: total };
    }, [checkinRecords, members]);

    return (
        <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                 <h1 className="text-2xl font-bold text-white">Unsettled Payments Log</h1>
                 <p className="text-gray-400">A live log of all outstanding client balances.</p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-xl flex items-center shadow-lg border border-gray-700">
                <div className="p-4 rounded-full mr-6 bg-red-500/20">
                    <CashIcon className="w-8 h-8 text-red-400" />
                </div>
                <div>
                    <p className="text-sm text-gray-400 uppercase font-semibold tracking-wider">Total Receivables</p>
                    <p className="text-4xl font-extrabold text-red-400">₱{totalReceivables.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
            </div>

            {unsettledClients.length > 0 ? (
                <div className="space-y-6">
                    {unsettledClients.map(client => (
                        <div key={client.clientId} className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                           <div className="p-4 bg-gray-700/50 flex justify-between items-center">
                               <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-gray-600">
                                        {client.photoUrl ? (
                                            <img src={client.photoUrl} alt={client.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="w-6 h-6 text-gray-500" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{client.name}</h3>
                                        <p className="text-sm text-gray-400 font-mono">{client.clientId}</p>
                                    </div>
                               </div>
                               <div>
                                    <p className="text-sm text-red-300">Total Balance</p>
                                    <p className="text-2xl font-bold text-red-400 text-right">₱{client.totalBalance.toFixed(2)}</p>
                               </div>
                           </div>
                           <div className="p-4">
                                <h4 className="text-md font-semibold text-gray-300 mb-2">Details:</h4>
                                <ul className="space-y-2">
                                    {client.unsettledRecords.map(rec => (
                                        <li key={rec.recordId} className="p-3 bg-gray-900/50 rounded-lg flex justify-between items-start">
                                            <div>
                                                <p className="text-gray-300 text-sm font-semibold max-w-md">{rec.details}</p>
                                                <p className="text-xs text-gray-500 mt-1">Transaction Date: {formatDate(rec.timestamp)}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0 ml-4 space-y-1">
                                                <p className="text-xs">Total: <span className="font-semibold text-white">₱{rec.amountDue.toFixed(2)}</span></p>
                                                <p className="text-xs text-green-400">Paid: ₱{rec.amountPaid.toFixed(2)}</p>
                                                <p className="font-bold text-red-400">Balance: ₱{rec.balance.toFixed(2)}</p>
                                                {rec.dueDate && (
                                                    <p className="text-xs text-orange-400">Due: {formatDate(rec.dueDate)}</p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                           </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center bg-gray-800 p-12 rounded-xl border border-dashed border-gray-700">
                    <CashIcon className="w-16 h-16 text-gray-600 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-white">All Accounts Settled</h3>
                    <p className="text-gray-400 mt-2">There are currently no clients with an outstanding balance.</p>
                </div>
            )}
        </div>
    );
};