/** Renders lesson text: paragraphs, **bold** and `code`, without HTML injection. */
import type { ComponentChildren } from 'preact';

function inline(text: string): ComponentChildren[] {
  const out: ComponentChildren[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    out.push(tok.startsWith('**') ? <strong key={i++}>{tok.slice(2, -2)}</strong> : <code key={i++}>{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\n+/).map((para, i) => {
        // A block whose lines all start with "- " is a list.
        const lines = para.split('\n');
        if (lines.every((l) => l.startsWith('- '))) {
          return (
            <ul key={i} class="rich-list">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{inline(para)}</p>;
      })}
    </>
  );
}

export { inline as richInline };
