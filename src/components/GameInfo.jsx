export default function GameInfo({ content, locale }) {
  const c = locale === "en" ? content.en : content.pt;

  return (
    <aside style={asideStyle}>
      <h2 style={h2Style}>{c.title}</h2>
      <p style={introStyle}>{c.intro}</p>
      {c.details.map((d, i) => (
        <details key={i} style={detailsStyle}>
          <summary style={summaryStyle}>{d.summary}</summary>
          <div style={bodyStyle}>
            {d.body.map((para, j) => (
              <p key={j} style={paraStyle}>
                {para}
              </p>
            ))}
          </div>
        </details>
      ))}
    </aside>
  );
}

const asideStyle = {
  maxWidth: 800,
  margin: "40px auto 0",
  padding: "0 20px",
  color: "#ccd6f6",
  fontFamily: "'Fira Code', monospace",
  lineHeight: 1.7,
};

const h2Style = {
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 14,
  color: "#00f0ff",
  textShadow: "0 0 8px rgba(0,240,255,0.3)",
  marginBottom: 12,
  letterSpacing: 0.5,
};

const introStyle = {
  fontSize: 13,
  color: "#ccd6f6",
  marginBottom: 24,
};

const detailsStyle = {
  marginBottom: 12,
  background: "rgba(0,240,255,0.04)",
  borderLeft: "2px solid rgba(0,240,255,0.4)",
  borderRadius: 4,
  overflow: "hidden",
};

const summaryStyle = {
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 11,
  color: "#00f0ff",
  padding: "12px 16px",
  cursor: "pointer",
  letterSpacing: 0.5,
  userSelect: "none",
};

const bodyStyle = {
  padding: "4px 16px 14px",
};

const paraStyle = {
  fontSize: 12,
  color: "#8892b0",
  marginBottom: 10,
};
