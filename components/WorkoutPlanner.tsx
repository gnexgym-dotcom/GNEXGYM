
import React, { useState } from 'react';
import { generateWorkoutPlan } from '../services/geminiService';
import { WorkoutPlan, WorkoutDay } from '../types';
import { DumbbellIcon } from './icons/Icons';

export const WorkoutPlanner: React.FC = () => {
    const [goal, setGoal] = useState('Build Muscle');
    const [level, setLevel] = useState('Intermediate');
    const [days, setDays] = useState('4');
    const [plan, setPlan] = useState<WorkoutPlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setPlan(null);
        try {
            const result = await generateWorkoutPlan({ goal, level, days });
            setPlan(result);
        } catch (err) {
            setError('Failed to generate workout plan. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-white">Create a Personalized Workout Plan</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="goal" className="block text-sm font-medium text-gray-400 mb-1">Primary Goal</label>
                        <select id="goal" value={goal} onChange={e => setGoal(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary">
                            <option>Build Muscle</option>
                            <option>Lose Fat</option>
                            <option>Increase Strength</option>
                            <option>Improve Endurance</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="level" className="block text-sm font-medium text-gray-400 mb-1">Fitness Level</label>
                        <select id="level" value={level} onChange={e => setLevel(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary">
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Advanced</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="days" className="block text-sm font-medium text-gray-400 mb-1">Days per Week</label>
                        <select id="days" value={days} onChange={e => setDays(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary">
                            <option>2</option>
                            <option>3</option>
                            <option>4</option>
                            <option>5</option>
                        </select>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-brand-primary hover:opacity-90 text-gray-900 font-bold py-2.5 px-4 rounded-lg transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center">
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                        ) : 'Generate Plan'}
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

const DayCard: React.FC<{ dayPlan: WorkoutDay }> = ({ dayPlan }) => (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <div className="flex items-center mb-4">
            <div className="p-2 bg-brand-primary/20 rounded-lg mr-4">
                 <DumbbellIcon className="w-6 h-6 text-brand-primary"/>
            </div>
            <div>
                <h3 className="text-lg font-bold text-white">{dayPlan.day}</h3>
                <p className="text-brand-secondary">{dayPlan.focus}</p>
            </div>
        </div>
        <div className="space-y-4">
            {dayPlan.exercises.map((ex, i) => (
                <div key={i} className="p-4 rounded-lg bg-gray-700/50">
                    <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-white">{ex.name}</h4>
                        <div className="flex space-x-4 text-sm">
                            <span className="text-gray-300">Sets: <span className="font-bold text-white">{ex.sets}</span></span>
                             <span className="text-gray-300">Reps: <span className="font-bold text-white">{ex.reps}</span></span>
                             <span className="text-gray-300">Rest: <span className="font-bold text-white">{ex.rest}</span></span>
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">{ex.description}</p>
                </div>
            ))}
        </div>
    </div>
);
