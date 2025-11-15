
import React from 'react';
import { CheckCircleIcon, XCircleIcon, XIcon, WarningIcon, IconProps } from './icons/Icons';

interface ImportResultModalProps {
    result: {
        success: number;
        errors: string[];
    };
    onClose: () => void;
}

export const ImportResultModal: React.FC<ImportResultModalProps> = ({ result, onClose }) => {
    const hasErrors = result.errors.length > 0;
    const wasPartialSuccess = result.success > 0 && hasErrors;
    const wasTotalSuccess = result.success > 0 && !hasErrors;
    const wasTotalFailure = result.success === 0 && hasErrors;

    let title = '';
    let titleColor = '';
    let IconComponent: React.FC<IconProps> = CheckCircleIcon; // Default icon

    if (wasTotalSuccess) {
        title = 'Import Successful';
        titleColor = 'text-green-400';
        IconComponent = CheckCircleIcon;
    } else if (wasPartialSuccess) {
        title = 'Partial Import';
        titleColor = 'text-yellow-400';
        IconComponent = WarningIcon;
    } else if (wasTotalFailure) {
        title = 'Import Failed';
        titleColor = 'text-red-400';
        IconComponent = XCircleIcon;
    } else { // No new members, but also no errors (e.g., empty file)
        title = 'No New Members Imported';
        titleColor = 'text-gray-400';
        IconComponent = CheckCircleIcon;
    }


    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity" aria-modal="true" role="dialog">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 border border-gray-700 animate-fade-in-up max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                        <IconComponent className={`w-8 h-8 mr-3 ${titleColor}`} />
                        <h2 className={`text-2xl font-bold ${titleColor}`}>{title}</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="overflow-y-auto">
                    <div className="bg-gray-900/50 p-4 rounded-lg">
                         <p className="text-lg text-green-400 font-semibold">{result.success} {result.success === 1 ? 'member' : 'members'} imported successfully.</p>
                        {hasErrors && (
                             <p className="mt-1 text-lg text-red-400 font-semibold">{result.errors.length} {result.errors.length === 1 ? 'row' : 'rows'} had errors.</p>
                        )}
                    </div>
                   
                    {hasErrors && (
                        <div className="mt-4">
                            <h3 className="text-md font-semibold text-gray-300 mb-2">Error Details:</h3>
                            <ul className="space-y-2 bg-gray-700/50 p-4 rounded-lg max-h-60 overflow-y-auto">
                                {result.errors.map((error, index) => (
                                    <li key={index} className="text-sm text-gray-400 font-mono border-b border-gray-600 pb-1">
                                        {error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="py-2 px-6 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold transition">Close</button>
                </div>
            </div>
        </div>
    );
};
