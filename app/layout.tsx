import type React from "react"
import "@/app/globals.css"

import type { Metadata } from "next"
import { Inter, Bangers } from "next/font/google"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })
const bangers = Bangers({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bangers",
})

export const metadata: Metadata = {
  title: "Slides On Hand AI",
  description: "Create and practice presentations with AI assistance",
  icons: {
    icon: "/favicon.svg",
  },
  generator: ''
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bangers.variable} light`} style={{colorScheme:"light"}}>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light">
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
