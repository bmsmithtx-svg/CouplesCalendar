import { projectMetadata } from '../lib/projectMetadata';

export function FoundationStatus() {
  return (
    <section className="foundation-panel" aria-labelledby="foundation-title">
      <p className="foundation-eyebrow">{projectMetadata.phase}</p>
      <h1 id="foundation-title">{projectMetadata.name}</h1>
      <p>{projectMetadata.description}</p>
      <p className="foundation-status">Workspace foundation is operational.</p>
    </section>
  );
}
