import { useState, useEffect } from 'react';
import { Product } from '../types';

const STORAGE_KEY = 'gnex-gym-products';

const initialProducts: Product[] = [
    { id: 'prod-1', name: 'Water Refill', category: 'Services', price: 10, stock: 999 },
    { id: 'prod-2', name: 'Summit Water Bottle', category: 'Drinks', price: 20, stock: 100 },
    { id: 'prod-3', name: 'Energy Drinks-Cobra', category: 'Drinks', price: 35, stock: 50 },
    { id: 'prod-4', name: 'Energy Drinks-Gatorade', category: 'Drinks', price: 55, stock: 50 },
    { id: 'prod-5', name: 'Energy Drinks-Pocari Sweat', category: 'Drinks', price: 55, stock: 50 },
    { id: 'prod-6', name: 'VITA MILK', category: 'Drinks', price: 40, stock: 50 },
    { id: 'prod-7', name: 'WHEY PROTEIN', category: 'Supplements', price: 50, stock: 100 },
    { id: 'prod-8', name: 'AMINO TABLET', category: 'Supplements', price: 20, stock: 200 },
    { id: 'prod-9', name: 'CREATINE', category: 'Supplements', price: 35, stock: 100 },
    { id: 'prod-10', name: 'DRI-FIT SHIRT', category: 'Apparel', price: 350, stock: 20 },
    { id: 'prod-11', name: 'TUMBLER', category: 'Merchandise', price: 300, stock: 30 },
    { id: 'prod-12', name: 'GLOVES RENTAL', category: 'Services', price: 100, stock: 999 },
    { id: 'prod-13', name: 'GNEX CAP', category: 'Merchandise', price: 200, stock: 30 },
    { id: 'prod-14', name: 'HANDWRAPS', category: 'Apparel', price: 450, stock: 50 },
];

export const useProducts = () => {
    const [products, setProducts] = useState<Product[]>(() => {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            return storedData ? JSON.parse(storedData) : initialProducts;
        } catch (error) {
            console.error("Error reading products from localStorage", error);
            return initialProducts;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
        } catch (error) {
            console.error("Error saving products to localStorage", error);
        }
    }, [products]);

    const addProduct = (productData: Omit<Product, 'id'>) => {
        const newProduct: Product = {
            ...productData,
            id: `prod-${Date.now()}`,
        };
        setProducts(prev => [newProduct, ...prev]);
    };

    const updateProduct = (updatedProduct: Product) => {
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    };

    const deleteProduct = (id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    };

    const updateStock = (productId: string, quantityChange: number) => {
        setProducts(prev => prev.map(p => 
            p.id === productId ? { ...p, stock: p.stock + quantityChange } : p
        ));
    };

    return { products, addProduct, updateProduct, deleteProduct, updateStock };
};