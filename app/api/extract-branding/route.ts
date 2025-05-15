import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import FirecrawlApp from "@mendable/firecrawl-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

interface BrandingData {
    url: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    background_colors?: Record<string, string>;
    text_colors?: Record<string, string>;
    system_colors?: Record<string, string>;
    font_families?: Record<string, string>;
    typography_patterns?: any[]; // Define a more specific type later
    logos?: any[]; // Define a more specific type later
    // user_id?: string; // Optional: if we associate with a user. Removed for now.
}

export async function POST(req: NextRequest) {
    try {
        const { targetUrl } = await req.json();

        if (!targetUrl) {
            return NextResponse.json({ error: 'targetUrl is required' }, { status: 400 });
        }

        if (!firecrawlApiKey) {
            console.error("FIRECRAWL_API_KEY is not set");
            return NextResponse.json({ error: "Firecrawl API key not configured" }, { status: 500 });
        }

        // 1. Use Firecrawl to scrape the website
        console.log(`Scraping URL: ${targetUrl} with Firecrawl...`);
        const firecrawlApp = new FirecrawlApp({ apiKey: firecrawlApiKey });
        const scrapeResult = await firecrawlApp.scrapeUrl(targetUrl, { 
            onlyMainContent: false, // We want the full page for branding elements
            formats: ['html']       // We specifically need the HTML content
        });

        if (!scrapeResult || !scrapeResult.success || !scrapeResult.data || !scrapeResult.data.html) {
            console.error("Firecrawl scraping failed or returned no HTML data:", scrapeResult);
            let errorMessage = "Failed to scrape URL using Firecrawl.";
            if (scrapeResult && scrapeResult.error) {
                errorMessage += ` Error: ${scrapeResult.error}`;
            } else if (scrapeResult && scrapeResult.success && (!scrapeResult.data || !scrapeResult.data.html)) {
                errorMessage = "Firecrawl succeeded but returned no HTML content.";
            }
            return NextResponse.json({ error: errorMessage, details: scrapeResult }, { status: 500 });
        }
        
        const htmlContent = scrapeResult.data.html;
        
        console.log(`Parsing branding for URL: ${targetUrl}`);
        const branding: BrandingData = { url: targetUrl };

        // Helper to extract CSS property value from <style> tags or inline styles
        // This is still a simplified regex approach. A real solution would use a CSS parser.
        const extractCssValue = (content: string, selector: string, property: string): string | undefined => {
            // Look in <style> tags
            const styleBlockRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
            let styleContent = "";
            let match;
            while((match = styleBlockRegex.exec(content)) !== null) {
                styleContent += match[1];
            }
            
            // Look for inline styles (less reliable for general branding but might catch some)
            // Example: <div style="color: #123456">
            const inlineStyleRegex = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*style="[^"]*${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*([^;"]+)`, 'im');
            const inlineMatch = content.match(inlineStyleRegex);
            if (inlineMatch?.[1]) return inlineMatch[1].trim();

            // Then check style blocks
            const cssRuleRegex = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*{\\s*[^}]*${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*([^;!}\\s]+)`, 'im');
            const ruleMatch = styleContent.match(cssRuleRegex);
            return ruleMatch?.[1].trim();
        };
        
        // Attempt to find colors
        branding.primary_color = extractCssValue(htmlContent, 'h1', 'color') || extractCssValue(htmlContent, '\\.primary-button', 'background-color') || extractCssValue(htmlContent, '\\.btn-primary', 'background-color') || '#007bff';
        branding.secondary_color = extractCssValue(htmlContent, '\\.secondary-button', 'background-color') || extractCssValue(htmlContent, '\\.btn-secondary', 'background-color') || '#6c757d';
        branding.accent_color = extractCssValue(htmlContent, '\\.accent-text', 'color') || extractCssValue(htmlContent, '\\.text-accent', 'color') || '#ffc107';

        branding.background_colors = {
            page_bg: extractCssValue(htmlContent, 'body', 'background-color') || '#ffffff',
            component_bg: extractCssValue(htmlContent, '\\.bg-light', 'background-color') || extractCssValue(htmlContent, '\\.card', 'background-color') || '#f8f9fa',
        };
        
        branding.text_colors = {
            heading: branding.primary_color, 
            body: extractCssValue(htmlContent, 'body', 'color') || extractCssValue(htmlContent, 'p', 'color') || '#333333',
            link_default: extractCssValue(htmlContent, 'a', 'color') || '#0056b3',
        };
        branding.system_colors = {
            success: extractCssValue(htmlContent, '\\.text-success', 'color') || extractCssValue(htmlContent, '\\.alert-success', 'color') || '#28a745',
            warning: extractCssValue(htmlContent, '\\.text-warning', 'color') || extractCssValue(htmlContent, '\\.alert-warning', 'color') || '#ffc107',
            error: extractCssValue(htmlContent, '\\.text-error', 'color') || extractCssValue(htmlContent, '\\.alert-danger', 'color') || '#dc3545',
        };

        // Font families
        const bodyFont = extractCssValue(htmlContent, 'body', 'font-family');
        const headingFont = extractCssValue(htmlContent, 'h1', 'font-family') || extractCssValue(htmlContent, 'h2', 'font-family');
        branding.font_families = {
            primary_font: headingFont || bodyFont || 'Arial, sans-serif',
            secondary_font: bodyFont || headingFont || 'Arial, sans-serif', 
        };
        
        branding.typography_patterns = [];
        const h1Pattern = {
            selector: "h1",
            font_family: branding.font_families.primary_font,
            color: branding.text_colors.heading,
            font_size: extractCssValue(htmlContent, 'h1', 'font-size')
        };
        if (h1Pattern.font_size || h1Pattern.color || h1Pattern.font_family ) branding.typography_patterns.push(h1Pattern);

        const pPattern = {
            selector: "p",
            font_family: branding.font_families.secondary_font,
            color: branding.text_colors.body,
            font_size: extractCssValue(htmlContent, 'p', 'font-size')
        };
        if (pPattern.font_size || pPattern.color || pPattern.font_family) branding.typography_patterns.push(pPattern);

        // Logos
        branding.logos = [];
        const imgRegex = /<img\s+[^>]*src="([^"]+)"[^>]*alt="([^"]*logo[^"]*)"[^>]*>/gi;
        let logoMatch;
        while((logoMatch = imgRegex.exec(htmlContent)) !== null) {
            // Attempt to resolve relative URLs
            let logoUrl = logoMatch[1];
            try {
                const base = new URL(targetUrl);
                logoUrl = new URL(logoUrl, base.origin).href;
            } catch (e) {
                // If not a valid relative URL or targetUrl is not a valid base, keep original
            }
            branding.logos.push({ url: logoUrl, alt: logoMatch[2] });
        }
        if (branding.logos.length === 0) {
            const commonLogoRegex = /<img\s+[^>]*src="([^"]*(logo|brand|site-icon)\.(png|svg|jpg|jpeg|webp))"[^>]*>/gi;
            while((logoMatch = commonLogoRegex.exec(htmlContent)) !== null) {
                 let logoUrl = logoMatch[1];
                try {
                    const base = new URL(targetUrl);
                    logoUrl = new URL(logoUrl, base.origin).href;
                } catch (e) { /* keep original */ }
                branding.logos.push({ url: logoUrl, alt: "Detected logo" });
            }
        }
        branding.logos = [...new Set(branding.logos.map(logo => JSON.stringify(logo)))].map(s => JSON.parse(s));


        // 2. Store in Supabase
        const { data, error } = await supabase
            .from('website_branding_elements')
            .upsert(branding, { onConflict: 'url' }) // Upsert based on URL to avoid duplicates and allow updates
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: 'Failed to store branding elements', details: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: 'Branding elements extracted and stored successfully', data }, { status: 200 });

    } catch (err: any) {
        console.error('Extraction error:', err);
        return NextResponse.json({ error: 'An unexpected error occurred', details: err.message || String(err) }, { status: 500 });
    }
}

// Helper function placeholder for actual Firecrawl call
// async function callFirecrawlScrape(url: string) {
// This would use the Firecrawl MCP tool:
// return await use_mcp_tool({
// server_name: 'github.com/mendableai/firecrawl-mcp-server',
// tool_name: 'firecrawl_scrape',
// arguments: { url: url, formats: ['html', 'markdown'] } // or other formats
// });
// }
