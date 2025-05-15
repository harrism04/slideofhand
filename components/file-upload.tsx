'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast'; // Assuming useToast is available
import { useRouter } from 'next/navigation'; // For redirecting

interface FileUploadProps {
  onUploadSuccess?: (presentationId: string) => void;
  buttonText?: string;
  acceptedFileTypes?: string; // e.g., ".pdf,.pptx"
}

export function FileUpload({
  onUploadSuccess,
  buttonText = 'Import File',
  acceptedFileTypes = '.pdf,application/pdf',
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a PDF file to import.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import-presentation', {
        method: 'POST',
        body: formData,
        // Headers are not explicitly set for FormData; browser handles 'Content-Type: multipart/form-data'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to import file (status: ${response.status})`);
      }

      toast({
        title: 'Import Successful',
        description: `${file.name} has been imported and a new presentation created.`,
      });

      if (onUploadSuccess) {
        onUploadSuccess(result.presentationId);
      } else {
        // Default behavior: redirect to the practice selection page or the new presentation
        router.push(`/practice/${result.presentationId}`); // Or /practice/select
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setFile(null); // Clear the file input
      // Reset the form's file input visually
      const form = event.target as HTMLFormElement;
      form.reset();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-start">
      <Input
        type="file"
        onChange={handleFileChange}
        accept={acceptedFileTypes}
        disabled={isLoading}
        className="max-w-xs"
      />
      {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
      <Button type="submit" disabled={!file || isLoading}>
        {isLoading ? 'Importing...' : buttonText}
      </Button>
    </form>
  );
}
