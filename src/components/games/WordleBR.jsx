"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";
import useLockScroll from "@/hooks/useLockScroll";

const GAME_W = 400;
const GAME_H = 550;

let ANSWERS_PT = [
  "GATOS","MUNDO","FESTA","PRAIA","LIVRO","CARRO","PLANO","VERDE","TIGRE","NUVEM",
  "PEDRA","FOLHA","PONTO","TERMO","MUSEU","CAMPO","PORTA","NOITE","FONTE","BRAVO",
  "RITMO","SINAL","BAIXO","NEGRO","CORPO","FRACO","GRADE","LENTO","METRO","NOSSO",
  "PALCO","RADIO","SANTO","TROCA","VENTO","NOBRE","MARCO","PROVA","SORTE","GERAL",
  "MORAL","TOTAL","APOIO","CHAVE","DENSO","ELITE","FIRME","HUMOR","JOVEM","LEGAL",
  "MEDIR","NARIZ","OPERA","PODER","RIGOR","SOLAR","TUMOR","USUAL","VIGOR","TRIGO",
  "BARCO","LEITE","CLARO","CAUSA","SETOR","GRUPO","CRISE","LIDER","FERRO","GRITO",
  "RISCO","PESCA","CHUVA","PULSO","MARCA","FIBRA","DRAMA","BOLSA","LUCRO","SURDO",
  "POUCO","VOLTA","BUSCA","CALMO","BISPO","LARGO","FUNIL","DUPLO","CURTO",
  "GOLPE","MILHO","TEMPO","NINHO","MORRO","VULTO","SURTO","JUSTO","COURO","FALSO",
  "PLUMA","GANHO","LOUCO","SURFA","TOURO","CABRA","FLUIR","BRISA","NERVO","MOLHO",
  "PAPEL","SUAVE","CHEFE","LOUSA","AMIGO","SIGNO","PLACA","VIDRO","CANTO","SENSO",
  "DIZER","CALDA","ETAPA","LIMPO","ABRIR","FUGIR","GIRAR","HAVER","TRAPO","EXATO",
  "FELIZ","DIGNO","JUIZO","ALTAR","FUMAR","CESTA","GREVE","RUBOR","LIXAR","BALDE",
  "RELVA","FENDA","PUNHO","GRUTA","APITO","SAFRA","CUNHA","PAVIO","MALHA","TERNO",
];
ANSWERS_PT = ANSWERS_PT.filter(w => w.length === 5);

