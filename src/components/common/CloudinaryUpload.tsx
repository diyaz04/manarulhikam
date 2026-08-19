import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, UploadCloud, Image as ImageIcon, X } from "lucide-react";

interface CloudinaryUploadProps {
  onUploadSuccess: (url: string) => void;
  onUploadError?: (error: string) => void;
  defaultImage?: string | null;
  buttonText?: string;
  className?: string;
}

export function CloudinaryUpload({ 
  onUploadSuccess, 
  onUploadError, 
  defaultImage, 
  buttonText = "Upload Gambar",
  className = "" 
}: CloudinaryUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!cloudName || !uploadPreset) {
      const errorMsg = "Konfigurasi Cloudinary tidak ditemukan di file .env.local";
      console.error(errorMsg);
      if (onUploadError) onUploadError(errorMsg);
      else alert(errorMsg);
      return;
    }

    // Tampilkan preview lokal sementara upload berjalan
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setPreviewUrl(data.secure_url);
        onUploadSuccess(data.secure_url);
      } else {
        throw new Error(data.error?.message || "Gagal mengunggah gambar");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      if (onUploadError) {
        onUploadError(error.message);
      } else {
        alert("Gagal mengunggah gambar: " + error.message);
      }
      // Revert preview to previous state if failed
      setPreviewUrl(defaultImage || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onUploadSuccess(""); // Kirim string kosong menandakan gambar dihapus
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {previewUrl ? (
        <div className="relative inline-block border rounded-lg overflow-hidden group">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-48 h-48 object-cover" 
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
            <Button 
              type="button" 
              variant="destructive" 
              size="sm"
              onClick={handleRemove}
              disabled={isUploading}
            >
              <X className="w-4 h-4 mr-1" /> Hapus
            </Button>
          </div>
          {isUploading && (
            <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
              <span className="text-xs font-semibold text-emerald-800">Mengunggah...</span>
            </div>
          )}
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 transition-colors cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {isUploading ? (
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
          ) : (
            <UploadCloud className="w-8 h-8 mb-2" />
          )}
          <span className="text-sm font-medium">{isUploading ? "Mengunggah..." : buttonText}</span>
          <span className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</span>
        </div>
      )}
      
      <input 
        type="file" 
        accept="image/png, image/jpeg, image/webp" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  );
}
