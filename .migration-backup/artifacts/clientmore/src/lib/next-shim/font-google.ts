type FontOpts = { variable?: string; subsets?: string[]; weight?: string | string[] };
type FontResult = { variable: string; className: string; style: { fontFamily: string } };

function makeFont(name: string) {
  return (opts: FontOpts = {}): FontResult => ({
    variable: opts.variable ?? "",
    className: "",
    style: { fontFamily: name },
  });
}

export const Inter = makeFont("Inter");
export const Cairo = makeFont("Cairo");
export const Outfit = makeFont("Outfit");
export const Roboto = makeFont("Roboto");
export const Geist = makeFont("Geist");
export const Geist_Mono = makeFont("Geist Mono");