let VALID_GUESSES_PT = [
  ...ANSWERS_PT,
  // A
  "ABADE","ABALO","ABATE","ABETO","ABONO","ABRIL","ACASO","ACENO","ACIDO",
  "ACIMA","ACRES","ADEUS","ADOBE","ADORE","AEREA","AFAGO","AFIOU",
  "AGAPE","AGAVE","AGEIS","AGIRA","AGITO","AGORA","AGUDO","AINDA","AJUDA","ALADO",
  "ALAGA","ALGAS","ALGUM","ALIAR","ALMAS","ALTAR","ALTOS","ALUGA","AMADO",
  "AMBAR","AMBOS","AMENO","AMIDO","AMPLO","ANDAR","ANJOS","ANTES","ANZOL","AONDE",
  "APEGO","ARAME","AREIA","ARENA","ARMAR","AROMA","ARTES","ASPAS","ASSAR","ATEAR",
  "ATLAS","ATRIZ","ATUAL","AUDIO","AULAS","AVIAO","AVISO","AZEDA","AZUIS","ACHAR",
  "ARDER",
  // B
  "BAGRE","BAILE","BALAS","BANCO","BANDA","BANHA","BANHO","BARBA","BARRO","BASAL",
  "BASTA","BEATA","BEIJO","BELGA","BESTA","BEBER","BICHO","BINGO","BLOCO","BOBOS",
  "BODAS","BOLHA","BOMBA","BONDE","BOTAS","BRACO","BREJO","BRIGA","BRUXA","BUFAR",
  "BUNDA","BURRO","BANIR",
  // C
  "CABAL","CABER","CABOS","CACAU","CALAR","CALHA","CALOR","CAMAS","CANJA","CAPAS",
  "CAPIM","CARAS","CARGO","CARNE","CASAL","CASAR","CASCA","CASCO","CASOS","CAVAR",
  "CEDER","CEGOS","CENAS","CERCA","CERTO","CICLO","CIFRA","CINCO","CISNE","CIVIL",
  "CLIMA","COBRA","COFRE","COISA","COLAR","COLMO","COMER","COMUM","CONTO","COPAS",
  "CORAL","CORAR","CORDA","CORES","COROA","COSTA","COTAS","COXAS","CRUEL","CRIAR",
  "CURAR",
  // D
  "DADOS","DAMAS","DAQUI","DEDOS","DESDE","DEVEM","DEVER","DEUSA","DIABO","DICAS",
  "DITAR","DITOS","DIZER","DOCES","DOMAR","DONOS","DOTES","DUELO","DUNAS","DURAS",
  "DUROU","DORAR","DURAR",
  // E
  "ELFOS","ENFIM","ENTRE","ERRAR","ERVAS","ETNIA","EXATA","EXIGE","EXPOR","EXTRA",
  // F
  "FAIXA","FALHA","FALAR","FALTA","FARDO","FATAL","FAUNA","FAVOR","FECHO",
  "FEITO","FENDA","FIBRA","FICAR","FILHA","FILME","FINAL","FITAR","FIXAR","FLORA",
  "FLUIR","FOCAR","FOGAO","FOLGA","FORCA","FORMA","FORNO","FORTE","FOSSA","FRACA",
  "FRASE","FREIO","FRUTA","FUMAR","FUNDO","FURAR",
  // G
  "GABAR","GAFES","GALHO","GARFO","GARRA","GATOS","GEADA","GELAR","GEMER","GENES",
  "GENRO","GENTE","GERAL","GERAR","GESSO","GIRAR","GLOBO","GOELA","GOLES","GORDO",
  "GOTAS","GOZAR","GRACA","GRAMA","GRANA","GRITO","GUIAR",
  // H
  "HAVER","HEROI","HIDRA","HINOS","HORTA","HOTEL","HUMOR",
  // I
  "IDEAL","IDEIA","IDOLO","IGUAL","ILESO","ILHAS","IMPAR","IMPOR","INDIO","ITENS",
  // J
  "JATOS","JEITO","JOGOS","JOGAR","JOIAS","JULHO","JUIZO","JUNTA","JURAR",
  // L
  "LACRE","LAGOA","LAJES","LAPSO","LASER","LATAS","LAVAR","LEGUA","LEIGO","LEMAS",
  "LEQUE","LESAO","LETAL","LEVAR","LIDAR","LIDER","LIGAR","LILAS","LIMBO","LINDO",
  "LINHO","LIRAS","LISTA","LOCAL","LONGE","LOTAR","LUGAR","LUNAR","LUTAR","LUXOS",
  "LEGAR",
  // M
  "MACRO","MADRE","MAGIA","MAGOA","MAIOR","MANDO","MANGA","MANHA","MANTO",
  "MARES","MASSA","MATAR","MATOS","MEDIA","MEIGA","MENTA","MESES","METAS","MICRO",
  "MINAS","MINHA","MISTA","MODAL","MOEDA","MOITA","MOLDE","MONTE","MORAL","MORAR",
  "MORTA","MOTEL","MOTOR","MUDAR","MUITA","MULAS","MUNDO","MUROS","MOVER",
  // N
  "NADAR","NATAS","NAVAL","NEGAR","NERVO","NETOS","NINAR","NIVEL","NOIVO","NOMES",
  "NORMA","NOTAR","NOVOS",
  // O
  "OASIS","OBESO","OBITO","OBRAS","OBVIO","OCASO","OLHAR","ONDAS","OPACO","OPTAR",
  "OUSAR","OUTRA","OUTRO","OUVIR","OBTER",
  // P
  "PADRE","PAGAR","PAIOL","PARDO","PARES","PARTE","PARAR","PASSO","PASTA","PATOS",
  "PAUSA","PAVIO","PECAS","PECAR","PEDIR","PEGAR","PEITO","PELAS","PENAL","PERDA",
  "PESAR","PIADA","PICAR","PILAR","PILHA","PINTA","PISAR","PISTA","PLENA","PODER",
  "POLAR","POLIR","POLPA","POMBA","PONTO","PORCA","POROS","POSSE","POSTE","POUCO",
  "PRAZO","PRECE","PREGO","PRESA","PRIMA","PROLE","PROSA","PUGNA","PULAR","PULGA",
  "PUNIR","PUROS","PUXAR",
  // Q
  "QUAIS","QUASE",
  // R
  "RAIVA","RAMOS","RARAS","RASTO","RATOS","RAZAO","REAIS","RECUO","REDES","REGER",
  "REGRA","RELER","RENDA","REPOR","RETER","REVER","REZAR","RIGOR","RIMAS","RIVAL",
  "ROCHA","RODAS","ROLAR","ROMBO","RONDA","ROTAS","RUFAR","RUGIR","RUINA","RUIVO",
  "RUMOS","RURAL",
  // S
  "SABIA","SACOS","SAIAS","SAIDA","SALDO","SALMO","SALSA","SALTO","SALVA","SAMBA",
  "SANAR","SANTA","SAPOS","SAQUE","SARAR","SARNA","SABER","SECAR","SEDES","SEIVA",
  "SELVA","SEGAR","SENIL","SERRA","SERVO","SEXOS","SIGLA","SINAL","SISMO","SITIO",
  "SOBRE","SOBRA","SOFRE","SOLAR","SOLDO","SOLTO","SONHO","SOPRA","SUBIR","SUCOS",
  "SUGAR","SUJAR","SUMIR","SUPER",
  // T
  "TACOS","TALCO","TANGO","TAPAS","TAXAS","TECLA","TEDIO","TEIAS","TEIMA","TEMAS",
  "TEMER","TEMPO","TENDA","TENOR","TENSA","TENSO","TERNO","TERRA","TESTA","TINHA",
  "TINTA","TIPOS","TIRAR","TOMAR","TOCAR","TODOS","TONAL","TOQUE","TORTO","TOTAL",
  "TRAPO","TRAIR","TRAVE","TREZE","TRIBO","TRONO","TROTE","TRUFA","TUBOS","TUMBA",
  "TURBO","TURMA","TURNO",
  // U
  "UIVAR","ULTRA","UNHAS","UNICO","UNIDO","UNTAR","URDIR","URNAS","USADA","USINA",
  "USUAL",
  // V
  "VAGAR","VAGAS","VALER","VALOR","VASOS","VAZIO","VEIAS","VELHA","VELHO","VENHA",
  "VERBA","VERBO","VERME","VERSO","VEZES","VIDEO","VIGOR","VILAS","VIMOS","VINDO",
  "VINIL","VIRAR","VIRUS","VISAR","VISTA","VITAL","VIUVA","VIVER","VOCAL","VOLTA",
  "VOTAR","VOTOS","VULGO","VAZAR",
  // X-Z
  "XAMPU","XEQUE","ZEROS","ZINCO","ZOMBA","ZONAS","ZELAR",
];
VALID_GUESSES_PT = VALID_GUESSES_PT.filter(w => w.length === 5);

