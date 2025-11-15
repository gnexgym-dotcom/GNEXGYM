import React, { useRef, useEffect, useState } from 'react';
import { XIcon } from './icons/Icons';

interface WebcamCaptureProps {
    onCapture: (imageDataUrl: string) => void;
    onClose: () => void;
}

export const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    useEffect(() => {
        let activeStream: MediaStream;
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                activeStream = stream;
                setStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing webcam:", err);
                alert("Could not access the webcam. Please ensure you have granted permission.");
                onClose();
            }
        };

        startCamera();

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [onClose]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            
            const imageDataUrl = canvas.toDataURL('image/jpeg');
            setCapturedImage(imageDataUrl);
        }
    };
    
    const handleSave = () => {
        if (capturedImage) {
            onCapture(capturedImage);
        }
    };
    
    const handleRetake = () => {
        setCapturedImage(null);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl m-4 border border-gray-700 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Take Photo</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${capturedImage ? 'hidden' : ''}`}></video>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    {capturedImage && (
                        <img src={capturedImage} alt="Captured" className="w-full h-full object-cover"/>
                    )}
                </div>

                <div className="flex justify-center gap-4 pt-6">
                    {!capturedImage ? (
                        <button onClick={handleCapture} className="py-3 px-8 rounded-lg bg-brand-red hover:opacity-90 text-white font-bold transition text-lg">
                            Capture
                        </button>
                    ) : (
                        <>
                            <button onClick={handleRetake} className="py-3 px-8 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold transition text-lg">
                                Retake
                            </button>
                             <button onClick={handleSave} className="py-3 px-8 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold transition text-lg">
                                Save Photo
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};