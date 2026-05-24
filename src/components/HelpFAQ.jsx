import useStore from '../store';

const FAQ_SECTIONS = [
  {
    title: 'Getting Started',
    items: [
      {
        q: 'How do I transcribe music?',
        a: 'You have three options: Upload an audio file (MP3, WAV, etc.), sing/play live using your microphone, or compose manually using the swara palette. Switch between modes using the tabs at the bottom.',
      },
      {
        q: 'What is "Sa" / Key?',
        a: 'Sa is the tonic note — the home note of your melody. Set it to match the pitch you sing Sa at. You can tap "Key (Sa)" in the config bar and either pick a note manually or sing Sa and let EzSwara detect it automatically.',
      },
      {
        q: 'How do I select a Raga?',
        a: 'Tap the Scale/Raga dropdown in the config strip. Choosing a raga helps the app filter out notes that don\'t belong to your scale, improving accuracy. Choose "Custom" if your raga isn\'t listed.',
      },
    ],
  },
  {
    title: 'Rhythm & Tala',
    items: [
      {
        q: 'What does "Rhythm/Tala" do?',
        a: 'When you select a metered tala (e.g., Adi 8 beats), the metronome activates and detected notes align to beat positions. This creates a structured notation grid. Use "Unmetered" for free-form (Alapana) where timing doesn\'t follow a beat cycle.',
      },
      {
        q: 'How does the metronome work?',
        a: 'Press the play button (▶) in the metronome strip. It will click on each beat. The red dot indicates Sam (beat 1), section starts are slightly accented. Adjust BPM in Settings to change the tempo.',
      },
      {
        q: 'Why are there empty beats in my notation?',
        a: 'When using a metered tala, notes align to their beat position. If you start singing at beat 3, beats 1 and 2 will be empty — this is correct musical notation showing the rhythm accurately.',
      },
    ],
  },
  {
    title: 'Editing Notes',
    items: [
      {
        q: 'How do I edit notes after recording?',
        a: 'Click/tap any note to select it. Then use:\n• Delete/Backspace — remove the note\n• Arrow keys (← →) — navigate between notes\n• Cmd+Z / Ctrl+Z — undo\n• Cmd+Shift+Z / Ctrl+Y — redo\n• Escape — deselect',
      },
      {
        q: 'How do I select multiple notes?',
        a: 'Drag across notes to select a range, or click one note then Shift+click another to select everything between them. Selected notes glow with an accent highlight and a toolbar appears with group actions.',
      },
      {
        q: 'What does "Same Speed" do?',
        a: 'Sets all selected notes to the same duration (the shortest/fastest note in the selection). Use this when you want a group of notes to be rendered at equal speed — for example, turning a mix of slow and fast notes into a uniform rapid passage.',
      },
      {
        q: 'What does "Group" do?',
        a: 'Visually groups selected notes together. Grouped notes get extra spacing before and after them to stand apart from surrounding notes. If there are underline beams (connecting fast notes), they are split at group boundaries so the group\'s beam stays separate. Use this to mark musical phrases or patterns.',
      },
      {
        q: 'What does "Merge" do?',
        a: 'Combines multiple selected notes into a single note. The merged note\'s duration equals the sum of all selected notes. You can choose to keep the first note\'s name, pick a standard swara from a list, or type any custom name. Use this to fix pitch detection errors where one sustained note was incorrectly split into several.',
      },
      {
        q: 'Can I clear all notes and start over?',
        a: 'Yes — tap the "Clear" button in the config strip at the top. This removes all detected notes so you can re-record or re-upload.',
      },
    ],
  },
  {
    title: 'Advanced Settings Explained',
    items: [
      {
        q: 'What does "Min Stability" do?',
        a: 'Controls how many consecutive frames must agree on a pitch before it\'s accepted as a note (for file uploads). Higher = fewer false notes but may miss quick ornaments. Lower = catches more detail but more noise. Default: 3 frames.',
      },
      {
        q: 'What does "Confidence" threshold do?',
        a: 'Sets how certain the app must be about a detected pitch. Higher values (60-80%) only show notes the app is very sure about. Lower (10-30%) shows more notes including uncertain ones (shown in italic). Good for noisy recordings.',
      },
      {
        q: 'What is "Min Note" duration?',
        a: 'The shortest note duration accepted during live recording (in milliseconds). Increase if you\'re getting spurious short notes from background noise. Decrease if you want to capture fast gamakas/ornaments. Default: 80ms.',
      },
      {
        q: 'What is "Silence Gap"?',
        a: 'How long a silence must last before the app considers the current note ended (live mode). Shorter gaps capture staccato phrases. Longer gaps connect sustained notes that have brief dips. Default: 150ms.',
      },
      {
        q: 'Which Pitch Engine should I use?',
        a: '• YIN — Best for voice, handles vibrato well. Recommended default.\n• McLeod (MPM) — Good for instruments with clear harmonics.\n• Autocorrelation — Lightweight, works well for simple signals.\n\nLeave on "Auto" execution mode unless you experience glitches.',
      },
    ],
  },
  {
    title: 'Configuration Tips',
    items: [
      {
        q: 'Best settings for vocal recording?',
        a: 'Use YIN engine, confidence 30-40%, min stability 3, min note 80ms. Set your Sa accurately (use auto-detect). Choose your raga if known — it significantly improves accuracy.',
      },
      {
        q: 'Best settings for instrument (veena, flute)?',
        a: 'Try McLeod (MPM) engine. For veena, lower the min note to 50ms to capture gamakas. For flute, increase confidence to 50% to reduce breath noise detection.',
      },
      {
        q: 'Recording sounds noisy/too many wrong notes?',
        a: 'Increase confidence threshold (try 50-60%). Increase min stability to 4-5. Make sure your Sa is set correctly — wrong tonic causes all notes to be off. Record in a quiet environment.',
      },
      {
        q: 'Missing fast ornaments (gamakas)?',
        a: 'Decrease min note duration to 40-60ms. Lower min stability to 2. Lower confidence to 20-30%. This captures more detail but may include some noise.',
      },
    ],
  },
  {
    title: 'Export & Sharing',
    items: [
      {
        q: 'How do I save my notation?',
        a: 'Tap the "Export" button below the recording controls. You can save as plain text (for sharing/copying) or as PDF (for printing). Use "More formats" for additional options.',
      },
      {
        q: 'Can I share my notation with others?',
        a: 'Export as text and share via messaging, email, or notes. The text format includes swara sequence, timing, raga, and tala information.',
      },
    ],
  },
];

