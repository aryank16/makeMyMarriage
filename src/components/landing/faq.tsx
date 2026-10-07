const QUESTIONS = [
  {
    q: 'Do guests need to create an account?',
    a: 'No. Never. They get a link, they open it, they reply.',
  },
  {
    q: 'Can my family help manage it?',
    a: 'Yes. Everyone sees the same guest list, tasks and expenses.',
  },
  {
    q: 'Who can see our photos?',
    a: 'Only people with the gallery link. It isn’t listed anywhere or indexed by search engines.',
  },
  {
    q: 'We haven’t fixed the date yet.',
    a: 'That’s fine. Add your functions now and fill in dates later.',
  },
  {
    q: 'Is this for wedding planners?',
    a: 'No. It’s built for one wedding — yours.',
  },
  {
    q: 'What happens to our data afterwards?',
    a: 'It stays. Download everything or delete all of it, whenever you want.',
  },
];

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-[72px]">
      <div className="max-w-[1200px] mx-auto px-6 py-24">
        <h2 className="h2-title text-ink mb-14">Questions</h2>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          {QUESTIONS.map((item) => (
            <div key={item.q} className="border-t border-line py-7">
              <dt className="h3-title text-ink mb-2.5">{item.q}</dt>
              <dd className="body-default">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
