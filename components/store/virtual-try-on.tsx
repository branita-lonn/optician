"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";

interface VirtualTryOnProps {
  imageUrl: string;
}

export function VirtualTryOn({ imageUrl }: VirtualTryOnProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setHasCamera(true);
      setCameraError(null);
    } catch (err) {
      console.error("Camera access denied or error:", err);
      setCameraError("Unable to access camera. Please check permissions.");
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setHasCamera(false);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2 rounded-xl border-primary text-primary hover:bg-primary/5">
          <Camera className="w-4 h-4" />
          Virtual Try-On
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-black border-none rounded-2xl">
        <DialogHeader className="absolute top-0 left-0 w-full z-50 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <DialogTitle className="text-white flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Virtual Try-On
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative w-full aspect-[4/3] bg-zinc-900 flex items-center justify-center">
          {cameraError ? (
            <div className="text-center p-6 space-y-4">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                <Camera className="w-8 h-8 text-zinc-500" />
              </div>
              <p className="text-zinc-400 text-sm">{cameraError}</p>
              <Button onClick={startCamera} variant="outline" className="text-white border-zinc-700">
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* Webcam Feed */}
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              
              {/* Glasses Overlay */}
              {hasCamera && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-[10%]">
                  <div className="relative w-[55%] max-w-[300px] aspect-[2/1] opacity-90 transition-transform duration-100 ease-out">
                    <Image
                      src={imageUrl}
                      alt="Glasses overlay"
                      fill
                      sizes="(max-width: 768px) 100vw, 300px"
                      className="object-contain drop-shadow-2xl"
                    />
                  </div>
                </div>
              )}

              {/* Instructions Overlay */}
              {hasCamera && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full whitespace-nowrap pointer-events-none">
                  Position your face in the center
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
