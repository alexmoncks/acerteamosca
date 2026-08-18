// kungfu-scenery-lib.js — regras puras do cenário. ZERO imports.
//
// Existe separado de kungfu-scenery.js porque aquele importa os JSON das fases
// com o alias `@/`, e o Node dos testes não resolve nem o alias nem o
// `with { type: "json" }` sem "type": "module" no package.json — que quebraria
// o build do Next. Os testes entram por aqui; o webpack carrega o outro.

/** Camadas de rolagem, e a velocidade com que cada uma passa. */
export const LAYERS = {
  bg: 0.15,
  mid: 0.5,
  game: 1,
  fg: 1,
};

/**
 * Âncoras verticais. O nome carrega a regra inteira: de onde se mede, e qual
 * ponto do sprite encosta ali.
 *
 * `chao` é a convenção dos props: âncora no pé (0.5, 1), y positivo AFUNDA o
 * elemento abaixo da linha do chão. `topo` e `horizonte` são as das faixas:
 * âncora no canto (0, 0).
 *
 * Antes havia uma quarta, `ground-overlap`, com fórmula própria — só que
 * `GROUND_Y - 10 - h + 28` e `GROUND_Y - h + 18` são a mesma conta. Duas
 * âncoras para um comportamento, agora uma.
 */
export const ANCHORS = ["chao", "topo", "horizonte"];

/**
 * Onde o topo do sprite fica, em pixels, para uma âncora.
 *
 * @param {string} anchor  uma de ANCHORS
 * @param {number} offset  o `y` declarado no elemento
 * @param {number} height  altura do sprite já escalado
 * @param {number} groundY linha do chão
 */
export function resolveY(anchor, offset, height, groundY) {
  if (anchor === "topo") return offset;
  if (anchor === "horizonte") return groundY + 18 - height + offset;
  return groundY + offset; // "chao" — a âncora do sprite já está no pé
}

/** O ponto do sprite que a âncora posiciona. */
export function anchorPoint(anchor) {
  return anchor === "chao" ? { x: 0.5, y: 1 } : { x: 0, y: 0 };
}

/**
 * As posições x em que um elemento é desenhado.
 *
 * Sem `repeat`, é uma só. Com `repeat.every: "auto"` o passo é a largura do
 * próprio sprite, que é o que faz uma faixa emendar sem costura. Duas
 * repetições além da borda do nível para a rolagem não mostrar o fim.
 */
export function positionsFor(el, spriteWidth, levelWidth) {
  const every = el.repeat?.every;
  if (every === undefined) return [el.x ?? 0];
  const step = every === "auto" ? spriteWidth : every;
  if (!(step > 0)) return [el.x ?? 0];
  const out = [];
  for (let x = el.x ?? 0; x < levelWidth + step * 2; x += step) out.push(x);
  return out;
}

/** "#06061a" -> 0x06061a. O JSON guarda hex legível; o PixiJS quer número. */
export function parseColor(value) {
  if (typeof value === "number") return value;
  return Number.parseInt(String(value).replace("#", ""), 16);
}

/** Céu com as cores já em número, pronto para o Graphics. */
export function hydrateSky(sky) {
  const out = { ...sky };
  for (const k of ["color", "from", "to"]) {
    if (out[k] !== undefined) out[k] = parseColor(out[k]);
  }
  return out;
}

/** Uma fase do JSON, pronta para o jogo. */
export function hydrate(fase) {
  return { ...fase, sky: hydrateSky(fase.sky) };
}

/**
 * A textura que um elemento realmente desenha.
 *
 * Props com animação (tocha, braseiro, lanternas) são carregados como uma TIRA
 * horizontal: `props["tocha-fogo"]` tem os nove quadros lado a lado, e o que se
 * desenha é `propAnims["tocha-fogo"].frames[0]`. Quem ler o mapa de props direto
 * mede a tira inteira — foi assim que a alça de seleção do editor saiu nove
 * vezes mais larga que a tocha. Renderizador e editor passam os dois por aqui
 * para não poderem divergir de novo.
 */
