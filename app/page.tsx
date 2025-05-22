import Link from "next/link"
import Image from "next/image" // Added Image import
import { ArrowRight, Mic, PenTool, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import AuthStatus from "@/components/AuthStatus"

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-yellow-400 py-4 border-b-4 border-black">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link href="/" passHref>
              <Image src="/soh.png" alt="Slides On Hand logo" width={120} height={40} />
            </Link>
            <nav>
              <ul className="flex space-x-6">
                <li>
                  <Link href="/presentations" className="text-black font-bold hover:underline">
                    Presentations
                  </Link>
                </li>
                <li>
                  <Link href="/practice" className="text-black font-bold hover:underline">
                    Practice
                  </Link>
                </li>
                <li>
                  <Link href="/history" className="text-black font-bold hover:underline">
                    History
                  </Link>
                </li>
              </ul>
            </nav>
            <AuthStatus />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-blue-100 relative overflow-hidden">
        <Image
          src="/soh_hero.png"
          alt="Hero Banner"
          layout="fill"
          objectFit="cover"
          className="opacity-30" // Adjust opacity as needed, e.g., opacity-30, opacity-40, opacity-50
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-6xl font-bangers text-black mb-6">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-md">LEVEL</span> UP
              <br />
              YOUR <span className="bg-red-500 text-white px-3 py-1 rounded-md">PRESENTATIONS!</span>
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Create stunning slides with AI assistance and practice your delivery with real-time feedback.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <Link href="/presentations">
                  My Presentations <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="bg-white text-black font-bold border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <Link href="/practice/select">
                  Practice Mode <Play className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bangers text-center mb-12">
            <span className="bg-purple-500 text-white px-3 py-1 rounded-md">AWESOME</span> FEATURES
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-3 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="bg-red-400 border-b-2 border-black pb-4">
                <CardTitle className="text-2xl font-bangers">AI Content Generation</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-yellow-200 rounded-full w-16 h-16 flex items-center justify-center mb-4 border-2 border-black">
                  <PenTool className="h-8 w-8 text-black" />
                </div>
                <CardDescription className="text-black text-lg">
                Create slides with AI by inputting your topic, draft, or webpage. Let our AI Agent handle the content generation for you!
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold border-2 border-black rounded-xl"
                >
                  <Link href="/presentations">Try It Now</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-3 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="bg-blue-400 border-b-2 border-black pb-4">
                <CardTitle className="text-2xl font-bangers">Practice Mode</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-red-200 rounded-full w-16 h-16 flex items-center justify-center mb-4 border-2 border-black">
                  <Mic className="h-8 w-8 text-black" />
                </div>
                <CardDescription className="text-black text-lg">
                Rehearse your presentations with real-time feedback on delivery and pacing, plus practice Q&A sessions in voice or chat mode.
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black rounded-xl"
                >
                  <Link href="/practice/select">Start Practicing</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-3 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="bg-green-400 border-b-2 border-black pb-4">
                <CardTitle className="text-2xl font-bangers">Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-blue-200 rounded-full w-16 h-16 flex items-center justify-center mb-4 border-2 border-black">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8 text-black"
                  >
                    <path d="M3 3v18h18" />
                    <path d="m19 9-5 5-4-4-3 3" />
                  </svg>
                </div>
                <CardDescription className="text-black text-lg">
                Analyze practice data to spot improvement areas. Examine detailed individual sessions or track progress trends over time.
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold border-2 border-black rounded-xl"
                >
                  <Link href="/history">View Analytics</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h2 className="text-2xl font-black">
              Slides On Hand
                <span className="bg-red-500 px-2 py-1 mr-1 rounded-md">AI</span>
              </h2>
            </div>
            <div>
              <p className="text-sm"></p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