// ---- English word lists ----
let ANSWERS_EN = [
  "HOUSE","WORLD","LIGHT","BRAIN","WATER","EARTH","PLANT","STONE","NIGHT","FLAME",
  "CLOUD","BREAD","DRINK","FIELD","BLOOD","CHAIR","CHEST","CHILD","CLOCK","COAST",
  "CROWN","DANCE","DEATH","DEPTH","DREAM","DRINK","DRIVE","EARTH","FAITH","FLAIR",
  "FLESH","FLOAT","FLOOR","FLUTE","FOCUS","FORCE","FORGE","FORTH","FRONT","FRUIT",
  "GHOST","GIANT","GIVEN","GLASS","GLEAM","GLOOM","GLORY","GLOVE","GRACE","GRADE",
  "GRAIN","GRAND","GRANT","GRASS","GRAVE","GREAT","GREED","GREEN","GRIEF","GROAN",
  "GROSS","GROUP","GROVE","GROWN","GUARD","GUIDE","GUILD","GUILE","GUISE","GUSTO",
  "HABIT","HAPPY","HARSH","HAVEN","HEART","HEAVY","HONOR","HORSE","HOTEL","HOUND",
  "HUMAN","HUMOR","HURRY","IMAGE","INNER","INPUT","IRONY","IVORY","JEWEL","JUDGE",
  "KNIFE","KNOCK","LABEL","LANCE","LAPSE","LASER","LAUGH","LAYER","LEARN","LEAVE",
  "LEVEL","LIGHT","LIMIT","LINEN","LOCAL","LODGE","LOGIC","LOOSE","LOWER","LUCKY",
  "MAGIC","MANOR","MAPLE","MARCH","MARSH","MATCH","MAYOR","MERCY","MERIT","METAL",
  "MIGHT","MINOR","MINUS","MIRTH","MIXED","MONEY","MONTH","MORAL","MOUNT","MOUSE",
  "MUSIC","NAIVE","NAVAL","NERVE","NIGHT","NOISE","NORTH","NOTED","NOVEL","NURSE",
  "NYMPH","OCEAN","OLIVE","ONSET","OPERA","ORBIT","ORDER","ORGAN","OUTER","OVERT",
  "OWNER","OXIDE","OZONE","PAGES","PAINT","PANIC","PAPER","PARTY","PEACE","PEARL",
  "PHASE","PHONE","PHOTO","PIANO","PILOT","PITCH","PIXEL","PIZZA","PLACE","PLAIN",
  "PLANE","PLANK","PLAZA","PLUCK","PLUME","PLUMP","PLUNGE","POINT","POLAR","POPPY",
  "POWER","PRESS","PRICE","PRIDE","PRIME","PRINT","PRIOR","PRIZE","PROBE","PRONE",
  "PROOF","PROSE","PROUD","PROVE","PULSE","PUNCH","PUPIL","PURSE","QUEEN","QUEST",
  "QUEUE","QUICK","QUIET","QUOTA","QUOTE","RADAR","RADIO","RAISE","RALLY","RANGE",
  "RAPID","RATIO","REACH","READY","REALM","REBEL","REIGN","RELAX","REMIT","REPAY",
  "REPEL","REPLY","RESIN","REUSE","RIDER","RIDGE","RIFLE","RIGHT","RISKY","RIVAL",
  "RIVER","ROBOT","ROCKY","ROGUE","ROUGH","ROUND","ROYAL","RULER","RURAL","RUSTY",
  "SAINT","SALAD","SALVE","SANDY","SAUCE","SAVVY","SCALD","SCALE","SCALP","SCANT",
  "SCARE","SCENE","SCORN","SCOUT","SCREW","SENSE","SERVE","SEVEN","SHADE","SHAFT",
  "SHAKE","SHALL","SHAME","SHAPE","SHARE","SHARK","SHARP","SHAWL","SHEEN","SHEEP",
  "SHEER","SHELF","SHELL","SHIFT","SHINE","SHIRT","SHOCK","SHORE","SHORT","SHOUT",
  "SIGHT","SIGMA","SIREN","SIXTH","SIXTY","SKILL","SKIMP","SKULL","SLACK","SLANT",
  "SLASH","SLATE","SLAVE","SLEEK","SLEEP","SLEET","SLICK","SLIDE","SLIME","SLOPE",
  "SMART","SMELL","SMILE","SMITE","SMOKE","SNARE","SNEAK","SNOW","SOLAR","SOLID",
  "SOLVE","SORRY","SOUTH","SPACE","SPARE","SPARK","SPAWN","SPEED","SPELL","SPEND",
  "SPICE","SPILL","SPINE","SPITE","SPLIT","SPOKE","SPORT","SPRAY","SPRIG","SQUAD",
  "SQUAB","STAGE","STAIN","STAKE","STALE","STALL","STAMP","STAND","STARE","START",
  "STATE","STAYS","STEAM","STEEL","STEEP","STEER","STERN","STICK","STIFF","STILL",
  "STING","STOCK","STOMP","STORE","STORM","STORY","STOUT","STOVE","STRAP","STRAW",
  "STRAY","STRUT","STUDY","STUMP","STYLE","SUGAR","SUITE","SUNNY","SUPER","SURGE",
  "SWAMP","SWEAR","SWEAT","SWEEP","SWEET","SWEPT","SWIFT","SWORD","TABLE","TASTE",
  "TEACH","THEME","THICK","THINK","THIRD","THORN","THOSE","THREE","THREW","THROW",
  "TIGER","TIGER","TIMER","TIRED","TITLE","TOAST","TODAY","TOKEN","TOPIC","TOUCH",
  "TOUGH","TOWER","TOXIC","TRACK","TRADE","TRAIL","TRAIN","TRAIT","TRAMP","TRASH",
  "TREAD","TREAT","TREND","TRIAL","TRIBE","TRICK","TRIED","TROOP","TROTH","TROUT",
  "TROVE","TRUCK","TRULY","TRUMP","TRUNK","TRUST","TRUTH","TULIP","TUMID","TUNER",
  "TUNIC","TUPLE","TWEAK","TWICE","TWILL","TWIST","TYING","UDDER","ULTRA","UNCUT",
  "UNFIT","UNION","UNITE","UNITY","UNTIL","UPPER","UPSET","USAGE","USHER","USUAL",
  "UTTER","VALID","VALUE","VALVE","VAPOR","VAULT","VENOM","VENUE","VERSE","VIGOR",
  "VIRAL","VIRUS","VISIT","VISTA","VITAL","VIVID","VOCAL","VOICE","VOTER","VYING",
  "WASTE","WATCH","WEARY","WEAVE","WEDGE","WEIGH","WEIRD","WHACK","WHALE","WHEAT",
  "WHEEL","WHERE","WHICH","WHILE","WHITE","WHOLE","WHOSE","WIDEN","WIDOW","WINDY",
  "WITCH","WOMAN","WOMEN","WORTH","WOULD","WOUND","WRATH","WRITE","WROTE","YOUNG",
  "YOUTH","ZEBRA","ZONES",
];
ANSWERS_EN = ANSWERS_EN.filter(w => w.length === 5);

