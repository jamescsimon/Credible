/* The eight answer choices. Intent-based labels (mis/dis/malinformation) are deliberately excluded. */
window.Credible.categories = [
  { id: 'satire',        name: 'Satire or parody',        icon: '\u{1F921}', def: 'Humor or parody with no intent to cause harm, but it could fool someone who takes it literally.' },
  { id: 'false-connection', name: 'False connection',     icon: '\u{1F517}', def: 'Headlines, visuals or captions that do not support what the content actually shows.' },
  { id: 'misleading',    name: 'Misleading content',      icon: '\u{1F9E9}', def: 'Real information framed deceptively, such as selective quotes, cropped data or slanted presentation.' },
  { id: 'false-context', name: 'False context',           icon: '\u{1F5D3}', def: 'Genuine content shared with false contextual information, such as the wrong date, place or event.' },
  { id: 'imposter',      name: 'Imposter content',        icon: '\u{1F3AD}', def: 'Content that impersonates genuine sources, people or organizations.' },
  { id: 'manipulated',   name: 'Manipulated content',     icon: '\u{1F58C}', def: 'Genuine content that has been altered or edited to deceive, such as a doctored photo or video.' },
  { id: 'fabricated',    name: 'Fabricated content',      icon: '\u{1F9EA}', def: 'Content that is completely made up and designed to deceive or do harm.' },
  { id: 'none',          name: 'No information disorder identified', icon: '✅', def: 'The post is accurately presented. Its claim, media and context hold up under checking.' }
];
