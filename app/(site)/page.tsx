import SBody from "@/app/components/SBody";
import TypingText from "@/app/components/TypingText";

export default function Home() {
  return (
    <>

      {/* Hero / Typed text */}
      <section className="text-center mt-16">
        <h1 className="text-5xl font-bold">
          I am <TypingText />
        </h1>
        <h3 className="text-blue-400">↣ Software Engineer ↢</h3>

        <p className="mt-6 max-w-xl mx-auto text-gray-400">
          This is my personal website and portfolio, rebuilt using
          Next.js, React, and modern web technologies.
        </p>
      </section>


      <SBody>
        <div className="max-w-3xl mx-auto p-8">
          <a
            href="/watch-party"
            className="group block rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, rgba(76,175,80,0.15), rgba(76,175,80,0.05))",
              border: "1px solid rgba(76,175,80,0.25)",
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#4CAF50]/20 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-[#4CAF50]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-white group-hover:text-[#4CAF50] transition-colors">
                  M-Party
                </h3>
                <p className="text-sm text-gray-400">
                  Just stop the yapping and get in — create a room and enjoy synced content with friends 😏
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-500 group-hover:text-[#4CAF50] group-hover:translate-x-1 transition-all ml-auto shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </a>
        </div>
      </SBody>


      {/* Main content */}

      <SBody>
      <main className="max-w-3xl mx-auto p-8">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Keep up with Bro latest things</h2>
        </section>

        <section className="mb-8">
          <h3 className="text-lg font-semibold mb-2">here is my channel</h3>

          <div className="aspect-video">
            <iframe
              className="w-full h-full rounded"
              src="https://www.youtube.com/embed/e8gaSt2THF8"
              allowFullScreen
            />
          </div>
        </section>
      </main>
      </SBody>





      <SBody>
      <main className="max-w-3xl mx-auto p-8">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Projects</h2>
        </section>

        <section>
          <p className="mb-4">
            Check out my latest projects on{" "}
            <a
              href="https://github.com/Mohammed2006bh"
              target="_blank"
              className="text-red-500 underline"
            >
              GitHub
            </a>
            <br />
            still working on it i didnt put any projects yet
          </p>
        </section>
      </main>
      </SBody>
    </>
  );
}