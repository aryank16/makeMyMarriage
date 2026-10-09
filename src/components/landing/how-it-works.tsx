const STEPS = [
  {
    number: '01',
    title: 'Add your functions',
    body: 'Mehendi, haldi, sangeet, the wedding, reception. Whatever you’re actually having.',
  },
  {
    number: '02',
    title: 'Add your guests',
    body: 'Tick which functions each one is invited to. The office comes to the reception. Your cousins come to everything.',
  },
  {
    number: '03',
    title: 'Share one link',
    body: 'Every guest gets their own. They open it, see what they’re invited to, and reply.',
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-[72px] border-t border-line bg-bone-deep"
    >
      <div className="max-w-[1200px] mx-auto px-6 py-24">
        <h2 className="h2-title text-ink mb-14 max-w-[620px]">
          Three steps. About three minutes.
        </h2>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {STEPS.map((step) => (
            <li key={step.number}>
              <div className="numeral text-[40px] leading-none mb-4">
                {step.number}
              </div>
              <h3 className="h3-title text-ink mb-3">{step.title}</h3>
              <p className="body-default">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
