import { useState, useEffect } from 'react';
import { WalkinClient, MemberHistoryEntry, HistoryEntryType } from '../types';
import { getTodayYMD, getLocalISOString } from '../utils/dateUtils';

const STORAGE_KEY = 'gnex-gym-walkin-clients';

// Helper function to add history entries, similar to useMembers hook
const addHistoryEntryToClient = (
    client: WalkinClient, 
    type: HistoryEntryType, 
    title: string, 
    details?: string, 
    paymentAmount?: number
): WalkinClient => {
    const newEntry: MemberHistoryEntry = { 
        timestamp: getLocalISOString(), 
        type, 
        title, 
        details, 
        paymentAmount 
    };
    const history = [newEntry, ...(client.history || [])];
    return { ...client, history };
};


export const useWalkinClients = () => {
    const [walkinClients, setWalkinClients] = useState<WalkinClient[]>(() => {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            return storedData ? JSON.parse(storedData) : [];
        } catch (error) {
            console.error("Error reading walk-in clients from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(walkinClients));
        } catch (error) {
            console.error("Error saving walk-in clients to localStorage", error);
        }
    }, [walkinClients]);

    const addWalkinClient = (clientData: Omit<WalkinClient, 'id'>, sessionPlan?: WalkinClient['sessionPlan']): WalkinClient => {
        let newClient: WalkinClient = {
            ...clientData,
            id: `walkin-${Date.now()}`,
            sessionPlan,
        };
        
        newClient = addHistoryEntryToClient(newClient, 'status_change', 'Client Created', `Client profile created for ${newClient.name}.`);

        if (sessionPlan) {
             newClient = addHistoryEntryToClient(newClient, 'payment', 'Session Plan Added', `Initial plan: ${sessionPlan.name} (${sessionPlan.total} sessions).`);
        }

        setWalkinClients(prev => [newClient, ...prev]);
        return newClient;
    };

    const updateWalkinClient = (updatedClient: WalkinClient) => {
        setWalkinClients(prev => prev.map(c => {
            if (c.id === updatedClient.id) {
                // To avoid too many log entries, just log a generic update
                return addHistoryEntryToClient(updatedClient, 'status_change', 'Client Details Updated', 'Profile information was modified.');
            }
            return c;
        }));
    };
    
    const updateWalkinClientSessionPlan = (clientId: string, sessionPlan: WalkinClient['sessionPlan']) => {
        setWalkinClients(prev => prev.map(c => {
            if (c.id === clientId) {
                // FIX: Explicitly type clientWithPlan to avoid type inference issues.
                let clientWithPlan: WalkinClient = { ...c, sessionPlan };
                if (sessionPlan) {
                    clientWithPlan = addHistoryEntryToClient(clientWithPlan, 'payment', 'Session Plan Purchased', `Plan: ${sessionPlan.name} (${sessionPlan.total} sessions).`);
                }
                return clientWithPlan;
            }
            return c;
        }));
    };

    const deleteWalkinClient = (id: string) => {
        setWalkinClients(prev => prev.filter(c => c.id !== id));
    };

    const useSessionForWalkinClient = (clientId: string): { success: boolean; message: string } => {
        let result = { success: false, message: 'An unknown error occurred.' };

        setWalkinClients(prev => prev.map(c => {
            if (c.id === clientId) {
                // FIX: Extracted sessionPlan to a constant to help TypeScript's type inference
                // and prevent potential issues with control flow analysis.
                const sessionPlan = c.sessionPlan;
                if (!sessionPlan) {
                    result = { success: false, message: 'Client does not have a session plan.' };
                    return c;
                }
                if (sessionPlan.used >= sessionPlan.total) {
                    result = { success: false, message: 'No sessions remaining.' };
                    return c;
                }

                const todayYMD = getTodayYMD();
                const updatedPlan = { ...sessionPlan, used: sessionPlan.used + 1, lastSessionUsedDate: todayYMD };
                // FIX: Explicitly type updatedClient as WalkinClient to prevent inference issues in the map function.
                const updatedClient: WalkinClient = { ...c, sessionPlan: updatedPlan, lastVisit: todayYMD };
                
                const remaining = updatedPlan.total - updatedPlan.used;
                result = { success: true, message: `Session used for ${c.name}. ${remaining} sessions remaining.` };

                return addHistoryEntryToClient(updatedClient, 'session_update', 'Session Used', `1 session used. ${remaining} sessions remaining.`);
            }
            return c;
        }));
        
        return result;
    };
    
    const markTaekwondoSessionUsed = (clientId: string): { success: boolean, message: string } => {
        return useSessionForWalkinClient(clientId);
    };

    const addPaymentHistoryToWalkinClient = (clientId: string, amount: number, notes: string) => {
        setWalkinClients(prev => prev.map(c => {
            if (c.id === clientId) {
                return addHistoryEntryToClient(c, 'payment', 'Payment Made', notes, amount);
            }
            return c;
        }));
    };

    return { walkinClients, addWalkinClient, updateWalkinClient, deleteWalkinClient, useSessionForWalkinClient, updateWalkinClientSessionPlan, markTaekwondoSessionUsed, addPaymentHistoryToWalkinClient };
};
