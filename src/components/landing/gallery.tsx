/* Decorative QR. It encodes nothing and is not scannable — it stands in for the
 * printed table card in the artwork. If this ever needs to be a real code it
 * has to be generated from the gallery URL, not hand-drawn. */
function DecorativeQr() {
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="21" height="21" fill="#1A1613" />
      <rect x={x + 3} y={y + 3} width="15" height="15" fill="#FFFFFF" />
      <rect x={x + 6} y={y + 6} width="9" height="9" fill="#1A1613" />
    </g>
  );

  // A fixed pattern, so the artwork does not change between renders.
  const modules = [
    [27, 6], [33, 6], [45, 6], [27, 12], [39, 12], [51, 12],
    [33, 18], [45, 18], [6, 27], [12, 27], [24, 27], [36, 27],
    [48, 27], [60, 27], [18, 33], [30, 33], [42, 33], [54, 33],
    [6, 39], [24, 39], [36, 39], [60, 39], [12, 45], [30, 45],
    [48, 45], [54, 45], [27, 51], [39, 51], [57, 51], [33, 57],
    [45, 57], [57, 63], [27, 63], [39, 69], [51, 69], [63, 51],
  ];

  return (
    <svg
      viewBox="0 0 75 75"
      className="w-full h-full"
      role="img"
      aria-label="Decorative QR code"
    >
      <rect width="75" height="75" fill="#FFFFFF" />
      {finder(3, 3)}
      {finder(51, 3)}
      {finder(3, 51)}
      {modules.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="6"
          height="6"
          fill="#1A1613"
        />
      ))}
    </svg>
  );
}

const ALBUMS = [
  { name: 'Mehendi', count: 84, active: false },
  { name: 'Haldi', count: 112, active: false },
  { name: 'Wedding', count: 240, active: true },
  { name: 'Reception', count: 318, active: false },
];

const PHOTOS = [
  { file: 'IMG_2041.RAW', by: 'Simran K.' },
  { file: 'IMG_2042.RAW', by: 'Ankit R.' },
  { file: 'IMG_2043.RAW', by: 'Chachi Ji' },
  { file: 'IMG_2044.RAW', by: 'Rahul P.' },
  { file: 'IMG_2045.RAW', by: 'Preeti M.' },
  { file: 'IMG_2046.RAW', by: 'Karan S.' },
  { file: 'IMG_2047.RAW', by: 'Rohit (Groom)' },
  { file: 'IMG_2048.RAW', by: 'Vikram G.' },
];

export default function Gallery() {
  return (
    <section className="bg-emerald text-bone">
      <div className="max-w-[1200px] mx-auto px-6 py-24">
        <div className="max-w-[760px] mb-14">
          <div className="text-[13px] uppercase tracking-[0.08em] font-medium text-bone/60 mb-4">
            Shared photo gallery
          </div>
          <h2 className="h2-title mb-6">
            Every photo, from every function, in one place.
          </h2>
          <p className="text-[19px] leading-[1.6] text-bone/75">
            Right now your wedding photos are on two hundred phones, in a group
            chat that compressed them into mush. Put a QR code on the tables.
            Guests scan it and upload straight from their camera roll.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3">
            <div className="bg-bone text-ink rounded-[14px] p-5">
              <div className="aspect-square w-full mb-4">
                <DecorativeQr />
              </div>
              <div className="text-[15px] font-medium mb-1">
                Table QR Printout
              </div>
              <div className="text-[13px] text-ink-muted">Scan to add photos</div>
              <div className="text-[13px] text-ink-muted">No login required</div>
            </div>
          </div>

          <div className="lg:col-span-9">
            <div className="flex flex-wrap gap-2 mb-5">
              {ALBUMS.map((album) => (
                <span
                  key={album.name}
                  className={`text-[13px] px-3 py-1.5 rounded-md border ${
                    album.active
                      ? 'bg-bone/15 border-bone/30 text-bone'
                      : 'border-bone/20 text-bone/70'
                  }`}
                >
                  {album.name} ({album.count})
                </span>
              ))}
            </div>

            <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {PHOTOS.map((photo) => (
                <li
                  key={photo.file}
                  className="rounded-[10px] border border-bone/15 bg-bone/5 overflow-hidden"
                >
                  <div className="aspect-[4/3] bg-bone/10" />
                  <div className="px-3 py-2.5">
                    <div className="text-[12px] font-mono text-bone/90 truncate">
                      {photo.file}
                    </div>
                    <div className="text-[12px] text-bone/55 truncate">
                      Uploaded by {photo.by}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
