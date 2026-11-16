import * as THREE from 'three';
import { AppView } from '../../types';

export type PackagingModelId =
  | 'giftBox'
  | 'windowBox'
  | 'fefco0427'
  | 'pharmaCarton'
  | 'slidingSleeve';

export interface ServiceHotspotSpec {
  id: string;
  label: string;
  serviceTitle: string;
  spec: string;
  description: string;
  localPoint: [number, number, number];
  targetView: AppView;
  ctaText: string;
}

export interface PackagingModelSpec {
  id: PackagingModelId;
  code: string;
  nameFa: string;
  subtitleFa: string;
  serviceCategoryFa: string;
  serviceSlug: string;
  defaultDims: { length: number; width: number; height: number };
  defaultBoardId: string;
  defaultFoilId: string;
  specs: string[];
  hotspots: ServiceHotspotSpec[];
}

export const PACKAGING_MODELS: PackagingModelSpec[] = [
  {
    id: 'giftBox',
    code: 'HARDBOX · LUXURY',
    nameFa: 'هاردباکس مگنتی صادراتی',
    subtitleFa: 'ساختار سخت ۲.۵ میلی‌متری با مغزی و روکش مخمل یا سلفون مات',
    serviceCategoryFa: 'چاپ افست ۵ رنگ و طلاکوب لوکس',
    serviceSlug: '/services/offset-printing',
    defaultDims: { length: 2.8, width: 2.1, height: 0.85 },
    defaultBoardId: 'carbon',
    defaultFoilId: 'gold24k',
    specs: ['مغزی مقوای سخت ۲.۵mm', 'طلاکوب داغ ۲۴ عیار + UV موضعی', 'قفل مگنتی مخفی و فوم برش‌خورده'],
    hotspots: [
      {
        id: 'foil-lid',
        label: 'طلاکوب ۲۴ عیار و لوگو',
        serviceTitle: 'چاپ افست ۵ رنگ و طلاکوب حرارتی',
        spec: 'کلیشه برنجی CNC · دقت ±0.1mm',
        description: 'اجرای هم‌زمان طلاکوب داغ، برجسته‌سازی (Emboss) و یووی موضعی با خشک‌کن این‌لاین بر روی شیت‌های افست.',
        localPoint: [0, 0.92, 0],
        targetView: AppView.DESIGN_STUDIO,
        ctaText: 'طراحی گرافیک در استودیو آنلاین',
      },
      {
        id: 'magnetic-wall',
        label: 'دیواره مگنتی و لولای سخت',
        serviceTitle: 'تولید هاردباکس و بسته‌بندی صادراتی',
        spec: 'تخته‌مقوای فشرده ۱۲۰۰ گرم · روکش مخملی',
        description: 'برش V-Groove نود درجه برای ایجاد لبه‌های تیز و مهندسی‌شده همراه با مگنت‌های نئودیمیوم مخفی.',
        localPoint: [1.42, 0.45, 0.6],
        targetView: AppView.INQUIRY,
        ctaText: 'استعلام قیمت تیراژ هاردباکس',
      },
    ],
  },
  {
    id: 'windowBox',
    code: 'DIE-CUT · WINDOW',
    nameFa: 'جعبه ویندودار لوکس اشک قلم',
    subtitleFa: 'برش پنجره کریستالی PET با کلاف دوبل و استحکام نمایشگاهی',
    serviceCategoryFa: 'مهندسی قالب دایکات و تیغ لیزری',
    serviceSlug: '/services/die-cutting-engineering',
    defaultDims: { length: 2.8, width: 2.6, height: 0.55 },
    defaultBoardId: 'kraft',
    defaultFoilId: 'gold24k',
    specs: ['پنجره شفاف PET ضدخش', 'تیغ لیزری با تلورانس ±0.15mm', 'دیواره دوبل خودبست بدون چسب'],
    hotspots: [
      {
        id: 'window-patch',
        label: 'پنجره شفاف و برش لیزری',
        serviceTitle: 'دایکات صنعتی و پنجره‌چسبانی (Window Patching)',
        spec: 'طلق شفاف PET ۰.۲۵mm · برش Bobst',
        description: 'نمایش مستقیم محصول بدون باز شدن درب با برش دقیق دایکات و چسب‌زنی اتوماتیک طلق شفاف.',
        localPoint: [0, 0.6, 0],
        targetView: AppView.DIELINE_GENERATOR,
        ctaText: 'ساخت دایلاین در جعبه‌ساز ۳D',
      },
      {
        id: 'crease-hinge',
        label: 'خط تا و لولای مهندسی',
        serviceTitle: 'مهندسی قالب و خطوط تا (Crease Matrix)',
        spec: 'جبران ضخامت ورق · خروجی DXF',
        description: 'محاسبه دقیق جبران ضخامت مقوا در زاویه ۹۰ درجه جهت جلوگیری از ترک‌خوردگی روکش چاپی.',
        localPoint: [-1.42, 0.28, 0.5],
        targetView: AppView.AUTOCAD_STUDIO,
        ctaText: 'باز کردن در اتوکد آنلاین',
      },
    ],
  },
  {
    id: 'fefco0427',
    code: 'FEFCO 0427 · E-FLUTE',
    nameFa: 'جعبه کیبوردی خودبست (Mailer)',
    subtitleFa: 'استاندارد بین‌المللی حمل‌ونقل تجارت الکترونیک و پیتزا با قفل سه‌گانه',
    serviceCategoryFa: 'تولید ورق و کارتن ۳ و ۵ لایه صنعتی',
    serviceSlug: '/services/corrugated-packaging',
    defaultDims: { length: 2.9, width: 2.4, height: 0.52 },
    defaultBoardId: 'sbs',
    defaultFoilId: 'rosegold',
    specs: ['فلوت E / B مقاوم در چیدمان پالت', 'محاسبه آنلاین مقاومت فشاری BCT', 'قفل بغل بدون نیاز به چسب'],
    hotspots: [
      {
        id: 'flute-strength',
        label: 'مقاومت فشاری BCT و فلوت',
        serviceTitle: 'تحلیل استحکام کارتن ۳ لایه و ۵ لایه',
        spec: 'آزمون McKee BCT · فلوت E / B / BC',
        description: 'مهندسی گام موج فلوت و گرماژ کرافت برای تحمل فشار چیدمان ستونی در سردخانه و کانتینر صادراتی.',
        localPoint: [0, 0.26, 1.24],
        targetView: AppView.PRODUCTS,
        ctaText: 'مشاهده رده‌های کارتن صنعتی',
      },
      {
        id: 'dieline-lock',
        label: 'زبانه‌های قفل خودبست',
        serviceTitle: 'طراحی پارامتریک کدهای FEFCO',
        spec: 'استاندارد FEFCO 0427 · بهینه‌سازی شیت',
        description: 'چیدمان بهینه فرم زینک روی شیت ۷۰×۱۰۰ برای کمترین دورریز کاغذ و مونتاژ سریع خط بسته‌بندی.',
        localPoint: [1.46, 0.35, -0.3],
        targetView: AppView.DIELINE_GENERATOR,
        ctaText: 'تغییر ابعاد این قالب در ۳D',
      },
    ],
  },
  {
    id: 'pharmaCarton',
    code: 'ECMA A20.20 · PHARMA',
    nameFa: 'جعبه دارویی و آرایشی استاندارد',
    subtitleFa: 'مقوای ایندربرد بهداشتی ۳۵۰ گرم با زبانه‌های متقابل و دقت خطوط خط تا',
    serviceCategoryFa: 'مدل‌سازی سه‌بعدی و ماکت قبل از تیراژ',
    serviceSlug: '/services/structural-3d-cad',
    defaultDims: { length: 1.55, width: 1.35, height: 1.45 },
    defaultBoardId: 'sbs',
    defaultFoilId: 'silver',
    specs: ['ایندربرد بهداشتی SBS ۳۵۰ گرم', 'شبیه‌سازی باز و بسته شدن قبل از تیراژ', 'قابلیت چاپ بریل و برجسته'],
    hotspots: [
      {
        id: 'tuck-flap',
        label: 'زبانه متقابل دارویی',
        serviceTitle: 'ماکت سه‌بعدی و تست فیتینگ قبل از چاپ',
        spec: 'خط تا استاندارد ECMA · تلورانس ۰.۱mm',
        description: 'بررسی تداخل زبانه‌ها، جهت الیاف کاغذ (Grain Direction) و خط چسب پیش از ساخت تیغ قالب.',
        localPoint: [0, 1.48, 0],
        targetView: AppView.DIELINE_GENERATOR,
        ctaText: 'تست ماکت در جعبه‌ساز ۳D',
      },
    ],
  },
  {
    id: 'slidingSleeve',
    code: 'ECMA C10 · SLEEVE',
    nameFa: 'کاور و کشوی صنعتی ریلی',
    subtitleFa: 'ساختار دوتکه کشویی لوکس مناسب هدایای شرکتی، عطر، زعفران و دیجیتال',
    serviceCategoryFa: 'چاپ تخصصی و طراحی گرافیک وکتور',
    serviceSlug: '/services/offset-printing',
    defaultDims: { length: 2.8, width: 1.9, height: 0.48 },
    defaultBoardId: 'royal',
    defaultFoilId: 'gold24k',
    specs: ['ساختار دوتکه کاور و کشو', 'طلاکوب و سلفون مخملی ضدخش', 'چیدمان اختصاصی روی شیت'],
    hotspots: [
      {
        id: 'sleeve-print',
        label: 'کاور چاپی و روکش مخملی',
        serviceTitle: 'چاپ افست و سلفون‌کشی مخملی',
        spec: 'رنگ پنتون اختصاصی + سلفون Soft-Touch',
        description: 'روکش لمس مخملی ضد اثر انگشت با درخشش کنتراست‌دار طلاکوب داغ روی بدنه کشویی.',
        localPoint: [0, 0.54, 0],
        targetView: AppView.DESIGN_STUDIO,
        ctaText: 'شروع طراحی گرافیک کاور',
      },
    ],
  },
];

