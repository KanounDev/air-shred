interface PoseTile {
  label: string;
  imageSrc?: string;
}

const LEFT_POSES: PoseTile[] = [
  { label: 'E3' },
  { label: 'G#3' },
  { label: 'C4' },
  { label: 'A4' },
  { label: 'G#3' },
  { label: 'C4' },
  { label: 'E3' },
  { label: 'D#3' },
  { label: 'C4' },
  { label: 'E3' },
  { label: 'G#3' },
  { label: 'A4' },
];

const RIGHT_POSES: PoseTile[] = [
  { label: 'E3' },
  { label: 'G#3' },
  { label: 'C4' },
  { label: 'A4' },
];

export function TutorialPage() {
  return (
    <section className="tutorial-page">
      <div className="tutorial-panels">
        <section className="tutorial-hand-panel">
          <div className="tutorial-panel-header">
            <h2>Left hand</h2>
            <span>12 notes</span>
          </div>
          <div className="tutorial-pose-grid left-hand">
            {LEFT_POSES.map((pose) => (
              <article key={pose.label} className="tutorial-pose-card">
                <div className="tutorial-pose-frame">
                  {pose.imageSrc ? (
                    <img
                      className="tutorial-pose-image"
                      src={pose.imageSrc}
                      alt={`Left hand pose ${pose.label}`}
                    />
                  ) : (
                    <div className="tutorial-pose-placeholder" aria-hidden="true" />
                  )}
                </div>
                <p className="tutorial-pose-label">{pose.label}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="tutorial-hand-panel">
          <div className="tutorial-panel-header">
            <h2>Right hand</h2>
            <span>4 octaves</span>
          </div>
          <div className="tutorial-pose-grid right-hand">
            {RIGHT_POSES.map((pose) => (
              <article key={pose.label} className="tutorial-pose-card">
                <div className="tutorial-pose-frame">
                  {pose.imageSrc ? (
                    <img
                      className="tutorial-pose-image"
                      src={pose.imageSrc}
                      alt={`Right hand pose ${pose.label}`}
                    />
                  ) : (
                    <div className="tutorial-pose-placeholder" aria-hidden="true" />
                  )}
                </div>
                <p className="tutorial-pose-label">{pose.label}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
