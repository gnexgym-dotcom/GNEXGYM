import React, { useState, useRef, useEffect, useCallback } from 'react';
import { XIcon, RotateClockwiseIcon, RotateCounterClockwiseIcon, ZoomInIcon, ZoomOutIcon, SpinnerIcon } from './icons/Icons';

interface ImageEditorProps {
    src: string | null;
    onSave: (dataUrl: string) => void;
    onClose: () => void;
}

const CANVAS_SIZE = 300;

export const ImageEditor: React.FC<ImageEditorProps> = ({ src, onSave, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isLoading, setIsLoading] = useState(false);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const canvasSize = canvas.width;

        // Clear and save context
        ctx.fillStyle = '#1E1E1E';
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        ctx.save();

        // Move to the center of the canvas and apply transformations
        ctx.translate(canvasSize / 2, canvasSize / 2);
        ctx.translate(offset.x, offset.y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);
        
        // Draw the image centered
        ctx.drawImage(image, -image.width / 2, -image.height / 2);

        ctx.restore();
    }, [zoom, rotation, offset]);

    useEffect(() => {
        if (!src) return;
        setIsLoading(true);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        img.onload = () => {
            imageRef.current = img;
            // Reset state for new image and calculate initial zoom
            const canvas = canvasRef.current;
            if(canvas) {
                const scaleX = canvas.width / img.width;
                const scaleY = canvas.height / img.height;
                const initialZoom = Math.max(scaleX, scaleY); // Fill the canvas
                setZoom(initialZoom);
            } else {
                 setZoom(1);
            }
            setRotation(0);
            setOffset({ x: 0, y: 0 });
            setIsLoading(false);
        };
        img.onerror = () => {
            alert('Failed to load image.');
            setIsLoading(false);
            onClose();
        }
    }, [src, onClose]);

    useEffect(() => {
        // Redraw whenever transform state changes
        draw();
    }, [draw, zoom, rotation, offset, isLoading]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.nativeEvent.offsetX - dragStart.x;
        const dy = e.nativeEvent.offsetY - dragStart.y;
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    };
    
    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };
    
    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const newZoom = zoom - e.deltaY * 0.001;
        setZoom(Math.max(0.1, Math.min(newZoom, 5)));
    };

    const handleSave = () => {
        setIsLoading(true);
        // Timeout to allow spinner to render
        setTimeout(() => {
            const canvas = canvasRef.current;
            if (canvas) {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                onSave(dataUrl);
            }
            setIsLoading(false);
        }, 50);
    };

    const controlButtonClass = "p-2 rounded-full bg-gray-600 hover:bg-gray-500 text-white transition-colors duration-200";

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 border border-gray-700 animate-fade-in-up flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Edit Photo</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="relative w-full aspect-square bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                    {isLoading && <SpinnerIcon className="w-12 h-12 text-brand-primary animate-spin" />}
                    <canvas 
                        ref={canvasRef} 
                        width={CANVAS_SIZE} 
                        height={CANVAS_SIZE}
                        className={`cursor-grab active:cursor-grabbing ${isLoading ? 'invisible' : ''}`}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onWheel={handleWheel}
                    />
                </div>

                <div className="flex justify-center items-center gap-4 pt-6">
                    <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className={controlButtonClass} aria-label="Zoom out"><ZoomOutIcon className="w-6 h-6"/></button>
                    <button onClick={() => setRotation(r => (r - 90 + 360) % 360)} className={controlButtonClass} aria-label="Rotate counter-clockwise"><RotateCounterClockwiseIcon className="w-6 h-6"/></button>
                    <button onClick={() => setRotation(r => (r + 90) % 360)} className={controlButtonClass} aria-label="Rotate clockwise"><RotateClockwiseIcon className="w-6 h-6"/></button>
                    <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className={controlButtonClass} aria-label="Zoom in"><ZoomInIcon className="w-6 h-6"/></button>
                </div>

                <div className="mt-6">
                    <button 
                        onClick={handleSave} 
                        disabled={isLoading}
                        className="w-full py-3 px-8 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold transition text-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isLoading ? <SpinnerIcon className="w-6 h-6 animate-spin"/> : 'Save Photo'}
                    </button>
                </div>
            </div>
        </div>
    );
};
