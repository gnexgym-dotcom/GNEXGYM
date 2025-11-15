import { useState, useEffect } from 'react';
import { Coach } from '../types';

const STORAGE_KEY = 'gnex-gym-coaches';

const initialCoaches: Coach[] = [
    {
        id: 'coach-1',
        name: 'COACH JAYSON',
        mobileNumber: '09171234567',
        address: 'Quezon City',
        skills: ['Bodybuilding', 'Strength Training']
    },
    {
        id: 'coach-2',
        name: 'COACH RALPH',
        mobileNumber: '09187654321',
        address: 'Makati City',
        skills: ['Circuit Training', 'Weight Loss', 'Boxing']
    },
    {
        id: 'coach-3',
        name: 'COACH WIL',
        mobileNumber: '09191112233',
        address: 'Taguig City',
        skills: ['Muay Thai', 'Taekwondo', 'Functional Fitness']
    }
];

export const useCoaches = () => {
    const [coaches, setCoaches] = useState<Coach[]>(() => {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            return storedData ? JSON.parse(storedData) : initialCoaches;
        } catch (error) {
            console.error("Error reading coaches from localStorage", error);
            return initialCoaches;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(coaches));
        } catch (error) {
            console.error("Error saving coaches to localStorage", error);
        }
    }, [coaches]);

    const addCoach = (coachData: Omit<Coach, 'id'>) => {
        const newCoach: Coach = {
            ...coachData,
            id: `coach-${Date.now()}`,
        };
        setCoaches(prev => [newCoach, ...prev]);
    };

    const updateCoach = (updatedCoach: Coach) => {
        setCoaches(prev => prev.map(c => c.id === updatedCoach.id ? updatedCoach : c));
    };

    const deleteCoach = (id: string) => {
        setCoaches(prev => prev.filter(c => c.id !== id));
    };

    return { coaches, addCoach, updateCoach, deleteCoach };
};