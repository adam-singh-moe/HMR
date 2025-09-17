import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">My React App</h1>
            <nav className="flex items-center gap-4">
              <Button variant="ghost">About</Button>
              <Button variant="ghost">Contact</Button>
              <Button>Get Started</Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <Badge variant="secondary" className="mb-4">
            Welcome to React
          </Badge>
          <h2 className="text-4xl font-bold text-balance">Build Amazing Things with React</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            This is a basic React application built with Next.js, TypeScript, and Tailwind CSS. Start building your next
            great project here.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg">Get Started</Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">Features</h3>
          <p className="text-muted-foreground">Everything you need to get started</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>⚡ Fast</CardTitle>
              <CardDescription>Built with Next.js for optimal performance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Server-side rendering and static generation for lightning-fast load times.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🎨 Beautiful</CardTitle>
              <CardDescription>Styled with Tailwind CSS and shadcn/ui</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Modern, responsive design with a comprehensive component library.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🔧 Developer Friendly</CardTitle>
              <CardDescription>TypeScript support and modern tooling</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Full TypeScript support with excellent developer experience.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2024 My React App. Built with ❤️ using React and Next.js.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
