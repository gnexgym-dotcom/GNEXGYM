import React, { useState } from 'react';
import { Product, CheckinRecord } from '../types';
import { XIcon } from './icons/Icons';

interface AddProductModalProps {
    record: CheckinRecord;
    products: Product[];
    onClose: () => void;
    onSave: (recordId: string, products: Array<{ productId: string; name: string; quantity: number; price: number }>, total: number) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ record, products, onClose, onSave }) => {
    const [selectedProductId, setSelectedProductId] = useState('');
    const [quantity, setQuantity] = useState(1);

    const selectedProduct = products.find(p => p.id === selectedProductId);

    const handleSubmit = () => {
        if (!selectedProduct || quantity <= 0) {
            alert('Please select a product and enter a valid quantity.');
            return;
        }
        if (quantity > selectedProduct.stock) {
            alert(`Not enough stock. Only ${selectedProduct.stock} available.`);
            return;
        }
        const total = selectedProduct.price * quantity;
        onSave(record.id, [{ productId: selectedProduct.id, name: selectedProduct.name, quantity, price: selectedProduct.price }], total);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md m-4 border border-gray-700 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Add Product to Tab</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                    <p>Adding product for: <span className="font-bold text-white">{record.name}</span></p>
                    <div>
                        <label htmlFor="product" className="block text-sm font-medium text-gray-400 mb-1">Product</label>
                        <select
                            id="product"
                            value={selectedProductId}
                            onChange={e => setSelectedProductId(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white"
                        >
                            <option value="" disabled>Select a product</option>
                            {products.filter(p => p.stock > 0).map(p => <option key={p.id} value={p.id}>{p.name} - ₱{p.price} (Stock: {p.stock})</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-400 mb-1">Quantity</label>
                        <input
                            type="number"
                            id="quantity"
                            value={quantity}
                            onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                            min="1"
                            max={selectedProduct?.stock}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-4 pt-6">
                    <button onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold">Cancel</button>
                    <button onClick={handleSubmit} className="py-2 px-4 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold">Add to Tab</button>
                </div>
            </div>
        </div>
    );
};