export function textureFor(scenery, asset) {
  const anim = scenery.propAnims?.[asset];
  return anim ? anim.frames[0] : scenery.props?.[asset];
}

/** O inverso de hydrate: devolve as cores para hex legível, como o JSON guarda. */
export function dehydrate(fase) {
  const sky = { ...fase.sky };
  for (const k of ["color", "from", "to"]) {
    if (typeof sky[k] === "number") sky[k] = "#" + sky[k].toString(16).padStart(6, "0");
  }
  return { ...fase, sky };
}

/** Caminho público de um asset de cenário. */
export const propPath = (name) => `/images/kungfucastle/props/${name}.png`;

/** Caminho público de um tileset. */
export const tilesetPath = (name) => `/images/kungfucastle/tiles/${name}.png`;

/**
 * Todo caminho público que os cenários precisam, sem repetição.
 * @param {object[]} fases
 */
export function sceneryAssetPathsFor(fases) {
  const set = new Set();
  for (const fase of fases) {
    set.add(tilesetPath(fase.tileset));
    for (const el of fase.elements) set.add(propPath(el.asset));
  }
  return [...set];
}

/** Nomes de tileset usados por alguma fase. */
export function sceneryTilesetNamesFor(fases) {
  return [...new Set(fases.map((f) => f.tileset))];
}

/**
 * Confere a forma de uma fase antes de gravar. Devolve a lista de problemas —
 * vazia quer dizer válida.
 *
 * A rota de gravação depende disto: um JSON malformado escrito no disco quebra
 * o jogo inteiro no próximo carregamento, e o erro aparece longe da causa.
 *
 * @param {object} fase
 * @param {(asset: string) => boolean} assetExists
 */
export function validatePhase(fase, assetExists = () => true) {
  const erros = [];
  const push = (m) => erros.push(m);

  if (!fase || typeof fase !== "object") return ["fase não é um objeto"];
  if (!Number.isFinite(fase.levelWidth) || fase.levelWidth <= 0) push("levelWidth inválido");
  if (typeof fase.tileset !== "string" || !fase.tileset) push("tileset ausente");

  const sky = fase.sky;
  if (!sky || typeof sky !== "object") push("sky ausente");
  else if (sky.type === "starfield") {
    if (sky.color === undefined) push("sky.color ausente");
    if (!Number.isFinite(sky.stars)) push("sky.stars inválido");
  } else if (sky.type === "gradient") {
    if (sky.from === undefined || sky.to === undefined) push("sky.from/to ausentes");
  } else push(`sky.type desconhecido: ${sky.type}`);

  if (!Array.isArray(fase.elements)) return [...erros, "elements não é uma lista"];

  fase.elements.forEach((el, i) => {
    const onde = `elements[${i}]`;
    if (typeof el.asset !== "string" || !el.asset) push(`${onde}.asset ausente`);
    else if (!assetExists(el.asset)) push(`${onde}.asset "${el.asset}" não existe no disco`);
    if (!(el.layer in LAYERS)) push(`${onde}.layer inválido: ${el.layer}`);
    if (!ANCHORS.includes(el.anchor)) push(`${onde}.anchor inválido: ${el.anchor}`);
    if (!Number.isFinite(el.y)) push(`${onde}.y não é número`);
    if (el.x !== undefined && !Number.isFinite(el.x)) push(`${onde}.x não é número`);
    if (el.repeat !== undefined) {
      const every = el.repeat.every;
      const ok = every === "auto" || (Number.isFinite(every) && every > 0);
      if (!ok) push(`${onde}.repeat.every inválido: ${every}`);
    }
    for (const k of ["scale", "alpha"]) {
      if (el[k] !== undefined && !Number.isFinite(el[k])) push(`${onde}.${k} não é número`);
    }
  });

  return erros;
}
