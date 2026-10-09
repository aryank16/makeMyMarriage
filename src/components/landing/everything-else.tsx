const FEATURES = [
  {
    title: 'Tasks',
    body: 'A shared checklist, so “who’s booking the pandit” has an answer.',
  },
  {
    title: 'Expenses',
    body: 'Log what you spend as you spend it. Not a budgeting spreadsheet.',
  },
  {
    title: 'Vendors',
    body: 'Photographer, caterer, decorator, pandit. Every number in one place.',
  },
  {
    title: 'Wedding website',
    body: 'Your schedule, venues and directions on a page you can share.',
  },
  {
    title: 'Live stream',
    body: 'Paste a YouTube link. Relatives abroad can watch.',
  },
  {
    title: 'Organizers',
    body: 'Add your parents, your sister, whoever’s helping.',
  },
];

export default function EverythingElse() {
  return (
    <section id="features" className="scroll-mt-[72px]">
      <div className="max-w-[1200px] mx-auto px-6 py-24">
        <h2 className="h2-title text-ink mb-14">And the rest of it.</h2>

        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="border-standard card-radius p-7 bg-surface"
            >
              <h3 className="h3-title text-ink mb-3">{feature.title}</h3>
              <p className="body-default">{feature.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
