import { useState, useEffect }from 'react';
import { getTodayYMD } from '../utils/dateUtils';

const STORAGE_KEY = 'gnex-gym-free-pass';

export const useFreePass = () => {
    const [freePass, setFreePass] = useState<{ date: string; code: string } | null>(() => {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            if (storedData) {
                const parsed = JSON.parse(storedData);
                // Invalidate if the code is not for today
                if (parsed.date === getTodayYMD()) {
                    return parsed;
                }
            }
            return null;
        } catch (error) {
            console.error("Error reading free pass from localStorage", error);
            return null;
        }
    });

    useEffect(() => {
        try {
            if (freePass) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(freePass));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (error) {
            console.error("Error saving free pass to localStorage", error);
        }
    }, [freePass]);

    const generateNewCode = () => {
        const newCode = Math.floor(1000 + Math.random() * 9000).toString();
        const todayYMD = getTodayYMD();
        const newPass = { date: todayYMD, code: newCode };
        setFreePass(newPass);
        return newPass;
    };
    
    // Check if the current code is valid for today.
    const todaysCode = freePass?.date === getTodayYMD() ? freePass.code : null;

    return { freePass, generateNewCode, todaysCode };
};