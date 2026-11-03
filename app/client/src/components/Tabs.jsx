// Tabs linked to the URL: `base` is the section hash (e.g. "#/profile").
export default function Tabs({ base, items, active }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((it) => (
        <a key={it.id} role="tab" aria-selected={it.id === active}
          className={it.id === active ? 'active' : ''} href={`${base}/${encodeURIComponent(it.id)}`}>
          {it.title}
          {it.mark && <span className="tab-mark" title={it.mark}>•</span>}
        </a>
      ))}
    </div>
  );
}
