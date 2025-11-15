import { useState, useEffect } from 'react';
import { PricePlan } from '../types';

const STORAGE_KEY = 'gnex-gym-pricelist';

const initialPriceList: PricePlan[] = [
    // Member Plans
    { id: 'price-1', name: 'Daily', amount: 100, type: 'member' },
    { id: 'price-2', name: 'Monthly', amount: 900, type: 'member' },
    { id: 'price-promo-3', name: '3 Months Promo', amount: 2200, type: 'member' },
    { id: 'price-promo-6', name: '6 Months Promo', amount: 4000, type: 'member' },
    { id: 'price-4', name: 'Yearly', amount: 6500, type: 'member' },
    { id: 'price-locker-1', name: 'Locker Rental', amount: 300, type: 'member' },
    { id: 'price-mf-1', name: 'Membership Fee (Annual)', amount: 500, type: 'member' },
    { id: 'price-nomf-1', name: 'Monthly (No MF)', amount: 1100, type: 'member' },

    // Walk-in Plans
    { id: 'price-5', name: 'Walk-in Daily', amount: 150, type: 'walk-in' },
    { id: 'price-walkin-student', name: 'Student/PWD/SC Daily', amount: 100, type: 'walk-in' },
    { id: 'price-walkin-pt', name: 'Walk-in PT', amount: 450, type: 'walk-in' },
    { id: 'price-walkin-box', name: 'Walk-in Boxing', amount: 450, type: 'walk-in' },
    { id: 'price-walkin-muay', name: 'Walk-in Muaythai', amount: 500, type: 'walk-in' },
    { id: 'price-free-pass', name: 'Free Pass Entry', amount: 0, type: 'walk-in' },


    // PT Session Plans
    { id: 'coach-pt-1', name: 'PT - 1 Session', amount: 400, type: 'coach' },
    { id: 'coach-pt-2', name: 'PT - 6 Sessions', amount: 2200, type: 'coach' },
    { id: 'coach-pt-3', name: 'PT - 16 Sessions', amount: 5600, type: 'coach' },
    { id: 'coach-pt-4', name: 'PT - 24 Sessions', amount: 7800, type: 'coach' },

    // Boxing Training Plans
    { id: 'coach-box-1', name: 'Boxing - 1 Session', amount: 400, type: 'coach' },
    { id: 'coach-box-2', name: 'Boxing - 6 Sessions', amount: 2200, type: 'coach' },
    { id: 'coach-box-3', name: 'Boxing - 16 Sessions', amount: 5600, type: 'coach' },
    { id: 'coach-box-4', name: 'Boxing - 24 Sessions', amount: 7800, type: 'coach' },
    
    // Muay Thai Training Plans
    { id: 'coach-muay-1', name: 'Muaythai - 1 Session', amount: 450, type: 'coach' },
    { id: 'coach-muay-2', name: 'Muaythai - 6 Sessions', amount: 2500, type: 'coach' },
    { id: 'coach-muay-3', name: 'Muaythai - 16 Sessions', amount: 6400, type: 'coach' },
    { id: 'coach-muay-4', name: 'Muaythai - 24 Sessions', amount: 8400, type: 'coach' },
    
    // Class Plans
    { id: 'class-tkd-bgn', name: 'Taekwondo - Beginner (8 Sessions)', amount: 3500, type: 'class' },
    { id: 'class-tkd-adv', name: 'Taekwondo - Advanced (8 Sessions)', amount: 2800, type: 'class' },
];

export const usePriceList = () => {
    const [priceList, setPriceList] = useState<PricePlan[]>(() => {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            return storedData ? JSON.parse(storedData) : initialPriceList;
        } catch (error) {
            console.error("Error reading price list from localStorage", error);
            return initialPriceList;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(priceList));
        } catch (error) {
            console.error("Error saving price list to localStorage", error);
        }
    }, [priceList]);

    const addPlan = (planData: Omit<PricePlan, 'id'>) => {
        const newPlan: PricePlan = {
            ...planData,
            id: `price-${Date.now()}`,
        };
        setPriceList(prev => [newPlan, ...prev]);
    };

    const updatePlan = (updatedPlan: PricePlan) => {
        setPriceList(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
    };

    const deletePlan = (id: string) => {
        setPriceList(prev => prev.filter(p => p.id !== id));
    };

    return { priceList, addPlan, updatePlan, deletePlan };
};