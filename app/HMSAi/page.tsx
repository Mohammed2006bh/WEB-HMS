import SBody from '../components/SBody';


export default function Home() {
  return (
    <>
<SBody>
    
      <main className="max-w-3xl mx-auto p-8">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">HMSAi</h2>
        </section>

        <section>
          <p className="mb-4">
            HMSAi is a web app that allows users to upload images and get answered questions. 
          </p>
        </section>

        <section>
          <p className="mb-4">
            its not operational yet 🧘🏼 Bro calm down<br />
            type a qustion and get an answer. 
          </p>


            <input type="text" placeholder="type a question" className="border border-gray-300 rounded-md p-2 w-full mb-4" />
        </section>




      </main>
      </SBody>
    </>
  );
}