let VALID_GUESSES_EN = [
  ...ANSWERS_EN,
  "ABACK","ABASE","ABASH","ABATE","ABBEY","ABBOT","ABHOR","ABIDE","ABLER","ABODE",
  "ABORT","ABOUT","ABOVE","ABUSE","ABYSS","ACORN","ACUTE","ADAGE","ADEPT","ADMIT",
  "ADOBE","ADOPT","ADORE","ADORN","ADULT","AFTER","AGAIN","AGAPE","AGATE","AGILE",
  "AGING","AGONY","AGREE","AHEAD","AISLE","ALARM","ALBUM","ALLAY","ALLEY","ALLOT",
  "ALLOW","ALONE","ALONG","ALTER","ANGEL","ANGLE","ANGRY","ANGST","ANIME","ANKLE",
  "ANNEX","ANTIC","ANVIL","APACE","APHID","ATONE","ATTIC","AVAIL","AWARE","AWFUL",
  "BADLY","BAGEL","BANDY","BANJO","BARON","BASIC","BASIS","BATHE","BEACH","BEADY",
  "BEARD","BEAST","BEGAT","BEIGE","BELLE","BERTH","BESET","BEVEL","BEWARE","BINGE",
  "BIRCH","BISON","BLAZE","BLEAT","BLEED","BLEND","BLESS","BLIND","BLINK","BLISS",
  "BLOAT","BLOCK","BLOND","BLOOM","BLOWN","BLUNT","BLURB","BLURT","BLUSH","BOAST",
  "BOGUS","BOOST","BOOTH","BOSSY","BOTCH","BRACE","BRAID","BRAKE","BRAWL","BRAWN",
  "BRAZE","BRIDLE","BRIEF","BRINE","BRINK","BRISK","BROKE","BROOK","BROTH","BUDGE",
  "BUGGY","BULGE","BULLY","BUNCH","BUNNY","BUOYANT","BURLY","BURST","BUYER","BYLAW",
  "CABAL","CACHE","CADET","CAMEL","CANDY","CANON","CARGO","CAROL","CARRY","CARVE",
  "CAUSE","CEASE","CHAFE","CHAIN","CHALK","CHANT","CHAOS","CHASM","CHECK","CHEEK",
  "CHEER","CHESS","CHIDE","CHIEF","CHIME","CHUNK","CIVIC","CIVIL","CLAMP","CLANG",
  "CLASP","CLEAN","CLEAR","CLEAT","CLEFT","CLERK","CLICK","CLIFF","CLING","CLIP",
  "CLOAK","CLONE","CLOSE","CLOTH","CLUMP","COARSE","COBALT","COMET","COMIC","COMMA",
  "COUCH","COULD","COVET","CRACK","CRAFT","CRANE","CREAK","CREAM","CREEP","CREST",
  "CRIMP","CRISP","CROAK","CRONE","CROSS","CRUDE","CRUEL","CRUMB","CRUSE","CRYPT",
  "CURLY","CURSE","CURVE","DALLY","DATED","DECRY","DELVE","DEMON","DETER","DEXTERITY",
  "DICEY","DIGIT","DINGY","DISCO","DITCH","DITTY","DODGE","DOING","DOLEFUL","DOPEY",
  "DOUBT","DOUGH","DOWDY","DOWNY","DOZEN","DRANK","DRAFT","DRAPE","DREAR","DROLL",
  "DRONE","DROOL","DROVE","DROWN","DRUID","DULCE","DULLY","DUNCE","DUSKY","DUSTY",
  "EARLY","EERIE","EGRET","ELBOW","ELDER","ELEGY","EMOTE","ENDED","ENJOY","ENTER",
  "ENVOY","ERUPT","ESTOP","EVADE","EVICT","EXACT","EXCEL","EXIST","EXPEL","EXTRA",
  "FABLE","FACET","PADDY","FAIRY","FAKER","FANCY","FARCE","FATAL","FAVOR","FEINT",
  "FENCE","FERAL","FERNY","FETCH","FIEND","FIERY","FILTH","FINCH","FINER","FISHY",
  "FIXED","FJORD","FLARE","FLASH","FLASK","FLINCH","FLOOD","FLUNG","FLURRY","FOLKS",
  "FOLLY","FORTH","FOYER","FRAIL","FRANK","FRAUD","FRESH","FRISK","FROTH","FRUGAL",
  "FULLY","GAUDY","GAUNT","GAUZE","GAVEL","GIDDY","GIRLY","GIRTH","GIVEN","GLAND",
  "GLAZE","GLOAT","GLOSS","GLINT","GNASH","GORGE","GOUGE","GRASP","GRATE","GRAZE",
  "GREET","GRIPE","GRUFF","GUILE","GULCH","GULLY","GUMMY","GUSTO",
  "HAPLESS","HARDY","HAUNT","HAZED","HEADY","HEAVE","HERON","HOARY","HORDE","HUNKY",
  "IDEAL","INEPT","INFER","INGOT","INNER","INTER","INTRO","IONIC","IRATE","IRONS",
  "JAGUAR","JANKY","JAZZY","JERKY","JIFFY","JOUST","JUMPY","KABOB","KIOSK","KITTY",
  "KNACK","KNEEL","KNELT","KNOLL","KNOWN","KUDOS","LARDY","LADEN","LATHE","LATKE",
  "LEAFY","LEGGY","LEAPT","LEGAL","LEMON","LOFTY","LOOPY","LORDY","LOUSY","LOVER",
  "LOWLY","LUNAR","LUNGE","LUSTY","LYING","MACHO","MANIC","MANLY","MANOR","MATTE",
  "MEALY","MEEK","MERCY","MESSY","MICRO","MIDWAY","MILKY","MISER","MISTY","MOLAR",
  "MOLDY","MOPEY","MOTIF","MOUND","MURKY","MUSHY","MUTED","MURKY","NERDY","NIFTY",
  "NIPPY","NOBLE","NODAL","NOISY","NORMS","NOTCH","NUTTY","OAKEN","OFTEN","ONYX",
  "OPTIC","OUTDO","OUTGO","OVOID","PADDY","PAGAN","PALER","PANDA","PANSY","PATSY",
  "PAULY","PEAKY","PENAL","PETTY","PICKY","PIGGY","PINEY","PITHY","PIXEL","PLAID",
  "PLEAT","PLUMB","PENAL","PAPAL","PSALM","PUBIC","PUDGY","PUFFY","PUSHY","QUIRK",
  "REEDY","REGAL","REIGN","RELY","RENEW","REPAY","RESET","RHYME","RISKY","RITZY",
  "ROCKY","RUDDY","RUGBY","RUGGED","SABER","SALINE","SASSY","SATIN","SAUCE","SAUCY",
  "SAVVY","SCALD","SCALP","SCAMP","SCONE","SCOOP","SCOPE","SCORE","SHADY","SHAKY",
  "SHAME","SHAME","SHINY","SHRUB","SHRUG","SIGMA","SILKY","SISSY","SIXTY","SKIMP",
  "SKUNK","SLIMY","SLUNG","SLYLY","SMALL","SMOKY","SMOKY","SNAKY","SNOBS","SNOOTY",
  "SOGGY","SONNET","SPANK","SPASM","SPATE","SPECK","SPIED","SPIKY","SPINY","SPOOF",
  "SPOOK","SPOOL","SPORT","STAB","STAGGER","STATELY","STAYED","STEED","STEEP","STOOD",
  "STRAP","STRIPED","TACKY","TANGY","TARDY","TAUNT","TAWNY","TEETH","TEPID","TERSE",
  "THEFT","TIDAL","TIPSY","TODDY","TOFFY","TORSO","TOTAL","TOUCHY","TOXIC","TRYST",
  "TUBBY","TUMID","TULIP","TUNER","TWERP","TYPED","TYRANT","UNDUE","UNIFY","UNTIE",
  "UNWED","VAPID","VAULT","VENAL","VERGE","VEXED","VIGIL","VILLAIN","VOGUE","VOILA",
  "WACKY","WADER","WAGED","WAIST","WALTZ","WARTY","WEEDY","WIMPY","WINCH","WISPY",
  "WITTY","WOOLY","WORDY","WOOZY","YEARN","YUMMY","ZAPPY","ZESTY","ZIPPY","ZONAL",
];
VALID_GUESSES_EN = VALID_GUESSES_EN.filter(w => w.length === 5);

