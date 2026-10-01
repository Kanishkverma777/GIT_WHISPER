import Link from "next/link";
import { AnomalousMatterHero } from "@/components/ui/anomalous-matter-hero";
import { getGithubLoginUrl } from "@/lib/api";

export default function HomePage() {
  return (
    <div className="relative min-h-[100dvh] bg-[#0A0A0A] text-[#EAEAEA] selection:bg-[#E61919] selection:text-white overflow-hidden font-sans flex flex-col">
      {/* CRT Scanline Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03] mix-blend-overlay bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#000_2px,#000_4px)]" />


      <main className="relative z-10 mx-auto w-full flex flex-col flex-1">
        {/* Brutalist Hero Section */}
        <section className="relative grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Background Anomaly */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <AnomalousMatterHero
              title=""
              subtitle=""
              description=""
            />
          </div>
          
          {/* Left Column: Massive Typography */}
          <div className="relative z-10 lg:col-span-8 p-6 lg:p-12 xl:p-16 flex flex-col justify-center min-h-[70vh]">
            <div className="font-heading text-[#EAEAEA] font-black text-5xl sm:text-6xl lg:text-7xl xl:text-[6rem] tracking-tighter uppercase mb-6 flex items-center gap-4">
              <svg viewBox="0 0 24 24" className="size-12 sm:size-16 lg:size-20 xl:size-24 text-[#E61919] fill-current" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GIT_WHISPER
            </div>
            
            <h1 className="font-mono text-xl sm:text-2xl lg:text-3xl font-bold uppercase tracking-[0.2em] text-[#A0A0A0] mt-4">
              TALK TO <span className="text-[#E61919]">CODE.</span>
            </h1>
            
            <div className="mt-12 max-w-[50ch] font-mono text-sm leading-relaxed text-[#A0A0A0] uppercase tracking-wide">
              &gt;&gt; SYSTEM INSTRUCTION: CONNECT REPOSITORY. INITIATE R.A.G. INDEXING VIA VECTOR DB. EXECUTE SEMANTIC QUERY WITH SURFACED CITATIONS.
            </div>
            
            <div className="flex flex-wrap items-center gap-4 pt-12">
              <a
                href={getGithubLoginUrl()}
                className="bg-[#E61919] text-white px-8 py-4 font-mono text-sm uppercase tracking-widest hover:bg-white hover:text-[#E61919] transition-colors border border-[#E61919]"
              >
                [ CONNECT_GITHUB ]
              </a>
              <Link
                href="/login"
                className="border border-[#333333] px-8 py-4 font-mono text-sm uppercase tracking-widest text-[#A0A0A0] hover:text-white hover:border-white transition-colors"
              >
                SYS.MANUAL ///
              </Link>
            </div>
          </div>

          {/* Right Column: Empty Space for Balance */}
          <div className="relative z-10 lg:col-span-4 flex flex-col pointer-events-none" />
        </section>


      </main>
    </div>
  );
}