function easeInOutCubic(t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export interface ArticulatedPanel {
  id: string;
  parentId: string | null;
  pivot: [number, number, number];
  size: [number, number, number];
  offset: [number, number, number];
  foldAxis: 'x' | 'z';
  foldDirection: number;
  maxFoldAngle: number;
  foldStage: 'wall' | 'innerWall' | 'back' | 'lid' | 'flap';
  isLid?: boolean;
  isWindowLid?: boolean;
  isInnerTray?: boolean;
  group: THREE.Group;
  mesh: THREE.Mesh;
  wireMesh: THREE.Mesh;
  creaseLine?: THREE.Line;
}

export interface PackagingAssemblyResult {
  root: THREE.Group;
  panels: ArticulatedPanel[];
  applyFoldAndExplode: (foldProgress: number, explodeProgress: number) => void;
  setCadMode: (cadBlend: number, foldProgress?: number) => void;
}

export function buildPackagingAssembly(
  modelId: PackagingModelId,
  L: number,
  W: number,
  H: number,
  boardMat: THREE.MeshStandardMaterial,
  foilMat: THREE.MeshPhysicalMaterial,
  colorLogoMat: THREE.MeshPhysicalMaterial,
  glassMat: THREE.MeshPhysicalMaterial,
  wireMat: THREE.MeshBasicMaterial,
  edgeMat: THREE.LineBasicMaterial,
  creaseMat: THREE.LineDashedMaterial
): PackagingAssemblyResult {
  const root = new THREE.Group();
  const t = 0.028;

  interface RawPanel {
    id: string;
    parentId: string | null;
    pivot: [number, number, number];
    size: [number, number, number];
    offset: [number, number, number];
    foldAxis: 'x' | 'z';
    foldDirection: number;
    maxFoldAngle: number;
    foldStage: 'wall' | 'innerWall' | 'back' | 'lid' | 'flap';
    isLid?: boolean;
    isWindowLid?: boolean;
    isInnerTray?: boolean;
  }

  let defs: RawPanel[] = [];

  if (modelId === 'giftBox') {
    defs = [
      { id: 'bottom', parentId: null, pivot: [0, 0, 0], size: [L, t, W], offset: [0, t / 2, 0], foldAxis: 'x', foldDirection: 0, maxFoldAngle: 0, foldStage: 'wall' },
      { id: 'left_wall', parentId: 'bottom', pivot: [-L / 2, 0, 0], size: [H, t, W], offset: [-H / 2, t / 2, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'right_wall', parentId: 'bottom', pivot: [L / 2, 0, 0], size: [H, t, W], offset: [H / 2, t / 2, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'front_wall', parentId: 'bottom', pivot: [0, 0, W / 2], size: [L, t, H], offset: [0, t / 2, H / 2], foldAxis: 'x', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'back_wall', parentId: 'bottom', pivot: [0, 0, -W / 2], size: [L, t, H], offset: [0, t / 2, -H / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'back' },
      { id: 'lid', parentId: 'back_wall', pivot: [0, 0, -H], size: [L + 0.04, t, W + 0.04], offset: [0, t / 2, -(W + 0.04) / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'lid', isLid: true },
      { id: 'lid_front_flap', parentId: 'lid', pivot: [0, 0, -(W + 0.04)], size: [L + 0.02, t * 0.9, H * 0.42], offset: [0, -t / 2, -(H * 0.42) / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'flap' },
    ];
  } else if (modelId === 'slidingSleeve') {
    defs = [
      { id: 'bottom', parentId: null, pivot: [0, 0, 0], size: [L, t, W], offset: [0, t / 2, 0], foldAxis: 'x', foldDirection: 0, maxFoldAngle: 0, foldStage: 'wall' },
      { id: 'front_wall', parentId: 'bottom', pivot: [0, 0, W / 2], size: [L, t, H], offset: [0, t / 2, H / 2], foldAxis: 'x', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'back_wall', parentId: 'bottom', pivot: [0, 0, -W / 2], size: [L, t, H], offset: [0, t / 2, -H / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'back' },
      { id: 'left_tray', parentId: 'bottom', pivot: [-L / 2, 0, 0], size: [H * 0.88, t * 0.9, W - 0.06], offset: [-(H * 0.88) / 2, t / 2, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'innerWall', isInnerTray: true },
      { id: 'right_tray', parentId: 'bottom', pivot: [L / 2, 0, 0], size: [H * 0.88, t * 0.9, W - 0.06], offset: [(H * 0.88) / 2, t / 2, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'innerWall', isInnerTray: true },
      { id: 'lid', parentId: 'back_wall', pivot: [0, 0, -H], size: [L + 0.02, t, W + 0.02], offset: [0, t / 2, -(W + 0.02) / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'lid', isLid: true },
    ];
  } else if (modelId === 'pharmaCarton') {
    defs = [
      { id: 'bottom', parentId: null, pivot: [0, 0, 0], size: [L, t, W], offset: [0, t / 2, 0], foldAxis: 'x', foldDirection: 0, maxFoldAngle: 0, foldStage: 'wall' },
      { id: 'back_wall', parentId: 'bottom', pivot: [0, 0, -W / 2], size: [L, t, H], offset: [0, t / 2, -H / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'back' },
      { id: 'front_wall', parentId: 'bottom', pivot: [0, 0, W / 2], size: [L, t, H], offset: [0, t / 2, H / 2], foldAxis: 'x', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'left_wall', parentId: 'bottom', pivot: [-L / 2, 0, 0], size: [H, t, W], offset: [-H / 2, t / 2, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'right_wall', parentId: 'bottom', pivot: [L / 2, 0, 0], size: [H, t, W], offset: [H / 2, t / 2, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'lid', parentId: 'back_wall', pivot: [0, 0, -H], size: [L, t, W], offset: [0, t / 2, -W / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'lid', isLid: true },
      { id: 'lid_front_flap', parentId: 'lid', pivot: [0, 0, -W], size: [L - 0.04, t * 0.85, 0.34], offset: [0, -t / 2, -0.17], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'flap' },
    ];
  } else {
    const isWindow = modelId === 'windowBox';
    defs = [
      { id: 'bottom', parentId: null, pivot: [0, 0, 0], size: [L, t, W], offset: [0, t / 2, 0], foldAxis: 'x', foldDirection: 0, maxFoldAngle: 0, foldStage: 'wall' },
      { id: 'left_wall', parentId: 'bottom', pivot: [-L / 2, 0, 0], size: [H, t, W], offset: [-H / 2, t / 2, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'left_wall_inner', parentId: 'left_wall', pivot: [-H, 0, 0], size: [H - 0.03, t * 0.85, W - 0.05], offset: [-(H - 0.03) / 2, -t / 2, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI * 0.98, foldStage: 'innerWall' },
      { id: 'right_wall', parentId: 'bottom', pivot: [L / 2, 0, 0], size: [H, t, W], offset: [H / 2, t / 2, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'right_wall_inner', parentId: 'right_wall', pivot: [H, 0, 0], size: [H - 0.03, t * 0.85, W - 0.05], offset: [(H - 0.03) / 2, -t / 2, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI * 0.98, foldStage: 'innerWall' },
      { id: 'front_wall', parentId: 'bottom', pivot: [0, 0, W / 2], size: [L, t, H], offset: [0, t / 2, H / 2], foldAxis: 'x', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'front_wall_inner', parentId: 'front_wall', pivot: [0, 0, H], size: [L - 0.05, t * 0.85, H - 0.03], offset: [0, -t / 2, (H - 0.03) / 2], foldAxis: 'x', foldDirection: -1, maxFoldAngle: Math.PI * 0.98, foldStage: 'innerWall' },
      { id: 'back_wall', parentId: 'bottom', pivot: [0, 0, -W / 2], size: [L, t, H], offset: [0, t / 2, -H / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'back' },
      { id: 'lid', parentId: 'back_wall', pivot: [0, 0, -H], size: [L, t, W], offset: [0, t / 2, -W / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'lid', isLid: true, isWindowLid: isWindow },
      { id: 'lid_front_flap', parentId: 'lid', pivot: [0, 0, -W], size: [L - 0.06, t * 0.85, H * 0.86], offset: [0, -t / 2, -(H * 0.86) / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'flap' },
      { id: 'lid_left_flap', parentId: 'lid', pivot: [-L / 2, 0, -W / 2], size: [H * 0.84, t * 0.85, W - 0.06], offset: [-(H * 0.84) / 2, -t / 2, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'flap' },
      { id: 'lid_right_flap', parentId: 'lid', pivot: [L / 2, 0, -W / 2], size: [H * 0.84, t * 0.85, W - 0.06], offset: [(H * 0.84) / 2, -t / 2, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'flap' },
    ];
  }

  const panelMap: Record<string, ArticulatedPanel> = {};
  const panels: ArticulatedPanel[] = [];

  defs.forEach((def) => {
    const group = new THREE.Group();
    group.position.set(...def.pivot);

    const geom = new THREE.BoxGeometry(...def.size);
    geom.translate(...def.offset);

    const mesh = new THREE.Mesh(geom, boardMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.layers.enable(1);

    if (def.isLid && def.isWindowLid) {
      const [fw, fh, fd] = def.size;
      const oz = def.offset[2];
      const winW = fw * 0.58;
      const winD = fd * 0.54;
      const sideW = (fw - winW) / 2;
      const sideD = (fd - winD) / 2;

      const frameParts: Array<[number, number, number, number, number, number]> = [
        [sideW, fh, fd, -fw / 2 + sideW / 2, fh / 2, oz],
        [sideW, fh, fd, fw / 2 - sideW / 2, fh / 2, oz],
        [winW, fh, sideD, 0, fh / 2, oz - fd / 2 + sideD / 2],
        [winW, fh, sideD, 0, fh / 2, oz + fd / 2 - sideD / 2],
      ];

      frameParts.forEach(([pw, ph, pd, px, py, pz]) => {
        const fg = new THREE.BoxGeometry(pw, ph, pd);
        fg.translate(px, py, pz);
        const fm = new THREE.Mesh(fg, boardMat);
        fm.castShadow = true;
        fm.receiveShadow = true;
        fm.layers.enable(1);
        group.add(fm);
      });

      mesh.visible = false;
      group.add(mesh);

      const glassGeom = new THREE.BoxGeometry(winW + 0.02, fh * 0.55, winD + 0.02);
      glassGeom.translate(0, fh * 0.5, oz);
      const glassMesh = new THREE.Mesh(glassGeom, glassMat);
      glassMesh.renderOrder = 4;
      group.add(glassMesh);

      const bezelGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(winW, fh + 0.004, winD).translate(0, fh / 2, oz));
      const bezelLine = new THREE.LineSegments(bezelGeom, edgeMat);
      group.add(bezelLine);

      // Foil strip below window
      const stripGeom = new THREE.PlaneGeometry(fw * 0.72, fd * 0.16);
      stripGeom.rotateX(-Math.PI / 2);
      stripGeom.translate(0, fh + 0.004, oz + fd * 0.38);
      const stripMesh = new THREE.Mesh(stripGeom, foilMat);
      stripMesh.renderOrder = 6;
      group.add(stripMesh);

      // Custom Color Logo badge on the lid rim for window boxes
      const badgeSize = Math.min(sideD * 0.85, 0.34);
      const winLogoGeom = new THREE.PlaneGeometry(badgeSize, badgeSize);
      winLogoGeom.rotateX(-Math.PI / 2);
      winLogoGeom.translate(0, fh + 0.006, oz + fd * 0.38);
      const winLogoMesh = new THREE.Mesh(winLogoGeom, colorLogoMat);
      winLogoMesh.renderOrder = 7;
      group.add(winLogoMesh);
    } else {
      group.add(mesh);
    }

    if (def.isLid && !def.isWindowLid) {
      const [fw, fh, fd] = def.size;
      const oz = def.offset[2];
      const artSize = Math.min(fw, fd) * 0.78;
      const topArt = new THREE.PlaneGeometry(artSize, artSize);
      topArt.rotateX(-Math.PI / 2);
      topArt.translate(0, fh + 0.003, oz);
      const topArtMesh = new THREE.Mesh(topArt, foilMat);
      topArtMesh.renderOrder = 6;
      group.add(topArtMesh);

      // Full-color custom admin logo centered inside the lid emblem medallion
      const logoPlaneSize = artSize * 0.44;
      const logoGeom = new THREE.PlaneGeometry(logoPlaneSize, logoPlaneSize);
      logoGeom.rotateX(-Math.PI / 2);
      // Slight -Z offset matches y=242/768 (upper half of foil artwork canvas, inside circular seal)
      logoGeom.translate(0, fh + 0.005, oz - artSize * 0.185);
      const logoMesh = new THREE.Mesh(logoGeom, colorLogoMat);
      logoMesh.renderOrder = 7;
      group.add(logoMesh);

      const innerArt = new THREE.PlaneGeometry(artSize * 0.85, artSize * 0.85);
      innerArt.rotateX(Math.PI / 2);
      innerArt.translate(0, -0.003, oz);
      const innerArtMesh = new THREE.Mesh(innerArt, foilMat);
      innerArtMesh.renderOrder = 6;
      group.add(innerArtMesh);
    }

    // Also place uploaded brand emblem subtly on front wall exterior when assembled
    if (def.id === 'front_wall' && H >= 0.45) {
      const [, fh, fd] = def.size;
      const oz = def.offset[2];
      const frontBadgeSize = Math.min(L * 0.24, fd * 0.72, 0.45);
      const frontLogoGeom = new THREE.PlaneGeometry(frontBadgeSize, frontBadgeSize);
      frontLogoGeom.rotateX(Math.PI / 2);
      frontLogoGeom.translate(0, -0.004, oz);
      const frontLogoMesh = new THREE.Mesh(frontLogoGeom, colorLogoMat);
      frontLogoMesh.renderOrder = 7;
      group.add(frontLogoMesh);
    }

    // Wireframe CAD overlay mesh
    const wireMesh = new THREE.Mesh(geom, wireMat);
    wireMesh.scale.setScalar(1.003);
    group.add(wireMesh);

    // Precision CAD cut/edge outline
    const edgeGeom = new THREE.EdgesGeometry(geom);
    const edgeLine = new THREE.LineSegments(edgeGeom, edgeMat);
    group.add(edgeLine);

    // Crease dashed score lines on hinges
    let creaseLine: THREE.Line | undefined;
    if (def.parentId) {
      const cGeom = new THREE.BufferGeometry();
      const span = def.foldAxis === 'z' ? W * 0.48 : L * 0.48;
      const pts =
        def.foldAxis === 'z'
          ? [0, t + 0.005, -span, 0, t + 0.005, span]
          : [-span, t + 0.005, 0, span, t + 0.005, 0];
      cGeom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      creaseLine = new THREE.Line(cGeom, creaseMat);
      creaseLine.computeLineDistances();
      group.add(creaseLine);
    }

    const panel: ArticulatedPanel = {
      ...def,
      group,
      mesh,
      wireMesh,
      creaseLine,
    };
    panelMap[def.id] = panel;
    panels.push(panel);
  });

  panels.forEach((p) => {
    if (p.parentId && panelMap[p.parentId]) {
      panelMap[p.parentId].group.add(p.group);
    } else {
      root.add(p.group);
    }
  });

  const applyFoldAndExplode = (foldProgress: number, explodeProgress: number) => {
    const f = THREE.MathUtils.clamp(foldProgress, 0, 1);

    // Staggered realistic packaging folding sequence with cubic easing
    const wallT = easeInOutCubic((f - 0.03) / 0.27);
    const innerWallT = easeInOutCubic((f - 0.22) / 0.22);
    const backT = easeInOutCubic((f - 0.34) / 0.24);
    const lidT = easeInOutCubic((f - 0.54) / 0.26);
    const flapT = easeInOutCubic((f - 0.78) / 0.22);

    // Keep unfolded flat dieline centered on the circular plinth and lift slightly mid-fold so flaps clear the table
    const flatShiftZ = (W + H) * 0.44;
    root.position.z = (1 - easeInOutCubic(f)) * flatShiftZ;
    root.position.y = Math.sin(f * Math.PI) * 0.12;

    const lidOpenOffset = explodeProgress * 0.55;

    panels.forEach((p) => {
      let stageVal = 0;
      if (p.foldStage === 'wall') stageVal = wallT;
      else if (p.foldStage === 'innerWall') stageVal = innerWallT;
      else if (p.foldStage === 'back') stageVal = backT;
      else if (p.foldStage === 'lid') stageVal = Math.max(0, lidT - lidOpenOffset);
      else if (p.foldStage === 'flap') stageVal = Math.max(0, flapT - explodeProgress * 0.7);

      const angle = p.foldDirection * p.maxFoldAngle * stageVal;
      if (p.foldAxis === 'z') {
        p.group.rotation.z = angle;
      } else {
        p.group.rotation.x = angle;
      }

      if (p.parentId) {
        const exp = explodeProgress * 0.28;
        p.group.position.set(
          p.pivot[0] + (p.foldAxis === 'z' ? p.foldDirection * exp : 0),
          p.pivot[1] + (p.isLid ? exp * 1.4 : exp * 0.35),
          p.pivot[2] + (p.foldAxis === 'x' ? -p.foldDirection * exp : 0)
        );
      }
    });
  };

  const setCadMode = (cadBlend: number, foldProgress = 1) => {
    const c = THREE.MathUtils.clamp(cadBlend, 0, 1);
    // Highlight dieline cut/crease paths naturally when unfolded into a flat sheet
    const dielineBoost = THREE.MathUtils.clamp(1 - foldProgress * 1.35, 0, 1);

    boardMat.opacity = 1 - c * 0.82;
    boardMat.transparent = c > 0.02;
    boardMat.depthWrite = c < 0.5;
    wireMat.opacity = c * 0.45;
    wireMat.visible = c > 0.02;
    edgeMat.opacity = Math.min(1, 0.22 + c * 0.72 + dielineBoost * 0.65);
    creaseMat.opacity = Math.min(1, 0.16 + c * 0.78 + dielineBoost * 0.75);
    foilMat.opacity = 1 - c * 0.85;
    foilMat.transparent = c > 0.02;
  };

  return {
    root,
    panels,
    applyFoldAndExplode,
    setCadMode,
  };
}