const KEYBOARD_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["\u232B","Z","X","C","V","B","N","M","ENTER"],
];

const COLOR_CORRECT = "#6aaa64";
const COLOR_PRESENT = "#c9b458";
const COLOR_ABSENT = "#787c7e";
const COLOR_EMPTY = "#3a3a3c";
const COLOR_BORDER = "#565758";
const COLOR_BG = "#050510";

// ---- Audio Engine ----
class WordleAudio {
  constructor() { this.ctx = null; }
  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await this.ctx.resume();
  }
  _tone(freq, dur, vol = 0.08, type = "sine") {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }
  keyPress() { this._tone(800, 0.04, 0.06, "sine"); }
  backspace() { this._tone(400, 0.05, 0.05, "sine"); }
  submit() { this._tone(600, 0.08, 0.08, "triangle"); }
  correct() {
    this._tone(523, 0.1, 0.1, "sine");
    setTimeout(() => this._tone(659, 0.1, 0.1, "sine"), 80);
    setTimeout(() => this._tone(784, 0.15, 0.12, "sine"), 160);
  }
  error() { this._tone(200, 0.15, 0.1, "square"); }
}

function pickWord(answers) {
  return answers[Math.floor(Math.random() * answers.length)];
}

function evaluateGuess(guess, answer) {
  const result = Array(5).fill("absent");
  const answerLetters = answer.split("");
  const guessLetters = guess.split("");
  const remaining = [...answerLetters];

  // First pass: mark greens
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === answerLetters[i]) {
      result[i] = "correct";
      remaining[i] = null;
    }
  }
  // Second pass: mark yellows
  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;
    const idx = remaining.indexOf(guessLetters[i]);
    if (idx !== -1) {
      result[i] = "present";
      remaining[idx] = null;
    }
  }
  return result;
}

function getColorForResult(r) {
  if (r === "correct") return COLOR_CORRECT;
  if (r === "present") return COLOR_PRESENT;
  return COLOR_ABSENT;
}

