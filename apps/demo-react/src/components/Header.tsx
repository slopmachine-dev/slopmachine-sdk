export function Header() {
  return (
    <header className="border-b-4 border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <a
            href="https://slopmachine.dev"
            className="flex items-center gap-3 no-underline"
          >
            <span className="font-['Rubik_Wet_Paint'] text-2xl text-primary leading-8">
              Slop Machine
            </span>
            <span className="hidden sm:inline-block bg-secondary text-primary-foreground text-[0.65rem] font-medium px-2 py-0.5 rounded-sm border border-transparent align-middle leading-4">
              For Developers
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a
              href="https://slopmachine.dev"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Slop Machine
            </a>
            <a
              href="https://docs.slopmachine.dev/getting-started"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Getting Started
            </a>
            <a
              href="https://docs.slopmachine.dev/demo-react/"
              className="text-primary transition-colors"
            >
              React Demo
            </a>
            <a
              href="https://docs.slopmachine.dev/demo-svelte/"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Svelte Demo
            </a>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/slopmachine-dev/slopmachine-sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label="Slop Machine on GitHub"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-8 w-8"
            >
              <path d="M12 2.247c5.525 0 10 4.475 10 10a10.016 10.016 0 0 1-6.813 9.487c-.5.1-.687-.212-.687-.475 0-.337.012-1.412.012-2.75 0-.937-.312-1.537-.675-1.85 2.226-.25 4.563-1.1 4.563-4.937 0-1.1-.387-1.988-1.025-2.688.1-.25.45-1.275-.1-2.65 0 0-.837-.275-2.75 1.025a9.28 9.28 0 0 0-2.5-.337c-.85 0-1.7.112-2.5.337-1.912-1.287-2.75-1.025-2.75-1.025-.55 1.375-.2 2.4-.1 2.65-.638.7-1.025 1.6-1.025 2.688 0 3.825 2.325 4.687 4.55 4.937-.287.25-.55.688-.637 1.338-.575.262-2.013.687-2.913-.825-.187-.3-.75-1.038-1.537-1.025-.838.012-.338.475.012.662.425.238.912 1.125 1.025 1.413.2.562.85 1.637 3.362 1.175 0 .837.013 1.625.013 1.862 0 .263-.188.563-.688.475A9.994 9.994 0 0 1 2 12.247c0-5.525 4.475-10 10-10Z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
