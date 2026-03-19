import { Home, Settings, HelpCircle, Users } from 'lucide-react';

export default function SiteMap() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Site Map</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Main Navigation */}
          <div className="bg-card rounded-lg p-6 border">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Home className="h-5 w-5" />
              Main Pages
            </h2>
            <ul className="space-y-2 text-base">
              <li>
                <a href="/" className="text-primary hover:text-primary/80 underline">Home - Play Game</a>
              </li>
              <li>
                <a href="/auth" className="text-primary hover:text-primary/80 underline">Authentication</a>
              </li>
            </ul>
          </div>

          {/* Game Features */}
          <div className="bg-card rounded-lg p-6 border">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Game Features
            </h2>
            <ul className="space-y-2 text-base">
              <li>
                <a href="/#single-player" className="text-primary hover:text-primary/80 underline">Single Player Mode</a>
              </li>
              <li>
                <a href="/#multiplayer" className="text-primary hover:text-primary/80 underline">Multiplayer Mode</a>
              </li>
              <li>
                <a href="/#difficulty-levels" className="text-primary hover:text-primary/80 underline">Difficulty Levels</a>
              </li>
              <li>
                <a href="/#scoring" className="text-primary hover:text-primary/80 underline">Scoring System</a>
              </li>
            </ul>
          </div>

          {/* Help & Support */}
          <div className="bg-card rounded-lg p-6 border">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Help & Support
            </h2>
            <ul className="space-y-2 text-base">
              <li>
                <a href="/#how-to-play" className="text-primary hover:text-primary/80 underline">How to Play</a>
              </li>
              <li>
                <a href="/#rules" className="text-primary hover:text-primary/80 underline">Game Rules</a>
              </li>
              <li>
                <a href="/#tips" className="text-primary hover:text-primary/80 underline">Tips & Strategies</a>
              </li>
              <li>
                <a href="/#faq" className="text-primary hover:text-primary/80 underline">FAQ</a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div className="bg-card rounded-lg p-6 border">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Community
            </h2>
            <ul className="space-y-2 text-base">
              <li>
                <a href="/#leaderboard" className="text-primary hover:text-primary/80 underline">Leaderboard</a>
              </li>
              <li>
                <a href="/#recent-games" className="text-primary hover:text-primary/80 underline">Recent Games</a>
              </li>
              <li>
                <a href="/#player-stats" className="text-primary hover:text-primary/80 underline">Player Statistics</a>
              </li>
            </ul>
          </div>

          {/* Search */}
          <div className="bg-card rounded-lg p-6 border">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Home className="h-5 w-5" />
              Navigation
            </h2>
            <p className="text-muted-foreground mb-4">
              Use the site map to navigate through different sections of the game.
            </p>
            <div className="text-sm text-muted-foreground">
              <p>All sections are accessible from the main menu.</p>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <a 
            href="/" 
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 underline text-base"
          >
            <Home className="h-4 w-4" />
            Back to Game
          </a>
        </div>
      </div>
    </div>
  );
}