// ---- MAIN COMPONENT ----
export default function WordleBR() {
  const t = useTranslations("games.wordle");
  const locale = useLocale();
  const answers = locale === "en" ? ANSWERS_EN : ANSWERS_PT;
  const validGuesses = locale === "en" ? VALID_GUESSES_EN : VALID_GUESSES_PT;

  const { user, checkedCookie, registering, register } = useJogador("wordle");
  const gameScale = useGameScale(GAME_W);

  const [answer, setAnswer] = useState(() => pickWord(answers));
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameStatus, setGameStatus] = useState("playing"); // playing | won | lost
  const [shakeRow, setShakeRow] = useState(-1);
  const [revealingRow, setRevealingRow] = useState(-1);
  const [bounceRow, setBounceRow] = useState(-1);
  const [toast, setToast] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [keyColors, setKeyColors] = useState({});
  const [hasStarted, setHasStarted] = useState(false);
  useLockScroll(hasStarted);
  const [selectedCol, setSelectedCol] = useState(null);

  const toastTimerRef = useRef(null);
  const firstGuessRef = useRef(false);
  const audioRef = useRef(null);

  const showToast = useCallback((msg, duration = 1500) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  const updateKeyColors = useCallback((guess, result) => {
    setKeyColors(prev => {
      const next = { ...prev };
      for (let i = 0; i < 5; i++) {
        const letter = guess[i];
        const current = next[letter];
        if (result[i] === "correct") {
          next[letter] = "correct";
        } else if (result[i] === "present" && current !== "correct") {
          next[letter] = "present";
        } else if (!current) {
          next[letter] = "absent";
        }
      }
      return next;
    });
  }, []);

  const submitScore = useCallback((score, tentativas, palavra) => {
    fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pontos: score,
        jogo: "wordle",
        metadata: { tentativas, palavra },
      }),
    }).catch(() => {});
  }, []);

  const handleSubmit = useCallback(() => {
    if (gameStatus !== "playing") return;
    if (currentGuess.length !== 5) return;

    const guess = currentGuess.toUpperCase();
    if (!/^[A-Z]{5}$/.test(guess)) {
      setShakeRow(guesses.length);
      setTimeout(() => setShakeRow(-1), 600);
      showToast(t("toastInvalidChars"));
      audioRef.current?.error();
      return;
    }

    if (!validGuesses.includes(guess)) {
      setShakeRow(guesses.length);
      setTimeout(() => setShakeRow(-1), 600);
      showToast(t("toastNotInList"));
      audioRef.current?.error();
      return;
    }

    audioRef.current?.submit();

    if (!firstGuessRef.current) {
      firstGuessRef.current = true;
      window.gtag?.("event", "game_start", { game_name: "wordle" });
    }

    const result = evaluateGuess(guess, answer);
    const rowIdx = guesses.length;
    const newGuesses = [...guesses, { word: guess, result }];

    setGuesses(newGuesses);
    setCurrentGuess("");
    setSelectedCol(null);
    setRevealingRow(rowIdx);

    // After reveal animation completes, update keyboard and check win/loss
    setTimeout(() => {
      setRevealingRow(-1);
      updateKeyColors(guess, result);

      if (guess === answer) {
        setBounceRow(rowIdx);
        setGameStatus("won");
        const score = (7 - newGuesses.length) * 100;
        showToast(t("toastWin"), 3000);
        audioRef.current?.correct();
        submitScore(score, newGuesses.length, answer);
        window.gtag?.("event", "game_end", { game_name: "wordle", score });
      } else if (newGuesses.length >= 6) {
        setGameStatus("lost");
        showToast(t("toastLose", { answer }), 4000);
        submitScore(0, 6, answer);
        window.gtag?.("event", "game_end", { game_name: "wordle", score: 0 });
      }
    }, 5 * 100 + 500); // wait for all tiles to flip
  }, [gameStatus, currentGuess, guesses, answer, validGuesses, showToast, updateKeyColors, submitScore, t]);

  const handleKey = useCallback((key) => {
    if (gameStatus !== "playing") return;
    if (key === "ENTER") {
      setSelectedCol(null);
      handleSubmit();
      return;
    }
    if (key === "BACKSPACE" || key === "\u232B") {
      if (selectedCol !== null) {
        // Remove the selected letter and shift remaining left
        setCurrentGuess(prev => prev.slice(0, selectedCol) + prev.slice(selectedCol + 1));
        setSelectedCol(prev => prev > 0 ? prev - 1 : null);
      } else {
        setCurrentGuess(prev => prev.slice(0, -1));
      }
      audioRef.current?.backspace();
      return;
    }
    if (/^[A-Z]$/.test(key)) {
      if (selectedCol !== null && selectedCol < currentGuess.length) {
        // Replace the letter at selectedCol
        setCurrentGuess(prev => prev.slice(0, selectedCol) + key + prev.slice(selectedCol + 1));
        setSelectedCol(prev => prev < 4 ? prev + 1 : null);
        audioRef.current?.keyPress();
      } else if (currentGuess.length < 5) {
        setCurrentGuess(prev => prev + key);
        setSelectedCol(null);
        audioRef.current?.keyPress();
      }
    }
  }, [gameStatus, currentGuess, handleSubmit]);

  // Physical keyboard
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (showInstructions || showRegister) return;
      if (e.key === "Enter") {
        e.preventDefault();
        handleKey("ENTER");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleKey("BACKSPACE");
      } else {
        const k = e.key.toUpperCase();
        if (/^[A-Z]$/.test(k)) {
          e.preventDefault();
          handleKey(k);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey, showInstructions, showRegister]);

  const resetGame = useCallback(() => {
    setAnswer(pickWord(answers));
    setGuesses([]);
    setCurrentGuess("");
    setGameStatus("playing");
    setShakeRow(-1);
    setRevealingRow(-1);
    setBounceRow(-1);
    setKeyColors({});
    setSelectedCol(null);
    setToast(null);
    firstGuessRef.current = false;
  }, [answers]);

  const handleShare = useCallback(() => {
    const emojiMap = { correct: "\uD83D\uDFE9", present: "\uD83D\uDFE8", absent: "\u2B1B" };
    const grid = guesses.map(g => g.result.map(r => emojiMap[r]).join("")).join("\n");
    const text = `${t("shareTitle")} ${gameStatus === "won" ? guesses.length : "X"}/6\n\n${grid}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast(t("toastCopied"));
    }).catch(() => {
      showToast(t("toastCopyError"));
    });
  }, [guesses, gameStatus, showToast, t]);

  const handleStart = async () => {
    if (!user) {
      setShowRegister(true);
    } else {
      if (!audioRef.current) {
        audioRef.current = new WordleAudio();
      }
      await audioRef.current.init();
      setHasStarted(true);
    }
  };

  const handleRegister = async (userData) => {
    const jogador = await register(userData);
    if (jogador) {
      setShowRegister(false);
      if (!audioRef.current) {
        audioRef.current = new WordleAudio();
      }
      await audioRef.current.init();
      setHasStarted(true);
    }
  };

  if (!checkedCookie) return null;

  // ---- RENDER ----
  return (
    <div style={{
      minHeight: "100vh", background: COLOR_BG, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", fontFamily: "'Fira Code', monospace",
      overflow: "hidden", padding: 12,
    }}>
      <style>{`
        @keyframes flipIn {
          0% { transform: rotateX(0deg); }
          50% { transform: rotateX(-90deg); }
          100% { transform: rotateX(0deg); }
        }
        @keyframes shakeRow {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-4px); }
          30%, 70% { transform: translateX(4px); }
        }
        @keyframes bounceCell {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes toastIn {
          0% { opacity: 0; transform: translate(-50%, -10px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes popIn {
          0% { transform: scale(0.8); opacity: 0; }
          40% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes tilePop {
          0% { transform: scale(1); }
          50% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Show register modal */}
      {showRegister && (
        <RegisterModal
          onRegister={handleRegister}
          loading={registering}
          jogoNome={t("gameTitle")}
          accentColor={COLOR_CORRECT}
        />
      )}

      {/* Splash screen */}
      {!hasStarted && !showRegister && (
        <div style={{
          position: "fixed", inset: 0, background: COLOR_BG, zIndex: 100,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontFamily: "'Press Start 2P', cursive", fontSize: 28, color: COLOR_CORRECT,
            textShadow: `0 0 20px ${COLOR_CORRECT}80`, marginBottom: 16, textAlign: "center",
            lineHeight: 1.4,
          }}>
            {t("gameTitle")}
          </div>
          <div style={{ color: "#aaa", fontSize: 14, marginBottom: 32, textAlign: "center", maxWidth: 300 }}>
            {t("splashSubtitle")}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
            {["W","O","R","D","L"].map((l, i) => (
              <div key={i} style={{
                width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, fontWeight: "bold", color: "#fff", borderRadius: 4,
                background: i === 0 ? COLOR_CORRECT : i === 2 ? COLOR_PRESENT : i === 4 ? COLOR_ABSENT : COLOR_EMPTY,
                border: `2px solid ${i === 0 ? COLOR_CORRECT : i === 2 ? COLOR_PRESENT : i === 4 ? COLOR_ABSENT : COLOR_BORDER}`,
                animation: `popIn 0.4s ${i * 0.1}s both`,
              }}>{l}</div>
            ))}
          </div>
          <button
            onClick={handleStart}
            style={{
              fontFamily: "'Press Start 2P', cursive", fontSize: 14, padding: "14px 36px",
              background: "transparent", color: COLOR_CORRECT,
              border: `2px solid ${COLOR_CORRECT}`, borderRadius: 8, cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.target.style.background = COLOR_CORRECT; e.target.style.color = "#fff"; }}
            onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = COLOR_CORRECT; }}
          >
            {t("playButton")}
          </button>
        </div>
      )}

      {/* Instructions modal */}
      {showInstructions && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={() => setShowInstructions(false)}>
          <div style={{
            background: "#1a1a2e", borderRadius: 12, padding: 24, maxWidth: 360, width: "100%",
            color: "#eee", fontSize: 13, lineHeight: 1.6, animation: "popIn 0.3s both",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "'Press Start 2P', cursive", fontSize: 14, marginBottom: 16, color: COLOR_CORRECT }}>
              {t("instructionsTitle")}
            </div>
            <p style={{ marginBottom: 12 }}>{t("instructionsP1")}</p>
            <p style={{ marginBottom: 12 }}>{t("instructionsP2")}</p>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, background: COLOR_CORRECT, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 16, color: "#fff" }}>A</div>
              <span>{t("instructionsGreen")}</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, background: COLOR_PRESENT, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 16, color: "#fff" }}>B</div>
              <span>{t("instructionsYellow")}</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, background: COLOR_ABSENT, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 16, color: "#fff" }}>C</div>
              <span>{t("instructionsGray")}</span>
            </div>
            <button onClick={() => setShowInstructions(false)} style={{
              width: "100%", padding: "10px 0", background: COLOR_CORRECT, color: "#fff",
              border: "none", borderRadius: 6, fontSize: 14, fontWeight: "bold", cursor: "pointer",
            }}>{t("instructionsClose")}</button>
          </div>
        </div>
      )}

      {/* Top ad - hidden during active play */}
      {gameStatus !== "playing" && (
        <AdBanner slot="wordle_top" style={{ marginBottom: 12, maxWidth: GAME_W }} />
      )}

      {/* Title above game area */}
      {hasStarted && (
        <h1 style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: COLOR_CORRECT,
          textShadow: `0 0 20px ${COLOR_CORRECT}, 0 0 40px ${COLOR_CORRECT}30`,
          marginBottom: 8, letterSpacing: 3, textAlign: "center",
        }}>
          {t("gameTitle")}
        </h1>
      )}
      {hasStarted && (
        <p style={{ color: "#4a5568", fontSize: 10, marginBottom: 14, fontFamily: "'Press Start 2P', monospace" }}>
          {t("gameSubtitle")}
        </p>
      )}

      {/* Game area in bordered container */}
      {hasStarted && (
        <div style={{ width: GAME_W * gameScale, height: GAME_H * gameScale }}>
        <div style={{
          width: GAME_W, height: GAME_H, position: "relative",
          background: "#0a0a1a",
          border: `2px solid ${COLOR_CORRECT}30`,
          borderRadius: 12, overflow: "hidden",
          boxShadow: `0 0 20px ${COLOR_CORRECT}15`,
          transform: `scale(${gameScale})`, transformOrigin: "top left",
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "8px 0",
        }}>
          {/* Header row with ? button */}
          <div style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 4, padding: "4px 8px", borderBottom: "1px solid #3a3a3c",
          }}>
            <button onClick={() => setShowInstructions(true)} style={{
              background: "none", border: "none", color: "#aaa", fontSize: 22, cursor: "pointer",
              width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
            }} aria-label={t("ariaInstructions")}>?</button>
            <div style={{ width: 36 }} />
          </div>

          {/* Toast */}
          {toast && (
            <div style={{
              position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
              background: "#fff", color: "#000", padding: "10px 20px", borderRadius: 6,
              fontWeight: "bold", fontSize: 14, zIndex: 300, animation: "toastIn 0.2s both",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}>{toast}</div>
          )}

          {/* Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8, marginTop: 4 }}>
            {Array.from({ length: 6 }).map((_, rowIdx) => {
              const isRevealing = revealingRow === rowIdx;
              const isShaking = shakeRow === rowIdx;
              const isBouncing = bounceRow === rowIdx;
              const guessData = guesses[rowIdx];
              const isCurrentRow = rowIdx === guesses.length && gameStatus === "playing";

              return (
                <div key={rowIdx} style={{
                  display: "flex", gap: 4,
                  animation: isShaking ? "shakeRow 0.6s" : undefined,
                }}>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    let letter = "";
                    let bgColor = "transparent";
                    let borderColor = COLOR_EMPTY;
                    let flipDelay = 0;
                    let shouldFlip = false;
                    let shouldBounce = false;
                    let shouldPop = false;

                    if (guessData) {
                      letter = guessData.word[colIdx];
                      if (isRevealing) {
                        shouldFlip = true;
                        flipDelay = colIdx * 100;
                        bgColor = "transparent";
                        borderColor = COLOR_BORDER;
                      } else {
                        bgColor = getColorForResult(guessData.result[colIdx]);
                        borderColor = bgColor;
                      }
                      if (isBouncing) {
                        shouldBounce = true;
                        flipDelay = colIdx * 80;
                      }
                    } else if (isCurrentRow) {
                      letter = currentGuess[colIdx] || "";
                      if (letter) {
                        borderColor = "#999";
                        shouldPop = true;
                      }
                    }

                    const isSelected = isCurrentRow && selectedCol === colIdx;

                    return (
                      <div key={colIdx}
                        onClick={isCurrentRow && colIdx < currentGuess.length ? () => {
                          setCurrentGuess(prev => prev.slice(0, colIdx) + prev.slice(colIdx + 1));
                          audioRef.current?.backspace();
                        } : undefined}
                        style={{
                        width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 24, fontWeight: "bold", color: "#fff",
                        border: `2px solid ${isSelected ? "#fff" : borderColor}`, borderRadius: 2,
                        background: bgColor, transition: "background 0.1s",
                        animation: shouldFlip
                          ? `flipIn 0.5s ${flipDelay}ms both`
                          : shouldBounce
                            ? `bounceCell 0.4s ${flipDelay}ms both`
                            : shouldPop && isCurrentRow && colIdx === currentGuess.length - 1
                              ? "tilePop 0.1s both"
                              : undefined,
                        userSelect: "none",
                        cursor: isCurrentRow && colIdx < currentGuess.length ? "pointer" : "default",
                      }}>
                        {letter}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Action buttons (shown when game is over) */}
          {gameStatus !== "playing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 8, animation: "fadeIn 0.5s 0.3s both" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleShare} style={{
                  padding: "8px 18px", background: COLOR_CORRECT, color: "#fff", border: "none",
                  borderRadius: 6, fontSize: 13, fontWeight: "bold", cursor: "pointer",
                  fontFamily: "'Fira Code', monospace",
                }}>{t("shareButton")}</button>
                <button onClick={resetGame} style={{
                  padding: "8px 18px", background: "transparent", color: COLOR_CORRECT,
                  border: `2px solid ${COLOR_CORRECT}`, borderRadius: 6, fontSize: 13,
                  fontWeight: "bold", cursor: "pointer", fontFamily: "'Fira Code', monospace",
                }}>{t("newWordButton")}</button>
              </div>
              <AdBanner slot="wordle_between" style={{ marginTop: 4, maxWidth: 300 }} />
            </div>
          )}

          {/* Virtual Keyboard */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", padding: "0 4px" }}>
            {KEYBOARD_ROWS.map((row, rIdx) => (
              <div key={rIdx} style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                {row.map(key => {
                  const isWide = key === "ENTER" || key === "\u232B";
                  const kc = keyColors[key];
                  let keyBg = "#818384";
                  if (kc === "correct") keyBg = COLOR_CORRECT;
                  else if (kc === "present") keyBg = COLOR_PRESENT;
                  else if (kc === "absent") keyBg = "#3a3a3c";

                  return (
                    <button
                      key={key}
                      onClick={() => handleKey(key)}
                      style={{
                        width: isWide ? 58 : 34, height: 47, display: "flex", alignItems: "center",
                        justifyContent: "center", background: keyBg, color: "#fff",
                        border: "none", borderRadius: 4, fontSize: isWide ? 11 : 15,
                        fontWeight: "bold", cursor: "pointer", fontFamily: "'Fira Code', monospace",
                        transition: "background 0.3s", userSelect: "none", padding: 0,
                      }}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* User info */}
          {user && (
            <div style={{
              marginTop: 8, color: "#4a5568", fontSize: 10,
              fontFamily: "'Fira Code', monospace",
            }}>
              {user.nome}
            </div>
          )}
        </div>
        </div>
      )}

      <AdBanner slot="wordle_bottom" style={{ marginTop: 16, maxWidth: GAME_W }} />
    </div>
  );
}