export default function HelpFAQ() {
  const showHelp = useStore((s) => s.showHelp);
  const toggleHelp = useStore((s) => s.toggleHelp);

  if (!showHelp) return null;

  return (
    <div className="help-overlay" onClick={(e) => { if (e.target === e.currentTarget) toggleHelp(); }}>
      <div className="help-panel">
        <div className="help-header">
          <h2 className="help-title">Help & FAQ</h2>
          <button className="help-close" onClick={toggleHelp}>&times;</button>
        </div>

        <div className="help-content">
          {FAQ_SECTIONS.map((section, si) => (
            <div key={si} className="help-section">
              <h3 className="help-section-title">{section.title}</h3>
              {section.items.map((item, qi) => (
                <details key={qi} className="help-item">
                  <summary className="help-question">{item.q}</summary>
                  <div className="help-answer">
                    {item.a.split('\n').map((line, li) => (
                      <p key={li}>{line}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          ))}

          <div className="help-section">
            <h3 className="help-section-title">Keyboard Shortcuts</h3>
            <div className="help-shortcuts">
              <div className="shortcut-row"><kbd>Delete</kbd> / <kbd>Backspace</kbd><span>Delete selected note(s)</span></div>
              <div className="shortcut-row"><kbd>←</kbd> <kbd>→</kbd><span>Navigate notes</span></div>
              <div className="shortcut-row"><kbd>Shift</kbd>+<kbd>Click</kbd><span>Select range</span></div>
              <div className="shortcut-row"><kbd>Drag</kbd><span>Select multiple notes</span></div>
              <div className="shortcut-row"><kbd>Cmd/Ctrl</kbd>+<kbd>Z</kbd><span>Undo</span></div>
              <div className="shortcut-row"><kbd>Cmd/Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd><span>Redo</span></div>
              <div className="shortcut-row"><kbd>Esc</kbd><span>Deselect / cancel</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
