'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';

interface ExtractedBrandingData {
    url: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    background_colors?: Record<string, string>;
    text_colors?: Record<string, string>;
    system_colors?: Record<string, string>;
    font_families?: Record<string, string>;
    typography_patterns?: Array<{
        selector: string;
        font_family?: string;
        color?: string;
        font_size?: string;
    }>;
    logos?: Array<{ url: string; alt: string }>;
}

export default function ExtractBrandingPage() {
    const [targetUrl, setTargetUrl] = useState('');
    const [brandingData, setBrandingData] = useState<ExtractedBrandingData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleExtractBranding = async () => {
        if (!targetUrl) {
            setError('Please enter a URL.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setBrandingData(null);

        try {
            const response = await fetch('/api/extract-branding', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ targetUrl }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

            setBrandingData(result.data);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
            console.error("Extraction failed:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const ColorSwatch = ({ color, name }: { color?: string; name: string }) => {
        if (!color) return null;
        return (
            <div className="flex items-center space-x-2">
                <div
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: color }}
                />
                <span>{name}: {color}</span>
            </div>
        );
    };
    
    const LogoDisplay = ({ logo }: { logo: { url: string; alt: string } }) => (
        <div className="flex flex-col items-center p-2 border rounded-md">
            <img src={logo.url} alt={logo.alt} className="max-w-full h-16 object-contain mb-1" />
            <p className="text-xs text-gray-500 truncate w-full text-center" title={logo.alt}>{logo.alt}</p>
        </div>
    );


    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8">
            <header className="text-center">
                <h1 className="font-bangers text-5xl md:text-7xl text-purple-600 tracking-wider">
                    Extract Website Branding
                </h1>
                <p className="text-lg text-gray-600 mt-2">
                    Enter a URL to automatically extract its branding elements and create a template.
                </p>
            </header>

            <Card className="shadow-lg border-2 border-black rounded-lg">
                <CardHeader>
                    <CardTitle className="font-bangers text-3xl text-blue-600">Enter URL</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <Input
                            type="url"
                            placeholder="https://example.com"
                            value={targetUrl}
                            onChange={(e) => setTargetUrl(e.target.value)}
                            className="flex-grow border-2 border-gray-400 focus:border-pink-500 rounded-md"
                            disabled={isLoading}
                        />
                        <Button
                            onClick={handleExtractBranding}
                            disabled={isLoading}
                            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold border-2 border-black rounded-md shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                        >
                            <Sparkles className="mr-2 h-5 w-5" />
                            {isLoading ? 'Extracting...' : 'Extract Branding'}
                        </Button>
                    </div>
                    {error && (
                        <Alert variant="destructive" className="border-red-500 border-2 rounded-md">
                            <AlertTitle className="font-bold">Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {isLoading && (
                <Card className="shadow-lg border-2 border-black rounded-lg">
                    <CardHeader>
                        <CardTitle className="font-bangers text-3xl text-green-600">Extracted Branding</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-8 w-1/4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-md" />)}
                        </div>
                         <Skeleton className="h-8 w-1/3 mt-4" />
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-md" />)}
                        </div>
                    </CardContent>
                </Card>
            )}

            {brandingData && !isLoading && (
                <Card className="shadow-lg border-2 border-black rounded-lg">
                    <CardHeader>
                        <CardTitle className="font-bangers text-3xl text-green-600">
                            Branding for: <span className="text-pink-500 underline">{brandingData.url}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Colors Section */}
                        <div>
                            <h3 className="font-bangers text-2xl text-red-600 mb-2">Colors</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-md bg-gray-50">
                                <ColorSwatch color={brandingData.primary_color} name="Primary" />
                                <ColorSwatch color={brandingData.secondary_color} name="Secondary" />
                                <ColorSwatch color={brandingData.accent_color} name="Accent" />
                                {brandingData.background_colors && Object.entries(brandingData.background_colors).map(([key, value]) => (
                                    <ColorSwatch key={key} color={value} name={`BG: ${key.replace('_', ' ')}`} />
                                ))}
                                {brandingData.text_colors && Object.entries(brandingData.text_colors).map(([key, value]) => (
                                    <ColorSwatch key={key} color={value} name={`Text: ${key.replace('_', ' ')}`} />
                                ))}
                                {brandingData.system_colors && Object.entries(brandingData.system_colors).map(([key, value]) => (
                                    <ColorSwatch key={key} color={value} name={`System: ${key.replace('_', ' ')}`} />
                                ))}
                            </div>
                        </div>

                        {/* Fonts Section */}
                        {brandingData.font_families && (Object.keys(brandingData.font_families).length > 0 || (brandingData.typography_patterns && brandingData.typography_patterns.length > 0)) && (
                            <div>
                                <h3 className="font-bangers text-2xl text-red-600 mb-2">Typography</h3>
                                <div className="p-4 border rounded-md bg-gray-50 space-y-3">
                                    {brandingData.font_families.primary_font && <p><strong>Primary Font:</strong> {brandingData.font_families.primary_font}</p>}
                                    {brandingData.font_families.secondary_font && <p><strong>Secondary Font:</strong> {brandingData.font_families.secondary_font}</p>}
                                    
                                    {brandingData.typography_patterns && brandingData.typography_patterns.length > 0 && (
                                        <div className="mt-2">
                                            <h4 className="font-semibold mb-1">Patterns:</h4>
                                            <ul className="list-disc list-inside pl-2 space-y-1 text-sm">
                                                {brandingData.typography_patterns.map((pattern, index) => (
                                                    <li key={index}>
                                                        <code>{pattern.selector}</code>:
                                                        {pattern.font_family && ` Font: ${pattern.font_family};`}
                                                        {pattern.color && ` Color: ${pattern.color};`}
                                                        {pattern.font_size && ` Size: ${pattern.font_size};`}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Logos Section */}
                        {brandingData.logos && brandingData.logos.length > 0 && (
                             <div>
                                <h3 className="font-bangers text-2xl text-red-600 mb-2">Logos</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 border rounded-md bg-gray-50">
                                    {brandingData.logos.map((logo, index) => (
                                        <LogoDisplay key={index} logo={logo} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
