// A file that imports nothing is a script, whose declarations every other spec would see.
export {};

/**
 * A spec runs in Node, from the root of the repository, and the console's types hold nothing of
 * Node: the two functions the sources are read with are declared here.
 */
declare const process: {
  getBuiltinModule(name: 'node:fs'): {
    readdirSync(path: string, options: { recursive: true }): string[];
    readFileSync(path: string, encoding: 'utf8'): string;
  };
};

const { readdirSync, readFileSync } = process.getBuiltinModule('node:fs');

const SOURCE_ROOT = 'src/app';

interface Source {
  file: string;
  text: string;
}

/** The code and the templates of one folder of the app, specs left out. */
const sources = (folder: string): Source[] =>
  readdirSync(`${SOURCE_ROOT}/${folder}`, { recursive: true })
    .filter((file) => /\.(ts|html)$/.test(file) && !file.endsWith('.spec.ts'))
    .map((file) => ({
      file: `${folder}/${file}`,
      text: readFileSync(`${SOURCE_ROOT}/${folder}/${file}`, 'utf8'),
    }));

const mentioning = (among: Source[], pattern: RegExp): string[] =>
  among.filter(({ text }) => pattern.test(text)).map(({ file }) => file);

/**
 * The files of core that name a route: the API files, the session, the request a moderation
 * decision builds, and the types, whose comments say which route answers each.
 */
const ROUTE_HOLDERS = /^core\/(?:.+\.api|auth\.store|moderation-format|types)\.ts$/;

const core = sources('core');
const charts = sources('charts');
const kit = sources('ui');
const pages = sources('features');

describe('the layers', () => {
  it('finds the sources it reads', () => {
    for (const layer of [core, charts, kit, pages]) {
      expect(layer).not.toEqual([]);
    }
  });

  // A route written in a page is one more place to find when the contract moves, and a page that
  // holds `ApiService` types an answer by itself.
  it('keep the routes of the backend and the service that calls them in core', () => {
    const above = [...charts, ...kit, ...pages];

    expect(mentioning(above, /['"`]\/admin\//)).toEqual([]);
    expect(mentioning(core, /['"`]\/admin\//).filter((file) => !ROUTE_HOLDERS.test(file))).toEqual(
      [],
    );
    expect(mentioning(above, /from '[^']*\/api\.service'/)).toEqual([]);
    expect(
      mentioning(core, /from '[^']*\/api\.service'/).filter((file) => !file.endsWith('.api.ts')),
    ).toEqual([]);
  });

  // What two pages share belongs to core, the charts or the kit, where a third page finds it.
  it('keep every page out of what another page imports', () => {
    expect(mentioning(pages, /from '\.\.\/(?!\.\.\/)/)).toEqual([]);
    expect(mentioning(pages, /from '[^']*\/features\//)).toEqual([]);
    expect(mentioning([...core, ...charts, ...kit], /from '[^']*\/features\//)).toEqual([]);
  });

  // Core says what the data is, never how it is drawn: it takes types from above and no code.
  it('keep the kit and the charts out of what core runs', () => {
    expect(mentioning(core, /^import (?!type\b)[^;]*?from '\.\.\/(?:ui|charts)\//m)).toEqual([]);
  });
});

describe('the production CSP', () => {
  const policy = /Content-Security-Policy "([^"]*)"/.exec(
    readFileSync('nginx/security-headers.conf', 'utf8'),
  );
  const directives = new Map(
    (policy?.[1] ?? '').split(';').map((directive) => {
      const [name = '', ...values] = directive.trim().split(/\s+/);
      return [name, values];
    }),
  );

  /** The directive that decides whether an element may load what it is given. */
  const LOADED_UNDER: Record<string, string> = {
    img: 'img-src',
    video: 'media-src',
    audio: 'media-src',
    iframe: 'frame-src',
  };

  // Nothing the backend serves the console is public: an image or a clip is fetched with the
  // bearer and shown through an object URL, which the policy refuses unless it says `blob:`.
  it('lets every element a template draws load an object URL', () => {
    const templates = [...kit, ...pages];
    const refused = Object.entries(LOADED_UNDER)
      .filter(([element]) => mentioning(templates, new RegExp(`<${element}\\b`)).length > 0)
      .filter(([, directive]) => !directives.get(directive)?.includes('blob:'))
      .map(([element, directive]) => `<${element}> needs ${directive} to allow blob:`);

    expect(directives.get('default-src')).toEqual(["'self'"]);
    expect(refused).toEqual([]);
  });
});
