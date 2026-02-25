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