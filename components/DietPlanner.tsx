
import React, { useState } from 'react';
import { generateDietPlan } from '../services/geminiService';
import { DietPlan, DietDay, Meal } from '../types';
import { AppleIcon } from './icons/Icons';

export const DietPlanner: React.FC = () => {
    const [goal, setGoal] = useState('Weight Loss');
    const [calories, setCalories] = useState('2000');
    const [preference, setPreference] = useState('None');
    const [plan, setPlan] = useState<DietPlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setPlan(null);
        try {
            const result = await generateDietPlan({ goal, calories, preference });
            setPlan(result);
        } catch (err) {
            setError('Failed to generate diet plan. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-white">Create a Personalized Diet Plan</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="goal" className="block text-sm font-medium text-gray-400 mb-1">Primary Goal</label>
                        <select id="goal" value={goal} onChange={e => setGoal(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary">
                            <option>Weight Loss</option>
                            <option>Weight Gain</option>
                            <option>Maintenance</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="calories" className="block text-sm font-medium text-gray-400 mb-1">Daily Calories</label>
                        <input type="number" id="calories" value={calories} onChange={e => setCalories(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    </div>
                    <div>
                        <label htmlFor="preference" className="block text-sm font-medium text-gray-400 mb-1">Dietary Preference</label>
                        <select id="preference" value={preference} onChange={e => setPreference(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary">
                            <option>None</option>
                            <option>Vegetarian</option>
                            <option>Vegan</option>
                            <option>Keto</option>
                            <option>Paleo</option>
                        </select>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-brand-primary hover:opacity-90 text-gray-900 font-bold py-2.5 px-4 rounded-lg transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center">
                        {isLoading ? <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div> : 'Generate Plan'}
                    </button>
                </form>
            </div>

            {error && <p className="text-center text-red-400">{error}</p>}

            {plan && (
                <div className="space-y-6">
                    {plan.plan.map((dayPlan, index) => <DayCard key={index} dayPlan={dayPlan} />)}
                </div>
            )}
        </div>
    );
};

const MealCard: React.FC<{ title: string; meal: Meal }> = ({ title, meal }) => (
     <div className="p-4 rounded-lg bg-gray-700/50">
        <div className="flex justify-between items-start">
            <div>
                <h4 className="font-semibold text-white capitalize">{title}</h4>
                <p className="text-sm text-gray-300 mt-1">{meal.name}</p>
                 <p className="text-xs text-gray-400 mt-2">{meal.description}</p>
            </div>
            <span className="text-sm font-bold text-brand-primary">{meal.calories} kcal</span>
        </div>
    </div>
);


const DayCard: React.FC<{ dayPlan: DietDay }> = ({ dayPlan }) => (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <div className="flex justify-between items-center mb-4">
             <div className="flex items-center">
                <div className="p-2 bg-brand-secondary/20 rounded-lg mr-4">
                     <AppleIcon className="w-6 h-6 text-brand-secondary"/>
                </div>
                <h3 className="text-lg font-bold text-white">{dayPlan.day}</h3>
            </div>
            <p className="text-gray-400">Total: <span className="font-bold text-white">{dayPlan.total_calories} kcal</span></p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MealCard title="Breakfast" meal={dayPlan.meals.breakfast} />
            <MealCard title="Lunch" meal={dayPlan.meals.lunch} />
            <MealCard title="Dinner" meal={dayPlan.meals.dinner} />
            <MealCard title="Snack" meal={dayPlan.meals.snack} />
        </div>
    </div>
);
