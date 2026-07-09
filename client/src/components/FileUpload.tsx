import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileCheck, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface FileUploadProps {
  category: "veiculo" | "condutor" | "voucher" | "passagem" | "visita" | "cliente";
  refId?: number;
  label?: string;
  accept?: string;
  onUploaded?: (doc: any) => void;
}

export default function FileUpload({ category, refId, label = "Anexar documento", accept, onUploaded }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<any>(null);

  const utils = trpc.useUtils();
  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: (doc: any) => {
      setUploadedDoc(doc);
      utils.documents.list.invalidate();
      toast.success("Documento anexado com sucesso!");
      onUploaded?.(doc);
    },
    onError: (e: any) => toast.error("Erro ao enviar arquivo: " + e.message),
    onSettled: () => setUploading(false),
  });

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 10MB)");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      uploadMutation.mutate({
        category,
        refId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileBase64: base64,
      });
    };
    reader.onerror = () => {
      toast.error("Erro ao ler arquivo");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  if (uploadedDoc) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
        <FileCheck className="h-4 w-4 text-green-600" />
        <a href={uploadedDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-green-700 hover:underline truncate flex-1">
          {uploadedDoc.name}
        </a>
        <button
          onClick={() => { setUploadedDoc(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
          className="text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="gap-2 w-full"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? "Enviando..." : label}
      </Button>
    </div>
  );
}
